const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('favicon contains an RGBA PNG accepted by the production ICO decoder', async () => {
  const ico = fs.readFileSync(path.join(root, 'app/favicon.ico'));
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 1);
  const length = ico.readUInt32LE(14), offset = ico.readUInt32LE(18);
  assert.equal(offset + length, ico.length);
  const png = ico.subarray(offset, offset + length);
  assert.equal(png[25], 6, 'ICO PNG must use RGBA color type, not RGB');
  const metadata = await sharp(png).metadata();
  assert.equal(metadata.width, 32); assert.equal(metadata.height, 32);
  assert.equal(metadata.channels, 4); assert.equal(metadata.hasAlpha, true);
});

test('all PWA icon consumers request the same new artwork revision', () => {
  for (const file of ['app/components/AppInstall.tsx', 'app/[lang]/app/page.tsx',
    'app/layout.tsx', 'app/manifest.ts', 'public/offline.html', 'public/sw.js']) {
    const references = [...read(file).matchAll(/\/icons\/[\w-]+\.png([^"\s]*)/g)];
    assert.ok(references.length, file);
    for (const item of references) assert.equal(item[1], '?v=20261019', file);
  }
  assert.match(read('public/sw.js'), /youqiu-v3-latin-icon-20261019/);
});

test('new app artwork is opaque and mask-safe at every advertised size', async () => {
  for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512],
    ['icon-maskable-512.png', 512], ['apple-touch-icon.png', 180]]) {
    const {data, info} = await sharp(path.join(root, 'public/icons', name))
      .ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(info.width, size); assert.equal(info.height, size);
    let white = 0;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      assert.equal(data[i+3], 255);
      if (data[i] > 225 && data[i+1] > 225 && data[i+2] > 225) {
        white++;
        assert.ok(Math.hypot(x/size-.5, y/size-.5) < .4, name);
      }
    }
    assert.ok(white > size * size * .1, name);
  }
});
