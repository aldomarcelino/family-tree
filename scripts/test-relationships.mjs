import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const root = fileURLToPath(new URL('..', import.meta.url));
function load(name) {
  const file = path.join(root, 'src/services', name + '.ts');
  const compiled = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInThisContext(`(function(module,exports){${code}\n})`, { filename: file })(compiled, compiled.exports);
  return compiled.exports;
}
const { getRelationshipError: error, canBeCoParent, hasParentLink } = load('relationshipEligibility');
const { getPersonInitials } = load('personInitials');
const rel = (type, from, to) => ({ id: `${type}:${from}:${to}`, type, from, to, metadata: {} });
const relationships = [rel('parent', 'grandparent', 'parent'), rel('parent', 'parent', 'child'),
  rel('parent', 'parent', 'sibling'), rel('marriage', 'parent', 'spouse'), rel('adoption', 'child', 'adopted'),
  rel('stepParent', 'adopted', 'stepchild'), rel('sibling', 'parent', 'aunt')];

test('Ancestors and descendants are excluded for all conflicting roles, including adoptive/step lineages', () => {
  for (const role of ['child', 'parent', 'spouse', 'sibling']) {
    assert.ok(error('child', 'grandparent', role, relationships));
    assert.ok(error('grandparent', 'child', role, relationships));
    assert.ok(error('parent', 'stepchild', role, relationships));
    assert.ok(error('parent', 'parent', role, relationships));
  }
});
test('Duplicate, sibling, and spouse conflicts are excluded; unrelated members and additional spouses remain available', () => {
  assert.ok(error('parent', 'spouse', 'spouse', relationships));
  assert.ok(error('parent', 'spouse', 'child', relationships));
  for (const role of ['parent', 'child', 'spouse', 'sibling']) assert.ok(error('child', 'sibling', role, relationships));
  assert.ok(error('parent', 'aunt', 'spouse', relationships));
  for (const role of ['parent', 'child', 'spouse', 'sibling']) assert.equal(error('parent', 'unrelated', role, relationships), null);
  assert.equal(error('parent', 'second-spouse', 'spouse', relationships), null);
});
test('Co-parent choices exclude self, ancestors, descendants, and siblings while preserving spouses', () => {
  assert.equal(canBeCoParent('child', 'grandparent', relationships), false);
  assert.equal(canBeCoParent('child', 'sibling', relationships), false);
  assert.equal(canBeCoParent('parent', 'child', relationships), false);
  assert.equal(canBeCoParent('parent', 'parent', relationships), false);
  assert.equal(canBeCoParent('parent', 'spouse', relationships), true);
  assert.equal(canBeCoParent('parent', 'unrelated', relationships), true);
  assert.equal(hasParentLink('parent', 'child', relationships), true);
});
test('Deep ancestry and cyclic imports terminate safely', () => {
  const deep = Array.from({ length: 20 }, (_, index) => rel('parent', String(index), String(index + 1)));
  assert.ok(error('20', '0', 'child', deep));
  assert.equal(error('20', 'unrelated', 'child', [...deep, rel('parent', '20', '0')]), null);
});
test('Initials use two letters for a single word and two initial letters for multiple words', () => {
  assert.equal(getPersonInitials('Soehodo'), 'SO');
  assert.equal(getPersonInitials('  mbah   uti '), 'MU');
  assert.equal(getPersonInitials('A'), 'A');
  assert.equal(getPersonInitials('Émile'), 'ÉM');
  assert.equal(getPersonInitials(''), '?');
});

test('Generation filtering follows spouse branches and still permits an unrecorded parent of a partner’s child', () => {
  const family = [...relationships, rel('parent', 'spouse-father', 'spouse'),
    rel('parent', 'spouse', 'partner-child'), rel('parent', 'spouse-father', 'partner-sibling')];
  assert.ok(error('parent', 'spouse-father', 'child', family), 'Father-in-law cannot be selected as a child');
  assert.ok(error('parent', 'partner-sibling', 'child', family), 'Same-generation members cannot be selected as children');
  assert.equal(canBeCoParent('parent', 'spouse-father', family), false);
  assert.equal(canBeCoParent('parent', 'partner-sibling', family), true);
  assert.equal(error('parent', 'partner-child', 'child', family), null, 'An existing partner’s child can gain the missing parent link');
});

test('Spouse and co-parent candidates exclude the same gender in both directions', () => {
  const persons = [{ id: 'woman', gender: 'female' }, { id: 'other-woman', gender: 'female' },
    { id: 'man', gender: 'male' }, { id: 'other-man', gender: 'male' }];
  assert.ok(error('woman', 'other-woman', 'spouse', [], persons));
  assert.ok(error('man', 'other-man', 'spouse', [], persons));
  assert.equal(error('woman', 'man', 'spouse', [], persons), null);
  assert.equal(error('man', 'woman', 'spouse', [], persons), null);
  assert.equal(canBeCoParent('woman', 'other-woman', [], persons), false);
  assert.equal(canBeCoParent('man', 'other-man', [], persons), false);
  assert.equal(canBeCoParent('woman', 'man', [], persons), true);
  for (const role of ['child', 'parent', 'sibling']) assert.equal(error('woman', 'other-woman', role, [], persons), null);
  const { getSpouseGenderError } = load('relationshipEligibility');
  assert.ok(getSpouseGenderError('female', 'female'));
  assert.ok(getSpouseGenderError('male', 'male'));
  assert.equal(getSpouseGenderError('female', 'male'), null);
});
