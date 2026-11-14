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
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInThisContext(`(function(module,exports){${code}\n})`, { filename: file })(compiled, compiled.exports);
  return compiled.exports;
}
const { getKinshipLabels } = load('kinship');
const { getFocusWaveSchedule } = load('focusWave');
const family = { schemaVersion: 1, name: 'Kinship fixture', persons: [], relationships: [], familyUnits: [], media: [], events: [], updatedAt: '' };
const add = (id, gender = 'male') => family.persons.push({ id, fullName: id, gender, tags: [] });
const relation = (type, from, to) => family.relationships.push({ id: `${type}:${from}:${to}`, type, from, to, metadata: {} });
for (const id of ['focus','father','grandpa','great-grandpa','uncle','aunt-partner','cousin','son','grandchild','nephew','wife-father','wife-brother','besan-father','disconnected','explicit-nephew']) add(id);
for (const id of ['mother','grandma','great-grandma','aunt','sister','wife','wife-mother','daughter-in-law','besan-mother','explicit-sister']) add(id,'female');
for (const [parent, children] of [['great-grandpa',['grandpa']],['great-grandma',['grandpa']],['grandpa',['father','aunt','uncle']],['grandma',['father','aunt','uncle']],['father',['focus','sister']],['mother',['focus','sister']],['sister',['nephew']],['aunt',['cousin']],['wife-father',['wife','wife-brother']],['wife-mother',['wife','wife-brother']],['focus',['son']],['wife',['son']],['besan-father',['daughter-in-law']],['besan-mother',['daughter-in-law']],['son',['grandchild']],['daughter-in-law',['grandchild']],['explicit-sister',['explicit-nephew']]]) for (const child of children) relation('parent',parent,child);
for (const [a,b] of [['father','mother'],['grandpa','grandma'],['great-grandpa','great-grandma'],['aunt','aunt-partner'],['focus','wife'],['son','daughter-in-law']]) relation('marriage',a,b);
relation('sibling','focus','explicit-sister');

test('Kinship includes both parental branches, collateral relatives, ancestors, and descendants', () => {
 const labels = getKinshipLabels('focus',family);
 for (const [id,label] of Object.entries({father:'Ayah',mother:'Ibu',sister:'Saudari',grandpa:'Kakek',grandma:'Nenek','great-grandpa':'Kakek buyut','great-grandma':'Nenek buyut',uncle:'Paman',aunt:'Tante','aunt-partner':'Paman',cousin:'Sepupu',nephew:'Keponakan',son:'Anak',grandchild:'Cucu','explicit-sister':'Saudari','explicit-nephew':'Keponakan'})) assert.equal(labels.get(id),label,id);
 assert.equal(labels.get('disconnected'),undefined);
 assert.equal(labels.get('focus'),undefined);
});
test('Kinship includes spouses, in-laws, children-in-law, and parents of children-in-law', () => {
 const labels=getKinshipLabels('focus',family);
 for(const [id,label] of Object.entries({wife:'Istri','wife-father':'Ayah mertua','wife-mother':'Ibu mertua','wife-brother':'Saudara ipar','daughter-in-law':'Menantu','besan-father':'Besan','besan-mother':'Besan'}))assert.equal(labels.get(id),label,id);
 assert.equal(getKinshipLabels('wife',family).get('focus'),'Suami');
 assert.equal(getKinshipLabels('son',family).get('aunt'),'Tante buyut');
 assert.equal(getKinshipLabels('wife',family).get('father'),'Ayah mertua');
 assert.equal(getKinshipLabels('wife',family).get('aunt-partner'),'Paman dari suami');
});
test('Relations are recomputed for a new focus and remain finite with imported cycles', () => {
 assert.equal(getKinshipLabels('son',family).get('focus'),'Ayah');
 assert.equal(getKinshipLabels('focus',family).get('son'),'Anak');
 const cyclic=structuredClone(family); cyclic.relationships.push({id:'cycle',type:'parent',from:'son',to:'grandpa',metadata:{}});
 assert.ok(getKinshipLabels('focus',cyclic) instanceof Map);
});

