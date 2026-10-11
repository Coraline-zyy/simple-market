const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const compile = file => ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;

test('comment likes store unique user votes, allow public counts, and reject hidden or muted content', () => {
  const sql = read('supabase/2026_10_11_comment_likes.sql');
  for (const clause of ['primary key(comment_id,user_id)', 'enable row level security', 'using(user_id=auth.uid())', 'not c.moderation_deleted and not p.moderation_deleted', 'public.is_account_muted()', 'pg_advisory_xact_lock', 'on conflict do nothing', 'where comment_id=p_comment and user_id=me', 'for share of c,p']) assert.ok(sql.includes(clause));
  assert.match(sql, /grant execute on function public.get_comment_like_states\(uuid\[\]\) to anon,authenticated/);
  assert.doesNotMatch(sql, /grant (?:insert|update|delete).*to authenticated/);
});

function harness(uid, respond) {
  const slots = [], effects = [], calls = []; let cursor = 0;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => slots[i] = typeof value === 'function' ? value(slots[i]) : value]; },
    useRef(initial) { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((v, n) => slots[i][n] !== v)) { slots[i] = deps; effects.push(fn); } },
  };
  const api = { rpc: async (name, args) => { calls.push({ name, args }); return name === 'get_comment_like_states' ? { data: [{ comment_id: 'comment', like_count: 2, liked: false }], error: null } : respond(args); } };
  const exports = {}, errors = [];
  vm.runInNewContext(compile('app/components/ForumLikes.tsx'), { exports, Set, Object, Promise, require: name => name === 'react' ? react : name.includes('supabaseClient') ? { supabase: api } : {} });
  return { calls, errors, render() { cursor = 0; const likes = exports.useCommentLikes(['comment'], uid, e => errors.push(e)); while (effects.length) effects.shift()(); return likes; } };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
test('comment like then unlike uses desired-state writes and restores the count', async () => {
  const h = harness('user', args => ({ data: { comment_id: 'comment', liked: args.p_liked, like_count: args.p_liked ? 3 : 2 }, error: null }));
  h.render(); await flush(); await h.render().toggle('comment', 'zh');
  assert.equal(h.render().states.comment.like_count, 3); assert.equal(h.render().states.comment.liked, true);
  await h.render().toggle('comment', 'zh');
  assert.equal(h.render().states.comment.like_count, 2); assert.equal(h.render().states.comment.liked, false);
  assert.deepEqual(h.calls.filter(c => c.name === 'set_comment_like').map(c => c.args.p_liked), [true, false]);
});
test('comment double clicks are locked; failures retain state and signed-out users cannot write', async () => {
  let finish; const h = harness('user', () => new Promise(resolve => finish = resolve)); h.render(); await flush();
  const likes = h.render(), first = likes.toggle('comment', 'en'); await likes.toggle('comment', 'en');
  assert.equal(h.calls.filter(c => c.name === 'set_comment_like').length, 1);
  finish({ data: null, error: { message: 'Failed' } }); await first;
  assert.equal(h.render().states.comment.like_count, 2); assert.equal(h.render().pending.size, 0);
  const guest = harness(null, () => { throw Error('Unexpected write'); }); guest.render(); await flush(); await guest.render().toggle('comment', 'en');
  assert.equal(guest.calls.filter(c => c.name === 'set_comment_like').length, 0);
});
test('card background navigation excludes links, buttons, lightboxes and selected text', () => {
  class Element { constructor(interactive) { this.interactive = interactive; } closest(selector) { assert.ok(selector.includes('[role="dialog"]')); return this.interactive ? {} : null; } }
  const exports = {}; vm.runInNewContext(compile('lib/communityCard.ts'), { exports, Element });
  assert.equal(exports.shouldOpenCommunityCard(new Element(false)), true);
  assert.equal(exports.shouldOpenCommunityCard(new Element(true)), false);
  assert.equal(exports.shouldOpenCommunityCard(new Element(false), 'selected text'), false);
  const board = read('app/components/CommunityBoard.tsx');
  assert.match(board, /onClick=\{event=>\{if\(shouldOpenCommunityCard/);
  assert.ok(board.includes('"详情 →":"Details →"'));
  assert.match(read('app/components/PostImageGallery.tsx'), /<div data-card-interactive className="fixed inset-0/);
  const detail = read('app/[lang]/community/[id]/page.tsx');
  assert.match(detail, /useCommentLikes\(comments.map/); assert.match(detail, /commentLikes.toggle\(c.id,lang\)/);
});
