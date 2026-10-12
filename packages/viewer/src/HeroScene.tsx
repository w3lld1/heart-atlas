import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import {
  Box3,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Raycaster,
  Vector2,
  Vector3,
  type Object3D,
} from 'three';
import { FOV, HOME, orbit, TARGET, type Vec3 } from './camera.ts';
import { SQUEEZE, type ChamberId, type CycleSource } from './cycle.ts';
import { anchorFollows, ghostLook, ndcToShare, sharesChanged, type Share } from './hero-state.ts';
import { Model } from './Scene.tsx';

export interface HeroSceneProps {
  url: string;
  /** Mesh names to light. */
  highlighted: ReadonlySet<string>;
  /** Everything else turns see-through. */
  ghost: boolean;
  /** Points on the poster (shares of its size) whose place on the model the page follows. */
  anchors: Readonly<Record<string, { x: number; y: number }>>;
  /**
   * Width / height of the poster. The canvas is as tall as the poster and may be wider, so the
   * turning heart is not cut at its sides; the same vertical field of view keeps the model exactly
   * where the poster shows it.
   */
  posterAspect: number;
  label: string;
  /** Turns slowly by itself until the reader turns it. */
  turn: boolean;
  cycle: CycleSource | null;
  /** False while the heart is off screen: nothing is drawn. */
  visible: boolean;
  onReady: () => void;
  onAnchors: (points: Record<string, Share>) => void;
}

const LIMITS = { minDistance: 0.36, maxDistance: 0.36 };
/** Radians per arrow key press. */
const STEP = Math.PI / 12;
/** Speed of the slow turn; OrbitControls makes 2 a full turn a minute at 60 frames a second. */
const TURN_SPEED = 0.5;

const noop = () => {};
const ATRIA: ChamberId[] = ['right-atrium', 'left-atrium'];
const VENTRICLES: ChamberId[] = ['right-ventricle', 'left-ventricle'];

type KeyHandler = (key: string) => boolean;

function meshesOf(root: Object3D): { mesh: Mesh; material: MeshStandardMaterial }[] {
  const list: { mesh: Mesh; material: MeshStandardMaterial }[] = [];
  root.traverse((o) => {
    if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
      list.push({ mesh: o, material: o.material });
    }
  });
  return list;
}

/**
 * The home page "ghost": everything that is not lit turns see-through. Runs after the Model's own
 * look (a later sibling), which keeps its narrower ghost rule off here.
 */
function Ghost({ highlighted, ghost }: { highlighted: ReadonlySet<string>; ghost: boolean }) {
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    for (const { mesh, material } of meshesOf(scene)) {
      const look = ghostLook(highlighted.has(mesh.name), ghost);
      material.opacity = look.opacity;
      material.depthWrite = !look.transparent;
      mesh.renderOrder = look.transparent ? 1 : 0;
      if (material.transparent !== look.transparent) {
        material.transparent = look.transparent;
        material.needsUpdate = true;
      }
    }
    invalidate();
  }, [scene, highlighted, ghost, invalidate]);
  return null;
}

interface AnchorPoint {
  /** Point at rest, in model space. */
  rest: Vector3;
  /** Chambers whose squeeze moves it, and the centre they squeeze towards. */
  follows: ChamberId[];
  centre: Vector3 | null;
}

/** Centre of the joint box of the named meshes; null when the model lacks them. */
function centreOf(scene: Object3D, names: readonly string[]): Vector3 | null {
  const box = new Box3();
  for (const name of names) {
    const node = scene.getObjectByName(name);
    if (node) box.expandByObject(node);
  }
  return box.isEmpty() ? null : box.getCenter(new Vector3());
}

/**
 * Finds where each poster point lies on the model, once: a ray from the poster's camera through
 * the point hits the visible surface of its structure (or, failing that, the middle of it). Every
 * frame each point moves with the heartbeat as the shader moves its mesh, is projected with the
 * live camera, and the page hears of the points when they move.
 */
