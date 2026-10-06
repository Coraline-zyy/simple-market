const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const sql = fs.readFileSync(path.join(root, 'supabase/2026_admin_private_chat_and_forum_likes.sql'), 'utf8');

// Migration contract checks, not a substitute for live PostgreSQL/RLS tests.
test('private chat migration requires verified admin role and participant-only access', () => {
  assert.match(sql, /if not public\.is_market_admin\(\) then raise exception 'Administrator access required'/);
  assert.match(sql, /sender_id=auth\.uid\(\)/);
  assert.match(sql, /using\(auth\.uid\(\)=user_id or \(auth\.uid\(\)=admin_id and public\.is_market_admin\(\)\)\)/);
  assert.match(sql, /grant select on public\.admin_private_threads to authenticated/);
  assert.doesNotMatch(sql, /grant (?:all|insert|update|delete).*admin_private_threads to authenticated/i);
});
test('likes enforce one per user and use desired-state writes', () => {
  assert.match(sql, /primary key\(post_id,user_id\)/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /on conflict do nothing/);
  assert.match(sql, /delete from public\.community_likes where post_id=p_post and user_id=me/);
  assert.match(sql, /p\.kind='discussion' and not p\.moderation_deleted/);
});

function harness(uid, response) {
  const slots = [], effects = [], calls = []; let cursor = 0;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useEffect(callback, deps) { const i = cursor++; if (!slots[i] || deps.some((value, n) => slots[i][n] !== value)) { slots[i] = deps; effects.push(callback); } },
  };
  const api = { rpc: async (name, args) => { calls.push({ name, args }); if (name === 'get_forum_like_states') return { data: [{ post_id: 'post', like_count: 3, liked: false }], error: null }; return response(); } };
  const compiled = ts.transpileModule(fs.readFileSync(path.join(root, 'app/components/ForumLikes.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, Set, Object, require: name => name === 'react' ? react : name.includes('supabaseClient') ? { supabase: api } : {} });
  const errors = [];
  return { calls, errors, render() { cursor = 0; const result = exports.useForumLikes(['post'], uid, error => errors.push(error)); while (effects.length) effects.shift()(); return result; } };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
test('signed-out visitors cannot issue like writes', async () => {
  const h = harness(null, () => { throw Error('Unexpected write'); }); h.render(); await flush();
  await h.render().toggle('post', 'en');
  assert.equal(h.calls.filter(call => call.name === 'set_forum_like').length, 0);
  assert.match(h.errors.at(-1), /sign in/);
});
test('rapid double clicks issue one write, and success updates count and state', async () => {
  let complete;
  const h = harness('user', () => new Promise(resolve => { complete = resolve; })); h.render(); await flush();
  const likes = h.render(); const first = likes.toggle('post', 'en'); await likes.toggle('post', 'en');
  assert.equal(h.calls.filter(call => call.name === 'set_forum_like').length, 1);
  complete({ data: { post_id: 'post', like_count: 4, liked: true }, error: null }); await first;
  assert.equal(h.render().states.post.like_count, 4); assert.equal(h.render().states.post.liked, true);
  assert.equal(h.render().pending.size, 0);
});
test('failed like requests preserve the previous count and release the lock', async () => {
  const h = harness('user', () => ({ data: null, error: { message: 'Network failed' } })); h.render(); await flush();
  await h.render().toggle('post', 'en');
  assert.equal(h.render().states.post.like_count, 3); assert.equal(h.render().pending.size, 0);
  assert.equal(h.errors.at(-1), 'Network failed');
});
