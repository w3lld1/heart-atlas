/**
 * Renders the home page poster of the heart model with a transparent background, and the screen
 * point of every mesh structure on it (assets/models/heart/anchors.json), so the cards around the
 * poster can draw lines to structures the reader can see.
 *
 * Usage: pnpm --filter @heart-atlas/models poster [congenital model id]   (run by hand after a model changes)
 *
 * With a congenital model id it renders that model's poster instead, cut along the frontal plane the
 * way the viewer opens it (section="frontal" in CongenitalModel.astro), and writes no anchors.
 *
 * The page uses the camera of the viewer (packages/viewer/src/camera.ts) and the same lights and
 * renderer settings as react-three-fiber's defaults there, so the poster matches the live model.
 * Anchors come from an id buffer: every structure is drawn in its own flat colour, and the anchor
 * is the pixel of that structure nearest to the centre of its visible pixels, so the point always
 * lies on a visible part of the structure, never inside the heart.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize } from 'node:path';
import { chromium } from '@playwright/test';
import { FOV, HOME, TARGET } from '@heart-atlas/viewer/camera';
import { assetsDir } from '../src/paths.ts';
import { MODELS } from '../src/build.ts';
import { parseStructures } from '../src/structures.ts';

/** Poster size in pixels: twice the largest size the home page shows it at (25rem), for 2x screens. */
export const POSTER_WIDTH = 800;
export const POSTER_HEIGHT = 880;
const QUALITY = 0.86;

const require = createRequire(import.meta.url);
// three exports no package.json; its main file lives in build/.
const threeDir = dirname(dirname(require.resolve('three')));
const types: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.glb': 'model/gltf-binary',
};

function page(meshIds: string[], cut: boolean): string {
  const settings = JSON.stringify({
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    quality: QUALITY,
    home: HOME,
    target: TARGET,
    fov: FOV,
    meshIds,
    cut,
  });
  return `<!doctype html><meta charset="utf-8">
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const s = ${settings};
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(s.width, s.height);
renderer.setClearColor(0x000000, 0);
// react-three-fiber defaults, as in the viewer's Canvas.
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.append(renderer.domElement);
const camera = new THREE.PerspectiveCamera(s.fov, s.width / s.height, 0.01, 10);
camera.position.set(...s.home);
camera.lookAt(...s.target);
const scene = new THREE.Scene();
// Lights of packages/viewer/src/Scene.tsx.
scene.add(new THREE.HemisphereLight('#ffffff', '#443333', 2));
const sun = new THREE.DirectionalLight('#ffffff', 2);
sun.position.set(1, 2, 3);
scene.add(sun);
const gltf = await new GLTFLoader().loadAsync('/heart.glb');
scene.add(gltf.scene);
if (s.cut) {
  // The viewer's frontal section at its default position: keeps the half behind the model's centre.
  // Keep in step with the clipping plane in packages/viewer/src/Scene.tsx.
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const centre = box.getCenter(new THREE.Vector3());
  renderer.localClippingEnabled = true;
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), centre.z);
  gltf.scene.traverse((o) => { if (o.isMesh) o.material.clippingPlanes = [plane]; });
}
renderer.render(scene, camera);
const poster = renderer.domElement.toDataURL('image/webp', s.quality);
if (s.cut) window.result = { poster, anchors: {} };
else {

// Id buffer: structure i is drawn in colour i + 1, everything else in 0.
const ids = new Map(s.meshIds.map((id, i) => [id, i + 1]));
const owner = (o) => { for (let p = o; p; p = p.parent) if (ids.has(p.name)) return ids.get(p.name); return 0; };
gltf.scene.traverse((o) => {
  if (!o.isMesh) return;
  const n = owner(o);
  // Both sides, like the model's own materials, so open meshes hide what is behind them.
  o.material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: new THREE.Color().setRGB((n & 255) / 255, 0, 0, THREE.LinearSRGBColorSpace) });
});
const target = new THREE.WebGLRenderTarget(s.width, s.height);
renderer.toneMapping = THREE.NoToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.setRenderTarget(target);
renderer.setClearColor(0x000000, 1);
renderer.render(scene, camera);
const pixels = new Uint8Array(s.width * s.height * 4);
renderer.readRenderTargetPixels(target, 0, 0, s.width, s.height, pixels);
const found = s.meshIds.map(() => []);
for (let y = 0; y < s.height; y++) {
  for (let x = 0; x < s.width; x++) {
    const n = pixels[(y * s.width + x) * 4];
    // Render targets start at the bottom row; anchors count from the top.
    if (n > 0 && n <= s.meshIds.length) found[n - 1].push([x, s.height - 1 - y]);
  }
}
const anchors = {};
s.meshIds.forEach((id, i) => {
  const points = found[i];
  if (points.length === 0) return;
  const cx = points.reduce((a, p) => a + p[0], 0) / points.length;
  const cy = points.reduce((a, p) => a + p[1], 0) / points.length;
  let best = points[0];
  for (const p of points) if (Math.hypot(p[0] - cx, p[1] - cy) < Math.hypot(best[0] - cx, best[1] - cy)) best = p;
  anchors[id] = {
    x: +((best[0] + 0.5) / s.width).toFixed(4),
    y: +((best[1] + 0.5) / s.height).toFixed(4),
    pixels: points.length,
  };
});
window.result = { poster, anchors };
}
</script>`;
}

