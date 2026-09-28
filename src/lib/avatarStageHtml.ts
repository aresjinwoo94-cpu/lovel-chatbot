// ARCHIVO GENERADO por scripts/build-stage.mjs a partir de avatar-stage/stage.html. No editar a mano.
export const AVATAR_STAGE_HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<title>Lovel House · Avatar</title>
<!--
  Escenario del avatar de Lovel House.
  Muestra un modelo VRM (el formato de VRoid que usan los VTubers) con
  sombreado anime (MToon), sobre una escena de fondo pintada a mano.
  Lo usa la app dentro de un WebView (móvil) o un iframe (web).

  Mensajes que acepta (postMessage con JSON):
    { type: 'appearance', appearance: {...}, modelBaseUrl: '...', framing: 'bust'|'face', shape: 'rect'|'circle' }
    { type: 'state', mood: 'idle'|'thinking'|'speaking'|'happy', speaking: bool }
    { type: 'snapshot' }  → responde { type: 'snapshot', dataUrl }
  Mensajes que envía: { type: 'ready' }, { type: 'loaded' }, { type: 'error', message }
-->
<!-- Compatibilidad con navegadores sin "import maps" (iOS antiguos) -->
<script async src="https://cdn.jsdelivr.net/npm/es-module-shims@1.10.0/dist/es-module-shims.js"></script>
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/",
  "@pixiv/three-vrm": "https://cdn.jsdelivr.net/npm/@pixiv/three-vrm@3.5.5/lib/three-vrm.module.min.js"
} }
</script>
<style>
  html, body { margin: 0; height: 100%; overflow: hidden; background: transparent; }
  #bg, #gl { position: fixed; inset: 0; width: 100%; height: 100%; }
  #loading { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; }
  #loading i { width: 18%; max-width: 38px; aspect-ratio: 1; border-radius: 50%; border: 3px solid rgba(255,255,255,.35); border-top-color: #fff; animation: spin 0.9s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
<canvas id="bg"></canvas>
<canvas id="gl"></canvas>
<div id="loading"><i></i></div>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

// ------------------------------------------------------------------ puente con la app
const send = (msg) => {
  const s = JSON.stringify(msg);
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
  else if (window.parent !== window) window.parent.postMessage(s, '*');
  else if (window.__onStageMessage) window.__onStageMessage(msg); // pruebas automáticas
};

