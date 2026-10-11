import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import {
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
  Color,
  Mesh,
  MeshStandardMaterial,
  Plane,
  Vector3,
  type Intersection,
  type Object3D,
  type PerspectiveCamera,
} from 'three';
import { keyAction, orbit, type Vec3 } from './camera.ts';
import type { SectionAxis } from './types.ts';

export interface SceneProps {
  url: string;
  /** Mesh names to emphasise. */
  highlighted: ReadonlySet<string>;
  /** Structure id whose name is shown next to it. */
  labelFor: string | null;
  label: string;
  ghost: boolean;
  isolate: boolean;
  section: SectionAxis;
  /** Cut position from -1 (one side of the model) to 1 (the other side). */
  sectionPosition: number;
  canvasLabel: string;
  /** Id of the element with keyboard help. */
  describedBy: string;
  reducedMotion: boolean;
  /** Moves focus to the model once it has loaded. */
  focusOnReady: boolean;
  onReady: () => void;
  onSelect: (id: string) => void;
}

const HOME: Vec3 = [0, 0.015, 0.36];
const TARGET: Vec3 = [0, 0.015, 0];
const LIMITS = { minDistance: 0.08, maxDistance: 0.8 };
const HIGHLIGHT = new Color('#ffb000');
const NO_EMISSION = new Color(0);
const GHOST_GROUPS = new Set(['chamber']);
const AXIS = { sagittal: 0, transverse: 1, frontal: 2 } as const;

type KeyHandler = (key: string) => boolean;

/** Applies keyboard moves to the default camera; registered into a ref the wrapper calls. */
function KeyboardOrbit({ handlerRef }: { handlerRef: RefObject<KeyHandler | null> }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as { target: Vector3; update: () => void } | null;
  useEffect(() => {
    handlerRef.current = (key) => {
      const action = keyAction(key);
      if (!action) return false;
      const target = controls?.target ?? new Vector3(...TARGET);
      const next = action.reset
        ? HOME
        : orbit(
            camera.position.toArray() as Vec3,
            target.toArray() as Vec3,
            action.dAzimuth,
            action.dPolar,
            action.zoom,
            LIMITS,
          );
      camera.position.set(...next);
      if (action.reset) target.set(...TARGET);
      camera.lookAt(target);
      controls?.update();
      return true;
    };
    return () => {
      handlerRef.current = null;
    };
  }, [camera, controls, handlerRef]);
  return null;
}

interface MeshState {
  mesh: Mesh;
  material: MeshStandardMaterial;
  group: string;
}

type ModelProps = Omit<
  SceneProps,
  'canvasLabel' | 'describedBy' | 'reducedMotion' | 'focusOnReady' | 'onReady'
> & { onLoaded: () => void };

function isShown(object: Object3D): boolean {
  for (let o: Object3D | null = object; o; o = o.parent) if (!o.visible) return false;
  return true;
}

