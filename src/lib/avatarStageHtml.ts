// ARCHIVO GENERADO por scripts/build-stage.mjs a partir de avatar-stage/stage.html. No editar a mano.
export const AVATAR_STAGE_HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<title>Lovel House · Personaje</title>
<!--
  Escenario 3D del personaje de Lovel House.
  Modelos VRM (el formato de VRoid que usan los VTubers) con sombreado anime (MToon).
  Lo usa la app dentro de un WebView (móvil) o un iframe (web).

  Mensajes que acepta (postMessage con JSON):
    { type: 'look', look: {...}, modelBaseUrl, framing: 'bust'|'face'|'portrait', transparent?: bool }
    { type: 'state', mood: 'idle'|'thinking'|'listening'|'speaking'|'happy'|'offline', emotion?: 'happy'|'sad'|'surprised'|'shy'|null }
    { type: 'snapshot', framing?, size? | width & height }  → responde { type: 'snapshot', dataUrl }
  Envía: { type: 'ready' } · { type: 'loaded' } · { type: 'error', message } · { type: 'fps', fps } (cada 3 s)

  Aspecto (look): modelo, peinado, colores de pelo (+ puntas), ojos, piel, ropa
  por piezas, maquillaje y marcas, expresión, pose, cabeza (inclinación, giro,
  tamaño), accesorios por zonas, fondo, luz, efecto de ambiente, contorno y brillo.
-->
<script async src="https://cdn.jsdelivr.net/npm/es-module-shims@1.10.0/dist/es-module-shims.js"></script>
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.min.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/",
  "@pixiv/three-vrm": "https://cdn.jsdelivr.net/npm/@pixiv/three-vrm@3.5.5/lib/three-vrm.module.min.js"
} }
</script>
<style>
  /* misma preferencia de esquema que la app: si no, Chrome pinta el iframe de blanco en oscuro */
  :root { color-scheme: light dark; }
  html, body { margin: 0; height: 100%; overflow: hidden; background: transparent; }
  #gl { position: fixed; inset: 0; width: 100%; height: 100%; }
  /* Acabado de ilustración: viñeta suave y grano de papel (capas baratas sobre el lienzo). */
  #vignette, #grain { position: fixed; inset: 0; pointer-events: none; }
  #vignette { background: radial-gradient(ellipse 75% 70% at 50% 42%, transparent 58%, rgba(24,14,34,.30) 100%); }
  #grain { opacity: .07; background-size: 160px 160px; }
  body.light #vignette { background: radial-gradient(ellipse 75% 70% at 50% 42%, transparent 62%, rgba(60,40,70,.12) 100%); }
  body.nofx #vignette, body.nofx #grain, body.lowfx #grain, body.lowfx #vignette { display: none; }
  #loading { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; }
  #loading i { width: 22px; height: 22px; border-radius: 50%; border: 2px solid rgba(111,91,211,.2); border-top-color: #6F5BD3; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
<canvas id="gl"></canvas>
<div id="vignette"></div><div id="grain"></div>
<div id="loading"><i></i></div>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

// ------------------------------------------------------------------ puente con la app
const send = (msg) => {
  const s = JSON.stringify(msg);
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
  else if (window.parent !== window) window.parent.postMessage(s, '*');
  if (window.__onStageMessage) window.__onStageMessage(msg); // pruebas automáticas
};

// Fondos de estudio: degradado suave (centro, borde).
const BACKDROPS = {
  lilac: ['#EEEAF9', '#DDD6F2'], blush: ['#F7ECEF', '#ECD9E0'], cream: ['#F5F1EA', '#E6DED1'],
  peach: ['#F7EDE5', '#ECDACC'], sky: ['#ECF1F8', '#D8E2EF'], mint: ['#EAF3EE', '#D3E6DB'],
  twilight: ['#E2DBF4', '#C9BDEB'], night: ['#34303F', '#1F1C27'],
  white: ['#FFFFFF', '#EEEDEB'], studio: ['#EDEDEF', '#D3D3D8'], sakura: ['#FBEFF4', '#F0CFDC'],
  sunset: ['#FBE6D6', '#E7B4B9'], ocean: ['#E3F2F3', '#B7D9DE'], forest: ['#E4EDE3', '#B9CDB8'],
  midnight: ['#2E3552', '#141A2D'], wine: ['#4A2433', '#24111A'],
};

// Iluminación: luz principal, relleno, contorno y ambiente.
const LIGHTS = {
  // Ilustración anime (por defecto): luz principal cálida lateral, relleno frío suave y un
  // contorno de luz de color (según el fondo) que separa la figura. Sombreado menos plano.
  illustrated: { key: [0xffe0c2, 1.6], fill: [0xb9c9ff, 0.4], rim: [0xffb8d8, 1.3], amb: [0xfff2ea, 0.36], keyPos: [-1.55, 1.3, 1.15], fillPos: [1.5, 0.45, 1.3], rimPos: [1.0, 1.4, -1.5], toony: 0.7, shift: 0.04, illustrated: true },
  // Luz de stream VTuber: frontal y plana, sombra anime limpia, casi sin contorno.
  vtuber: { key: [0xfffaf6, 1.5], fill: [0xf3f0ff, 0.4], rim: [0xffffff, 0.35], amb: [0xffffff, 0.85], keyPos: [0.25, 0.9, 2.2], toony: 0.97, shift: 0.18 },
  studio: { key: [0xfff6ee, 2.1], fill: [0xdcd6ff, 0.55], rim: [0xffffff, 1.2], amb: [0xffffff, 0.42] },
  soft: { key: [0xffffff, 1.45], fill: [0xfff8f4, 0.85], rim: [0xffffff, 0.7], amb: [0xffffff, 0.72] },
  warm: { key: [0xffd8ae, 2.0], fill: [0xffe8d8, 0.5], rim: [0xffc283, 1.5], amb: [0xfff0e2, 0.45] },
  cool: { key: [0xe4eeff, 2.0], fill: [0xc6d6ff, 0.62], rim: [0xb5d2ff, 1.6], amb: [0xeef3ff, 0.45] },
  sunset: { key: [0xffcaa8, 1.85], fill: [0xc4b0ff, 0.6], rim: [0xff9cc0, 1.6], amb: [0xffeae2, 0.42] },
  night: { key: [0xa9b6ff, 1.25], fill: [0x6f5bd3, 0.65], rim: [0x9fd0ff, 2.1], amb: [0x8890c0, 0.38] },
  dramatic: { key: [0xffffff, 2.7], fill: [0xffffff, 0.12], rim: [0xffffff, 2.3], amb: [0xffffff, 0.18] },
};

// ------------------------------------------------------------------ 3D
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 20);

const key = new THREE.DirectionalLight(0xfff6ee, 2.1);
key.position.set(-0.7, 1.5, 1.6);
const fill = new THREE.DirectionalLight(0xdcd6ff, 0.55);
fill.position.set(1.2, 0.4, 1.0);
const rim = new THREE.DirectionalLight(0xffffff, 1.2);
rim.position.set(0.4, 1.2, -1.6);
const ambient = new THREE.AmbientLight(0xffffff, 0.42);
scene.add(key, fill, rim, ambient);

const KEY_POS = [-0.7, 1.5, 1.6], FILL_POS = [1.2, 0.4, 1.0], RIM_POS = [0.4, 1.2, -1.6];
// Color del contorno de luz en la iluminación ilustrada: sale del propio fondo.
const RIM_TINT = { dusk: 0xffa6c4, aurora: 0x92f0dc, starry: 0xb9a8ff, city: 0xff92c9, dawn: 0xffc4a6, room: 0xffc995, night: 0xa9b8ff, midnight: 0x9fb2ff, wine: 0xff9cb8 };
const lightingOf = (look) => LIGHTS[look?.lighting] || LIGHTS.illustrated;
const rimTint = (look) => RIM_TINT[look?.background] ?? 0xd8ccff;
function setLighting(look) {
  const L = lightingOf(look);
  key.position.set(...(L.keyPos || KEY_POS));
  fill.position.set(...(L.fillPos || FILL_POS));
  rim.position.set(...(L.rimPos || RIM_POS));
  key.color.setHex(L.key[0]); key.intensity = L.key[1];
  fill.color.setHex(L.fill[0]); fill.intensity = L.fill[1];
  rim.color.setHex(L.illustrated ? rimTint(look) : L.rim[0]); rim.intensity = L.rim[1];
  ambient.color.setHex(L.amb[0]); ambient.intensity = L.amb[1];
}

// Fondos ilustrados: cielo pintado tipo acuarela (degradado, nubes redondas y difusas,
// luces bokeh). Sin siluetas oscuras ni franjas. Cada uno conserva su paleta.
const PAINTED = {
  dusk: { sky: ['#2B1F4A', '#7B3F86', '#D9677F', '#F2A58A'], cloud: '#F6C2B4', glow: '#FFD2B8', bokeh: ['255,206,170', '255,170,200'], stars: 26 },
  aurora: { sky: ['#14213D', '#25406B', '#3E7C8F', '#9AD3C6'], cloud: '#BFF0E2', glow: '#C9F5E6', bokeh: ['190,240,226', '160,200,255'], stars: 60 },
  starry: { sky: ['#0E1024', '#1C1F45', '#3A2F6B', '#6A4C8C'], cloud: '#8E7CC3', glow: '#B7A6EE', bokeh: ['200,180,255', '150,170,255'], stars: 130 },
  city: { sky: ['#1A1630', '#2E2350', '#5B3B72', '#B0628A'], cloud: '#E39AB4', glow: '#FFB3CC', bokeh: ['255,200,150', '255,150,200', '180,170,255'], stars: 18, cityLights: true },
  dawn: { sky: ['#F7D6C9', '#F5C1C9', '#D9C3EE', '#BFD3F2'], cloud: '#FFFFFF', glow: '#FFF3EA', bokeh: ['255,255,255', '255,214,200'], stars: 0, light: true },
  room: { room: true },
};

