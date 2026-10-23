// Versión "solo pelo" de un VRM para prestar el peinado a otros cuerpos.
// Conserva: esqueleto, física del pelo (secondaryAnimation), mallas de pelo y la malla de la cara
// sin expresiones (el escenario mide su ancho para ajustar el pelo). Quita el cuerpo, la ropa,
// las expresiones y sus datos; los índices del JSON no cambian (los datos sin uso quedan vacíos).
// Uso: node scripts/make-hair-vrm.cjs <id>.vrm <id>.hair.vrm
const fs = require('fs');

const [, , inFile, outFile] = process.argv;
const glb = fs.readFileSync(inFile);
const jsonLen = glb.readUInt32LE(12);
const json = JSON.parse(glb.subarray(20, 20 + jsonLen).toString('utf8'));
const binStart = 20 + jsonLen + 8;
const bin = glb.subarray(binStart, binStart + glb.readUInt32LE(20 + jsonLen));
const viewData = json.bufferViews.map((v) => bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength));

const matName = (i) => (i == null ? '' : json.materials[i]?.name || '');
const isHair = (p) => /HAIR/i.test(matName(p.material));
const isFace = (p) => /FACE_00_SKIN|^FACE$/i.test(matName(p.material));

// 1) primitivas: pelo (con sus morphs, por si acaso no tiene) y cara (sin morphs)
json.meshes.forEach((m) => {
  m.primitives = m.primitives.filter((p) => isHair(p) || isFace(p));
  for (const p of m.primitives) if (isFace(p)) { delete p.targets; }
  if (m.primitives.every((p) => !p.targets)) { delete m.weights; if (m.extras) delete m.extras.targetNames; }
});
const emptyMesh = new Set(json.meshes.map((m, i) => (m.primitives.length ? -1 : i)).filter((i) => i >= 0));
for (const n of json.nodes) if (n.mesh != null && emptyMesh.has(n.mesh)) delete n.mesh;
// las mallas vacías se quedan con una primitiva mínima válida no referenciada por ningún nodo
json.meshes.forEach((m, i) => { if (emptyMesh.has(i)) m.primitives = []; });

// 2) VRM 0: sin expresiones (blendShape) ni anotaciones de primera persona de mallas quitadas
const vrm = json.extensions?.VRM;
if (vrm?.blendShapeMaster?.blendShapeGroups) for (const g of vrm.blendShapeMaster.blendShapeGroups) { g.binds = []; g.materialValues = []; }
if (vrm?.firstPerson?.meshAnnotations) vrm.firstPerson.meshAnnotations = vrm.firstPerson.meshAnnotations.filter((a) => !emptyMesh.has(a.mesh));

// 3) qué datos se siguen usando
const usedAcc = new Set();
for (const n of json.nodes) if (n.mesh != null) for (const p of json.meshes[n.mesh].primitives) {
  Object.values(p.attributes).forEach((a) => usedAcc.add(a));
  if (p.indices != null) usedAcc.add(p.indices);
  (p.targets || []).forEach((t) => Object.values(t).forEach((a) => usedAcc.add(a)));
}
for (const s of json.skins || []) if (s.inverseBindMatrices != null) usedAcc.add(s.inverseBindMatrices);
const usedView = new Set();
for (const a of usedAcc) {
  const acc = json.accessors[a];
  if (acc.bufferView != null) usedView.add(acc.bufferView);
  if (acc.sparse) { usedView.add(acc.sparse.indices.bufferView); usedView.add(acc.sparse.values.bufferView); }
}
const usedMat = new Set();
for (const n of json.nodes) if (n.mesh != null) for (const p of json.meshes[n.mesh].primitives) if (p.material != null) usedMat.add(p.material);
const usedTex = new Set();
const visit = (o) => { if (o && typeof o === 'object') { if (typeof o.index === 'number' && ('texCoord' in o || 'scale' in o || 'strength' in o || Object.keys(o).length <= 3)) usedTex.add(o.index); Object.values(o).forEach(visit); } };
for (const i of usedMat) visit(json.materials[i]);
if (vrm?.materialProperties) for (const mp of vrm.materialProperties) if ([...usedMat].some((i) => matName(i) === mp.name)) Object.values(mp.textureProperties || {}).forEach((t) => usedTex.add(t));
if (vrm?.meta?.texture != null) usedTex.add(vrm.meta.texture);
for (const t of usedTex) { const src = json.textures[t]?.source; if (src != null) usedView.add(json.images[src].bufferView); }

// 4) vacía lo que no se usa y re-empaqueta
const parts = []; let offset = 0;
json.bufferViews.forEach((v, i) => {
  const d = usedView.has(i) ? viewData[i] : Buffer.alloc(4);
  v.byteOffset = offset; v.byteLength = d.length;
  parts.push(d); offset += d.length;
  const pad = (4 - (offset % 4)) % 4; if (pad) { parts.push(Buffer.alloc(pad)); offset += pad; }
});
const newBin = Buffer.concat(parts);
json.buffers[0].byteLength = newBin.length;
let jsonBuf = Buffer.from(JSON.stringify(json), 'utf8');
jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc((4 - (jsonBuf.length % 4)) % 4, 0x20)]);
const header = Buffer.alloc(12); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + jsonBuf.length + newBin.length, 8);
const jh = Buffer.alloc(8); jh.writeUInt32LE(jsonBuf.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
const bh = Buffer.alloc(8); bh.writeUInt32LE(newBin.length, 0); bh.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync(outFile, Buffer.concat([header, jh, jsonBuf, bh, newBin]));
console.log(inFile.split('/').pop(), Math.round(glb.length / 1024), '->', Math.round(fs.statSync(outFile).size / 1024), 'KB (solo pelo)');