function serve(html: string, model: string): Promise<Server> {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost').pathname;
    let file: string | undefined;
    if (url === '/heart.glb') file = join(assetsDir, model);
    else if (url.startsWith('/three/')) {
      const path = normalize(join(threeDir, url.slice('/three/'.length)));
      if (path.startsWith(threeDir)) file = path;
    }
    if (url === '/') {
      res.writeHead(200, { 'content-type': types['.html'] }).end(html);
    } else if (file) {
      try {
        const body = readFileSync(file);
        res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404).end();
      }
    } else {
      res.writeHead(404).end();
    }
  });
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done(server)));
}

const congenital = process.argv[2];
if (congenital !== undefined && !MODELS.some((m) => m.source === `congenital/${congenital}.glb`)) {
  throw new Error(`Unknown congenital model ${congenital}`);
}
const structures = parseStructures(
  readFileSync(
    join(assetsDir, congenital ? 'congenital/structures.yaml' : 'heart/structures.yaml'),
    'utf8',
  ),
);
const meshIds = structures.filter((s) => s.kind === 'mesh').map((s) => s.id);
if (meshIds.length > 255) throw new Error('The id buffer holds at most 255 structures');

const server = await serve(
  page(meshIds, congenital !== undefined),
  congenital ? `congenital/${congenital}.glb` : 'heart/heart.glb',
);
const address = server.address();
const port = typeof address === 'object' && address ? address.port : 0;
const browser = await chromium.launch({
  // The same override the e2e tests use when Playwright's own browser is not installed.
  ...(process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH']
    ? { executablePath: process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'] }
    : {}),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const tab = await browser.newPage();
  tab.on('pageerror', (error) => console.error(error));
  await tab.goto(`http://127.0.0.1:${port}/`);
  await tab.waitForFunction(() => 'result' in window, undefined, { timeout: 60_000 });
  const { poster, anchors } = (await tab.evaluate(
    () => (window as unknown as { result: unknown }).result,
  )) as {
    poster: string;
    anchors: Record<string, { x: number; y: number; pixels: number }>;
  };
  const webp = Buffer.from(poster.replace(/^data:image\/webp;base64,/, ''), 'base64');
  if (congenital) {
    writeFileSync(join(assetsDir, `congenital/${congenital}-poster.webp`), webp);
    console.log(`${congenital}-poster.webp: ${(webp.byteLength / 1024).toFixed(0)} KB`);
  } else {
    writeFileSync(join(assetsDir, 'heart/hero-poster.webp'), webp);
    const json = {
      width: POSTER_WIDTH,
      height: POSTER_HEIGHT,
      camera: { home: HOME, target: TARGET, fov: FOV },
      anchors,
    };
    writeFileSync(join(assetsDir, 'heart/anchors.json'), `${JSON.stringify(json, null, 2)}\n`);
    console.log(
      `hero-poster.webp: ${(webp.byteLength / 1024).toFixed(0)} KB, ${Object.keys(anchors).length} anchors`,
    );
  }
} finally {
  await browser.close();
  server.close();
}