/** Azar con semilla: el mismo fondo se pinta igual siempre (también en los retratos). */
function seeded(str) {
  let a = 0; for (let i = 0; i < str.length; i++) a = (a * 31 + str.charCodeAt(i)) | 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** Mancha redonda y difusa (base de nubes y bokeh). */
function blob(g, x, y, r, color, a) {
  const grd = g.createRadialGradient(x, y, 0, x, y, r);
  grd.addColorStop(0, color.startsWith('#') ? rgba(color, a) : \`rgba(\${color},\${a})\`);
  grd.addColorStop(0.55, color.startsWith('#') ? rgba(color, a * 0.55) : \`rgba(\${color},\${a * 0.55})\`);
  grd.addColorStop(1, color.startsWith('#') ? rgba(color, 0) : \`rgba(\${color},0)\`);
  g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
}

function paintBackdrop(g, W, H, P, id = '') {
  const rnd = seeded(id || 'x');
  if (P.room) {
    // Habitación acogedora desenfocada: pared, ventana con luz y bokeh cálido.
    const wall = g.createLinearGradient(0, 0, 0, H); wall.addColorStop(0, '#3B2E45'); wall.addColorStop(1, '#2A2133');
    g.fillStyle = wall; g.fillRect(0, 0, W, H);
    const win = g.createLinearGradient(0, H * 0.1, 0, H * 0.6); win.addColorStop(0, '#6E5C9C'); win.addColorStop(1, '#C88BA8');
    g.fillStyle = win; g.fillRect(W * 0.58, H * 0.12, W * 0.32, H * 0.46);
    g.fillStyle = 'rgba(40,30,50,0.9)'; g.fillRect(W * 0.735, H * 0.12, W * 0.012, H * 0.46); g.fillRect(W * 0.58, H * 0.345, W * 0.32, H * 0.01);
    const floor = g.createLinearGradient(0, H * 0.7, 0, H); floor.addColorStop(0, 'rgba(31,24,38,0)'); floor.addColorStop(1, 'rgba(31,24,38,0.95)');
    g.fillStyle = floor; g.fillRect(0, H * 0.7, W, H * 0.3);
    for (let i = 0; i < 38; i++) {
      const x = rnd() * W, y = rnd() * H * 0.75, r = 6 + rnd() * 26;
      blob(g, x, y, r, ['255,198,140', '255,170,200', '200,170,255'][i % 3], 0.55);
    }
    return;
  }
  // 1) cielo: degradado vertical de la paleta
  const sky = g.createLinearGradient(0, 0, 0, H);
  P.sky.forEach((c, i) => sky.addColorStop(i / (P.sky.length - 1), c));
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  // 2) resplandor suave en el horizonte (sin línea dura)
  const hz = H * 0.74;
  const glow = g.createRadialGradient(W * 0.5, hz, 0, W * 0.5, hz, W * 0.75);
  glow.addColorStop(0, rgba(P.glow, P.light ? 0.55 : 0.4)); glow.addColorStop(1, rgba(P.glow, 0));
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  // 3) estrellas pequeñas y suaves en la parte alta
  for (let i = 0; i < P.stars; i++) {
    const x = rnd() * W, y = rnd() * H * 0.55, r = 0.8 + rnd() * 1.6;
    g.fillStyle = \`rgba(255,255,255,\${0.25 + rnd() * 0.55})\`; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  // 4) nubes de acuarela: racimos de manchas redondas, más densas abajo
  const clouds = 7;
  for (let c = 0; c < clouds; c++) {
    const cx = (c + 0.5 + (rnd() - 0.5) * 0.8) * (W / clouds);
    // en fondos claros, las nubes no se acumulan detrás del cuerpo (la ropa clara se perdería)
    const cy = H * (0.18 + rnd() * (P.light ? 0.4 : 0.62));
    const size = W * (0.07 + rnd() * 0.08) * (0.7 + (cy / H) * 0.6);
    const puffs = 6 + Math.floor(rnd() * 6);
    for (let k = 0; k < puffs; k++) {
      const dx = (rnd() - 0.5) * size * 3.2, dy = (rnd() - 0.5) * size * 0.9;
      blob(g, cx + dx, cy + dy, size * (0.7 + rnd() * 0.8), P.cloud, (P.light ? 0.35 : 0.3) * (0.6 + rnd() * 0.5));
    }
  }
  // 5) luces lejanas de ciudad: bokeh cálido cerca del horizonte (en vez de edificios)
  if (P.cityLights) {
    const band = g.createLinearGradient(0, hz - H * 0.12, 0, hz + H * 0.12);
    band.addColorStop(0, 'rgba(255,190,150,0)'); band.addColorStop(0.5, 'rgba(255,190,150,0.28)'); band.addColorStop(1, 'rgba(255,190,150,0)');
    g.fillStyle = band; g.fillRect(0, hz - H * 0.12, W, H * 0.24);
    for (let i = 0; i < 46; i++) {
      const x = rnd() * W, y = hz - H * 0.06 + rnd() * H * 0.16, r = 12 + rnd() * 18;
      blob(g, x, y, r, P.bokeh[i % P.bokeh.length], 0.45 + rnd() * 0.35);
    }
  }
  // 6) bokeh suave por todo el cielo
  for (let i = 0; i < 26; i++) {
    const x = rnd() * W, y = rnd() * H * 0.9, r = 10 + rnd() * 34;
    blob(g, x, y, r, P.bokeh[i % P.bokeh.length], (P.light ? 0.3 : 0.18) + rnd() * 0.15);
  }
  // 7) suelo de luz: el tercio bajo se aclara en neblina (sin silueta)
  const mist = g.createLinearGradient(0, hz - H * 0.08, 0, H);
  mist.addColorStop(0, rgba(P.glow, 0)); mist.addColorStop(1, rgba(P.glow, P.light ? 0.45 : 0.22));
  g.fillStyle = mist; g.fillRect(0, hz - H * 0.08, W, H);
}

/** Desenfoque barato del fondo (profundidad de campo): se reduce y se vuelve a ampliar. Una sola vez por fondo. */
function softBlur(c, factor) {
  const s = document.createElement('canvas');
  s.width = Math.round(c.width / factor); s.height = Math.round(c.height / factor);
  const sg = s.getContext('2d'); sg.imageSmoothingQuality = 'high'; sg.drawImage(c, 0, 0, s.width, s.height);
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.clearRect(0, 0, c.width, c.height); g.drawImage(s, 0, 0, c.width, c.height);
}

let backdropTex = null;
function setBackdrop(id, transparent) {
  const light = PAINTED[id] ? !!PAINTED[id].light : !['night', 'midnight', 'wine'].includes(id);
  document.body.classList.toggle('light', light);
  document.body.classList.toggle('nofx', !!transparent);
  if (transparent) { scene.background = null; return; }
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  if (PAINTED[id]) {
    c.width = c.height = 1024;
    paintBackdrop(g, 1024, 1024, PAINTED[id], id);
    softBlur(c, PAINTED[id].room ? 4 : 2);
  } else {
    const [c1, c2] = BACKDROPS[id] || BACKDROPS.lilac;
    c.width = c.height = 512;
    const grad = g.createRadialGradient(256, 200, 20, 256, 256, 400);
    grad.addColorStop(0, c1); grad.addColorStop(1, c2);
    g.fillStyle = grad; g.fillRect(0, 0, 512, 512);
  }
  backdropTex?.dispose();
  backdropTex = new THREE.CanvasTexture(c);
  backdropTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = backdropTex;
}

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / Math.max(1, innerHeight);
  camera.updateProjectionMatrix();
  if (current.vrm) frameCamera();
}
addEventListener('resize', resize);

// ------------------------------------------------------------------ recoloreado (como en VRoid)
const originals = new WeakMap();
/**
 * Cambia el color de una textura conservando sus luces y sombras y, si se pide,
 * pinta encima (maquillaje). \`key\` evita repetir el trabajo si nada cambió.
 */
function retexture(material, { hex = null, strength = 1, paint = null, key = '', flat = 0 } = {}) {
  const map = material.map;
  const want = hex || paint ? \`\${hex}|\${strength}|\${key}|\${flat}\` : '';
  if ((material.userData.lovelKey || '') === want) return;
  if (!want && !originals.has(material)) return;
  if (!originals.has(material)) originals.set(material, { image: map?.image, color: material.color?.clone(), shade: material.shadeColorFactor?.clone() });
  material.userData.lovelKey = want;
  const orig = originals.get(material);
  if (!want) {
    if (orig.image && map) { const tex = new THREE.Texture(orig.image); copyTex(tex, map); material.map = tex; if (material.shadeMultiplyTexture) material.shadeMultiplyTexture = tex; }
    if (orig.color) material.color.copy(orig.color);
    if (orig.shade && material.shadeColorFactor) material.shadeColorFactor.copy(orig.shade);
    material.needsUpdate = true;
    return;
  }
  if (!map || !orig.image) { if (hex) material.color?.set(hex); return; }
  const img = orig.image;
  const c = document.createElement('canvas');
  const W = (c.width = img.width), H = (c.height = img.height);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  if (hex) {
    const d = g.getImageData(0, 0, W, H); const px = d.data;
    const tr = parseInt(hex.slice(1, 3), 16), tg = parseInt(hex.slice(3, 5), 16), tb = parseInt(hex.slice(5, 7), 16);
    let sum = 0, n = 0;
    for (let i = 0; i < px.length; i += 16) { if (px[i + 3] > 10) { sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]; n++; } }
    const avg = Math.max(1, sum / Math.max(1, n));
    for (let i = 0; i < px.length; i += 4) {
      let l = Math.min(1.6, (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / avg);
      if (flat) l = 1 + (l - 1) * (1 - flat); // tela lisa: borra estampados y detalles
      px[i] += (Math.min(255, tr * l) - px[i]) * strength;
      px[i + 1] += (Math.min(255, tg * l) - px[i + 1]) * strength;
      px[i + 2] += (Math.min(255, tb * l) - px[i + 2]) * strength;
    }
    g.putImageData(d, 0, 0);
  }
  if (paint) paint(g, W, H);
  const tex = new THREE.CanvasTexture(c);
  copyTex(tex, map);
  material.map = tex;
  if (material.shadeMultiplyTexture) material.shadeMultiplyTexture = tex;
  if (hex) {
    if (material.color) material.color.set(0xffffff);
    if (material.shadeColorFactor) material.shadeColorFactor.set(new THREE.Color(hex).multiplyScalar(0.72).lerp(new THREE.Color(0xffffff), 0.3));
  } else {
    if (orig.color) material.color.copy(orig.color);
    if (orig.shade && material.shadeColorFactor) material.shadeColorFactor.copy(orig.shade);
  }
  material.needsUpdate = true;
}
function copyTex(tex, from) { tex.colorSpace = from.colorSpace; tex.flipY = from.flipY; tex.wrapS = from.wrapS; tex.wrapT = from.wrapT; tex.needsUpdate = true; }

const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const rgba = (hex, a) => { const [r, g, b] = rgb(hex); return \`rgba(\${r},\${g},\${b},\${a})\`; };

/**
 * Maquillaje y marcas sobre la textura de la cara. Todos los rostros de VRoid
 * comparten el mismo mapa UV: ojos ≈ (0.35, 0.555) y (0.665, 0.555),
 * mejillas ≈ (0.31, 0.66) y (0.69, 0.66), boca ≈ (0.5, 0.765).
 */
// Bocas dibujadas con forma propia (labios a dos tonos): no se retocan.
const MOUTH_KEEP = new Set(['bibi', 'vita']);
const MALE_BODIES = new Set(['hair_m', 'fumiriya']);

/**
 * Boca en reposo cerrada y natural (WP-10). Las texturas de cara de VRoid traen un punto de
 * brillo blanco bajo la línea de la boca (de lejos parece la boca entreabierta o una segunda
 * línea) y, en los cuerpos masculinos, una línea muy larga, gruesa y naranja. Aquí:
 *  - el brillo se borra con la piel de arriba y abajo de esa misma columna;
 *  - la línea se suaviza (menos contraste, tono labio en vez de naranja) y se afina hacia
 *    las comisuras, con un largo máximo, para que acabe en punta y no en un bloque.
 * Se detecta en la propia textura, así que sirve para cualquier modelo con el mapa de VRoid.
 */
function cleanMouth(g, W, H) {
  const x0 = Math.floor(W * 0.36), x1 = Math.ceil(W * 0.64), y0 = Math.floor(H * 0.725), y1 = Math.ceil(H * 0.835);
  const w = x1 - x0, h = y1 - y0;
  const d = g.getImageData(x0, y0, w, h); const px = d.data;
  const at = (i, j) => (j * w + i) * 4;
  const L = (k) => 0.299 * px[k] + 0.587 * px[k + 1] + 0.114 * px[k + 2];
  // piel de referencia: la fila de abajo del todo (barbilla, sin boca ni brillo)
  let sr = 0, sg = 0, sb = 0;
  for (let i = 0; i < w; i++) { const k = at(i, h - 1); sr += px[k]; sg += px[k + 1]; sb += px[k + 2]; }
  const skin = [sr / w, sg / w, sb / w];
  const skinL = 0.299 * skin[0] + 0.587 * skin[1] + 0.114 * skin[2];
  const skinB = skin[2] / skin[0];

  // 1) la línea: filas y columnas claramente más oscuras que la piel
  let minX = w, maxX = -1, lineY = -1, best = 0;
  for (let j = 0; j < h; j++) {
    let n = 0;
    for (let i = 0; i < w; i++) if (skinL - L(at(i, j)) > 40) { n++; minX = Math.min(minX, i); maxX = Math.max(maxX, i); }
    if (n > best) { best = n; lineY = j; }
  }
  if (lineY < 0 || best < w * 0.05) { g.putImageData(d, x0, y0); return; }
  const cx = (minX + maxX) / 2, half = (maxX - minX) / 2;

  // 2) el brillo: píxeles casi blancos (mucho azul para su rojo) justo debajo de la línea.
  //    Se rellena cada fila interpolando entre la piel de su izquierda y de su derecha.
  const hx0 = Math.max(0, Math.floor(cx - W * 0.05)), hx1 = Math.min(w - 1, Math.ceil(cx + W * 0.05));
  const hy0 = lineY + 2, hy1 = Math.min(h - 2, lineY + Math.ceil(H * 0.05));
  const isHi = (i, j) => { const k = at(i, j); return px[k + 2] / Math.max(1, px[k]) > skinB + 0.04 && L(k) > skinL - 12; };
  for (let j = hy0; j <= hy1; j++) {
    let i = hx0;
    while (i <= hx1) {
      if (!isHi(i, j)) { i++; continue; }
      let e = i; while (e <= hx1 && isHi(e, j)) e++;
      const a = Math.max(0, i - 5), b = Math.min(w - 1, e + 4); // más ancho: el borde suavizado del brillo
      const ka = at(a, j), kb = at(b, j);
      for (let x = a + 1; x < b; x++) {
        const t = (x - a) / (b - a), k = at(x, j);
        for (let c = 0; c < 3; c++) px[k + c] = px[ka + c] * (1 - t) + px[kb + c] * t;
      }
      i = e + 1;
    }
  }

  // 3) la línea: tono labio en vez de naranja y afinada hacia las comisuras, con largo máximo.
  //    La piel de cada columna es la de justo encima y debajo de la línea (no la de la barbilla).
  const reach = Math.min(half, W * 0.05);
  const lip = [160, 88, 84];
  const pad = Math.max(6, Math.round(H * 0.016));
  const ya = Math.max(0, lineY - pad), yb = Math.min(h - 1, lineY + pad);
  for (let j = ya + 1; j < yb; j++) for (let i = 0; i < w; i++) {
    const k = at(i, j), l = L(k);
    const t = (j - ya) / (yb - ya), ka = at(i, ya), kb = at(i, yb);
    const skin = [0, 1, 2].map((c) => px[ka + c] * (1 - t) + px[kb + c] * t);
    const dark = 0.299 * skin[0] + 0.587 * skin[1] + 0.114 * skin[2] - l;
    if (dark <= 3) continue;
    const along = Math.abs(i - cx) / Math.max(1, reach); // 0 centro … 1 comisura
    const taper = along >= 1 ? 0 : along < 0.5 ? 1 : 1 - Math.pow((along - 0.5) / 0.5, 1.5);
    const tone = Math.min(1, dark / 80) * 0.5;
    for (let c = 0; c < 3; c++) {
      const v = px[k + c] + (lip[c] * (l / 140) - px[k + c]) * tone;
      px[k + c] = skin[c] + (v - skin[c]) * taper;
    }
  }
  g.putImageData(d, x0, y0);
}

/**
 * Iris (y su brillo) más pequeños: las texturas de VRoid traen los dos ojos lado a lado sobre
 * fondo transparente; cada mitad se encoge alrededor de su propio centro.
 */
function shrinkEyes(k) {
  if (Math.abs(k - 1) < 0.001) return null;
  return (g, W, H) => {
    const copy = document.createElement('canvas'); copy.width = W; copy.height = H;
    copy.getContext('2d').drawImage(g.canvas, 0, 0);
    const a = g.getImageData(0, 0, W, H).data;
    g.clearRect(0, 0, W, H);
    for (const [hx0, hx1] of [[0, W / 2], [W / 2, W]]) {
      let sx = 0, sy = 0, n = 0;
      for (let y = 0; y < H; y += 4) for (let x = Math.floor(hx0); x < hx1; x += 4) { const al = a[(y * W + x) * 4 + 3]; if (al > 60) { sx += x * al; sy += y * al; n += al; } }
      if (!n) { g.drawImage(copy, hx0, 0, hx1 - hx0, H, hx0, 0, hx1 - hx0, H); continue; }
      const cx = sx / n, cy = sy / n;
      g.save(); g.beginPath(); g.rect(hx0, 0, hx1 - hx0, H); g.clip();
      g.translate(cx, cy); g.scale(k, k); g.translate(-cx, -cy);
      g.drawImage(copy, hx0, 0, hx1 - hx0, H, hx0, 0, hx1 - hx0, H);
      g.restore();
    }
  };
}

function paintFace(look) {
  const blush = Math.max(0, Math.min(1, +look.blush || 0));
  const marks = Array.isArray(look.marks) ? look.marks : [];
  const mouth = !MOUTH_KEEP.has(look.model);
  if (!mouth && !ageFace(look).contour && !ageFace(look).stubble && !blush && !look.lipColor && !look.eyeshadow && !marks.length) return null;
  return (g, W, H) => {
    const X = (x) => x * W, Y = (y) => y * H;
    if (mouth) cleanMouth(g, W, H);
    const soft = (cx, cy, rx, ry, color, alpha, op = 'source-over') => {
      g.save(); g.globalCompositeOperation = op;
      g.translate(X(cx), Y(cy)); g.scale(1, ry / rx);
      const grd = g.createRadialGradient(0, 0, 0, 0, 0, X(rx));
      grd.addColorStop(0, rgba(color, alpha)); grd.addColorStop(1, rgba(color, 0));
      g.fillStyle = grd; g.beginPath(); g.arc(0, 0, X(rx), 0, Math.PI * 2); g.fill(); g.restore();
    };
    // edad: sombra muy suave bajo los pómulos y hacia la mandíbula (cara más definida)
    const contour = ageFace(look).contour;
    if (contour) for (const cx of [0.25, 0.75]) soft(cx, 0.72, 0.075, 0.11, '#B88270', 0.3 * contour, 'multiply');
    // hombres de 35+: sombra de barba muy leve en barbilla y mandíbula
    if (ageFace(look).stubble && MALE_BODIES.has(look.model)) {
      // a lo largo de la mandíbula, no alrededor de la boca; tono gris neutro (no verdoso)
      for (const cx of [0.3, 0.7]) soft(cx, 0.8, 0.075, 0.05, '#9A9090', 0.22, 'multiply');
      soft(0.5, 0.855, 0.09, 0.03, '#9A9090', 0.24, 'multiply');
    }
    if (look.eyeshadow) for (const cx of [0.352, 0.662]) soft(cx, 0.527, 0.09, 0.045, look.eyeshadow, 0.85, 'multiply');
    if (blush) for (const cx of [0.315, 0.688]) soft(cx, 0.655, 0.075, 0.045, '#F07C98', 0.5 * blush);
    if (look.lipColor) {
      // Solo los píxeles del labio (más oscuros que la piel de alrededor).
      const x0 = Math.floor(X(0.43)), y0 = Math.floor(Y(0.742)), w = Math.ceil(X(0.14)), h = Math.ceil(Y(0.05));
      const d = g.getImageData(x0, y0, w, h); const px = d.data;
      const ref = g.getImageData(Math.floor(X(0.5)), Math.floor(Y(0.725)), 1, 1).data;
      const refL = 0.299 * ref[0] + 0.587 * ref[1] + 0.114 * ref[2];
      const [lr, lg, lb] = rgb(look.lipColor);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const nx = (i / w - 0.5) * 2, ny = (j / h - 0.5) * 2;
        if (nx * nx + ny * ny > 1) continue;
        const k = (j * w + i) * 4;
        const l = 0.299 * px[k] + 0.587 * px[k + 1] + 0.114 * px[k + 2];
        const amt = Math.max(0, Math.min(1, (refL - l) / 45)) * (1 - (nx * nx + ny * ny) * 0.6);
        const f = l / 170;
        px[k] += (Math.min(255, lr * f) - px[k]) * amt; px[k + 1] += (Math.min(255, lg * f) - px[k + 1]) * amt; px[k + 2] += (Math.min(255, lb * f) - px[k + 2]) * amt;
      }
      g.putImageData(d, x0, y0);
    }
    const dot = (x, y, r, color) => { g.fillStyle = color; g.beginPath(); g.arc(X(x), Y(y), X(r), 0, Math.PI * 2); g.fill(); };
    const line = (pts, color, width) => { g.strokeStyle = color; g.lineWidth = X(width); g.lineCap = 'round'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.stroke(); };
    if (marks.includes('freckles')) {
      const spots = [[0.395, 0.63], [0.41, 0.645], [0.38, 0.648], [0.425, 0.635], [0.4, 0.662], [0.37, 0.635], [0.415, 0.668], [0.435, 0.652]];
      for (const [x, y] of spots) { dot(x, y, 0.0032, 'rgba(160,96,70,0.55)'); dot(1 - x, y + 0.002, 0.0032, 'rgba(160,96,70,0.55)'); }
    }
    if (marks.includes('mole')) dot(0.705, 0.632, 0.0058, 'rgba(70,40,36,0.85)');
    if (marks.includes('blush_lines')) for (const cx of [0.315, 0.688]) for (let i = -1; i <= 1; i++) line([[cx + i * 0.018 - 0.006, 0.648], [cx + i * 0.018 + 0.006, 0.668]], 'rgba(224,110,140,0.75)', 0.0035);
    if (marks.includes('star')) {
      g.save(); g.translate(X(0.345), Y(0.628)); g.fillStyle = '#F2B84B'; g.beginPath();
      for (let i = 0; i < 10; i++) { const r = X(i % 2 ? 0.011 : 0.026); const a = -Math.PI / 2 + (i * Math.PI) / 5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      g.closePath(); g.fill(); g.restore();
    }
    if (marks.includes('heart')) {
      g.save(); g.translate(X(0.345), Y(0.628)); const s = X(0.017); g.fillStyle = '#E26D8F'; g.beginPath();
      g.moveTo(0, s * 0.9); g.bezierCurveTo(-s * 1.6, -s * 0.2, -s * 0.7, -s * 1.3, 0, -s * 0.45); g.bezierCurveTo(s * 0.7, -s * 1.3, s * 1.6, -s * 0.2, 0, s * 0.9); g.fill(); g.restore();
    }
    if (marks.includes('tear')) {
      g.save(); g.translate(X(0.655), Y(0.622)); const s = X(0.011); g.fillStyle = 'rgba(70,90,150,0.85)'; g.beginPath();
      g.moveTo(0, -s * 1.6); g.quadraticCurveTo(s * 1.1, 0, 0, s); g.quadraticCurveTo(-s * 1.1, 0, 0, -s * 1.6); g.fill(); g.restore();
    }
    if (marks.includes('scar')) {
      line([[0.6, 0.6], [0.73, 0.69]], 'rgba(170,80,80,0.75)', 0.006);
      for (const t of [0.3, 0.5, 0.7]) { const x = 0.6 + 0.13 * t, y = 0.6 + 0.09 * t; line([[x - 0.008, y + 0.01], [x + 0.008, y - 0.01]], 'rgba(176,96,96,0.5)', 0.003); }
    }
    if (marks.includes('whiskers')) for (const side of [-1, 1]) for (const dy of [-0.014, 0, 0.014]) {
      const x0 = side < 0 ? 0.27 : 0.73, x1 = side < 0 ? 0.37 : 0.63;
      line([[x0, 0.672 + dy * 1.4], [x1, 0.668 + dy]], 'rgba(90,60,60,0.55)', 0.0028);
    }
  };
}

// Degradado en las puntas del pelo: se inyecta en el shader MToon (sin recompilar al cambiar de color).
function prepareHairTip(m) {
  if (m.userData.tip) return;
  const u = { uTipColor: { value: new THREE.Color(1, 1, 1) }, uTipOn: { value: 0 }, uTipTop: { value: 1 }, uTipBottom: { value: 0 } };
  m.userData.tip = u;
  // MToon ya usa onBeforeCompile (define la versión de three): lo encadenamos.
  const prev = m.onBeforeCompile;
  const prevKey = m.customProgramCacheKey;
  m.onBeforeCompile = (shader, r) => {
    prev?.call(m, shader, r);
    Object.assign(shader.uniforms, u);
    if (!shader.vertexShader.includes('#include <skinning_vertex>') || !shader.fragmentShader.includes('#include <dithering_fragment>')) return;
    shader.vertexShader = 'varying float vLovelY;\\n' + shader.vertexShader.replace('#include <skinning_vertex>', '#include <skinning_vertex>\\nvLovelY = (modelMatrix * vec4(transformed, 1.0)).y;');
    shader.fragmentShader = 'varying float vLovelY;\\nuniform vec3 uTipColor;\\nuniform float uTipOn;\\nuniform float uTipTop;\\nuniform float uTipBottom;\\n' +
      shader.fragmentShader.replace('#include <dithering_fragment>', \`
        if (uTipOn > 0.5) {
          float k = clamp((uTipTop - vLovelY) / max(uTipTop - uTipBottom, 0.001), 0.0, 1.0);
          k = k * k * (3.0 - 2.0 * k);
          vec3 W = vec3(0.299, 0.587, 0.114);
          float l = dot(gl_FragColor.rgb, W);
          vec3 tgt = clamp(uTipColor * (0.5 + 0.85 * l), 0.0, 1.0);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, tgt, k * 0.92);
        }
        #include <dithering_fragment>\`);
  };
  m.customProgramCacheKey = () => (prevKey ? prevKey.call(m) : '') + '|lovel-hairtip';
  m.needsUpdate = true;
}

const category = (name) => {
  const n = (name || '').toUpperCase();
  if (n.includes('HAIR')) return 'hair';
  if (n.includes('EYEIRIS') || n.includes('IRIS')) return 'iris';
  if (n.includes('EYEHIGHLIGHT')) return 'highlight';
  if (n.includes('FACEBROW')) return 'brow';
  if (n.includes('FACE_00_SKIN') || n === 'FACE') return 'face';
  if (n.includes('_SKIN') || n === 'BODY' || n.includes('BODY_00')) return 'skin';
  if (/TOPS|ONEPI|ONEPICE|OUTER|DRESS/.test(n)) return 'top';
  if (n.includes('BOTTOMS')) return 'bottom';
  if (n.includes('SHOES')) return 'shoes';
  if (n.includes('ACCESSORY')) return 'accent';
  return 'other';
};

function eachMaterial(root, fn) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) fn(m, o);
  });
}

/** Contorno de luz (rim) y líneas de contorno según el gusto. */
function applyFinish(look) {
  const shine = look.shine == null ? 0.2 : Math.max(0, Math.min(1, +look.shine));
  const outline = look.outline || 'normal';
  const L = lightingOf(look);
  const ill = !!L.illustrated;
  for (const root of [current.vrm?.scene, current.hairVrm?.scene].filter(Boolean)) {
    eachMaterial(root, (m) => {
      // Sombreado anime: corte de sombra (casi plano en VTuber, con más volumen en ilustración).
      if (m.shadingToonyFactor != null) {
        if (m.userData.toony0 == null) { m.userData.toony0 = m.shadingToonyFactor; m.userData.shift0 = m.shadingShiftFactor; }
        m.shadingToonyFactor = L.toony ?? m.userData.toony0;
        m.shadingShiftFactor = m.userData.shift0 + (L.shift || 0);
      }
      if (m.parametricRimColorFactor) {
        if (ill) {
          // contorno de luz de color (no blanco): siempre algo presente, más con "brillo"
          m.parametricRimColorFactor.setHex(rimTint(look)).multiplyScalar(0.16 + shine * 0.9);
          m.parametricRimFresnelPowerFactor = 4 - shine;
          m.parametricRimLiftFactor = 0.04 + shine * 0.05;
        } else {
          m.parametricRimColorFactor.setHex(0xf1ecff).multiplyScalar(shine * 2);
          m.parametricRimFresnelPowerFactor = 5 - shine * 1.5;
          m.parametricRimLiftFactor = 0.02 + shine * 0.06;
        }
      }
      if (m.outlineWidthFactor != null) {
        if (m.userData.outline0 == null) {
          m.userData.outline0 = m.outlineWidthFactor;
          m.userData.outlineColor0 = m.outlineColorFactor?.clone();
          m.userData.outlineMix0 = m.outlineLightingMixFactor;
        }
        const o = m.userData.outline0;
        // ilustración: línea más fina y teñida con el color oscuro del propio material
        const normal = ill ? o * 0.55 : o;
        m.outlineWidthFactor = outline === 'none' ? 0 : outline === 'bold' ? Math.max(o * 3.5, 0.0025) : normal;
        if (m.outlineColorFactor) {
          if (ill) { const k = outline === 'bold' ? 0.14 : 0.36; m.outlineColorFactor.setRGB(k, k * 0.85, k); m.outlineLightingMixFactor = 1; }
          else { if (m.userData.outlineColor0) m.outlineColorFactor.copy(m.userData.outlineColor0); m.outlineLightingMixFactor = m.userData.outlineMix0 ?? m.outlineLightingMixFactor; }
        }
      }
    });
  }
}

function applyColors(look) {
  const targets = [current.vrm?.scene, current.hairVrm?.scene].filter(Boolean);
  const facePaint = paintFace(look);
  const faceKey = JSON.stringify(['boca1', look.model, ageFace(look).contour, ageFace(look).stubble, look.blush, look.lipColor, look.eyeshadow, look.marks]);
  for (const root of targets) {
    const own = root === current.vrm.scene;
    eachMaterial(root, (m) => {
      const cat = category(m.name);
      if (cat === 'hair') {
        retexture(m, { hex: look.hairColor || null });
        if (m.userData.tip) {
          const on = !!look.hairTip;
          m.userData.tip.uTipOn.value = on ? 1 : 0;
          if (on) { const [r, g, b] = rgb(look.hairTip); m.userData.tip.uTipColor.value.setRGB(r / 255, g / 255, b / 255, THREE.LinearSRGBColorSpace); }
        }
      } else if (!own) return;
      else if (cat === 'iris') retexture(m, { hex: look.eyeColor || null, paint: shrinkEyes(ageFace(look).iris), key: \`iris\${ageFace(look).iris}\` });
      else if (cat === 'brow') retexture(m, { hex: look.hairColor ? shadeHex(look.hairColor, 0.62) : null, strength: 0.85 });
      else if (cat === 'highlight') { m.visible = look.eyeShine !== false; retexture(m, { paint: shrinkEyes(ageFace(look).iris), key: \`iris\${ageFace(look).iris}\` }); }
      else if (cat === 'face') retexture(m, { hex: look.skinTone || null, strength: 0.5, paint: facePaint, key: faceKey });
      else if (cat === 'skin') retexture(m, { hex: look.skinTone || null, strength: 0.5 });
      else if (cat === 'top') retexture(m, { hex: look.outfitColor || (look.plainOutfit ? '#2A2730' : null), strength: look.plainOutfit ? 1 : 0.9, flat: look.plainOutfit ? 0.82 : 0 });
      else if (cat === 'bottom') retexture(m, { hex: look.bottomColor || (look.plainOutfit ? '#2F2B36' : null), strength: look.plainOutfit ? 1 : 0.9, flat: look.plainOutfit ? 0.82 : 0 });
      else if (cat === 'shoes') retexture(m, { hex: look.shoesColor || null, strength: 0.9 });
      else if (cat === 'accent') { m.visible = !look.plainOutfit; retexture(m, { hex: look.accentColor || null, strength: 0.9 }); }
    });
  }
  updateHairTipRange();
}
const shadeHex = (hex, f) => '#' + rgb(hex).map((v) => Math.round(v * f).toString(16).padStart(2, '0')).join('');

/** Altura del pelo (en el mundo) para el degradado de las puntas. */
function updateHairTipRange() {
  const box = new THREE.Box3();
  for (const root of [current.vrm?.scene, current.hairVrm?.scene].filter(Boolean)) {
    root.traverse((o) => { if (o.isMesh && o.visible && isHairMesh(o)) box.expandByObject(o); });
  }
  if (box.isEmpty()) return;
  const top = box.max.y, bottom = box.min.y;
  const start = bottom + (top - bottom) * 0.55;
  for (const root of [current.vrm?.scene, current.hairVrm?.scene].filter(Boolean)) {
    eachMaterial(root, (m) => { if (m.userData.tip) { m.userData.tip.uTipTop.value = start; m.userData.tip.uTipBottom.value = bottom; } });
  }
}

// ------------------------------------------------------------------ carga
const loader = new GLTFLoader();
// Los modelos de vrm-models/v2 llevan la geometría comprimida (EXT_meshopt_compression, sin pérdida).
loader.setMeshoptDecoder(MeshoptDecoder);
loader.register((parser) => new VRMLoaderPlugin(parser));

/**
 * Caché local de modelos (Cache Storage): la segunda vez el personaje no se descarga.
 * Los modelos del catálogo van en carpetas versionadas (vrm-models/v2/…): si cambian, cambia la
 * carpeta, así que aquí se puede servir siempre desde la caché. La app también la llena antes
 * (precarga durante el cuestionario y al abrir con un chat reciente).
 */
const MODEL_CACHE = 'lovel-vrm-v2';
/** Tiempos de la última carga (ms), para medir en un teléfono real: window.__lovelTimings. */
const timings = (window.__lovelTimings = { start: 0, bytes: 0, parse: 0, setup: 0, firstFrame: 0, total: 0, cache: '' });
async function modelBytes(url) {
  if (!/\\/vrm-models\\/v\\d+\\//.test(url) || typeof caches === 'undefined') return null;
  try {
    const cache = await caches.open(MODEL_CACHE);
    let res = await cache.match(url);
    if (!res) {
      res = await fetch(url);
      if (!res.ok) return null;
      await cache.put(url, res.clone());
    }
    return await res.arrayBuffer();
  } catch {
    return null; // sin Cache Storage (p. ej. algún WebView): se descarga como siempre
  }
}
const current = { vrm: null, hairVrm: null, modelUrl: null, hairUrl: null, look: null, mood: 'idle', framing: 'bust', accessories: [], headScale: 1, pose: null };

async function fetchVrm(url) {
  const t0 = performance.now();
  const bytes = await modelBytes(url);
  const t1 = performance.now();
  timings.bytes = Math.max(timings.bytes, Math.round(t1 - t0));
  const gltf = bytes ? await loader.parseAsync(bytes, url.slice(0, url.lastIndexOf('/') + 1)) : await loader.loadAsync(url);
  timings.parse = Math.max(timings.parse, Math.round(performance.now() - t1));
  const vrm = gltf.userData.vrm;
  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.combineSkeletons(gltf.scene);
  VRMUtils.rotateVRM0(vrm);
  vrm.scene.traverse((o) => { o.frustumCulled = false; });
  eachMaterial(vrm.scene, (m) => { if (category(m.name) === 'hair') prepareHairTip(m); });
  return vrm;
}

// ------------------------------------------------------------------ poses
// Valores para el brazo izquierdo de un VRM 0 (el derecho es su espejo).
// \`body\`: reposo natural (peso en una pierna, cadera y hombros con algo de giro, 3/4 suave).
const POSES = {
  relaxed: { u: [0.1, -0.08, 1.3], l: [-0.15, -0.5, 0.12], h: [-0.25, 0.1, -0.15], body: true },
  formal: { u: [0.02, 0, 1.36], l: [0, 0, 0.05], h: [0, 0, 0.1] },
  confident: { u: [0.05, -0.35, 0.78], l: [0, -0.55, 1.55], h: [0, 0, -0.3] },
  shy: { u: [0.15, -0.55, 1.22], l: [0, -1.15, 0.35], h: [0, -0.3, 0] },
  hands_back: { u: [0.05, 0.7, 1.22], l: [0, 1.25, 0.2], h: [0, 0, 0] },
  wave: { u: [0.1, -0.08, 1.3], l: [-0.15, -0.5, 0.12], h: [-0.25, 0.1, -0.15], body: true, turn: 0.06, right: { u: [0, -0.25, 0.45], l: [0, -0.1, -1.9], h: [0, 0, 0] } },
  // La pose de prueba de siempre (brazos rectos), por si alguien la prefiere.
  straight: { u: [0.1, 0, 1.2], l: [0, 0, 0.14], h: [0, 0, 0] },
};
const FINGERS = ['Index', 'Middle', 'Ring', 'Little'];

function applyPose(vrm, pose) {
  if (!vrm) return;
  const b = (n) => vrm.humanoid.getNormalizedBoneNode(n);
  const v0 = vrm.meta?.metaVersion === '0';
  const P = POSES[pose] || POSES.relaxed;
  const set = (node, [x, y, z], mirror) => {
    if (!node) return;
    // espejo: el lado derecho invierte Y y Z; VRM 1 está girado 180° (invierte X y Z).
    let rx = x, ry = mirror ? -y : y, rz = mirror ? -z : z;
    if (!v0) { rx = -rx; rz = -rz; }
    node.rotation.set(rx, ry, rz);
  };
  for (const [side, mirror] of [['left', false], ['right', true]]) {
    const def = side === 'right' && P.right ? P.right : P;
    set(b(\`\${side}UpperArm\`), def.u, mirror);
    set(b(\`\${side}LowerArm\`), def.l, mirror);
    set(b(\`\${side}Hand\`), def.h, mirror);
    // dedos ligeramente curvados (manos naturales, no planas)
    for (const f of FINGERS) for (const seg of ['Proximal', 'Intermediate', 'Distal']) set(b(\`\${side}\${f}\${seg}\`), [0, 0, P.body ? 0.5 : 0.28], mirror);
  }
  // Piernas: el peso cae en la derecha y la rodilla izquierda se relaja.
  const leg = P.body ? { lu: [-0.07, 0, 0.03], ll: [0.16, 0, 0], ru: [0, 0, -0.02], rl: [0, 0, 0] } : { lu: [0, 0, 0], ll: [0, 0, 0], ru: [0, 0, 0], rl: [0, 0, 0] };
  set(b('leftUpperLeg'), leg.lu, false); set(b('leftLowerLeg'), leg.ll, false);
  set(b('rightUpperLeg'), leg.ru, false); set(b('rightLowerLeg'), leg.rl, false);
  vrm.userData = vrm.userData || {};
  vrm.userData.natural = !!P.body;
  vrm.userData.turn = P.body ? (P.turn ?? 0.3) : 0;
  current.pose = pose;
}

const isHairMesh = (o) => {
  const mats = Array.isArray(o.material) ? o.material : [o.material];
  return mats.some((m) => /HAIR/i.test(m.name || ''));
};

function faceWidth(vrm) {
  const box = new THREE.Box3();
  let found = false;
  vrm.scene.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.some((m) => /FACE_00_SKIN|^FACE$/i.test(m.name || ''))) { box.expandByObject(o); found = true; }
  });
  if (!found) return null;
  return box.max.x - box.min.x;
}

/**
 * Peinado de otro modelo VRoid: todos comparten esqueleto, así que el pelo del
 * donante sigue a los huesos de este personaje (copiamos la pose cada fotograma)
 * y conserva su propia física.
 */
// Algunos peinados quedan más atrás en caras ajenas (las cejas asoman por el flequillo): más margen.
const HAIR_FIT = 1.04;
const HAIR_FIT_BY = { vita: 1.09, fumiriya: 1.08, hair_m: 1.08, hair_f: 1.07, victoria: 1.06, noir: 1.06 };
function attachHair(target, donor) {
  donor.scene.traverse((o) => { if (o.isMesh) o.visible = isHairMesh(o); });
  target.scene.traverse((o) => { if (o.isMesh && isHairMesh(o)) o.visible = false; });
  scene.add(donor.scene);
  const pairs = [];
  for (const name of Object.keys(target.humanoid.humanBones)) {
    const t = target.humanoid.getRawBoneNode(name);
    const d = donor.humanoid.getRawBoneNode(name);
    if (t && d) { d.matrixWorldAutoUpdate = false; d.matrixAutoUpdate = false; pairs.push([name, t, d]); }
  }
  const tw = faceWidth(target), dw = faceWidth(donor);
  const ratio = tw && dw ? tw / dw : 1;
  // un pelo prestado queda unos milímetros más atrás que el propio: un 4 % más grande cubre la
  // frente (sin cejas por delante del flequillo) y no deja huecos en la coronilla (QA, WP-5)
  current.headScale = (ratio > 0.86 && ratio < 1.16 ? ratio : 1) * (HAIR_FIT_BY[current.look?.hair] ?? HAIR_FIT);
  current.hairPairs = pairs;
}

const tmp = new THREE.Matrix4();
function followSkeleton() {
  if (!current.hairVrm || !current.hairPairs) return;
  const s = current.headScale;
  for (const [name, t, d] of current.hairPairs) {
    d.matrixWorld.copy(t.matrixWorld);
    if (name === 'head' && s !== 1) d.matrixWorld.multiply(tmp.makeScale(s, s, s));
  }
  current.hairVrm.scene.updateMatrixWorld(true);
}

function settle() {
  for (const v of [current.vrm, current.hairVrm]) { if (!v) continue; v.springBoneManager?.setInitState(); v.springBoneManager?.reset(); }
  for (let i = 0; i < 120; i++) step(1 / 60, 0, true);
}

async function load(look, base) {
  const modelUrl = /^https?:/.test(look.model) ? look.model : \`\${base}/\${look.model}.vrm\`;
  // Peinado prestado: versión "solo pelo" del donante (esqueleto, física, pelo y cara sin
  // expresiones; ~2 MB en lugar de ~5), generada al publicar los modelos (avatar-stage/MODELS.md).
  const hairUrl = look.hair && look.hair !== look.model ? (/^https?:/.test(look.hair) ? look.hair : \`\${base}/\${look.hair}.hair.vrm\`) : null;
  if (current.modelUrl === modelUrl && current.hairUrl === hairUrl) return false;
  Object.assign(timings, { start: performance.now(), bytes: 0, parse: 0, setup: 0, firstFrame: 0, total: 0 });
  document.getElementById('loading').style.display = 'flex';
  const [vrm, hairVrm] = await Promise.all([fetchVrm(modelUrl), hairUrl ? fetchVrm(hairUrl) : null]);
  for (const v of [current.vrm, current.hairVrm]) if (v) { scene.remove(v.scene); VRMUtils.deepDispose(v.scene); }
  current.vrm = vrm; current.hairVrm = hairVrm; current.modelUrl = modelUrl; current.hairUrl = hairUrl; current.hairPairs = null; current.headScale = 1;
  current.accessories = [];
  scene.add(vrm.scene);
  applyPose(vrm, look.pose);
  if (hairVrm) { applyPose(hairVrm, look.pose); attachHair(vrm, hairVrm); }
  applyHeadSize(look);
  vrm.update(0);
  scene.updateMatrixWorld(true);
  followSkeleton();
  settle();
  frameCamera();
  perf.loadedAt = clock.elapsedTime;
  // una emoción que llegó mientras cargaba empieza a contar ahora
  if (current.emotionAt) current.emotionAt = Math.max(current.emotionAt, clock.elapsedTime);
  return true;
}

/**
 * Rasgos por rango de edad (WP-10), siempre adultos. Misma tabla que
 * src/lib/character/ageRanges.ts (face): párpado superior algo más bajo (mirada menos
 * redonda), ojos "naturales" del propio modelo VRoid si los tiene, cabeza un poco más pequeña
 * respecto al cuerpo, un sombreado suave bajo los pómulos que define la cara e iris algo más
 * pequeños (el iris grande es lo que más aniña una cara anime).
 */
const AGE_FACE = {
  '18-22': { lid: 0, natural: 0, head: 1.03, contour: 0, iris: 1.03, stubble: 0 },
  '23-27': { lid: 0.1, natural: 0.25, head: 1, contour: 0.25, iris: 0.95, stubble: 0 },
  '28-34': { lid: 0.2, natural: 0.55, head: 0.96, contour: 0.55, iris: 0.9, stubble: 0 },
  '35+': { lid: 0.36, natural: 1, head: 0.93, contour: 1, iris: 0.86, stubble: 1 },
};
function ageFace(look) {
  const a = +look.age;
  if (!a) return AGE_FACE['23-27'];
  return AGE_FACE[a <= 22 ? '18-22' : a <= 27 ? '23-27' : a <= 34 ? '28-34' : '35+'];
}

function applyHeadSize(look) {
  const s = Math.max(0.86, Math.min(1.16, (+look.headSize || 1) * ageFace(look).head));
  const head = current.vrm?.humanoid.getRawBoneNode('head');
  if (head) head.scale.setScalar(s);
}

// ------------------------------------------------------------------ accesorios 3D
const mat = (c, metal = 0.3, rough = 0.38, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal, ...extra });
const ACC_DEFAULT = { bow: '#E6A0B4', flower: '#F4B6C8', star_clip: '#F2C14E', headphones: '#6F5BD3', choker: '#2B2733', tiara: '#C9B6F2', flower_crown: '#F4B6C8', horns: '#2E2738', angel_wings: '#FFFFFF', demon_wings: '#3B2448', fairy_wings: '#BFE6F2' };

function headMetrics(vrm) {
  const head = vrm.humanoid.getRawBoneNode('head');
  const le = vrm.humanoid.getRawBoneNode('leftEye');
  const re = vrm.humanoid.getRawBoneNode('rightEye');
  const hp = new THREE.Vector3(); head.getWorldPosition(hp);
  const eyes = new THREE.Vector3();
  let eyeDist = 0.064;
  if (le && re) {
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    le.getWorldPosition(a); re.getWorldPosition(b);
    eyes.copy(a).add(b).multiplyScalar(0.5); eyeDist = a.distanceTo(b);
  } else eyes.set(hp.x, hp.y + 0.06, hp.z + 0.08);
  // Los huesos de los ojos no siempre están donde se ven los ojos (p. ej. en algunos VRM 1):
  // el centro y la separación reales salen de la geometría de los iris.
  const irisBox = new THREE.Box3();
  vrm.scene.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (!mats.some((m) => category(m.name) === 'iris')) return;
    const pos = o.geometry.attributes.position; if (!pos) return;
    o.updateWorldMatrix(true, false);
    const v = new THREE.Vector3();
    const stepN = Math.max(1, Math.floor(pos.count / 800));
    for (let i = 0; i < pos.count; i += stepN) { v.fromBufferAttribute(pos, i); if (o.isSkinnedMesh) o.applyBoneTransform(i, v); v.applyMatrix4(o.matrixWorld); irisBox.expandByPoint(v); }
  });
  if (!irisBox.isEmpty()) {
    const w = irisBox.max.x - irisBox.min.x;
    if (w > 0.03 && w < 0.2) {
      eyes.set((irisBox.min.x + irisBox.max.x) / 2, (irisBox.min.y + irisBox.max.y) / 2, Math.max(eyes.z, irisBox.max.z));
      eyeDist = w * 0.68;
    }
  }
  const faceBox = new THREE.Box3();
  vrm.scene.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.some((m) => /FACE_00_SKIN|^FACE$/i.test(m.name || ''))) faceBox.expandByObject(o);
  });
  const front = Math.max(faceBox.isEmpty() ? 0 : faceBox.max.z, eyes.z + eyeDist * 1.15);
  // Plano de las lentes: poco delante de los ojos, como unas gafas reales. Más lejos, en 3/4
  // la montura se ve desplazada respecto a los ojos y sobresale de la cara.
  const lens = eyes.z + eyeDist * 0.3;
  const crown = faceBox.isEmpty() ? hp.y + eyeDist * 2.6 : Math.max(faceBox.max.y, eyes.y + eyeDist * 1.6);
  const halfW = faceBox.isEmpty() ? eyeDist * 1.4 : (faceBox.max.x - faceBox.min.x) / 2;
  // Volumen real del pelo por encima de los ojos (para que nada quede escondido dentro).
  const hairBox = new THREE.Box3();
  for (const root of [vrm.scene, current.hairVrm?.scene].filter(Boolean)) root.traverse((o) => {
    if (!o.isMesh || !o.visible || !isHairMesh(o)) return;
    const pos = o.geometry.attributes.position; if (!pos) return;
    o.updateWorldMatrix(true, false);
    const v = new THREE.Vector3();
    const stepN = Math.max(1, Math.floor(pos.count / 1500));
    for (let i = 0; i < pos.count; i += stepN) { v.fromBufferAttribute(pos, i); o.isSkinnedMesh ? o.applyBoneTransform(i, v) : null; v.applyMatrix4(o.matrixWorld); if (v.y > eyes.y) hairBox.expandByPoint(v); }
  });
  const hairTop = hairBox.isEmpty() ? crown + eyeDist * 0.3 : Math.max(crown, hairBox.max.y);
  const hairHalfW = hairBox.isEmpty() ? halfW * 1.2 : Math.max(halfW, (hairBox.max.x - hairBox.min.x) / 2);
  return { head, eyes, eyeDist, front, lens, crown: hairTop - eyeDist * 0.25, halfW, hairTop, hairHalfW };
}

/** Las piezas se construyen en coordenadas del mundo mirando a +Z y luego se cuelgan del hueso. */
function attachTo(bone, group) {
  const q = new THREE.Quaternion(); bone.getWorldQuaternion(q);
  const inv = q.clone().invert();
  const s = new THREE.Vector3(); bone.getWorldScale(s);
  for (const c of group.children) {
    const wp = c.position.clone();
    c.position.copy(bone.worldToLocal(wp));
    c.quaternion.premultiply(inv);
    c.scale.divide(s);
  }
  bone.add(group);
  current.accessories.push(group);
}

function star(r, inner) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const rr = i % 2 ? inner : r; const a = Math.PI / 2 + (i * Math.PI) / 5; i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  return s;
}
function flowerMesh(size, color) {
  const g = new THREE.Group();
  const petal = mat(color, 0, 0.6);
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(size * 0.55, 12, 8), petal);
    const a = (i / 5) * Math.PI * 2;
    p.scale.set(1, 0.62, 0.35);
    p.position.set(Math.cos(a) * size * 0.62, Math.sin(a) * size * 0.62, 0);
    p.rotation.z = a;
    g.add(p);
  }
  const c = new THREE.Mesh(new THREE.SphereGeometry(size * 0.36, 12, 8), mat('#F6D36B', 0, 0.5));
  c.scale.z = 0.6; c.position.z = size * 0.12; g.add(c);
  return g;
}
function hornGeometry(r, h, bend) {
  const geo = new THREE.ConeGeometry(r, h, 18, 10);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) + h / 2) / h;
    pos.setZ(i, pos.getZ(i) - bend * t * t * h);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Gafas y monóculo van siempre por encima del flequillo (como en la ilustración anime):
 * sin esto, los mechones que caen sobre los ojos atraviesan la montura.
 * Solo tienen montura frontal, así que no se ven "a través" de la cabeza.
 */
function overHair(obj) {
  obj.traverse((o) => {
    if (!o.isMesh) return;
    // pase transparente y al final: el pelo semitransparente se dibuja antes y no tapa la montura
    o.renderOrder = 1000;
    o.material = o.material.clone();
    o.material.transparent = true;
    o.material.depthTest = false;
    o.material.depthWrite = false;
  });
}

// Los accesorios se miden y se colocan con el cuerpo en reposo (mirando al frente): con la
// pose relajada el cuerpo está girado 3/4 y la cabeza no mira a +z, y las cajas de la cara
// (alineadas con los ejes del mundo) quedarían descentradas, con las gafas torcidas.
function buildAccessories(look) {
  const rigs = [current.vrm, current.hairVrm].filter(Boolean);
  const saved = rigs.map((v) => v.humanoid.getNormalizedPose());
  for (const v of rigs) { v.humanoid.resetNormalizedPose(); v.humanoid.update(); }
  try { buildAccessoriesAtRest(look); } finally {
    rigs.forEach((v, i) => { v.humanoid.setNormalizedPose(saved[i]); v.humanoid.update(); });
    scene.updateMatrixWorld(true);
  }
}

function buildAccessoriesAtRest(look) {
  for (const g of current.accessories) g.parent?.remove(g);
  current.accessories = [];
  current.wings = null;
  current.extraTop = 0;
  const vrm = current.vrm;
  const ids = look.accessories || [];
  if (!vrm || !ids.length) return;
  scene.updateMatrixWorld(true);
  const { head, eyes, eyeDist: e, front, lens, crown, halfW, hairTop, hairHalfW } = headMetrics(vrm);
  let extraTop = 0;
  const top = (y) => { extraTop = Math.max(extraTop, y - hairTop); };
  const has = (id) => ids.includes(id);
  const col = (id) => look.accessoryColor || ACC_DEFAULT[id] || '#6F5BD3';
  const W = (x, y, z) => new THREE.Vector3(eyes.x + x, y, z);
  const g = new THREE.Group();
  const put = (mesh, pos, rot) => { mesh.position.copy(pos); if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]); g.add(mesh); return mesh; };

  // --- ojos
  if (has('glasses_round') || has('glasses_square') || has('sunglasses')) {
    const gl = new THREE.Group();
    const r = e * 0.42;
    const round = has('glasses_round');
    const sun = has('sunglasses');
    const frame = mat(sun ? '#141218' : '#2b2733', 0.6, 0.3);
    // montura rectangular de esquinas redondeadas (antes un anillo de 4 lados: en 3/4 se veía torcida)
    const rrect = (w, h, rad) => {
      const sh = new THREE.Shape();
      sh.moveTo(-w / 2 + rad, -h / 2); sh.lineTo(w / 2 - rad, -h / 2); sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + rad);
      sh.lineTo(w / 2, h / 2 - rad); sh.quadraticCurveTo(w / 2, h / 2, w / 2 - rad, h / 2); sh.lineTo(-w / 2 + rad, h / 2);
      sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - rad); sh.lineTo(-w / 2, -h / 2 + rad); sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + rad, -h / 2);
      return sh;
    };
    for (const sx of [-1, 1]) {
      let ring, glass;
      if (round) {
        ring = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.09, 10, 40), frame);
        glass = new THREE.Mesh(new THREE.CircleGeometry(r * 0.96, 32), null);
      } else {
        const w = r * 2.15, h = r * 1.55, t = r * 0.16;
        const outer = rrect(w, h, r * 0.42);
        outer.holes.push(rrect(w - t * 2, h - t * 2, r * 0.3));
        ring = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: r * 0.06, bevelEnabled: false, curveSegments: 6 }), frame);
        glass = new THREE.Mesh(new THREE.ShapeGeometry(rrect(w - t * 2, h - t * 2, r * 0.3), 6), null);
      }
      glass.material = new THREE.MeshStandardMaterial({ color: sun ? 0x1a1820 : 0xffffff, transparent: true, opacity: sun ? 0.86 : 0.12, roughness: 0.05, metalness: sun ? 0.4 : 0 });
      ring.position.set(sx * e * 0.5, 0, 0);
      glass.position.copy(ring.position);
      gl.add(ring, glass);
    }
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.06, r * 0.06, e * 0.2, 8), frame);
    bridge.rotation.z = Math.PI / 2; gl.add(bridge);
    overHair(gl);
    // pegadas al plano de la cara: si flotan delante, al inclinar la cabeza se deslizan sobre los ojos
    put(gl, W(0, eyes.y + 0.003, lens));
  }
  if (has('monocle')) {
    const gold = mat('#D4AF37', 0.85, 0.25);
    const r = e * 0.5;
    const m1 = put(new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.08, 10, 40), gold), W(-e * 0.5, eyes.y, lens));
    const lens = put(new THREE.Mesh(new THREE.CircleGeometry(r * 0.95, 32), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 })), m1.position.clone());
    overHair(m1); overHair(lens);
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(e * 0.012, e * 0.012, e * 1.6, 6), gold);
    put(chain, W(-e * 0.9, eyes.y - e * 0.95, lens + e * 0.07), [0, 0, 0.35]);
  }
  if (has('eyepatch')) {
    const dark = mat('#1d1a22', 0.1, 0.7);
    const patch = new THREE.Mesh(new THREE.SphereGeometry(e * 0.5, 20, 12), dark);
    patch.scale.set(1.05, 0.9, 0.28);
    put(patch, W(e * 0.5, eyes.y, front + e * 0.18));
    for (const [x0, y0] of [[e * 0.95, e * 0.35], [e * 0.95, -e * 0.2]]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(halfW * 1.1, e * 0.05, e * 0.04), dark);
      put(strap, W(x0 - halfW * 0.25, eyes.y + y0, front - e * 0.45), [0, -0.9, y0 > 0 ? 0.25 : -0.2]);
    }
  }
  // --- cabeza (arriba)
  if (has('cat_ears') || has('fox_ears')) {
    const fox = has('fox_ears');
    const color = look.accessoryColor || look.hairColor || (fox ? '#E08A4E' : '#3a3346');
    for (const sx of [-1, 1]) {
      const ear = new THREE.Group();
      const outer = new THREE.Mesh(new THREE.ConeGeometry(e * (fox ? 0.55 : 0.62), e * (fox ? 1.65 : 1.25), fox ? 14 : 3), mat(color, 0, 0.7));
      if (fox) outer.scale.z = 0.5;
      const inner = new THREE.Mesh(new THREE.ConeGeometry(e * (fox ? 0.32 : 0.36), e * (fox ? 1.1 : 0.8), fox ? 12 : 3), mat(fox ? '#FFF4E6' : '#f2b5c5', 0, 0.8));
      inner.position.set(0, -e * 0.15, e * (fox ? 0.12 : 0.16));
      if (fox) inner.scale.z = 0.4;
      ear.add(outer, inner);
      if (fox) { const tip = new THREE.Mesh(new THREE.ConeGeometry(e * 0.2, e * 0.42, 12), mat('#2B2228', 0, 0.7)); tip.scale.z = 0.5; tip.position.y = e * 0.62; ear.add(tip); }
      put(ear, W(sx * halfW * 0.62, crown + e * (fox ? 0.7 : 0.55), eyes.z - e * 0.3), [0, 0, -sx * 0.32]);
      top(crown + e * (fox ? 1.55 : 1.2));
    }
  }
  if (has('bunny_ears')) {
    for (const sx of [-1, 1]) {
      const ear = new THREE.Group();
      const outer = new THREE.Mesh(new THREE.CapsuleGeometry(e * 0.26, e * 1.9, 8, 16), mat(look.accessoryColor || '#F7F4F1', 0, 0.75));
      outer.scale.z = 0.45;
      const inner = new THREE.Mesh(new THREE.CapsuleGeometry(e * 0.15, e * 1.5, 8, 16), mat('#F4B9C9', 0, 0.8));
      inner.scale.z = 0.3; inner.position.z = e * 0.06;
      ear.add(outer, inner);
      put(ear, W(sx * halfW * 0.42, crown + e * 1.35, eyes.z - e * 0.35), [-0.12, 0, -sx * 0.22]);
      top(crown + e * 2.6);
    }
  }
  if (has('horns')) {
    for (const sx of [-1, 1]) {
      const horn = new THREE.Mesh(hornGeometry(e * 0.2, e * 1.05, 0.55), mat(col('horns'), 0.2, 0.35));
      put(horn, W(sx * halfW * 0.55, crown + e * 0.25, eyes.z - e * 0.15), [-0.25, 0, -sx * 0.38]);
      top(crown + e * 0.9);
    }
  }
  if (has('halo')) {
    put(new THREE.Mesh(new THREE.TorusGeometry(e * 1.35, e * 0.09, 12, 60), new THREE.MeshBasicMaterial({ color: look.accessoryColor || 0xffe9a3 })), W(0, hairTop + e * 0.75, eyes.z - e * 0.4), [Math.PI / 2.3, 0, 0]);
    top(hairTop + e * 1.1);
  }
  if (has('tiara')) {
    // Diadema: arco por encima del pelo (visto de frente) con picos y gemas.
    const silver = mat('#ECEAF3', 0.9, 0.18);
    const t = new THREE.Group();
    const cy = eyes.y + e * 0.4;
    const R = (hairTop - cy) * 0.98;
    const arc = Math.PI * 0.62;
    const band = new THREE.Mesh(new THREE.TorusGeometry(R, e * 0.075, 10, 48, arc), silver);
    band.rotation.z = (Math.PI - arc) / 2; t.add(band);
    for (let i = -2; i <= 2; i++) {
      const a = Math.PI / 2 + i * 0.22;
      const len = e * (i === 0 ? 0.7 : Math.abs(i) === 1 ? 0.46 : 0.28);
      const spike = new THREE.Mesh(new THREE.ConeGeometry(e * 0.1, len, 8), silver);
      spike.position.set(Math.cos(a) * (R + len / 2), Math.sin(a) * (R + len / 2), 0);
      spike.rotation.z = a - Math.PI / 2; t.add(spike);
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(e * (i === 0 ? 0.13 : 0.08)), mat(col('tiara'), 0.3, 0.1, { emissive: new THREE.Color(col('tiara')).multiplyScalar(0.3) }));
      gem.position.set(Math.cos(a) * R, Math.sin(a) * R, e * 0.05); t.add(gem);
    }
    t.scale.x = Math.min(1.25, (hairHalfW * 0.95) / Math.max(R * Math.sin(arc / 2), 0.001));
    put(t, W(0, cy, eyes.z - e * 0.1), [-0.32, 0, 0]);
    top(cy + R + e * 0.6);
  }
  if (has('flower_crown')) {
    const fc = new THREE.Group();
    const palette = look.accessoryColor ? [look.accessoryColor] : ['#F4B6C8', '#FFFFFF', '#C9B6F2', '#F6D36B'];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const f = flowerMesh(e * 0.3, palette[i % palette.length]);
      f.position.set(Math.cos(a) * hairHalfW * 0.82, 0, Math.sin(a) * hairHalfW * 0.82);
      f.lookAt(Math.cos(a) * hairHalfW * 3, e * 1.2, Math.sin(a) * hairHalfW * 3);
      fc.add(f);
    }
    put(fc, W(0, hairTop - e * 0.85, eyes.z - e * 0.45), [0.3, 0, 0]);
    top(hairTop + e * 0.1);
  }
  // --- lateral (horquillas)
  const side = (x, y) => W(x * hairHalfW, hairTop - e * y, eyes.z - e * 0.25);
  if (has('bow')) {
    const bw = new THREE.Group();
    const m = mat(col('bow'), 0, 0.55);
    for (const sx of [-1, 1]) { const lobe = new THREE.Mesh(new THREE.SphereGeometry(e * 0.48, 16, 12), m); lobe.scale.set(1.2, 0.72, 0.42); lobe.position.x = sx * e * 0.5; lobe.rotation.z = sx * 0.25; bw.add(lobe); }
    const knot = new THREE.Mesh(new THREE.SphereGeometry(e * 0.2, 12, 10), m); knot.scale.z = 0.7; bw.add(knot);
    put(bw, side(0.62, 0.55), [0, 0.35, -0.45]);
  }
  if (has('flower')) put(flowerMesh(e * 0.42, col('flower')), side(0.64, 0.6), [0, 0.35, -0.3]);
  if (has('star_clip')) {
    const s = new THREE.Mesh(new THREE.ExtrudeGeometry(star(e * 0.38, e * 0.16), { depth: e * 0.06, bevelEnabled: true, bevelSize: e * 0.02, bevelThickness: e * 0.02, bevelSegments: 2 }), mat(col('star_clip'), 0.6, 0.25));
    put(s, side(0.64, 0.6), [0, 0.35, -0.3]);
  }
  // --- orejas
  if (has('headphones')) {
    // las copas van sobre las orejas (ancho de la cara), no al ancho del pelo: si no, flotan
    const r = halfW * 1.12;
    const band = new THREE.Mesh(new THREE.TorusGeometry(r, e * 0.13, 10, 48, Math.PI), mat(0x2f2b38, 0.4));
    band.scale.set(1, (hairTop + e * 0.12 - (eyes.y - e * 0.12)) / r, 1);
    put(band, W(0, eyes.y - e * 0.12, eyes.z - e * 0.55));
    // a la altura de las orejas (algo por debajo de los ojos), pegadas a la cabeza
    for (const sx of [-1, 1]) put(new THREE.Mesh(new THREE.CylinderGeometry(e * 0.5, e * 0.5, e * 0.36, 24), mat(col('headphones'), 0.2)), W(sx * r, eyes.y - e * 0.12, eyes.z - e * 0.55), [0, 0, Math.PI / 2]);
  }
  current.extraTop = extraTop;
  if (g.children.length) attachTo(head, g);

  // --- espalda (alas)
  const wingsId = ['angel_wings', 'demon_wings', 'fairy_wings'].find(has);
  if (wingsId) {
    const chest = vrm.humanoid.getRawBoneNode('upperChest') || vrm.humanoid.getRawBoneNode('chest') || vrm.humanoid.getRawBoneNode('spine');
    const cp = new THREE.Vector3(); chest.getWorldPosition(cp);
    const wg = new THREE.Group();
    const color = col(wingsId);
    const pivots = [];
    for (const sx of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(cp.x + sx * e * 0.8, cp.y + e * 1.5, cp.z - e * 1.7);
      pivot.scale.setScalar(1.55);
      if (wingsId === 'angel_wings') {
        // Silueta de ala con el borde inferior en ondas (plumas), en dos capas.
        const wingShape = (k) => {
          const sh = new THREE.Shape();
          sh.moveTo(0, 0);
          sh.bezierCurveTo(e * 0.8 * k, e * 1.6 * k, e * 2.4 * k, e * 2.9 * k, e * 3.9 * k, e * 2.7 * k);
          sh.quadraticCurveTo(e * 4.1 * k, e * 1.2 * k, e * 3.6 * k, -e * 0.5 * k);
          const lobes = 5;
          for (let i = 0; i < lobes; i++) {
            const x0 = e * k * (3.6 - (i * 3.6) / lobes), x1 = e * k * (3.6 - ((i + 1) * 3.6) / lobes);
            const y0 = -e * k * (0.5 - i * 0.1), y1 = -e * k * (0.5 - (i + 1) * 0.1);
            sh.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - e * 0.55 * k, x1, y1);
          }
          return new THREE.ExtrudeGeometry(sh, { depth: e * 0.05, bevelEnabled: true, bevelSize: e * 0.03, bevelThickness: e * 0.03, bevelSegments: 2 });
        };
        const back = new THREE.Mesh(wingShape(1), mat(color, 0, 0.85, { emissive: new THREE.Color(color).multiplyScalar(0.38) }));
        const front = new THREE.Mesh(wingShape(0.62), mat(shadeHex(color, 0.94), 0, 0.85, { emissive: new THREE.Color(color).multiplyScalar(0.3) }));
        back.scale.x = sx; front.scale.x = sx;
        front.position.set(sx * e * 0.15, e * 0.25, e * 0.1);
        pivot.add(back, front);
      } else if (wingsId === 'demon_wings') {
        const s = new THREE.Shape();
        s.moveTo(0, 0); s.lineTo(e * 3.6, e * 2.2); s.quadraticCurveTo(e * 3.4, e * 0.6, e * 3.8, -e * 0.6);
        s.quadraticCurveTo(e * 2.9, -e * 0.2, e * 2.6, -e * 1.1); s.quadraticCurveTo(e * 1.9, -e * 0.4, e * 1.4, -e * 1.0); s.quadraticCurveTo(e * 1.0, -e * 0.2, 0, 0);
        const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: e * 0.04, bevelEnabled: false }), mat(color, 0.1, 0.55, { side: THREE.DoubleSide }));
        m.scale.x = sx; pivot.add(m);
        const bone = new THREE.Mesh(new THREE.CylinderGeometry(e * 0.07, e * 0.05, e * 4.25, 8), mat(shadeHex(color, 0.6), 0.1, 0.5));
        bone.position.set(sx * e * 1.8, e * 1.1, e * 0.03); bone.rotation.z = -sx * 1.02; pivot.add(bone);
      } else {
        const m = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.72, roughness: 0.2, metalness: 0.3, emissive: new THREE.Color(color).multiplyScalar(0.35), side: THREE.DoubleSide, depthWrite: false });
        for (const [w, h, x, y, rz] of [[1.5, 0.75, 1.4, 0.9, 0.55], [0.95, 0.5, 1.0, -0.5, -0.5]]) {
          const wing = new THREE.Mesh(new THREE.CircleGeometry(e, 40), m);
          wing.scale.set(e * 0 + w * 1.6, h * 1.6, 1);
          wing.position.set(sx * x * e, y * e, 0); wing.rotation.z = sx * rz; pivot.add(wing);
        }
      }
      pivot.rotation.y = sx * -0.35;
      wg.add(pivot);
      pivots.push([pivot, sx]);
    }
    attachTo(chest, wg);
    current.wings = pivots;
  }
}

// ------------------------------------------------------------------ efectos de ambiente (partículas)
function spriteTexture(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.translate(32, 32);
  if (kind === 'star') {
    g.fillStyle = '#fff'; g.beginPath();
    for (let i = 0; i < 8; i++) { const r = i % 2 ? 5 : 30; const a = (i * Math.PI) / 4; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fill();
    const grd = g.createRadialGradient(0, 0, 0, 0, 0, 14); grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grd; g.fillRect(-32, -32, 64, 64);
  } else if (kind === 'petal') {
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -26); g.bezierCurveTo(22, -14, 18, 18, 0, 26); g.bezierCurveTo(-18, 18, -22, -14, 0, -26); g.fill();
  } else if (kind === 'heart') {
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, 22); g.bezierCurveTo(-34, -2, -16, -30, 0, -12); g.bezierCurveTo(16, -30, 34, -2, 0, 22); g.fill();
  } else if (kind === 'ring') {
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 24, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(-9, -9, 5, 0, Math.PI * 2); g.fill();
  } else {
    const grd = g.createRadialGradient(0, 0, 0, 0, 0, 30); grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.35, 'rgba(255,255,255,0.7)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(-32, -32, 64, 64);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const EFFECTS = {
  sparkles: { sprite: 'star', color: '#FFF1BF', n: 60, size: 0.05, vy: 0.02, sway: 0.01, additive: true, twinkle: 3 },
  petals: { sprite: 'petal', color: '#F2A7C0', n: 55, size: 0.05, vy: -0.13, sway: 0.08, spin: true },
  snow: { sprite: 'dot', color: '#FFFFFF', n: 90, size: 0.035, vy: -0.08, sway: 0.04 },
  fireflies: { sprite: 'dot', color: '#FFE38A', n: 40, size: 0.06, vy: 0.01, sway: 0.06, additive: true, twinkle: 1.5 },
  bubbles: { sprite: 'ring', color: '#C9E4FF', n: 34, size: 0.07, vy: 0.08, sway: 0.03 },
  hearts: { sprite: 'heart', color: '#EE8FAE', n: 32, size: 0.05, vy: 0.06, sway: 0.03, twinkle: 1.2 },
};
let fx = null;
function setEffect(id) {
  if (fx && fx.id === id) return;
  if (fx) { scene.remove(fx.points); fx.points.geometry.dispose(); fx.points.material.dispose(); fx = null; }
  const E = EFFECTS[id];
  if (!E) return;
  const pos = new Float32Array(E.n * 3), phase = new Float32Array(E.n);
  for (let i = 0; i < E.n; i++) { phase[i] = Math.random() * Math.PI * 2; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { map: { value: spriteTexture(E.sprite) }, color: { value: new THREE.Color(E.color) }, uTime: { value: 0 }, uSize: { value: E.size }, uTw: { value: E.twinkle || 0 }, uSpin: { value: E.spin ? 1 : 0 }, uPx: { value: renderer.getPixelRatio() * innerHeight } },
    vertexShader: \`attribute float phase; uniform float uTime; uniform float uSize; uniform float uTw; uniform float uPx; varying float vA; varying float vRot;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        float tw = uTw > 0.0 ? 0.45 + 0.55 * sin(uTime * uTw + phase * 3.0) : 1.0; vA = clamp(tw, 0.0, 1.0); vRot = phase + uTime * 0.8;
        gl_PointSize = uSize * uPx * 1.25 * (0.6 + 0.4 * tw) / -mv.z; }\`,
    fragmentShader: \`uniform sampler2D map; uniform vec3 color; uniform float uSpin; varying float vA; varying float vRot;
      void main(){ vec2 p = gl_PointCoord - 0.5; if (uSpin > 0.5) { float c = cos(vRot), s = sin(vRot); p = mat2(c, -s, s, c) * p; }
        vec4 t = texture2D(map, p + 0.5); gl_FragColor = vec4(color, 1.0) * t; gl_FragColor.a *= vA; if (gl_FragColor.a < 0.01) discard; }\`,
    transparent: true, depthWrite: false, blending: E.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  scene.add(points);
  fx = { id, points, E, seeded: false };
}
function updateEffect(dt, t) {
  if (!fx || !current.vrm) return;
  const head = current.vrm.humanoid.getNormalizedBoneNode('head');
  const hp = new THREE.Vector3(); head.getWorldPosition(hp);
  const top = hp.y + 0.45, bottom = hp.y - 0.95;
  const pos = fx.points.geometry.attributes.position;
  const ph = fx.points.geometry.attributes.phase;
  const E = fx.E;
  const respawn = (i, anywhere) => {
    const y = anywhere ? bottom + Math.random() * (top - bottom) : E.vy < 0 ? top : bottom;
    pos.setXYZ(i, (Math.random() - 0.5) * 1.3, y, -0.45 + Math.random() * 0.95);
  };
  if (!fx.seeded) { for (let i = 0; i < E.n; i++) respawn(i, true); fx.seeded = true; }
  for (let i = 0; i < E.n; i++) {
    const p = ph.getX(i);
    let x = pos.getX(i) + Math.sin(t * 0.9 + p) * E.sway * dt;
    let y = pos.getY(i) + E.vy * dt * (0.7 + 0.6 * ((p * 7) % 1));
    pos.setXYZ(i, x, y, pos.getZ(i));
    if (y > top || y < bottom) respawn(i, false);
  }
  pos.needsUpdate = true;
  fx.points.material.uniforms.uTime.value = t;
  fx.points.material.uniforms.uPx.value = renderer.getPixelRatio() * innerHeight;
}

// ------------------------------------------------------------------ encuadre
function frameCamera() {
  const vrm = current.vrm;
  if (!vrm) return;
  const head = vrm.humanoid.getNormalizedBoneNode('head');
  const p = new THREE.Vector3(); head.getWorldPosition(p);
  const portrait = innerHeight > innerWidth * 1.15;
  // Hueco extra arriba si hay orejas, cuernos, diadema…
  const x = Math.min(0.2, current.extraTop || 0);
  if (current.framing === 'avatar') {
    // Foto de perfil pequeña (burbujas, listas): cabeza y un poco de hombros, centrada en los ojos.
    // Si el pelo o las orejas suben mucho (orejas de gato, aletas), se aleja para no cortarlos.
    const { eyes, hairTop } = headMetrics(vrm);
    const cy = eyes.y - 0.03 + x * 0.4;
    const half = Math.max(0.17, hairTop + x - cy + 0.02);
    const dist = half / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.set(0, cy + 0.025, dist);
    camera.lookAt(new THREE.Vector3(0, cy, 0));
  } else if (current.framing === 'face') {
    camera.position.set(0, p.y + 0.03 + x * 0.9, 1.35 + x * 3.2);
    camera.lookAt(new THREE.Vector3(0, p.y + 0.02 + x * 0.9, 0));
  } else if (current.framing === 'portrait' || portrait) {
    camera.position.set(0, p.y - 0.16 + x * 0.6, 2.8 + x * 2);
    camera.lookAt(new THREE.Vector3(0, p.y - 0.25 + x * 0.6, 0));
  } else {
    camera.position.set(0, p.y - 0.04 + x * 0.9, 1.75 + x * 3.2);
    camera.lookAt(new THREE.Vector3(0, p.y - 0.09 + x * 0.9, 0));
  }
}

// ------------------------------------------------------------------ animación y estados
const clock = new THREE.Clock();
let nextBlink = 1.5, blinkT = -1, talk = 0, talkTarget = 0, nextSyll = 0, nod = 0, dim = 0;
// mirada viva: de vez en cuando aparta la vista y vuelve
let nextGlance = 4, glanceEnd = 0, gazeYaw = 0, gazePitch = 0, emoAmt = 0;
const glance = { yaw: 0, pitch: 0 }, NO_GAZE = { yaw: 0, pitch: 0 };
const ex = { happy: 0, angry: 0, sad: 0, relaxed: 0, surprised: 0, blink: 0 };

/** Expresión base (valores de las expresiones estándar de VRM). */
const EXPRESSIONS = {
  neutral: {},
  smile: { relaxed: 0.35, happy: 0.08 }, // boca cerrada: el happy de VRoid separa los labios
  joy: { relaxed: 0.55, happy: 0.3 },
  calm: { relaxed: 0.45 },
  serious: { angry: 0.3 },
  shy: { relaxed: 0.25, sad: 0.18 },
  smug: { relaxed: 0.22, angry: 0.1 },
  sad: { sad: 0.4 },
  surprised: { surprised: 0.38 },
  angry: { angry: 0.5 },
  sleepy: { blink: 0.5, relaxed: 0.15 },
};

/**
 * Emoción del momento (de lo que acaba de decir el personaje): cara y gesto marcados.
 * head.x positivo = baja la cabeza; gaze en grados (pitch positivo = mira abajo).
 */
const EMOTIONS = {
  // alegría = sonrisa de boca cerrada (relaxed) + un poco de happy: el happy de VRoid a tope abre la boca con dientes
  happy: { face: { relaxed: 0.6, happy: 0.3 }, head: { x: -0.04, z: 0.05 } },
  sad: { face: { sad: 0.45 }, head: { x: 0.11, z: -0.04 }, gaze: { yaw: -18, pitch: 34 } },
  surprised: { face: { surprised: 0.38 }, head: { x: -0.07, z: 0 } },
  shy: { face: { relaxed: 0.35, sad: 0.2 }, head: { x: 0.1, z: 0.1 }, gaze: { yaw: 26, pitch: 22 } },
  angry: { face: { angry: 0.5 }, head: { x: 0.03, z: 0 } },
};

// Límites de la cara (QA de personajes, WP-5): ninguna expresión al máximo, y mientras
// habla la emoción se suaviza para que boca de emoción + boca de habla no se deformen.
const FACE_CAP = { happy: 0.45, angry: 0.55, sad: 0.48, relaxed: 0.65, surprised: 0.4, blink: 1 };
const FACE_TOTAL = 1.0; // suma máxima de emociones (sin contar parpadeo)
// Topes por cuerpo, medidos con la calibración de QA (scripts/qa-characters.mjs): en los
// cuerpos masculinos, "happy" y "angry" enseñan los dientes muy pronto; la alegría que
// sobra pasa a "relaxed" (sonrisa de boca cerrada).
const MODEL_FACE_CAP = { hair_m: { happy: 0.1, angry: 0.12 }, fumiriya: { happy: 0.1, angry: 0.12 } };
const VISEMES = ['aa', 'ih', 'ou', 'ee', 'oh'];
const VISEME_CAP = { aa: 0.6, ih: 0.45, ou: 0.5, ee: 0.42, oh: 0.5 };
const SPEECH_DAMP = 0.6; // cuánto baja la emoción mientras habla (0..1)
const vis = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
let syllable = 'aa';
const EMOTION_HOLD = 9; // segundos con la emoción marcada antes de volver al gesto base

/**
 * Boca cerrada en reposo (WP-10): los gestos base (sonrisa, serio, pícaro) separan un poco los
 * labios y por la rendija asomaban los dientes como una raya blanca. En reposo el interior de la
 * boca (dientes y lengua) toma el tono de la sombra entre los labios, así la rendija se lee como
 * una sola línea; al hablar recupera su color.
 */
const MOUTH_SHADOW = new THREE.Color(0.32, 0.17, 0.17);
function setMouthInterior(vrm, open) {
  if (!vrm.userData.mouthMats) {
    vrm.userData.mouthMats = [];
    eachMaterial(vrm.scene, (m) => {
      if (!/FACEMOUTH/i.test(m.name || '') || !m.color) return;
      vrm.userData.mouthMats.push([m, m.color.clone(), m.shadeColorFactor?.clone()]);
    });
  }
  for (const [m, c0, s0] of vrm.userData.mouthMats) {
    m.color.copy(MOUTH_SHADOW).lerp(c0, open);
    if (s0 && m.shadeColorFactor) m.shadeColorFactor.copy(MOUTH_SHADOW).lerp(s0, open);
  }
}

/** "Fcl_EYE_Natural" de VRoid (ojos menos redondos): no está en ninguna expresión VRM. */
function setNaturalEyes(vrm, w) {
  if (vrm.userData.naturalEyes === undefined) {
    vrm.userData.naturalEyes = [];
    vrm.scene.traverse((o) => {
      const dict = o.morphTargetDictionary;
      if (!dict) return;
      const key = Object.keys(dict).find((k) => /Fcl_EYE_Natural$/.test(k));
      if (key != null) vrm.userData.naturalEyes.push([o, dict[key]]);
    });
  }
  for (const [o, i] of vrm.userData.naturalEyes) o.morphTargetInfluences[i] = w;
}

function step(dt, t, silent = false) {
  const vrm = current.vrm;
  if (!vrm) return;
  const em = vrm.expressionManager;
  const b = (n) => vrm.humanoid.getNormalizedBoneNode(n);
  const look = current.look || {};
  const mood = silent ? 'idle' : current.mood;
  const base = EXPRESSIONS[look.expression] || {};
  // parpadeo natural (basado en el reloj: si el render se pausa, los ojos no se quedan cerrados)
  let blinkAnim = 0;
  if (!silent) {
    if (t > nextBlink && blinkT < 0) blinkT = t;
    if (blinkT >= 0) {
      const k = t - blinkT;
      blinkAnim = k < 0.07 ? k / 0.07 : k < 0.13 ? 1 : Math.max(0, 1 - (k - 0.13) / 0.08);
      if (k > 0.21) { blinkT = -1; nextBlink = t + 2.2 + Math.random() * 3.2; blinkAnim = 0; }
    }
  }
  // labios al hablar: una vocal (visema) por sílaba, con tope por vocal
  const qa = current.qa;
  const speaking = qa ? !!qa.viseme : mood === 'speaking';
  if (qa) { blinkAnim = 0; talk = qa.viseme ? 1 : 0; syllable = qa.viseme || 'aa'; }
  else {
    if (speaking && t > nextSyll) {
      talkTarget = 0.45 + Math.random() * 0.5; nextSyll = t + 0.1 + Math.random() * 0.09; // sílabas de ~0,1–0,19 s
      syllable = VISEMES[Math.floor(Math.random() * VISEMES.length)];
    }
    if (!speaking) talkTarget = 0;
    // apertura suave; al terminar de hablar se cierra en ~0,25 s
    talk += (talkTarget - talk) * Math.min(1, dt * (speaking ? 13 : 10));
  }
  for (const v of VISEMES) {
    const target = v === syllable ? talk * VISEME_CAP[v] : 0;
    vis[v] = qa ? target : vis[v] + (target - vis[v]) * Math.min(1, dt * 12); // de una vocal a otra sin saltos
    em?.setValue(v, vis[v]);
  }
  // expresión: base elegida + estado
  const want = { ...{ happy: 0, angry: 0, sad: 0, relaxed: 0, surprised: 0, blink: 0 }, ...base };
  // emoción del último mensaje: se impone un rato y luego se suaviza (en QA, fija)
  const emoId = qa ? qa.emotion : current.emotion;
  const E = !silent && emoId && EMOTIONS[emoId] ? EMOTIONS[emoId] : null;
  const emoOn = E && (qa || t - (current.emotionAt || 0) < EMOTION_HOLD) ? 1 : 0;
  emoAmt = qa ? emoOn : emoAmt + (emoOn - emoAmt) * Math.min(1, dt * 2.5);
  // la emoción sustituye al gesto base (no se suman: enfado + sonrisa = mueca con dientes)
  if (E) for (const k in want) if (k !== 'blink') want[k] = want[k] * (1 - emoAmt) + (E.face[k] || 0) * emoAmt;
  if (mood === 'happy') { want.relaxed = Math.max(want.relaxed, 0.45); want.happy = Math.max(want.happy, 0.2); }
  if (speaking) want.happy = Math.max(want.happy, 0.1);
  if (mood === 'thinking') want.relaxed = Math.max(want.relaxed, 0.45);
  // enfado y alegría a la vez solo en dosis pequeñas (la sonrisa pícara); si no, gana el mayor
  const joy = want.happy + want.relaxed;
  if (want.angry > 0.3 && joy > 0.3) { if (want.angry >= joy) { want.happy = 0; want.relaxed = 0; } else want.angry = 0; }
  // calibración (solo QA): pesos crudos, sin topes
  if (qa?.raw) { for (const k in want) want[k] = qa.raw[k] || 0; }
  // topes: por expresión, suma total, y menos emoción mientras la boca habla
  const damp = 1 - SPEECH_DAMP * Math.min(1, talk * 1.4);
  const bodyCap = MODEL_FACE_CAP[look.model] || {};
  if (bodyCap.happy != null && want.happy > bodyCap.happy) { want.relaxed = Math.max(want.relaxed, want.relaxed + (want.happy - bodyCap.happy) * 0.8); want.happy = bodyCap.happy; }
  let sum = 0;
  for (const k in want) {
    if (k === 'blink') continue;
    want[k] = Math.min(want[k], FACE_CAP[k] ?? 1, bodyCap[k] ?? 1) * (k === 'relaxed' ? 1 : damp);
    sum += want[k];
  }
  if (sum > FACE_TOTAL) for (const k in want) if (k !== 'blink') want[k] *= FACE_TOTAL / sum;
  if (qa?.raw) for (const k in want) want[k] = qa.raw[k] || 0;
  const lerp = qa ? 1 : Math.min(1, dt * 4);
  for (const k in ex) ex[k] += (want[k] - ex[k]) * lerp;
  em?.setValue('happy', ex.happy);
  em?.setValue('angry', ex.angry);
  em?.setValue('sad', ex.sad);
  em?.setValue('relaxed', ex.relaxed);
  em?.setValue('surprised', ex.surprised);
  em?.setValue('Surprised', ex.surprised);
  const AF = ageFace(look);
  em?.setValue('blink', Math.max(ex.blink, blinkAnim, AF.lid * (1 - ex.happy * 2) * (1 - ex.surprised * 2)));
  setNaturalEyes(vrm, AF.natural);
  // abierta según lo que hable (vocales) o la emoción que abra la boca (sorpresa, alegría fuerte)
  const opening = Math.max(...VISEMES.map((v) => vis[v])) * 2.5 + ex.surprised * 2 + Math.max(0, ex.happy - 0.25) * 3;
  setMouthInterior(vrm, Math.min(1, opening));
  // cabeza, respiración y pose
  const think = ex.relaxed > 0.3 && mood === 'thinking' ? 1 : 0;
  current.think = (current.think || 0) + (think - (current.think || 0)) * Math.min(1, dt * 3);
  current.attend = (current.attend || 0) + ((mood === 'listening' ? 1 : 0) - (current.attend || 0)) * Math.min(1, dt * 3);
  nod += ((speaking ? 1 : 0) - nod) * Math.min(1, dt * 3);
  const th = current.think, at = current.attend;
  const tilt = (+look.headTilt || 0) * 0.3, turn = (+look.headTurn || 0) * 0.42;
  const nat = vrm.userData?.natural ? 1 : 0;
  const bodyTurn = vrm.userData?.turn || 0;
  // Las rotaciones se escriben en el marco de un VRM 0 (como las poses): un VRM 1 está
  // girado 180°, así que X y Z cambian de signo. \`up\` = sentido "mirar hacia abajo".
  const v0 = vrm.meta?.metaVersion === '0';
  const sx = v0 ? 1 : -1, down = v0 ? -1 : 1;
  const ehx = E ? (E.head.x || 0) * emoAmt : 0, ehz = E ? (E.head.z || 0) * emoAmt : 0;
  // respiración (pecho) y micro-balanceo (cadera); en reposo natural, 3/4 suave y peso en una pierna
  const breath = Math.sin(t * 1.55);
  const hips = b('hips');
  if (hips) {
    hips.rotation.y = bodyTurn;
    hips.rotation.z = sx * nat * (0.035 + Math.sin(t * 0.42) * 0.012);
  }
  b('spine').rotation.x = breath * 0.012;
  b('spine').rotation.z = sx * nat * -0.045;
  b('spine').rotation.y = -bodyTurn * 0.2;
  const chest = b('chest');
  if (chest) { chest.rotation.x = Math.sin(t * 1.55 + 0.5) * 0.016; chest.rotation.z = sx * nat * -0.012; }
  const upperChest = b('upperChest');
  if (upperChest) upperChest.rotation.x = breath * 0.008;
  const shL = b('leftShoulder'), shR = b('rightShoulder');
  if (shL) shL.rotation.z = sx * breath * 0.012;
  if (shR) shR.rotation.z = -sx * breath * 0.012;
  // la cabeza compensa el giro del cuerpo: mira a cámara, con la cara en 3/4 leve
  b('neck').rotation.y = Math.sin(t * 0.5) * 0.04 + turn * 0.45 - bodyTurn * 0.4;
  b('neck').rotation.z = tilt * 0.35;
  // mirada (grados; en three-vrm, pitch positivo = mirar abajo): aparta la vista cada
  // pocos segundos (no mientras escucha) y vuelve
  if (!silent) {
    if (t > nextGlance && mood !== 'listening') {
      glance.yaw = (Math.random() < 0.5 ? -1 : 1) * (28 + Math.random() * 22);
      glance.pitch = 6 + Math.random() * 14;
      glanceEnd = t + 0.7 + Math.random() * 1.1; nextGlance = glanceEnd + 3.5 + Math.random() * 5;
    }
    const gz = E?.gaze && emoAmt > 0.3 ? E.gaze : t < glanceEnd ? glance : NO_GAZE;
    gazeYaw += (gz.yaw - gazeYaw) * Math.min(1, dt * 6);
    gazePitch += (gz.pitch - gazePitch) * Math.min(1, dt * 6);
    if (vrm.lookAt) { vrm.lookAt.yaw = gazeYaw; vrm.lookAt.pitch = gazePitch; }
  }
  b('head').rotation.z = tilt + sx * (nat * 0.05 + ehz) + th * 0.12 + at * -0.06 + Math.sin(t * 0.7) * 0.025;
  b('head').rotation.x = th * -0.07 + at * (0.05 + Math.sin(t * 2.2) * 0.03) + nod * Math.sin(t * 6) * 0.05 + down * ehx;
  b('head').rotation.y = turn * 0.65 - bodyTurn * 0.27 + th * 0.12 + gazeYaw * 0.002 + Math.sin(t * 0.37) * 0.035;
  if (current.pose === 'wave' && !silent) {
    const v0 = vrm.meta?.metaVersion === '0';
    const lower = b('rightLowerArm');
    if (lower) lower.rotation.z = (v0 ? 1 : -1) * (1.9 + Math.sin(t * 5) * 0.22);
  }
  if (current.wings && !silent) for (const [pivot, sx] of current.wings) pivot.rotation.y = sx * (-0.35 + Math.sin(t * 1.6) * 0.08);
  em?.update();
  vrm.update(dt);
  if (current.hairVrm) {
    scene.updateMatrixWorld(true);
    followSkeleton();
    current.hairVrm.springBoneManager?.update(dt);
  }
}

// Calidad automática: en móvil, si no llega a 45 fps se quitan viñeta y grano; por debajo
// de 30 fps se baja la resolución interna. En escritorio no se toca nada.
const MOBILE = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
// ?fx=on desactiva el ajuste automático (solo para medir con los efectos siempre puestos).
const FORCE_FX = new URLSearchParams(location.search).get('fx') === 'on';
const perf = { frames: 0, fps: null, since: 0, checks: 0, slow: 0, lowfx: false, pixelRatio: renderer.getPixelRatio(), loadedAt: 0 };
const resetWindow = () => { perf.since = 0; perf.frames = 0; };
document.addEventListener('visibilitychange', resetWindow);
/**
 * Mide en ventanas de 3 s, empezando 1,5 s después de cargar (la primera imagen compila
 * los shaders). Una ventana con un tirón de más de 250 ms (pestaña en segundo plano,
 * compilación) se descarta. Hacen falta dos ventanas lentas seguidas para quitar efectos,
 * y vuelven si después va sobrado (> 55 fps).
 */
function governor(t, rawDt) {
  if (!current.vrm || t - perf.loadedAt < 1.5) { resetWindow(); return; }
  if (rawDt > 0.25) { resetWindow(); return; }
  if (!perf.since) { perf.since = t; perf.frames = 0; return; }
  perf.frames++;
  if (t - perf.since < 3) return;
  perf.fps = perf.frames / (t - perf.since);
  resetWindow(); perf.checks++;
  send({ type: 'fps', fps: Math.round(perf.fps) });
  if (!MOBILE || FORCE_FX) return;
  perf.slow = perf.fps < 45 ? perf.slow + 1 : 0;
  if (perf.slow >= 2 && !perf.lowfx) { perf.lowfx = true; document.body.classList.add('lowfx'); }
  else if (perf.lowfx && perf.fps < 30 && perf.slow >= 2 && renderer.getPixelRatio() > 1.25) {
    renderer.setPixelRatio(Math.max(1.25, renderer.getPixelRatio() - 0.5));
    perf.pixelRatio = renderer.getPixelRatio();
    perf.slow = 0;
    resize();
  } else if (perf.lowfx && perf.fps > 55) { perf.lowfx = false; document.body.classList.remove('lowfx'); }
}

function frame() {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  const t = clock.elapsedTime;
  governor(t, rawDt);
  step(dt, t);
  updateEffect(dt, t);
  dim += ((current.mood === 'offline' ? 1 : 0) - dim) * Math.min(1, dt * 3);
  canvas.style.filter = dim > 0.02 ? \`grayscale(\${dim}) opacity(\${1 - dim * 0.35})\` : '';
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(frame);

// ------------------------------------------------------------------ acabado (viñeta y grano)
const grainCanvas = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 160;
  const g = c.getContext('2d'); const d = g.createImageData(160, 160);
  for (let i = 0; i < d.data.length; i += 4) { const v = 110 + Math.random() * 145; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0); return c;
})();
document.getElementById('grain').style.backgroundImage = \`url(\${grainCanvas.toDataURL('image/png')})\`;
/** Las capturas también llevan viñeta y grano (las capas del DOM no salen en el lienzo). */
function paintFinish(out) {
  const cls = document.body.classList;
  if (cls.contains('nofx')) return;
  const g = out.getContext('2d'); const W = out.width, H = out.height;
  const v = g.createRadialGradient(W / 2, H * 0.42, Math.min(W, H) * 0.42, W / 2, H * 0.42, Math.max(W, H) * 0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, cls.contains('light') ? 'rgba(60,40,70,0.12)' : 'rgba(24,14,34,0.30)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  g.globalAlpha = 0.07; g.fillStyle = g.createPattern(grainCanvas, 'repeat'); g.fillRect(0, 0, W, H); g.globalAlpha = 1;
}

// ------------------------------------------------------------------ mensajes
const pick = (l, keys) => JSON.stringify(keys.map((k) => l?.[k] ?? null));
const COLOR_KEYS = ['age', 'plainOutfit', 'hairColor', 'hairTip', 'eyeColor', 'skinTone', 'outfitColor', 'bottomColor', 'shoesColor', 'accentColor', 'blush', 'lipColor', 'eyeshadow', 'marks', 'eyeShine'];
const ACC_KEYS = ['accessories', 'accessoryColor', 'hairColor', 'headSize', 'age'];

async function handle(msg) {
  if (msg.type === 'look') {
    const look = msg.look || {};
    if (msg.framing) current.framing = msg.framing;
    if (current.bg !== \`\${look.background}|\${!!msg.transparent}\`) { current.bg = \`\${look.background}|\${!!msg.transparent}\`; setBackdrop(look.background, !!msg.transparent); }
    setLighting(look);
    setEffect(look.effect);
    const prev = current.look;
    current.look = look;
    try {
      const reloaded = await load(look, msg.modelBaseUrl);
      if (!reloaded && (prev?.pose || 'relaxed') !== (look.pose || 'relaxed')) {
        applyPose(current.vrm, look.pose);
        if (current.hairVrm) applyPose(current.hairVrm, look.pose);
      }
      if (!reloaded && ((prev?.headSize || 1) !== (look.headSize || 1) || ageFace(prev || {}) !== ageFace(look))) { applyHeadSize(look); scene.updateMatrixWorld(true); settle(); }
      if (reloaded || pick(prev, COLOR_KEYS) !== pick(look, COLOR_KEYS)) applyColors(look);
      applyFinish(look);
      if (reloaded || pick(prev, ACC_KEYS) !== pick(look, ACC_KEYS)) buildAccessories(look);
      frameCamera();
      document.getElementById('loading').style.display = 'none';
      if (reloaded) {
        // primer fotograma de verdad (compila los shaders): el 3D ya se ve
        const t2 = performance.now();
        renderer.render(scene, camera);
        timings.firstFrame = Math.round(performance.now() - t2);
        timings.setup = Math.round(t2 - timings.start - timings.bytes - timings.parse);
        timings.total = Math.round(performance.now() - timings.start);
      }
      send({ type: 'loaded', timings: reloaded ? { ...timings } : null });
    } catch (e) {
      document.getElementById('loading').style.display = 'none';
      send({ type: 'error', message: String((e && e.message) || e) });
    }
  } else if (msg.type === 'qa') {
    // QA de personajes: cara fija (sin parpadeo ni miradas) con una emoción y/o una vocal.
    current.qa = msg.off ? null : { emotion: msg.emotion || null, viseme: msg.viseme || null, raw: msg.raw || null };
    if (current.qa) {
      gazeYaw = gazePitch = 0; glanceEnd = 0; nextGlance = Infinity;
      // el pelo se coloca en la postura nueva antes de la foto (si no, un mechón puede salir volando)
      // vuelve al reposo capturado al cargar (nunca se guarda la postura actual como reposo:
      // eso acumulaba la deformación del flequillo en cada cambio)
      for (const v of [current.vrm, current.hairVrm]) v?.springBoneManager?.reset();
      for (let i = 0; i < 90; i++) step(1 / 60, clock.elapsedTime);
    }
    else nextGlance = clock.elapsedTime + 3;
    send({ type: 'qa-ok' });
  } else if (msg.type === 'active') {
    // escenario persistente de la app: escondido = en pausa (sin gastar batería ni GPU)
    if (msg.on) { clock.getDelta(); renderer.setAnimationLoop(frame); } else renderer.setAnimationLoop(null);
  } else if (msg.type === 'state') {
    current.mood = msg.mood || 'idle';
    const emoKey = \`\${msg.emotion || ''}|\${msg.emotionId || ''}\`;
    if ('emotion' in msg && emoKey !== current.emotionKey) { current.emotionKey = emoKey; current.emotion = msg.emotion || null; current.emotionAt = clock.elapsedTime; }
  } else if (msg.type === 'snapshot') {
    const em = current.vrm?.expressionManager;
    if (em) { blinkT = -1; nextBlink = clock.elapsedTime + 2; em.setValue('blink', ex.blink); em.update(); }
    // la foto mira a cámara (sin la mirada de reojo del reposo)
    if (current.vrm?.lookAt) { gazeYaw = gazePitch = 0; glanceEnd = 0; current.vrm.lookAt.yaw = 0; current.vrm.lookAt.pitch = 0; current.vrm.lookAt.update(0); }
    const prevFraming = current.framing;
    const prevAspect = camera.aspect;
    if (msg.framing) { current.framing = msg.framing; if (!msg.width) { camera.aspect = 1; camera.updateProjectionMatrix(); } frameCamera(); }
    renderer.render(scene, camera);
    const out = document.createElement('canvas');
    if (msg.width && msg.height) {
      out.width = msg.width; out.height = msg.height;
      out.getContext('2d').drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, msg.width, msg.height);
    } else {
      const size = msg.size || 512;
      out.width = out.height = size;
      const s = Math.min(canvas.width, canvas.height);
      out.getContext('2d').drawImage(canvas, (canvas.width - s) / 2, (canvas.height - s) / 2, s, s, 0, 0, size, size);
    }
    paintFinish(out);
    if (msg.framing) { current.framing = prevFraming; camera.aspect = prevAspect; camera.updateProjectionMatrix(); frameCamera(); }
    send({ type: 'snapshot', dataUrl: out.toDataURL('image/jpeg', msg.quality || 0.88) });
  }
}
const onMessage = (e) => { try { handle(typeof e.data === 'string' ? JSON.parse(e.data) : e.data); } catch {} };
window.addEventListener('message', onMessage);
document.addEventListener('message', onMessage);
window.__lovel = {
  handle,
  perf: () => ({ ...perf, mobile: MOBILE }),
  // diagnóstico (QA): orden de dibujo de cada malla visible
  orders: () => { const out = []; for (const r of [current.vrm?.scene, current.hairVrm?.scene].filter(Boolean)) r.traverse((o) => { if (o.isMesh && o.visible) for (const m of [].concat(o.material)) out.push([r === current.vrm.scene ? 'body' : 'hair', m.name, o.renderOrder, m.transparent, m.depthWrite, m.depthTest]); }); return out; },
  morphs: () => { const out = {}; current.vrm?.scene.traverse((o) => { if (o.morphTargetInfluences && o.morphTargetDictionary) { const d = o.morphTargetDictionary; for (const k in d) { const v = o.morphTargetInfluences[d[k]]; if (v > 0.01) out[o.name + ':' + k] = +v.toFixed(2); } } }); return out; },
  debug: () => { const em = current.vrm?.expressionManager; return em ? Object.fromEntries(em.expressions.map((x) => [x.expressionName, +em.getValue(x.expressionName)?.toFixed?.(2)])) : null; },
};
resize();
send({ type: 'ready' });
</script>
</body>
</html>
`;
