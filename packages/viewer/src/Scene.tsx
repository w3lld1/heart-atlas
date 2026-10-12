import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
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
  BufferAttribute,
  Color,
  Mesh,
  MeshStandardMaterial,
  Plane,
  Vector2,
  Vector3,
  type Intersection,
  type Object3D,
  type PerspectiveCamera,
} from 'three';
import { FOV, HOME, keyAction, orbit, TARGET, type Vec3 } from './camera.ts';
import {
  CHAMBERS,
  DEFORM_UNIFORMS,
  DEFORM_VERTEX,
  ease,
  GLOW_EASE_MS,
  SETTLE_EASE_MS,
  SQUEEZE,
  VALVE_EASE_MS,
  VALVE_SPREAD,
  VALVES,
  valveFrame,
  ZONE_EMISSIVE,
  ZONE_FRAGMENT,
  ZONE_FRAGMENT_UNIFORMS,
  type ChamberId,
  type CycleSource,
  type ValveId,
} from './cycle.ts';
import type { PresetId } from '@heart-atlas/heart-clock';
import { nearestDistances, ZONE_FADE, zoneWeight, type DiseaseShape } from './disease.ts';
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
  /**
   * Heartbeat: read every frame while set; null or absent lets the heart settle and stop.
   * HeartViewer wires it once the heart clock publishes cycle states.
   */
  cycle?: CycleSource | null;
  /** Signs of a disease drawn on the model; they stay without a heartbeat. */
  disease?: DiseaseShape | null;
  /** Text of the disease marker, when the shape has one. */
  markerLabel?: string;
  /** Called when the preset of the cycle's clock changes, and with null when the cycle goes. */
  onPreset?: (preset: PresetId | null) => void;
  onReady: () => void;
  onSelect: (id: string) => void;
}

const LIMITS = { minDistance: 0.08, maxDistance: 0.8 };
const HIGHLIGHT = new Color('#ffb000');
const NO_EMISSION = new Color(0);
/** Soft glow of excited conduction parts: a fade, never a flash (WCAG 2.3.1). */
const PULSE = new Color('#5ec8ff');
const PULSE_INTENSITY = 0.6;
/** Colour of disease signs: distinct from the reader's highlight and the conduction glow. */
const DISEASE = new Color('#9b4dca');
const DISEASE_INTENSITY = 0.35;
/** A deeper shade for a zone, so it stands out on a ventricle already lit with DISEASE. */
const ZONE = new Color('#5b1780');
const ZONE_MIX = 0.9;
const LV = 'left-ventricle';
const GHOST_GROUPS = new Set(['chamber']);
/** The muscle layer of congenital models: see-through, it shows the blood cast of the chambers. */
const GHOST_MESHES = new Set(['myocardium']);
const AXIS = { sagittal: 0, transverse: 1, frontal: 2 } as const;

type KeyHandler = (key: string) => boolean;

/** Applies keyboard moves to the default camera; registered into a ref the wrapper calls. */
function KeyboardOrbit({ handlerRef }: { handlerRef: RefObject<KeyHandler | null> }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as { target: Vector3; update: () => void } | null;
  const invalidate = useThree((s) => s.invalidate);
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
      invalidate();
      return true;
    };
    return () => {
      handlerRef.current = null;
    };
  }, [camera, controls, handlerRef, invalidate]);
  return null;
}

interface DeformUniforms {
  uSqueeze: { value: number };
  uSqueezeCenter: { value: Vector3 };
  uValve: { value: number };
  uOpen: { value: number };
  uCenter: { value: Vector3 };
  uNormal: { value: Vector3 };
  uRadius: { value: number };
  uEnlarge: { value: number };
  uEnlargeCenter: { value: Vector3 };
  uZoneSelect: { value: Vector2 };
  uZoneMotion: { value: number };
  uZoneColor: { value: Color };
  uZoneMix: { value: number };
}

interface MeshState {
  mesh: Mesh;
  material: MeshStandardMaterial;
  group: string;
  /** Present on meshes the heartbeat deforms. */
  deform?: DeformUniforms;
  /** Chambers whose contraction squeezes this mesh. */
  follows?: ChamberId[];
  /** Eased heartbeat value: valve opening or conduction glow. */
  level: number;
}

const isChamber = (name: string): name is ChamberId =>
  (CHAMBERS as readonly string[]).includes(name);
const isValve = (name: string): name is ValveId => (VALVES as readonly string[]).includes(name);

