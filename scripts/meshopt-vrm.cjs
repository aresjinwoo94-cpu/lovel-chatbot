// Comprime la geometría de un VRM (GLB) con EXT_meshopt_compression sin pérdida (filtro NONE):
// vértices, morphs e índices. No toca imágenes, materiales ni extensiones VRM.
// three.js lo lee con GLTFLoader.setMeshoptDecoder (three/addons/libs/meshopt_decoder.module.js).
// Uso: npm i --no-save meshoptimizer@0.25.0 && node scripts/meshopt-vrm.cjs in.vrm out.vrm
const fs = require('fs');
const { MeshoptEncoder } = require('meshoptimizer');

const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const BYTES = { 5126: 4, 5125: 4, 5123: 2, 5122: 2, 5121: 1, 5120: 1 };

(async () => {
  await MeshoptEncoder.ready;
  const [, , inFile, outFile] = process.argv;
  const glb = fs.readFileSync(inFile);
  const jsonLen = glb.readUInt32LE(12);
  const json = JSON.parse(glb.subarray(20, 20 + jsonLen).toString('utf8'));
  const binStart = 20 + jsonLen + 8;
  const bin = glb.subarray(binStart, binStart + glb.readUInt32LE(20 + jsonLen));
  const views = json.bufferViews;
  const raw = views.map((v) => bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength));

  // accesor de cada bufferView (en estos VRM, uno por vista)
  const accOf = new Map();
  json.accessors.forEach((a) => { if (a.bufferView != null && !a.sparse) accOf.set(a.bufferView, a); });
  // índices: los que usan las primitivas como "indices" (modo TRIANGLES solo si son listas de triángulos)
  const indexViews = new Set();
  for (const m of json.meshes) for (const p of m.primitives) if (p.indices != null && (p.mode ?? 4) === 4) indexViews.add(json.accessors[p.indices].bufferView);

  const packed = []; // [viewIndex, data, ext]
  let saved = 0;
  views.forEach((v, i) => {
    const a = accOf.get(i);
    if (!a || v.byteStride) return;
    const elem = SIZE[a.type] * BYTES[a.componentType];
    if (indexViews.has(i)) {
      if (a.count % 3 || (elem !== 2 && elem !== 4)) return;
      const data = MeshoptEncoder.encodeGltfBuffer(new Uint8Array(raw[i]), a.count, elem, 'TRIANGLES');
      packed.push([i, data, { byteStride: elem, mode: 'TRIANGLES', count: a.count }]);
    } else if (v.target === 34962) {
      if (elem % 4 || elem > 256) return;
      const data = MeshoptEncoder.encodeGltfBuffer(new Uint8Array(raw[i]), a.count, elem, 'ATTRIBUTES');
      packed.push([i, data, { byteStride: elem, mode: 'ATTRIBUTES', count: a.count }]);
    }
  });
  const compressed = new Map(packed.filter(([i, d]) => d.length < raw[i].length * 0.95).map(([i, d, e]) => [i, [Buffer.from(d), e]]));

  // buffer 0 (BIN): datos comprimidos + lo que no se comprime; buffer 1: "fallback" virtual sin datos
  const parts = [];
  let off = 0, fallbackOff = 0;
  const push = (d) => { const o = off; parts.push(d); off += d.length; const pad = (4 - (off % 4)) % 4; if (pad) { parts.push(Buffer.alloc(pad)); off += pad; } return o; };
  views.forEach((v, i) => {
    const c = compressed.get(i);
    if (c) {
      const [data, ext] = c;
      const o = push(data);
      v.buffer = 1;
      v.byteOffset = fallbackOff;
      fallbackOff += v.byteLength + ((4 - (v.byteLength % 4)) % 4);
      v.extensions = { ...(v.extensions || {}), EXT_meshopt_compression: { buffer: 0, byteOffset: o, byteLength: data.length, byteStride: ext.byteStride, mode: ext.mode, count: ext.count } };
      saved += raw[i].length - data.length;
    } else {
      v.buffer = 0;
      v.byteOffset = push(raw[i]);
    }
  });
  const newBin = Buffer.concat(parts);
  json.buffers = [{ byteLength: newBin.length }, { byteLength: fallbackOff, extensions: { EXT_meshopt_compression: { fallback: true } } }];
  for (const key of ['extensionsUsed', 'extensionsRequired']) json[key] = [...new Set([...(json[key] || []), 'EXT_meshopt_compression'])];

  let jsonBuf = Buffer.from(JSON.stringify(json), 'utf8');
  jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc((4 - (jsonBuf.length % 4)) % 4, 0x20)]);
  const header = Buffer.alloc(12); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + jsonBuf.length + newBin.length, 8);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(jsonBuf.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8); bh.writeUInt32LE(newBin.length, 0); bh.writeUInt32LE(0x004e4942, 4);
  fs.writeFileSync(outFile, Buffer.concat([header, jh, jsonBuf, bh, newBin]));
  console.log(inFile.split('/').pop(), Math.round(glb.length / 1024), '->', Math.round(fs.statSync(outFile).size / 1024), 'KB', `(geometría -${Math.round(saved / 1024)} KB, ${compressed.size} vistas)`);
})();
