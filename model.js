import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const container = document.getElementById("model");

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearAlpha(0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

// --- Scene & camera ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 1, 1e7);

// --- Lights (fixed to the world so the mountain stays evenly lit while we orbit) ---
scene.add(new THREE.HemisphereLight(0xffffff, 0x55503f, 1.6));
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const key = new THREE.DirectionalLight(0xffffff, 2.6);
key.position.set(3, 6, 4);
scene.add(key);
const fill = new THREE.DirectionalLight(0xcfe0ff, 1.0);
fill.position.set(-4, 2, -3);
scene.add(fill);

// --- Orbit state ---
const BASE_SPEED = 0.3; // rad/s, constant idle orbit speed
let velocity = BASE_SPEED; // current angular velocity
let angle = 0; // current orbit angle around the mountain
let orbitR = 1; // camera distance from the axis
let orbitH = 0; // camera height
let pitchDrop = 0; // aim below the crater to lift the peak up in frame
const summit = new THREE.Vector3(); // crater centre — kept centered horizontally
const lookTarget = new THREE.Vector3();
let ready = false;

// --- Load model ---
const loader = new GLTFLoader();

loader.load(
  "assets/mount_fuji.glb",
  (gltf) => {
    const model = gltf.scene;
    // Loaded scene is Z-up (height along world Z). Instead of rotating the model,
    // we orbit the camera about the world Z axis with up = +Z (see tick()).

    // Hide the enclosing base cube; keep only the terrain
    let terrain = null;
    model.traverse((o) => {
      if (!o.isMesh) return;
      if (/cube/i.test(o.name)) {
        o.visible = false;
        return;
      }
      terrain = o;
      if (o.material) {
        o.material.side = THREE.DoubleSide;
        if ("metalness" in o.material) o.material.metalness = 0;
        if ("roughness" in o.material) o.material.roughness = 0.95;
      }
    });

    // Center the mountain at the origin.
    // updateMatrixWorld is required before measuring, otherwise the box reports
    // the raw (pre-node-transform) FBX scale instead of true world size.
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(terrain || model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    scene.add(model);
    model.updateMatrixWorld(true);

    // Find the crater centre (жерло) in world space — this stays pinned to the
    // panel centre. The highest vertex sits on the crater rim, so instead we take
    // the centroid of the whole summit region (the rim ring around the crater).
    const mesh = terrain || model;
    const pos = mesh.geometry.attributes.position;
    const v = new THREE.Vector3();

    let maxY = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      if (v.y > maxY) maxY = v.y;
    }
    const rimThreshold = maxY - size.y * 0.04; // top sliver = the crater rim
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      if (v.y >= rimThreshold) {
        sx += v.x; sy += v.y; sz += v.z; n++;
      }
    }
    summit.set(sx / n, sy / n, sz / n);

    // Camera orbit framing (Y-up world: footprint is X/Z, height is Y)
    const horiz = Math.max(size.x, size.z);
    const fovRad = (camera.fov * Math.PI) / 180;
    orbitR = (horiz / 2 / Math.tan(fovRad / 2)) * 0.72; // closer to the mountain
    orbitH = orbitR * 0.36; // lower camera, ~20° above horizon (shallower angle)
    pitchDrop = orbitR * 0.16; // raise the peak toward the upper third of the panel
    camera.near = orbitR / 100;
    camera.far = orbitR * 10;
    camera.updateProjectionMatrix();

    ready = true;
    resize();
  },
  undefined,
  (err) => console.error("GLB load error", err)
);

// --- Wheel: orbit faster (impulse decays back to BASE_SPEED) ---
window.addEventListener(
  "wheel",
  (e) => {
    velocity += -e.deltaY * 0.0015;
  },
  { passive: true }
);

// --- Resize ---
function resize() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

// --- Animation loop: orbit the camera around the mountain ---
const clock = new THREE.Clock();
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  // Ease velocity back toward the base idle speed
  velocity += (BASE_SPEED - velocity) * Math.min(1, dt * 1.2);
  angle += velocity * dt;

  if (ready) {
    // Orbit around the summit's vertical axis, always aiming at the peak so it
    // stays pinned to the centre of the panel while the mountain spins.
    camera.position.set(
      summit.x + Math.sin(angle) * orbitR,
      orbitH,
      summit.z + Math.cos(angle) * orbitR
    );
    lookTarget.set(summit.x, summit.y - pitchDrop, summit.z);
    camera.lookAt(lookTarget);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