const ATRIA: ChamberId[] = ['right-atrium', 'left-atrium'];
const VENTRICLES: ChamberId[] = ['right-ventricle', 'left-ventricle'];
/** Atrium and ventricle on each side of an atrioventricular valve, for its flow axis. */
const AV_AXIS: Partial<Record<ValveId, [ChamberId, ChamberId]>> = {
  'tricuspid-valve': ['right-atrium', 'right-ventricle'],
  'mitral-valve': ['left-atrium', 'left-ventricle'],
};

/**
 * Chambers whose contraction a mesh follows. Papillary muscles and the vessels on the surface
 * move with the ventricles, so they stay attached to the wall that carries them. Everything that
 * follows ventricles squeezes towards their common centre, and atria towards theirs, so shared
 * walls such as the septum move as one.
 */
function followsFor(name: string, group: string): ChamberId[] | undefined {
  if (isChamber(name)) return [name];
  switch (name) {
    case 'right-papillary-muscles':
      return ['right-ventricle'];
    case 'left-papillary-muscles':
      return ['left-ventricle'];
    // Atrioventricular valves hang on chordae from the papillary muscles.
    case 'tricuspid-valve':
    case 'mitral-valve':
    case 'bundle-of-his':
    case 'right-bundle-branch':
    case 'left-bundle-branch':
    case 'purkinje-fibers':
      return VENTRICLES;
    case 'sa-node':
    case 'av-node':
      return ['right-atrium'];
  }
  if (group === 'coronary-artery' || group === 'cardiac-vein') return VENTRICLES;
  return undefined;
}

function newUniforms(): DeformUniforms {
  return {
    uSqueeze: { value: 0 },
    uSqueezeCenter: { value: new Vector3() },
    uValve: { value: 0 },
    uOpen: { value: 0 },
    uCenter: { value: new Vector3() },
    uNormal: { value: new Vector3(0, 1, 0) },
    uRadius: { value: 0 },
    uEnlarge: { value: 1 },
    uEnlargeCenter: { value: new Vector3() },
    uZoneSelect: { value: new Vector2() },
    uZoneMotion: { value: 1 },
    uZoneColor: { value: ZONE },
    uZoneMix: { value: 0 },
  };
}

/** Valve frame in the mesh's own geometry space, where the shader works. */
function setValveFrame(mesh: Mesh, uniforms: DeformUniforms, axis?: Vec3) {
  const position = mesh.geometry.getAttribute('position');
  if (!position) return;
  // getX/Y/Z undo the quantization, giving the same values the shader sees.
  const points = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    points[i * 3] = position.getX(i);
    points[i * 3 + 1] = position.getY(i);
    points[i * 3 + 2] = position.getZ(i);
  }
  const frame = valveFrame(points, axis);
  uniforms.uValve.value = 1;
  uniforms.uCenter.value.set(...frame.center);
  uniforms.uNormal.value.set(...frame.normal);
  uniforms.uRadius.value = frame.radius;
}

function addDeformation(material: MeshStandardMaterial, uniforms: DeformUniforms, zone: boolean) {
  if (zone) material.defines = { ...material.defines, HAS_ZONE: '' };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${DEFORM_UNIFORMS}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${DEFORM_VERTEX}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${ZONE_FRAGMENT_UNIFORMS}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${ZONE_FRAGMENT}`)
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>\n${ZONE_EMISSIVE}`,
      );
  };
}

/** Positions of a mesh in model space, undoing quantization and node transforms. */
function worldPositions(mesh: Mesh): Float32Array {
  const position = mesh.geometry.getAttribute('position');
  const out = new Float32Array((position?.count ?? 0) * 3);
  const v = new Vector3();
  for (let i = 0; position && i < position.count; i++) {
    v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
    out.set([v.x, v.y, v.z], i * 3);
  }
  return out;
}

/**
 * Zone weights of the left ventricle as vertex attributes. They depend only on the geometry, so
 * the copy shared with the loader cache gets them once and every viewer reuses them.
 */
function addZoneWeights(lv: Mesh, scene: Object3D) {
  const geometry = lv.geometry;
  const points = worldPositions(lv);
  for (const [kind, attribute] of [
    ['inferior', 'zoneInferior'],
    ['septal', 'zoneSeptal'],
  ] as const) {
    if (geometry.getAttribute(attribute)) continue;
    const { near, full, none } = ZONE_FADE[kind];
    const target = scene.getObjectByName(near);
    const weights = new Float32Array(points.length / 3);
    if (target instanceof Mesh) {
      const distances = nearestDistances(points, worldPositions(target), none);
      distances.forEach((d, i) => (weights[i] = zoneWeight(d, full, none)));
    }
    geometry.setAttribute(attribute, new BufferAttribute(weights, 1));
  }
}

