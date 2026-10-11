const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const compiled = ts.transpileModule(read('lib/i18n.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const api = {};
new Function('exports', compiled)(api);

test('all stored categories have English labels while Chinese and unknown values are preserved', () => {
  const labels = ['Home services', 'Repairs', 'Moving', 'Errands', 'Education', 'Design', 'Other'];
  for (const [i, value] of api.getT('en').categories.items.entries()) {
    assert.equal(api.categoryLabel(value, 'en'), labels[i]);
    assert.equal(api.categoryLabel(value, 'zh'), value);
  }
  assert.equal(api.categoryLabel(null, 'en'), 'Other');
  assert.equal(api.categoryLabel('Custom category', 'en'), 'Custom category');
  assert.deepEqual(api.getT('en').categories.items, api.getT('zh').categories.items);
});

test('both halls translate labels but retain stored option, filter, and publish values', () => {
  for (const kind of ['demands', 'services']) {
    const source = read(`app/[lang]/${kind}/page.tsx`);
    assert.equal(source.split('{categoryLabel(c, lang)}').length - 1, 2);
    assert.equal(source.split('<option key={c} value={c}>').length - 1, 2);
    assert.match(source, /it.category === filterCategory/);
    assert.match(source, /category: category \|\| "其他"/);
    assert.match(source, /setCategory\("其他"\)/);
    assert.match(source, /categoryLabel\(it.category, lang\)/);
    assert.match(read(`app/[lang]/${kind}/[id]/page.tsx`), /categoryLabel\(item.category, lang\)/);
  }
});