// ------------------------------------------------------------------ escena de fondo (pintada)
const bg = document.getElementById('bg');
function mix(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
function paintBackground(colors) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = (bg.width = Math.round(innerWidth * dpr));
  const h = (bg.height = Math.round(innerHeight * dpr));
  const g = bg.getContext('2d');
  const [top, mid, horizon] = colors.length >= 3 ? colors : [colors[0], mix(colors[0], colors[1], 0.5), colors[1]];
  const hy = h * 0.8; // línea del horizonte
  const sky = g.createLinearGradient(0, 0, 0, hy);
  sky.addColorStop(0, top); sky.addColorStop(0.55, mid); sky.addColorStop(1, horizon);
  g.fillStyle = sky; g.fillRect(0, 0, w, hy);
  // estrellas en cielos oscuros
  const lum = (() => { const p = [1, 3, 5].map((i) => parseInt(top.slice(i, i + 2), 16)); return (0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]) / 255; })();
  if (lum < 0.45) {
    let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 60; i++) { g.globalAlpha = 0.35 + rnd() * 0.6; g.fillStyle = '#fff'; g.beginPath(); g.arc(rnd() * w, rnd() * hy * 0.45, (0.5 + rnd() * 1.2) * dpr, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
  }
  // nubes alargadas, suaves
  const streak = (y, thick, color, alpha, wave) => {
    g.save(); g.globalAlpha = alpha; g.fillStyle = color; g.filter = \`blur(\${Math.max(1, thick * 0.35)}px)\`;
    g.beginPath(); g.moveTo(-w * 0.1, y);
    g.bezierCurveTo(w * 0.3, y - wave, w * 0.6, y + wave, w * 1.1, y - wave * 0.5);
    g.lineTo(w * 1.1, y - wave * 0.5 + thick);
    g.bezierCurveTo(w * 0.6, y + wave + thick * 0.6, w * 0.3, y - wave + thick * 1.2, -w * 0.1, y + thick);
    g.closePath(); g.fill(); g.restore();
  };
  streak(hy * 0.12, h * 0.035, mix(mid, '#ffffff', 0.25), 0.25, h * 0.02);
  streak(hy * 0.26, h * 0.05, mix(top, '#000000', 0.25), 0.45, h * 0.03);
  streak(hy * 0.42, h * 0.04, mix(mid, '#ffffff', 0.35), 0.3, h * 0.025);
  streak(hy * 0.58, h * 0.06, mix(mid, '#000000', 0.2), 0.35, h * 0.03);
  streak(hy * 0.74, h * 0.035, mix(horizon, '#ffffff', 0.4), 0.45, h * 0.02);
  streak(hy * 0.88, h * 0.025, mix(horizon, '#ffffff', 0.5), 0.5, h * 0.012);
  // resplandor del horizonte
  const glow = g.createRadialGradient(w * 0.5, hy, 0, w * 0.5, hy, w * 0.9);
  glow.addColorStop(0, mix(horizon, '#ffffff', 0.55)); glow.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = 0.55; g.fillStyle = glow; g.fillRect(0, hy - h * 0.2, w, h * 0.4); g.globalAlpha = 1;
  // agua / suelo con reflejos
  const water = g.createLinearGradient(0, hy, 0, h);
  water.addColorStop(0, mix(horizon, '#ffffff', 0.25)); water.addColorStop(1, mix(horizon, '#000000', 0.35));
  g.fillStyle = water; g.fillRect(0, hy, w, h - hy);
  g.fillStyle = mix(horizon, '#ffffff', 0.6);
  let s2 = 3; const r2 = () => ((s2 = (s2 * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 40; i++) { g.globalAlpha = 0.25 + r2() * 0.4; g.fillRect(r2() * w, hy + r2() * (h - hy), (4 + r2() * 26) * dpr, 1.2 * dpr); }
  g.globalAlpha = 1;
  // siluetas en el horizonte
  const sil = mix(mix(top, mid, 0.3), '#000000', 0.55);
  g.fillStyle = sil;
  g.beginPath(); g.moveTo(0, hy + 2); g.bezierCurveTo(w * 0.1, hy - h * 0.035, w * 0.22, hy - h * 0.03, w * 0.35, hy + 2); g.fill();
  g.beginPath(); g.moveTo(w * 0.62, hy + 2); g.bezierCurveTo(w * 0.75, hy - h * 0.045, w * 0.9, hy - h * 0.05, w, hy - h * 0.02); g.lineTo(w, hy + 2); g.fill();
  for (const [x, hh] of [[0.86, 0.11], [0.91, 0.075], [0.8, 0.06], [0.06, 0.06]]) {
    g.beginPath(); g.moveTo(w * x - h * 0.02, hy + 2); g.lineTo(w * x, hy - h * hh); g.lineTo(w * x + h * 0.02, hy + 2); g.fill();
  }
}

// ------------------------------------------------------------------ 3D
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 20);
const light = new THREE.DirectionalLight(0xffffff, 1.9);
light.position.set(0.5, 1.4, 1.6);
scene.add(light, new THREE.AmbientLight(0xffffff, 0.45));

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  if (current.appearance) paintBackground(current.appearance.background);
  frame();
}
addEventListener('resize', resize);

// ------------------------------------------------------------------ recoloreado (como en VRoid)
const originalImages = new WeakMap();
/** Cambia el color de una textura conservando sus luces y sombras (luminancia × color). */
function recolor(material, hex, strength = 1) {
  const map = material.map;
  if (!map || !map.image) { if (material.color) material.color.set(hex); return; }
  if (!originalImages.has(material)) originalImages.set(material, map.image);
  const img = originalImages.get(material);
  const c = document.createElement('canvas');
  const W = (c.width = img.width), H = (c.height = img.height);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, W, H); const px = d.data;
  const tr = parseInt(hex.slice(1, 3), 16), tg = parseInt(hex.slice(3, 5), 16), tb = parseInt(hex.slice(5, 7), 16);
  // luminancia media para normalizar (así un pelo oscuro también se puede aclarar)
  let sum = 0, n = 0;
  for (let i = 0; i < px.length; i += 16) { if (px[i + 3] > 10) { sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]; n++; } }
  const avg = Math.max(1, sum / Math.max(1, n));
  for (let i = 0; i < px.length; i += 4) {
    const l = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / avg; // 1 = tono medio
    const k = Math.min(1.6, l);
    const nr = Math.min(255, tr * k), ng = Math.min(255, tg * k), nb = Math.min(255, tb * k);
    px[i] = px[i] + (nr - px[i]) * strength;
    px[i + 1] = px[i + 1] + (ng - px[i + 1]) * strength;
    px[i + 2] = px[i + 2] + (nb - px[i + 2]) * strength;
  }
  g.putImageData(d, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = map.colorSpace; tex.flipY = map.flipY; tex.wrapS = map.wrapS; tex.wrapT = map.wrapT;
  tex.needsUpdate = true;
  material.map = tex;
  if (material.shadeMultiplyTexture) material.shadeMultiplyTexture = tex;
  if (material.color) material.color.set(0xffffff);
  if (material.shadeColorFactor) material.shadeColorFactor.set(new THREE.Color(hex).multiplyScalar(0.75).lerp(new THREE.Color(0xffffff), 0.35));
  material.needsUpdate = true;
}

const category = (name) => {
  const n = (name || '').toUpperCase();
  if (n.includes('HAIR')) return 'hair';
  if (n.includes('EYEIRIS') || n.includes('IRIS')) return 'iris';
  if (n.includes('SKIN') || n.includes('BODY') || n.includes('FACE_00') || n === 'FACE') return 'skin';
  if (n.includes('TOPS') || n.includes('ONEPIECE') || n.includes('CLOTH') || n.includes('OUTER') || n.includes('ACCESSORY')) return 'cloth';
  return 'other';
};

function applyAppearance(vrm, a) {
  vrm.scene.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      const cat = category(m.name);
      if (cat === 'hair' && a.hairColor) recolor(m, a.hairColor);
      else if (cat === 'iris' && a.eyeColor) recolor(m, a.eyeColor);
      else if (cat === 'skin' && a.skinTone) recolor(m, a.skinTone, 0.55);
      else if (cat === 'cloth' && a.outfitColor && /TOPS|ONEPIECE|OUTER/i.test(m.name)) recolor(m, a.outfitColor, 0.9);
      if (/HAIRBACK/i.test(m.name)) o.visible = !a.shortHair;
    }
  });
}

// ------------------------------------------------------------------ carga del modelo
const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));
const current = { vrm: null, modelUrl: null, appearance: null, mood: 'idle', speaking: false, framing: 'bust' };

function frameCamera(vrm) {
  const head = vrm.humanoid.getNormalizedBoneNode('head');
  const p = new THREE.Vector3(); head.getWorldPosition(p);
  if (current.framing === 'face') {
    // Primer plano (foto de perfil del chat)
    camera.position.set(0, p.y + 0.01, 1.2);
    camera.lookAt(new THREE.Vector3(0, p.y - 0.04, 0));
  } else {
    // Busto con hombros (como la referencia)
    camera.position.set(0, p.y - 0.06, 1.9);
    camera.lookAt(new THREE.Vector3(0, p.y - 0.12, 0));
  }
}

function relaxPose(vrm) {
  const b = (n) => vrm.humanoid.getNormalizedBoneNode(n);
  // brazos abajo, relajados (VRM 0.x y 1.0 usan orientaciones opuestas)
  const sgn = vrm.meta?.metaVersion === '0' ? 1 : -1;
  b('leftUpperArm').rotation.z = 1.22 * sgn; b('rightUpperArm').rotation.z = -1.22 * sgn;
  b('leftLowerArm').rotation.z = 0.12 * sgn; b('rightLowerArm').rotation.z = -0.12 * sgn;
  b('leftUpperArm').rotation.x = 0.08; b('rightUpperArm').rotation.x = 0.08;
}

async function loadModel(url, appearance) {
  document.getElementById('loading').style.display = 'flex';
  const gltf = await loader.loadAsync(url);
  const vrm = gltf.userData.vrm;
  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.combineSkeletons(gltf.scene);
  VRMUtils.rotateVRM0(vrm);
  vrm.scene.traverse((o) => { o.frustumCulled = false; });
  if (current.vrm) { scene.remove(current.vrm.scene); VRMUtils.deepDispose(current.vrm.scene); }
  scene.add(vrm.scene);
  current.vrm = vrm;
  current.modelUrl = url;
  relaxPose(vrm);
  vrm.update(0);
  // El pelo tiene física (spring bones): la reiniciamos en la pose relajada y la
  // dejamos asentarse antes de mostrar el avatar, para que no aparezca "volando".
  vrm.springBoneManager?.setInitState();
  vrm.springBoneManager?.reset();
  for (let i = 0; i < 120; i++) vrm.update(1 / 60);
  frameCamera(vrm);
  if (vrm.lookAt) vrm.lookAt.target = camera;
  applyAppearance(vrm, appearance);
  document.getElementById('loading').style.display = 'none';
  send({ type: 'loaded' });
}

// ------------------------------------------------------------------ animación
const clock = new THREE.Clock();
let nextBlink = 1.5, blinkT = -1, talk = 0, talkTarget = 0, nextSyll = 0, nod = 0, smile = 0;
function frame() {
  const vrm = current.vrm;
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (vrm) {
    const em = vrm.expressionManager;
    const b = (n) => vrm.humanoid.getNormalizedBoneNode(n);
    // parpadeo natural
    if (t > nextBlink && blinkT < 0) blinkT = 0;
    if (blinkT >= 0) {
      blinkT += dt;
      const v = blinkT < 0.07 ? blinkT / 0.07 : blinkT < 0.14 ? 1 : Math.max(0, 1 - (blinkT - 0.14) / 0.08);
      em?.setValue('blink', v);
      if (blinkT > 0.22) { blinkT = -1; nextBlink = t + 2 + Math.random() * 3.5; }
    }
    // labios al hablar
    const speaking = current.speaking || current.mood === 'speaking';
    if (speaking && t > nextSyll) { talkTarget = 0.25 + Math.random() * 0.75; nextSyll = t + 0.08 + Math.random() * 0.1; }
    if (!speaking) talkTarget = 0;
    talk += (talkTarget - talk) * Math.min(1, dt * 18);
    em?.setValue('aa', talk * 0.8);
    em?.setValue('oh', speaking ? talk * 0.25 * (Math.sin(t * 7) * 0.5 + 0.5) : 0);
    // expresión
    // En VRoid, "happy" cierra los ojos al sonreír: lo usamos con suavidad.
    const wantSmile = current.mood === 'happy' ? 0.45 : speaking ? 0.1 : 0;
    smile += (wantSmile - smile) * Math.min(1, dt * 4);
    em?.setValue('happy', smile);
    em?.setValue('relaxed', current.mood === 'thinking' ? 0.5 : 0);
    // cabeza y respiración
    const thinking = current.mood === 'thinking';
    nod += ((speaking ? 1 : 0) - nod) * Math.min(1, dt * 3);
    b('spine').rotation.x = Math.sin(t * 1.6) * 0.012;
    b('chest') && (b('chest').rotation.x = Math.sin(t * 1.6 + 0.5) * 0.01);
    b('neck').rotation.y = Math.sin(t * 0.5) * 0.05;
    b('head').rotation.z = thinking ? 0.13 : Math.sin(t * 0.7) * 0.03;
    b('head').rotation.x = (thinking ? -0.06 : 0) + nod * Math.sin(t * 6) * 0.05;
    b('head').rotation.y = Math.sin(t * 0.37) * 0.04;
    em?.update();
    vrm.update(dt);
  }
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(frame);

// ------------------------------------------------------------------ mensajes
async function handle(msg) {
  if (msg.type === 'appearance') {
    const a = msg.appearance;
    const model = a.model || 'shibu';
    const url = /^https?:/.test(model) ? model : \`\${msg.modelBaseUrl}/\${model}.vrm\`;
    if (msg.shape === 'circle') document.documentElement.style.clipPath = 'circle(50% at 50% 50%)';
    if (msg.framing && msg.framing !== current.framing) { current.framing = msg.framing; if (current.vrm) frameCamera(current.vrm); }
    const prev = current.appearance;
    current.appearance = a;
    paintBackground(a.background || ['#2E1446', '#C8284F', '#F7923A']);
    try {
      if (!current.vrm || current.modelUrl !== url) await loadModel(url, a);
      else if (JSON.stringify({ ...prev, background: 0 }) !== JSON.stringify({ ...a, background: 0 })) applyAppearance(current.vrm, a);
    } catch (e) {
      send({ type: 'error', message: String(e && e.message || e) });
    }
  } else if (msg.type === 'state') {
    current.mood = msg.mood || 'idle';
    current.speaking = !!msg.speaking;
  } else if (msg.type === 'snapshot') {
    // Ojos abiertos en la foto (nunca a mitad de un parpadeo)
    if (current.vrm?.expressionManager) {
      blinkT = -1; nextBlink = clock.elapsedTime + 2;
      current.vrm.expressionManager.setValue('blink', 0);
      current.vrm.expressionManager.update();
    }
    frame();
    const out = document.createElement('canvas');
    out.width = 512; out.height = 512;
    const g = out.getContext('2d');
    const s = Math.min(bg.width, bg.height);
    g.drawImage(bg, (bg.width - s) / 2, (bg.height - s) / 2, s, s, 0, 0, 512, 512);
    const s2 = Math.min(canvas.width, canvas.height);
    g.drawImage(canvas, (canvas.width - s2) / 2, (canvas.height - s2) / 2, s2, s2, 0, 0, 512, 512);
    send({ type: 'snapshot', dataUrl: out.toDataURL('image/jpeg', 0.9) });
  }
}
const onMessage = (e) => { try { handle(typeof e.data === 'string' ? JSON.parse(e.data) : e.data); } catch {} };
window.addEventListener('message', onMessage);
document.addEventListener('message', onMessage);
window.__lovel = { handle };
resize();
send({ type: 'ready' });
</script>
</body>
</html>
`;
