import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const resolvePackage = createRequire(import.meta.url);
// Load the production TypeScript service with its existing @/ imports.
const root = fileURLToPath(new URL('..', import.meta.url));
const modules = new Map();
function load(file) {
  if (modules.has(file)) return modules.get(file).exports;
  const compiledModule = { exports: {} };
  modules.set(file, compiledModule);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const localRequire = (id) => id.startsWith('@/')
    ? load(path.join(root, id.slice(2)) + '.ts') : resolvePackage(id);
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(localRequire, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const { getTreeLayout } = load(path.join(root, 'src/services/layoutEngine.ts'));
const { sampleFamily } = load(path.join(root, 'src/data/sampleFamily.ts'));
const layout = (family, mode = 'full', focus = null, collapsed = new Set(), manual = 'auto') =>
  getTreeLayout(family, mode, focus, () => {}, undefined, undefined, undefined, collapsed, undefined, manual);

function fixture(depthA, depthB) {
  const family = { schemaVersion: 1, name: 'Layout fixture', persons: [], relationships: [], familyUnits: [], media: [], events: [], updatedAt: '' };
  const person = (id) => family.persons.push({ id, fullName: id, gender: 'male', tags: [] });
  const relation = (type, from, to) => family.relationships.push({ id: `${type}:${from}:${to}`, type, from, to, metadata: {} });
  const lineage = (prefix, depth) => {
    for (let generation = 0; generation < depth; generation += 1) {
      const a = `${prefix}-${generation}`, b = `${a}-spouse`;
      person(a); person(b); relation('marriage', a, b);
      if (generation > 0) {
        relation('parent', `${prefix}-${generation - 1}`, a);
        relation('parent', `${prefix}-${generation - 1}-spouse`, a);
      }
    }
    const siblings = Array.from({ length: 5 }, (_, index) => `${prefix}-child-${index}`);
    for (const child of siblings) {
      person(child);
      relation('parent', `${prefix}-${depth - 1}`, child);
      relation('parent', `${prefix}-${depth - 1}-spouse`, child);
    }
    return siblings;
  };
  const a = lineage('a', depthA), b = lineage('b', depthB);
  relation('marriage', a[4], b[0]);
  person('shared-child');
  relation('parent', a[4], 'shared-child'); relation('parent', b[0], 'shared-child');
  return { family, a, b };
}

function checkGeometry(family, result, complete = true) {
  const nodes = new Map(result.nodes.map((node) => [node.id, node]));
  const people = result.nodes.filter((node) => node.type === 'person');
  if (complete) assert.equal(people.length, family.persons.length, 'Every member is retained');
  for (const person of people) {
    assert.ok(Number.isFinite(person.position.x) && Number.isFinite(person.position.y));
    for (const other of people) {
      if (person.id >= other.id || person.position.y !== other.position.y) continue;
      assert.ok(Math.abs(person.position.x - other.position.x) >= 236, `Overlapping cards: ${person.id}, ${other.id}`);
    }
  }
  for (const edge of result.edges) assert.ok(nodes.has(edge.source) && nodes.has(edge.target), 'All visible edges have visible endpoints');
  for (const relation of family.relationships) {
    const a = nodes.get(relation.from), b = nodes.get(relation.to);
    if (!a || !b) continue;
    if (relation.type === 'marriage') assert.equal(a.position.y, b.position.y, 'Spouses share a row');
    if (['parent', 'adoption', 'stepParent'].includes(relation.type)) assert.ok(a.position.y < b.position.y, 'Parents are above their children');
  }
  return (id) => nodes.get(id).position;
}

for (const [depthA, depthB] of [[1, 2], [6, 2], [7, 7]]) {
  test(`Connected ancestral families remain distinct at depths ${depthA} and ${depthB}`, () => {
    const { family, a, b } = fixture(depthA, depthB);
    const result = layout(family);
    const position = checkGeometry(family, result);
    const range = (ids) => [Math.min(...ids.map((id) => position(id).x)), Math.max(...ids.map((id) => position(id).x)) + 236];
    const [aMin, aMax] = range(a), [bMin, bMax] = range(b);
    assert.ok(aMax < bMin || bMax < aMin, 'Sibling blocks from different families do not interleave');
    assert.equal(new Set([...a, ...b].map((id) => position(id).y)).size, 1, 'Connecting spouses and all their siblings share a generation');
    const center = (position(a[4]).x + position(b[0]).x) / 2;
    assert.equal(position('shared-child').x, center, 'Shared child is centered below the connecting couple');
    for (const rel of family.relationships.filter((rel) => rel.type === 'parent')) {
      assert.equal(position(rel.to).y - position(rel.from).y, 240, 'Shorter ancestry does not leave empty generation gaps');
    }
  });
}

test('Shuffled input keeps sibling blocks, additional descendants, and unrelated trees intact', () => {
  const { family, a, b } = fixture(5, 7);
  for (let index = 0; index < 4; index += 1) {
    const id = `grandchild-${index}`;
    family.persons.push({ id, fullName: id, gender: 'female', tags: [] });
    family.relationships.push({ id: `grandchild-link-${index}`, type: index === 0 ? 'adoption' : 'parent', from: a[index % 2], to: id, metadata: {} });
  }
  family.persons.push({ id: 'unrelated', fullName: 'Unrelated', gender: 'female', tags: [] });
  family.persons.sort((a, b) => a.id.localeCompare(b.id));
  const position = checkGeometry(family, layout(family));
  const aX = a.map((id) => position(id).x), bX = b.map((id) => position(id).x);
  assert.ok(Math.max(...aX) < Math.min(...bX) || Math.max(...bX) < Math.min(...aX));
});

test('Sample data, filtered views, collapsed branches, and manual coordinates still work', () => {
  checkGeometry(sampleFamily, layout(sampleFamily));
  const focus = sampleFamily.persons[0].id;
  for (const mode of ['ancestor', 'descendant', 'branch']) {
    const result = layout(sampleFamily, mode, focus);
    const ids = new Set(result.nodes.map((node) => node.id));
    for (const edge of result.edges) assert.ok(ids.has(edge.source) && ids.has(edge.target));
  }
  checkGeometry(sampleFamily, layout(sampleFamily, 'full', focus, new Set([focus])), false);
  const family = structuredClone(sampleFamily);
  family.persons[0].layout = { x: 123, y: 456 };
  assert.deepEqual(layout(family, 'full', focus, new Set(), 'manual').nodes.find((node) => node.id === focus).position, { x: 123, y: 456 });
});

test('Two spouses flank their shared partner and never cover the other marriage or child junction', () => {
  for (const reverse of [false, true]) {
    const { family } = fixture(1, 2);
    const shared = 'b-0';
    const originalSpouse = 'b-0-spouse';
    const secondSpouse = 'additional-spouse';
    family.persons.push({ id: secondSpouse, fullName: secondSpouse, gender: 'female', tags: [] });
    family.relationships.push({ id: 'second-marriage', type: 'marriage', from: shared, to: secondSpouse, metadata: {} });
    if (reverse) { family.persons.reverse(); family.relationships.reverse(); }
    const result = layout(family);
    const position = checkGeometry(family, result);
    const x = position(shared).x;
    assert.ok((position(originalSpouse).x < x && x < position(secondSpouse).x) ||
      (position(secondSpouse).x < x && x < position(originalSpouse).x), 'The shared partner is in the middle');
    for (const edge of result.edges.filter((edge) => edge.type === 'marriage')) {
      const left = Math.min(position(edge.source).x, position(edge.target).x) + 236;
      const right = Math.max(position(edge.source).x, position(edge.target).x);
      for (const node of result.nodes.filter((node) => node.type === 'person' && node.position.y === position(edge.source).y)) {
        assert.ok(node.position.x + 236 <= left || node.position.x >= right, 'No marriage line passes through another card');
      }
    }
    const child = position('b-1');
    assert.equal(child.x, (position(shared).x + position(originalSpouse).x) / 2, 'Children remain below their actual parents, not the whole three-person group');
  }
});

test('Children from two marriages remain separate blocks, including interleaved import order', () => {
  const { family } = fixture(1, 1);
  const shared = 'a-0', first = 'a-0-spouse', second = 'second-spouse';
  family.persons.push({ id: second, fullName: second, gender: 'female', tags: [] });
  family.relationships.push({ id: 'another-marriage', type: 'marriage', from: shared, to: second, metadata: {} });
  const children = [];
  for (let index = 0; index < 3; index += 1) {
    const id = `second-child-${index}`;
    children.push(id);
    family.persons.splice(index * 3, 0, { id, fullName: id, gender: 'male', tags: [] });
    for (const parent of [shared, second]) family.relationships.push({ id: `${parent}:${id}`, type: 'parent', from: parent, to: id, metadata: {} });
  }
  const result = layout(family);
  const position = checkGeometry(family, result);
  const firstChildren = family.relationships.filter((relation) => relation.type === 'parent' && relation.from === first).map((relation) => relation.to);
  const firstX = firstChildren.map((id) => position(id).x), secondX = children.map((id) => position(id).x);
  assert.ok(Math.max(...firstX) < Math.min(...secondX) || Math.max(...secondX) < Math.min(...firstX), 'Half-siblings are grouped by their actual parent pair');
  const spouseOrder = position(first).x < position(second).x;
  assert.equal(Math.min(...firstX) < Math.min(...secondX), spouseOrder, 'Child groups follow their respective parents');
});

test('Adding ancestors to one spouse keeps the full two-spouse group together', () => {
  const { family } = fixture(1, 2);
  const husband = 'b-0', wife = 'b-0-spouse', second = 'additional-spouse';
  for (const id of [second, 'new-grandfather', 'new-grandmother']) {
    family.persons.push({ id, fullName: id, gender: 'female', tags: [] });
  }
  family.relationships.push(
    { id: 'second-marriage', type: 'marriage', from: husband, to: second, metadata: {} },
    { id: 'grandparent-couple', type: 'marriage', from: 'new-grandfather', to: 'new-grandmother', metadata: {} },
    ...['new-grandfather', 'new-grandmother'].map((from) => ({ id: `${from}:${wife}`, type: 'parent', from, to: wife, metadata: {} })),
  );
  for (const reverse of [false, true]) {
    if (reverse) { family.persons.reverse(); family.relationships.reverse(); }
    const position = checkGeometry(family, layout(family));
    assert.equal(Math.abs(position(husband).x - position(wife).x), 304, 'Ancestry does not pull spouses into separate lanes');
    assert.equal(Math.abs(position(husband).x - position(second).x), 304, 'The second spouse remains beside the shared partner');
    assert.ok((position(wife).x - position(husband).x) * (position(second).x - position(husband).x) < 0);
    assert.equal(position('b-1').x, (position(husband).x + position(wife).x) / 2);
  }
});

test('Every sibling can marry into another recorded family without marriage lines crossing cards', () => {
  const { family, a } = fixture(5, 7);
  const coupleIds = [];
  for (let index = 0; index < 4; index += 1) {
    const spouse = `inlaw-${index}`, parent = `inlaw-parent-${index}`, grandparent = `inlaw-grandparent-${index}`;
    for (const id of [spouse, parent, grandparent]) family.persons.push({ id, fullName: id, gender: 'female', tags: [] });
    family.relationships.push(
      { id: `inlaw-marriage-${index}`, type: 'marriage', from: a[index], to: spouse, metadata: {} },
      { id: `inlaw-parent-${index}`, type: 'parent', from: parent, to: spouse, metadata: {} },
      { id: `inlaw-ancestor-${index}`, type: 'parent', from: grandparent, to: parent, metadata: {} },
    );
    coupleIds.push([a[index], spouse]);
  }
  const additional = 'another-inlaw';
  family.persons.push({ id: additional, fullName: additional, gender: 'female', tags: [] });
  family.relationships.push({ id: 'another-inlaw-marriage', type: 'marriage', from: a[3], to: additional, metadata: {} });
  coupleIds.push([a[3], additional]);
  const result = layout(family);
  const position = checkGeometry(family, result);
  for (const [a, b] of coupleIds) assert.equal(Math.abs(position(a).x - position(b).x), 304, 'Each spouse is directly beside their partner');
  for (const edge of result.edges.filter((edge) => edge.type === 'marriage')) {
    const a = position(edge.source), b = position(edge.target);
    for (const person of result.nodes.filter((node) => node.type === 'person' && node.id !== edge.source && node.id !== edge.target && node.position.y === a.y)) {
      assert.ok(person.position.x + 236 <= Math.min(a.x, b.x) + 236 || person.position.x >= Math.max(a.x, b.x), 'Marriage does not cross another card');
    }
  }
});

test('A single color is shared by all family connections across view modes', () => {
  const { family, a } = fixture(2, 3);
  const { getFamilyLineGroups } = load(path.join(root, 'src/services/familyLineColors.ts'));
  const before = getFamilyLineGroups(family);
  assert.deepEqual([...new Set(before.groups.map((group) => group.color))], ['#a1a1aa'], 'All families use the same line color');
  const firstCouple = before.relationshipGroups.get('marriage:a-0:a-0-spouse');
  assert.equal(before.relationshipGroups.get('parent:a-0:a-1').id, firstCouple.id);
  for (const mode of ['full', 'ancestor', 'descendant', 'branch']) {
    const result = layout(family, mode, a[4]);
    for (const edge of result.edges) {
      assert.ok(edge.data?.familyColor, `${mode}: every relationship has a family color`);
      assert.equal(edge.style.stroke, edge.data.familyColor);
    }
    for (const junction of result.nodes.filter((node) => node.type === 'junction')) {
      const couple = result.edges.find((edge) => edge.type === 'marriage' && junction.id.includes(edge.source) && junction.id.includes(edge.target));
      for (const edge of result.edges.filter((edge) => edge.source === junction.id)) assert.equal(edge.data.familyColor, couple.data.familyColor, 'Couple and children share a color');
    }
  }
  family.persons.push({ id: 'new-person', fullName: 'New member', gender: 'female', tags: [] },
    { id: 'another-new-person', fullName: 'Another new member', gender: 'male', tags: [] });
  family.relationships.push({ id: 'new-family', type: 'parent', from: 'new-person', to: 'another-new-person', metadata: {} });
  const after = getFamilyLineGroups(family);
  for (const group of before.groups) assert.equal(after.groups.find((candidate) => candidate.id === group.id).color, group.color, 'Appending another family keeps existing colors');
});

function countLineageCrossings(family, result) {
  const position = new Map(result.nodes.filter((node) => node.type === 'person').map((node) => [node.id, node.position]));
  const parents = new Map();
  for (const relation of family.relationships.filter((relation) => ['parent', 'adoption', 'stepParent'].includes(relation.type))) {
    parents.set(relation.to, [...(parents.get(relation.to) ?? []), relation.from]);
  }
  const links = [...parents].map(([child, ids]) => ({
    sourceX: ids.reduce((sum, id) => sum + position.get(id).x, 0) / ids.length,
    targetX: position.get(child).x, sourceY: position.get(ids[0]).y, targetY: position.get(child).y,
  }));
  let count = 0;
  for (let a = 0; a < links.length; a += 1) for (let b = a + 1; b < links.length; b += 1) {
    const first = links[a], second = links[b];
    if (first.sourceY === second.sourceY && first.targetY === second.targetY &&
      (first.sourceX - second.sourceX) * (first.targetX - second.targetX) < -.001) count += 1;
  }
  return count;
}

test('Several generations of intermarried families minimize crossings without splitting couples', () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(root, 'scripts/fixtures/intermarried-generations.json'), 'utf8'));
  const family = { schemaVersion: 1, name: 'Anonymous complex topology', persons: fixture.genders.map((gender, index) =>
    ({ id: `p${index + 1}`, fullName: `Member ${index + 1}`, gender, tags: [], layout: { x: 0, y: 0 } })),
    relationships: fixture.relationships.map(([type, from, to], index) => ({ id: `r${index}`, type, from, to, metadata: {} })),
    familyUnits: [], media: [], events: [], updatedAt: '' };
  const result = layout(family);
  const position = checkGeometry(family, result);
  assert.ok(countLineageCrossings(family, result) <= 3, 'The 40-member regression had 27 crossings before ordering whole family layers');
  for (const relation of family.relationships.filter((relation) => relation.type === 'marriage')) {
    assert.ok(Math.abs(Math.abs(position(relation.from).x - position(relation.to).x) - 304) < .001, 'Partners remain adjacent');
  }
  const repeated = layout(family);
  assert.deepEqual(result.nodes.map((node) => [node.id, node.position]), repeated.nodes.map((node) => [node.id, node.position]), 'Automatic arrangement is deterministic');
  const shuffled = structuredClone(family);
  shuffled.persons.reverse(); shuffled.relationships.reverse();
  checkGeometry(shuffled, layout(shuffled));
  assert.ok(countLineageCrossings(shuffled, layout(shuffled)) <= 5, 'Input order does not bring back the tangled layout');
});
