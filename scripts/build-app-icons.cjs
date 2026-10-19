// Convert the approved app artwork into the sizes consumed by the PWA.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

async function main() {
  const source = process.argv[2];
  if (!source) throw new Error('Provide the approved square PNG artwork path.');
  const root = path.resolve(__dirname, '..');
  for (const [name, size] of [
    ['icon-192.png', 192],
    ['icon-512.png', 512],
    ['icon-maskable-512.png', 512],
    ['apple-touch-icon.png', 180],
  ]) {
    await sharp(source).resize(size, size).flatten({background:'#5b3de8'})
      .png().toFile(path.join(root, 'public/icons', name));
  }
  const png = await sharp(source).resize(32, 32).png().toBuffer();
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header[6] = 32; header[7] = 32;
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  await fs.writeFile(path.join(root, 'app/favicon.ico'), Buffer.concat([header, png]));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
