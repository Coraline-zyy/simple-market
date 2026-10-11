const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('activity forms, inserts, list queries and galleries all include images', () => {
  const board = read('app/components/CommunityBoard.tsx');
  assert.match(board, /pinned_at,image_paths\$\{social/);
  assert.match(board, /paths=await uploadPostImages\(uid,"forum-post",id,files\)/);
  assert.match(board, /\.\.\.schedule,image_paths:paths/);
  assert.doesNotMatch(board, /!social&&<CommunityImagePicker|!social&&<PostImageGallery|if\(!social\)paths=/);
  assert.match(board, /<PostImageGallery paths=\{row.image_paths\}/);
  assert.match(board, /if\(!saved&&paths.length\)await supabase.storage/);
  assert.match(read('app/[lang]/community/[id]/page.tsx'), /<PostImageGallery paths=\{post.image_paths\}/);
});

test('activity images use existing user-owned storage and clean partial uploads on failure', async () => {
  const calls = [], removals = [];
  const storage = { from(bucket) { assert.equal(bucket, 'post-images'); return {
    async upload(filePath) { calls.push(filePath); return { error: calls.length === 2 ? new Error('Upload failed') : null }; },
    async remove(paths) { removals.push(paths); return { error: null }; },
  }; } };
  const compiled = ts.transpileModule(read('lib/media.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const api = {};
  new Function('exports', 'require', compiled)(api, () => ({ supabase: { storage } }));
  const files = [1, 2].map(n => ({ name: `test-${n}.png`, type: 'image/png', size: 100 }));
  await assert.rejects(api.uploadPostImages('test-user', 'forum-post', 'activity-id', files), /Upload failed/);
  assert.ok(calls.every(value => value.startsWith('test-user/forum-post/activity-id/')));
  assert.deepEqual(removals, [[calls[0]]]);
});
