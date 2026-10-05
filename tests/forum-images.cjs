const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

function setup(failAt = -1) {
  const uploaded = [], removed = [];
  const storage = { from: () => ({
    upload: async name => { const index = uploaded.length; uploaded.push(name); return { error: index === failAt ? new Error('Upload failed') : null }; },
    remove: async paths => { removed.push(...paths); return { error: null }; },
  }) };
  const source = fs.readFileSync(path.join(__dirname, '../lib/media.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: () => ({ supabase: { storage } }), Date, Error });
  return { api: exports, uploaded, removed };
}
const image = { name: 'test.png', type: 'image/png', size: 100 };

test('forum posts and comments upload to owner-specific paths', async () => {
  for (const type of ['forum-post', 'forum-comment']) {
    const { api, uploaded } = setup();
    const paths = await api.uploadPostImages('owner', type, 'item', [image, image]);
    assert.equal(paths.length, 2);
    assert.ok(uploaded.every(name => name.startsWith(`owner/${type}/item/`)));
  }
});
test('partial uploads are removed through the Storage API after failure', async () => {
  const { api, uploaded, removed } = setup(1);
  await assert.rejects(api.uploadPostImages('owner', 'forum-comment', 'item', [image, image]), /Upload failed/);
  assert.deepEqual(removed, [uploaded[0]]);
});
test('oversized images are rejected before upload', async () => {
  const { api, uploaded } = setup();
  await assert.rejects(api.uploadPostImages('owner', 'forum-post', 'item', [{ ...image, size: 6 * 1024 * 1024 }]), /5 MB/);
  assert.equal(uploaded.length, 0);
});
test('text-only posts need no storage upload', async () => {
  const { api, uploaded } = setup();
  assert.equal((await api.uploadPostImages('owner', 'forum-post', 'item', [])).length, 0);
  assert.equal(uploaded.length, 0);
});