function Model({ onLoaded, ...props }: ModelProps) {
  const gltf = useGLTF(props.url, false, true);
  const gl = useThree((s) => s.gl);

  // useGLTF caches one scene per URL. Each viewer works on its own copy with its own materials,
  // so two viewers on a page, or a remount, never fight over the same objects.
  const { scene, meshes } = useMemo(() => {
    const copy = gltf.scene.clone(true);
    const list: MeshState[] = [];
    copy.traverse((o: Object3D) => {
      if (!(o instanceof Mesh) || !(o.material instanceof MeshStandardMaterial)) return;
      const material = o.material.clone();
      o.material = material;
      list.push({ mesh: o, material, group: String(o.userData['group'] ?? '') });
    });
    return { scene: copy, meshes: list };
  }, [gltf.scene]);
  // Geometry stays shared with the cache; only the cloned materials belong to this viewer.
  useEffect(() => () => meshes.forEach((m) => m.material.dispose()), [meshes]);
  useEffect(onLoaded, [onLoaded, scene]);

  const bounds = useMemo(() => new Box3().setFromObject(scene), [scene]);
  const plane = useMemo(() => new Plane(), []);
  const cutting = props.section !== 'off';
  if (props.section !== 'off') {
    const i = AXIS[props.section];
    const size = bounds.getSize(new Vector3());
    const centre = bounds.getCenter(new Vector3());
    // Keeps the part of the model on the lower side of the cut position along the axis.
    plane.set(
      new Vector3().setComponent(i, -1),
      centre.getComponent(i) + (props.sectionPosition * size.getComponent(i)) / 2,
    );
  }
  const isolating = props.isolate && props.highlighted.size > 0;

  useLayoutEffect(() => {
    gl.localClippingEnabled = true;
    for (const { mesh, material, group } of meshes) {
      const lit = props.highlighted.has(mesh.name);
      material.emissive.copy(lit ? HIGHLIGHT : NO_EMISSION);
      material.emissiveIntensity = lit ? 0.45 : 0;
      const ghosted = props.ghost && GHOST_GROUPS.has(group) && !lit;
      material.opacity = ghosted ? 0.18 : 1;
      material.depthWrite = !ghosted;
      // Only these two change the shader program, so only they need a recompile.
      if (material.transparent !== ghosted || (material.clippingPlanes !== null) !== cutting) {
        material.transparent = ghosted;
        material.clippingPlanes = cutting ? [plane] : null;
        material.needsUpdate = true;
      }
      mesh.visible = !isolating || lit;
      // Transparent chambers draw after the structures inside them.
      mesh.renderOrder = ghosted ? 1 : 0;
    }
  }, [meshes, plane, gl, cutting, isolating, props.highlighted, props.ghost]);

  const anchor = useMemo(() => {
    if (!props.labelFor) return null;
    const node = scene.getObjectByName(props.labelFor);
    if (!node) return null;
    if (node instanceof Mesh) return new Box3().setFromObject(node).getCenter(new Vector3());
    return node.getWorldPosition(new Vector3());
  }, [scene, props.labelFor]);
  const labelShown = anchor !== null && (!cutting || plane.distanceToPoint(anchor) >= 0);

  // three's raycaster ignores visibility, clipping and opacity, so pick the first hit the reader
  // can actually see: not hidden, not cut away and not a see-through chamber.
  const pickable = (hit: Intersection) =>
    hit.object instanceof Mesh &&
    isShown(hit.object) &&
    !(cutting && plane.distanceToPoint(hit.point) < 0) &&
    !(hit.object.material instanceof MeshStandardMaterial && hit.object.material.transparent);

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const hit = event.intersections.find(pickable);
    if (hit?.object.name) props.onSelect(hit.object.name);
  };

  return (
    <>
      <primitive object={scene} onClick={onClick} />
      {labelShown && props.label && (
        <Html position={anchor} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <span className="heart-viewer-label">{props.label}</span>
        </Html>
      )}
    </>
  );
}

export default function Scene({
  canvasLabel,
  describedBy,
  reducedMotion,
  focusOnReady,
  onReady,
  ...props
}: SceneProps) {
  const keyHandler = useRef<KeyHandler | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  // Wheel and pinch zoom only while the model has focus, so scrolling past it moves the page.
  const [focused, setFocused] = useState(false);
  const onLoaded = useCallback(() => setReady(true), []);

  useEffect(() => {
    if (!ready) return;
    onReady();
    if (focusOnReady) wrapper.current?.focus();
  }, [ready, focusOnReady, onReady]);

  return (
    <div
      ref={wrapper}
      className="heart-viewer-canvas"
      tabIndex={0}
      role="application"
      aria-label={canvasLabel}
      aria-describedby={describedBy}
      aria-busy={!ready}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onKeyDown={(event) => {
        if (keyHandler.current?.(event.key)) event.preventDefault();
      }}
    >
      <Canvas
        camera={{ position: HOME, fov: 35, near: 0.01, far: 10 }}
        dpr={[1, 2]}
        onCreated={({ camera }) => (camera as PerspectiveCamera).lookAt(...TARGET)}
      >
        <hemisphereLight args={['#ffffff', '#443333', 2]} />
        <directionalLight position={[1, 2, 3]} intensity={2} />
        <Model {...props} onLoaded={onLoaded} />
        <OrbitControls
          makeDefault
          target={TARGET}
          enableDamping={!reducedMotion}
          enableZoom={focused}
          minDistance={LIMITS.minDistance}
          maxDistance={LIMITS.maxDistance}
        />
        <KeyboardOrbit handlerRef={keyHandler} />
      </Canvas>
    </div>
  );
}