test('Siblings distinguish Adik, Kakak, Abang when birth dates are known and fall back to Saudara/Saudari', () => {
 const ageFamily = { schemaVersion: 1, name: 'Age fixture', persons: [
   { id: 'me', fullName: 'Me', gender: 'male', birthDate: '2000-01-01', tags: [] },
   { id: 'older-brother', fullName: 'Older Brother', gender: 'male', birthDate: '1995-05-12', tags: [] },
   { id: 'older-sister', fullName: 'Older Sister', gender: 'female', birthDate: '1998-08-20', tags: [] },
   { id: 'younger-sister', fullName: 'Younger Sister', gender: 'female', birthDate: '2005-03-15', tags: [] },
   { id: 'younger-brother', fullName: 'Younger Brother', gender: 'male', birthDate: '2008-11-01', tags: [] },
   { id: 'unknown-brother', fullName: 'Unknown Brother', gender: 'male', tags: [] },
   { id: 'unknown-sister', fullName: 'Unknown Sister', gender: 'female', tags: [] },
   { id: 'father', fullName: 'Father', gender: 'male', birthDate: '1970-01-01', tags: [] },
 ], relationships: [], familyUnits: [], media: [], events: [], updatedAt: '' };
 for (const id of ['me','older-brother','older-sister','younger-sister','younger-brother','unknown-brother','unknown-sister']) {
   ageFamily.relationships.push({ id: `p:${id}`, type: 'parent', from: 'father', to: id, metadata: {} });
 }
 const labels = getKinshipLabels('me', ageFamily);
 assert.equal(labels.get('older-brother'), 'Abang');
 assert.equal(labels.get('older-sister'), 'Kakak');
 assert.equal(labels.get('younger-sister'), 'Adik');
 assert.equal(labels.get('younger-brother'), 'Adik');
 assert.equal(labels.get('unknown-brother'), 'Saudara');
 assert.equal(labels.get('unknown-sister'), 'Saudari');

 // Check from younger sibling perspective
 const fromYoungest = getKinshipLabels('younger-brother', ageFamily);
 assert.equal(fromYoungest.get('me'), 'Abang');
 assert.equal(fromYoungest.get('older-sister'), 'Kakak');
 assert.equal(fromYoungest.get('younger-sister'), 'Kakak');
 assert.equal(fromYoungest.get('older-brother'), 'Abang');

 // Check from oldest sibling perspective
 const fromOldest = getKinshipLabels('older-brother', ageFamily);
 assert.equal(fromOldest.get('older-sister'), 'Adik');
 assert.equal(fromOldest.get('me'), 'Adik');
 assert.equal(fromOldest.get('younger-sister'), 'Adik');
 assert.equal(fromOldest.get('younger-brother'), 'Adik');
});

const nodes = ['a','b','child','grandchild','unrelated'].map(id=>({id,type:'person',position:{x:0,y:0},data:{}}));
nodes.push({id:'junction:a:b',type:'junction',position:{x:0,y:0},data:{}});
const edges=[{id:'couple',source:'a',target:'b',type:'marriage'},{id:'child',source:'junction:a:b',target:'child',type:'smoothstep'},{id:'grandchild',source:'child',target:'grandchild',type:'smoothstep'}];
test('Focus waves begin at the card border and spread into all connected branches',()=>{
 const wave=getFocusWaveSchedule(nodes,edges,'a');
 assert.equal(wave.nodes.get('a'),0);
 assert.equal(wave.edges.get('couple').origin,'source');
 assert.equal(wave.edges.get('couple').delay,140);
 assert.ok(wave.edges.get('child').delay>wave.edges.get('couple').delay);
 assert.ok(wave.nodes.get('grandchild')>wave.nodes.get('child'));
 assert.equal(wave.nodes.has('unrelated'),false);
 assert.equal(wave.edges.size,edges.length);
});
test('Focusing a child reveals the parents’ couple line from its midpoint in both directions',()=>{
 const wave=getFocusWaveSchedule(nodes,edges,'child');
 assert.equal(wave.edges.get('child').origin,'target');
 assert.equal(wave.edges.get('couple').origin,'middle');
 assert.equal(wave.nodes.get('a'),wave.nodes.get('b'));
 assert.ok(wave.edges.has('grandchild'),'The wave also travels down the other branch');
 assert.equal(getFocusWaveSchedule(nodes,edges,null).edges.size,0);
});
