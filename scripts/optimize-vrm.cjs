// Re-codifica las texturas de un VRM (GLB) sin tocar geometría ni extensiones VRM.
// PNG sin transparencia real -> JPEG q90; PNG con alfa -> PNG con paleta (calidad 90).
// Solo se queda la versión nueva si ahorra más de un 15 %.
// Uso: npm i --no-save sharp && node scripts/optimize-vrm.cjs in.vrm out.vrm
const fs = require('fs');
const sharp = require('sharp');

const [, , inFile, outFile] = process.argv;
const glb = fs.readFileSync(inFile);
const jsonLen = glb.readUInt32LE(12);
const json = JSON.parse(glb.subarray(20, 20 + jsonLen).toString('utf8'));
const binStart = 20 + jsonLen + 8;
const binLen = glb.readUInt32LE(20 + jsonLen);
const bin = glb.subarray(binStart, binStart + binLen);

const viewData = json.bufferViews.map((v) => bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength));

(async () => {
  let saved = 0;
  for (const im of json.images) {
    const data = viewData[im.bufferView];
    if (data.length < 60 * 1024) continue;
    const img = sharp(data);
    const meta = await img.metadata();
    let next = null, mime = im.mimeType;
    if (meta.hasAlpha) {
      const { channels } = await sharp(data).stats();
      const alphaMin = channels[3]?.min ?? 255;
      if (alphaMin === 255) {
        next = await sharp(data).removeAlpha().jpeg({ quality: 90, mozjpeg: true }).toBuffer();
        mime = 'image/jpeg';
      } else {
        next = await sharp(data).png({ palette: true, quality: 90, effort: 10, dither: 0.6 }).toBuffer();
        mime = 'image/png';
      }
    } else if (im.mimeType === 'image/png') {
      next = await sharp(data).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
      mime = 'image/jpeg';
    } else {
      next = await sharp(data).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
    }
    if (next && next.length < data.length * 0.85) {
      saved += data.length - next.length;
      viewData[im.bufferView] = next;
      im.mimeType = mime;
    }
  }
  // Re-empaqueta el buffer binario (alineado a 4 bytes) con los nuevos tamaños.
  const parts = [];
  let offset = 0;
  json.bufferViews.forEach((v, i) => {
    const d = viewData[i];
    v.byteOffset = offset;
    v.byteLength = d.length;
    parts.push(d);
    offset += d.length;
    const pad = (4 - (offset % 4)) % 4;
    if (pad) { parts.push(Buffer.alloc(pad)); offset += pad; }
  });
  const newBin = Buffer.concat(parts);
  json.buffers[0].byteLength = newBin.length;
  let jsonBuf = Buffer.from(JSON.stringify(json), 'utf8');
  const jpad = (4 - (jsonBuf.length % 4)) % 4;
  jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(jpad, 0x20)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + newBin.length, 8);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(jsonBuf.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8); bh.writeUInt32LE(newBin.length, 0); bh.writeUInt32LE(0x004e4942, 4);
  fs.writeFileSync(outFile, Buffer.concat([header, jh, jsonBuf, bh, newBin]));
  console.log(inFile.split('/').pop(), Math.round(glb.length / 1024), '->', Math.round(fs.statSync(outFile).size / 1024), 'KB', `(texturas -${Math.round(saved / 1024)} KB)`);
})();