type ModelProps = Omit<
  SceneProps,
  'canvasLabel' | 'describedBy' | 'reducedMotion' | 'focusOnReady' | 'onReady'
> & { onLoaded: () => void };

function isShown(object: Object3D): boolean {
  for (let o: Object3D | null = object; o; o = o.parent) if (!o.visible) return false;
  return true;
}

export function Model({ onLoaded, ...props }: ModelProps) {
  const gltf = useGLTF(props.url, false, true);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);

  // useGLTF caches one scene per URL. Each viewer works on its own copy with its own materials,
  // so two viewers on a page, or a remount, never fight over the same objects.
  const { scene, meshes } = useMemo(() => {
    const copy = gltf.scene.clone(true);
    copy.updateMatrixWorld(true);
    // Squeeze centres in model space; null when the model lacks the chambers.
    const centreOf = (names: readonly string[]) => {
      const box = new Box3();
      for (const name of names) {
        const node = copy.getObjectByName(name);
        if (node) box.expandByObject(node);
      }
      return box.isEmpty() ? null : box.getCenter(new Vector3());
    };
    const atria = centreOf(ATRIA);
    const ventricles = centreOf(VENTRICLES);
    const leftVentricle = centreOf([LV]);
    const list: MeshState[] = [];
    copy.traverse((o: Object3D) => {
      if (!(o instanceof Mesh) || !(o.material instanceof MeshStandardMaterial)) return;
      const material = o.material.clone();
      o.material = material;
      const group = String(o.userData['group'] ?? '');
      const centre = (c: ChamberId) => (ATRIA.includes(c) ? atria : ventricles);
      const found = followsFor(o.name, group);
      const follows = found?.every((c) => centre(c)) ? found : undefined;
      let deform: DeformUniforms | undefined;
      if (follows || isValve(o.name)) {
        deform = newUniforms();
        // The shader works in the mesh's geometry space; quantization scales nodes uniformly,
        // so squeezing there about the mapped centre equals squeezing in model space.
        const squeezeCentre = follows?.[0] ? centre(follows[0]) : null;
        if (squeezeCentre) deform.uSqueezeCenter.value.copy(o.worldToLocal(squeezeCentre.clone()));
        if (leftVentricle) deform.uEnlargeCenter.value.copy(o.worldToLocal(leftVentricle.clone()));
      }
      const zone = o.name === LV && deform !== undefined;
      if (zone) addZoneWeights(o, copy);
      if (deform && isValve(o.name)) {
        const ends = AV_AXIS[o.name];
        const from = ends && centreOf([ends[0]]);
        const to = ends && centreOf([ends[1]]);
        const axis =
          from && to
            ? o.worldToLocal(to.clone()).sub(o.worldToLocal(from.clone())).toArray()
            : undefined;
        setValveFrame(o, deform, axis);
      }
      if (deform) addDeformation(material, deform, zone);
      list.push({
        mesh: o,
        material,
        group,
        level: 0,
        ...(deform ? { deform } : {}),
        ...(follows ? { follows } : {}),
      });
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
    const tinted = new Set(props.disease?.tint);
    for (const { mesh, material, group } of meshes) {
      const lit = props.highlighted.has(mesh.name);
      // The reader's highlight wins over the disease colour.
      const tint = !lit && tinted.has(mesh.name);
      material.emissive.copy(lit ? HIGHLIGHT : tint ? DISEASE : NO_EMISSION);
      material.emissiveIntensity = lit ? 0.45 : tint ? DISEASE_INTENSITY : 0;
      const ghosted =
        props.ghost && (GHOST_GROUPS.has(group) || GHOST_MESHES.has(mesh.name)) && !lit;
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
  }, [meshes, plane, gl, cutting, isolating, props.highlighted, props.ghost, props.disease]);

  // Static signs of a disease: they hold at rest, the heartbeat only adds to them.
  useLayoutEffect(() => {
    const shape = props.disease;
    const growing = new Set(shape?.enlarge ? [LV, ...shape.enlarge.with] : []);
    for (const { mesh, deform } of meshes) {
      if (!deform) continue;
      deform.uEnlarge.value = growing.has(mesh.name) ? (shape?.enlarge?.scale ?? 1) : 1;
      if (mesh.name !== LV) continue;
      const kind = shape?.zone?.kind;
      deform.uZoneSelect.value.set(kind === 'inferior' ? 1 : 0, kind === 'septal' ? 1 : 0);
      deform.uZoneMotion.value = shape?.zone?.motion ?? 1;
      // The reader's highlight wins over the zone colour too.
      deform.uZoneMix.value = kind && !props.highlighted.has(LV) ? ZONE_MIX : 0;
    }
  }, [meshes, props.disease, props.highlighted]);
  // The canvas draws on demand: any change of props (highlight, cut position, label) needs a frame.
  useEffect(() => invalidate());

  // Heartbeat. Chambers follow the clock's contraction directly (it is already smooth); valves
  // and the conduction glow are eased here. While anything moves, each frame asks for the next.
  // A source has no change events, so while one is set a slow tick lets a paused clock resume.
  const lastState = useRef('');
  const lastPreset = useRef<PresetId | null>(null);
  const { onPreset } = props;
  useEffect(() => {
    if (props.cycle) return;
    lastPreset.current = null;
    onPreset?.(null);
  }, [props.cycle, onPreset]);
  useEffect(() => {
    if (!props.cycle) return;
    const tick = window.setInterval(invalidate, 200);
    return () => window.clearInterval(tick);
  }, [props.cycle, invalidate]);

  useFrame((state, delta) => {
    const cycle = props.cycle?.() ?? null;
    // A clock between two presets gives no state for a moment; the last preset holds meanwhile.
    if (cycle && (cycle.preset ?? null) !== lastPreset.current) {
      lastPreset.current = cycle.preset ?? null;
      onPreset?.(lastPreset.current);
    }
    const dt = delta * 1000;
    // A paused clock gives the same state every frame; only a change asks for the next frame.
    const signature = cycle ? JSON.stringify(cycle) : '';
    let moving = signature !== lastState.current;
    lastState.current = signature;
    for (const m of meshes) {
      const name = m.mesh.name;
      if (m.deform && m.follows) {
        const target =
          m.follows.reduce((sum, c) => sum + (cycle?.contraction[c] ?? 0) * SQUEEZE[c], 0) /
          m.follows.length;
        const squeeze = cycle ? target : ease(m.deform.uSqueeze.value, 0, dt, SETTLE_EASE_MS);
        m.deform.uSqueeze.value = squeeze;
        if (!cycle && squeeze > 1e-4) moving = true;
      }
      if (m.deform && isValve(name)) {
        const target = cycle?.valveOpen[name] ?? 0;
        m.level = ease(m.level, target, dt, VALVE_EASE_MS);
        const narrowed = name === 'aortic-valve' ? (props.disease?.aorticOpening ?? 1) : 1;
        m.deform.uOpen.value = m.level * VALVE_SPREAD * narrowed;
        if (Math.abs(m.level - target) > 1e-4) moving = true;
      } else if (m.group === 'conduction') {
        const target = cycle?.excited.includes(name) ? 1 : 0;
        m.level = ease(m.level, target, dt, GLOW_EASE_MS);
        if (Math.abs(m.level - target) > 1e-4) moving = true;
        // The reader's own highlight wins over the heartbeat.
        if (!props.highlighted.has(name)) {
          m.material.emissive.copy(m.level > 1e-4 ? PULSE : NO_EMISSION);
          m.material.emissiveIntensity = PULSE_INTENSITY * m.level;
        }
      }
    }
    if (moving) state.invalidate();
  });

  const anchor = useMemo(() => {
    if (!props.labelFor) return null;
    const node = scene.getObjectByName(props.labelFor);
    if (!node) return null;
    if (node instanceof Mesh) return new Box3().setFromObject(node).getCenter(new Vector3());
    return node.getWorldPosition(new Vector3());
  }, [scene, props.labelFor]);
  const labelShown = anchor !== null && (!cutting || plane.distanceToPoint(anchor) >= 0);
  const marker = useMemo(() => {
    const node = props.disease?.marker ? scene.getObjectByName(props.disease.marker) : undefined;
    return node ? node.getWorldPosition(new Vector3()) : null;
  }, [scene, props.disease]);
  // Hidden while the reader isolates structures or has the marked zone's label on the same spot.
  const markerShown =
    marker !== null &&
    !isolating &&
    props.labelFor !== props.disease?.marker &&
    (!cutting || plane.distanceToPoint(marker) >= 0);

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
      {markerShown && props.markerLabel && (
        <Html position={marker} center zIndexRange={[9, 0]} style={{ pointerEvents: 'none' }}>
          <span className="heart-viewer-marker">{props.markerLabel}</span>
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
      {/* Draw only when something changes: a constant render loop keeps the CPU busy for nothing. */}
      <Canvas
        frameloop="demand"
        camera={{ position: HOME, fov: FOV, near: 0.01, far: 10 }}
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