function Anchors({
  anchors,
  posterAspect,
  cycle,
  onAnchors,
}: Pick<HeroSceneProps, 'anchors' | 'posterAspect' | 'cycle' | 'onAnchors'>) {
  const scene = useThree((s) => s.scene);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  // Found after the commit that puts the model into the scene.
  const points = useRef<Record<string, AnchorPoint>>({});
  useEffect(() => {
    const camera = new PerspectiveCamera(FOV, posterAspect, 0.01, 10);
    camera.position.set(...HOME);
    camera.lookAt(...TARGET);
    camera.updateMatrixWorld();
    const ray = new Raycaster();
    // Like the shader: everything on the atria squeezes towards their joint centre, and so for
    // the ventricles, so shared walls move as one.
    const atria = centreOf(scene, ATRIA);
    const ventricles = centreOf(scene, VENTRICLES);
    const found: Record<string, AnchorPoint> = {};
    for (const [id, { x, y }] of Object.entries(anchors)) {
      const node = scene.getObjectByName(id);
      if (!node) continue;
      ray.setFromCamera(new Vector2(x * 2 - 1, 1 - y * 2), camera);
      const rest =
        ray.intersectObject(node, true)[0]?.point.clone() ??
        new Box3().setFromObject(node).getCenter(new Vector3());
      const follows = anchorFollows(id, String(node.userData['group'] ?? ''));
      const centre = follows[0] && ATRIA.includes(follows[0]) ? atria : ventricles;
      found[id] = { rest, follows, centre };
    }
    points.current = found;
    invalidate();
  }, [scene, anchors, posterAspect, invalidate]);

  const last = useRef<Record<string, Share>>({});
  const point = useMemo(() => new Vector3(), []);
  useFrame(({ camera }) => {
    const state = cycle?.() ?? null;
    // How much wider the canvas is than the poster; shares are given of the poster.
    const widen = size.width / (size.height * posterAspect);
    const next: Record<string, Share> = {};
    for (const [id, { rest, follows, centre }] of Object.entries(points.current)) {
      point.copy(rest);
      if (state && centre && follows.length > 0) {
        const squeeze =
          follows.reduce((sum, c) => sum + (state.contraction[c] ?? 0) * SQUEEZE[c], 0) /
          follows.length;
        point.lerp(centre, squeeze);
      }
      point.project(camera);
      next[id] = ndcToShare(point.x * widen, point.y);
    }
    if (!sharesChanged(last.current, next)) return;
    last.current = next;
    onAnchors(next);
  });
  return null;
}

/** Tells the page once the model has been drawn, so the poster leaves only then. */
function FirstFrame({ ready, onReady }: { ready: boolean; onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (!ready || done.current) return;
    done.current = true;
    // useFrame runs before the frame is drawn; the next animation frame comes after it.
    requestAnimationFrame(onReady);
  });
  return null;
}

/** Arrow keys turn the heart around its vertical axis; Home brings it back. */
function KeyboardTurn({ handlerRef }: { handlerRef: RefObject<KeyHandler | null> }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as { update: () => void } | null;
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    handlerRef.current = (key) => {
      const turn = key === 'ArrowLeft' ? -STEP : key === 'ArrowRight' ? STEP : 0;
      if (!turn && key !== 'Home') return false;
      const next = turn
        ? orbit(camera.position.toArray() as Vec3, TARGET, turn, 0, 1, LIMITS)
        : HOME;
      camera.position.set(...next);
      camera.lookAt(...TARGET);
      controls?.update();
      invalidate();
      return true;
    };
    return () => {
      handlerRef.current = null;
    };
  }, [camera, controls, handlerRef, invalidate]);
  return null;
}

/** Vertical page scrolling stays with the browser on touch screens; sideways drags turn the heart. */
function TouchScroll() {
  const controls = useThree((s) => s.controls) as { domElement?: HTMLElement } | null;
  useEffect(() => {
    if (controls?.domElement) controls.domElement.style.touchAction = 'pan-y';
  }, [controls]);
  return null;
}

export default function HeroScene({
  url,
  highlighted,
  ghost,
  anchors,
  posterAspect,
  label,
  turn,
  cycle,
  visible,
  onReady,
  onAnchors,
}: HeroSceneProps) {
  const keyHandler = useRef<KeyHandler | null>(null);
  const [ready, setReady] = useState(false);
  // The slow turn stops for good once the reader turns the heart.
  const [touched, setTouched] = useState(false);
  const onLoaded = useCallback(() => setReady(true), []);

  const spinning = turn && !touched;
  const frameloop = !visible ? 'never' : spinning ? 'always' : 'demand';

  return (
    <div
      className="hero-heart-canvas"
      // Reachable with Tab only once the model shows; before that the poster is what is seen.
      tabIndex={ready ? 0 : -1}
      role="img"
      aria-label={label}
      aria-busy={!ready}
      onKeyDown={(event) => {
        if (keyHandler.current?.(event.key)) {
          event.preventDefault();
          setTouched(true);
        }
      }}
      style={{ inlineSize: '100%', blockSize: '100%' }}
    >
      <Canvas
        frameloop={frameloop}
        camera={{ position: HOME, fov: FOV, near: 0.01, far: 10 }}
        dpr={[1, 2]}
        gl={{ alpha: true }}
        onCreated={({ camera }) => (camera as PerspectiveCamera).lookAt(...TARGET)}
      >
        <hemisphereLight args={['#ffffff', '#443333', 2]} />
        <directionalLight position={[1, 2, 3]} intensity={2} />
        <Suspense fallback={null}>
          <Model
            url={url}
            highlighted={highlighted}
            labelFor={null}
            label=""
            ghost={false}
            isolate={false}
            section="off"
            sectionPosition={0}
            cycle={cycle}
            onSelect={noop}
            onLoaded={onLoaded}
          />
          <Ghost highlighted={highlighted} ghost={ghost} />
          <Anchors
            anchors={anchors}
            posterAspect={posterAspect}
            cycle={cycle}
            onAnchors={onAnchors}
          />
          <FirstFrame ready={ready} onReady={onReady} />
        </Suspense>
        <OrbitControls
          makeDefault
          target={TARGET}
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
          autoRotate={spinning}
          autoRotateSpeed={TURN_SPEED}
          onStart={() => setTouched(true)}
        />
        <KeyboardTurn handlerRef={keyHandler} />
        <TouchScroll />
      </Canvas>
    </div>
  );
}
