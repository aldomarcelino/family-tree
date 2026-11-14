import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";
const root = fileURLToPath(new URL("..", import.meta.url));
function load(name) {
  const file = path.join(root, "src/services", name + ".ts");
  const compiled = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  vm.runInThisContext(`(function(module,exports){${code}\n})`, {
    filename: file,
  })(compiled, compiled.exports);
  return compiled.exports;
}
const { getKinshipLabels } = load("kinship");
const { getFocusWaveSchedule } = load("focusWave");
const family = {
  schemaVersion: 1,
  name: "Kinship fixture",
  persons: [],
  relationships: [],
  familyUnits: [],
  media: [],
  events: [],
  updatedAt: "",
};
const add = (id, gender = "male") =>
  family.persons.push({ id, fullName: id, gender, tags: [] });
const relation = (type, from, to) =>
  family.relationships.push({
    id: `${type}:${from}:${to}`,
    type,
    from,
    to,
    metadata: {},
  });
for (const id of [
  "focus",
  "father",
  "grandpa",
  "great-grandpa",
  "uncle",
  "aunt-partner",
  "cousin",
  "son",
  "grandchild",
  "nephew",
  "wife-father",
  "wife-brother",
  "besan-father",
  "disconnected",
  "explicit-nephew",
])
  add(id);
for (const id of [
  "mother",
  "grandma",
  "great-grandma",
  "aunt",
  "sister",
  "wife",
  "wife-mother",
  "daughter-in-law",
  "besan-mother",
  "explicit-sister",
])
  add(id, "female");
for (const [parent, children] of [
  ["great-grandpa", ["grandpa"]],
  ["great-grandma", ["grandpa"]],
  ["grandpa", ["father", "aunt", "uncle"]],
  ["grandma", ["father", "aunt", "uncle"]],
  ["father", ["focus", "sister"]],
  ["mother", ["focus", "sister"]],
  ["sister", ["nephew"]],
  ["aunt", ["cousin"]],
  ["wife-father", ["wife", "wife-brother"]],
  ["wife-mother", ["wife", "wife-brother"]],
  ["focus", ["son"]],
  ["wife", ["son"]],
  ["besan-father", ["daughter-in-law"]],
  ["besan-mother", ["daughter-in-law"]],
  ["son", ["grandchild"]],
  ["daughter-in-law", ["grandchild"]],
  ["explicit-sister", ["explicit-nephew"]],
])
  for (const child of children) relation("parent", parent, child);
for (const [a, b] of [
  ["father", "mother"],
  ["grandpa", "grandma"],
  ["great-grandpa", "great-grandma"],
  ["aunt", "aunt-partner"],
  ["focus", "wife"],
  ["son", "daughter-in-law"],
])
  relation("marriage", a, b);
relation("sibling", "focus", "explicit-sister");

test("Kinship includes both parental branches, collateral relatives, ancestors, and descendants", () => {
  const labels = getKinshipLabels("focus", family);
  for (const [id, label] of Object.entries({
    father: "Ayah",
    mother: "Ibu",
    sister: "Saudari",
    grandpa: "Kakek",
    grandma: "Nenek",
    "great-grandpa": "Kakek buyut",
    "great-grandma": "Nenek buyut",
    uncle: "Paman",
    aunt: "Tante",
    "aunt-partner": "Paman",
    cousin: "Sepupu",
    nephew: "Keponakan",
    son: "Anak",
    grandchild: "Cucu",
    "explicit-sister": "Saudari",
    "explicit-nephew": "Keponakan",
  }))
    assert.equal(labels.get(id), label, id);
  assert.equal(labels.get("disconnected"), undefined);
  assert.equal(labels.get("focus"), undefined);
});
test("Kinship includes spouses, in-laws, children-in-law, and parents of children-in-law", () => {
  const labels = getKinshipLabels("focus", family);
  for (const [id, label] of Object.entries({
    wife: "Istri",
    "wife-father": "Ayah mertua",
    "wife-mother": "Ibu mertua",
    "wife-brother": "Saudara ipar",
    "daughter-in-law": "Menantu",
    "besan-father": "Besan",
    "besan-mother": "Besan",
  }))
    assert.equal(labels.get(id), label, id);
  assert.equal(getKinshipLabels("wife", family).get("focus"), "Suami");
  assert.equal(getKinshipLabels("son", family).get("aunt"), "Tante buyut");
  assert.equal(getKinshipLabels("wife", family).get("father"), "Ayah mertua");
  assert.equal(
    getKinshipLabels("wife", family).get("aunt-partner"),
    "Paman dari suami",
  );
});
test("Relations are recomputed for a new focus and remain finite with imported cycles", () => {
  assert.equal(getKinshipLabels("son", family).get("focus"), "Ayah");
  assert.equal(getKinshipLabels("focus", family).get("son"), "Anak");
  const cyclic = structuredClone(family);
  cyclic.relationships.push({
    id: "cycle",
    type: "parent",
    from: "son",
    to: "grandpa",
    metadata: {},
  });
  assert.ok(getKinshipLabels("focus", cyclic) instanceof Map);
});

test("Siblings distinguish Adik, Kakak, Abang when birth dates are known and fall back to Saudara/Saudari", () => {
  const ageFamily = {
    schemaVersion: 1,
    name: "Age fixture",
    persons: [
      {
        id: "me",
        fullName: "Me",
        gender: "male",
        birthDate: "2000-01-01",
        tags: [],
      },
      {
        id: "older-brother",
        fullName: "Older Brother",
        gender: "male",
        birthDate: "1995-05-12",
        tags: [],
      },
      {
        id: "older-sister",
        fullName: "Older Sister",
        gender: "female",
        birthDate: "1998-08-20",
        tags: [],
      },
      {
        id: "younger-sister",
        fullName: "Younger Sister",
        gender: "female",
        birthDate: "2005-03-15",
        tags: [],
      },
      {
        id: "younger-brother",
        fullName: "Younger Brother",
        gender: "male",
        birthDate: "2008-11-01",
        tags: [],
      },
      {
        id: "unknown-brother",
        fullName: "Unknown Brother",
        gender: "male",
        tags: [],
      },
      {
        id: "unknown-sister",
        fullName: "Unknown Sister",
        gender: "female",
        tags: [],
      },
      {
        id: "father",
        fullName: "Father",
        gender: "male",
        birthDate: "1970-01-01",
        tags: [],
      },
    ],
    relationships: [],
    familyUnits: [],
    media: [],
    events: [],
    updatedAt: "",
  };
  for (const id of [
    "me",
    "older-brother",
    "older-sister",
    "younger-sister",
    "younger-brother",
    "unknown-brother",
    "unknown-sister",
  ]) {
    ageFamily.relationships.push({
      id: `p:${id}`,
      type: "parent",
      from: "father",
      to: id,
      metadata: {},
    });
  }
  const labels = getKinshipLabels("me", ageFamily);
  assert.equal(labels.get("older-brother"), "Abang");
  assert.equal(labels.get("older-sister"), "Kakak");
  assert.equal(labels.get("younger-sister"), "Adik");
  assert.equal(labels.get("younger-brother"), "Adik");
  assert.equal(labels.get("unknown-brother"), "Saudara");
  assert.equal(labels.get("unknown-sister"), "Saudari");

  // Check from younger sibling perspective
  const fromYoungest = getKinshipLabels("younger-brother", ageFamily);
  assert.equal(fromYoungest.get("me"), "Abang");
  assert.equal(fromYoungest.get("older-sister"), "Kakak");
  assert.equal(fromYoungest.get("younger-sister"), "Kakak");
  assert.equal(fromYoungest.get("older-brother"), "Abang");

  // Check from oldest sibling perspective
  const fromOldest = getKinshipLabels("older-brother", ageFamily);
  assert.equal(fromOldest.get("older-sister"), "Adik");
  assert.equal(fromOldest.get("me"), "Adik");
  assert.equal(fromOldest.get("younger-sister"), "Adik");
  assert.equal(fromOldest.get("younger-brother"), "Adik");
});

const nodes = ["a", "b", "child", "grandchild", "unrelated"].map((id) => ({
  id,
  type: "person",
  position: { x: 0, y: 0 },
  data: {},
}));
nodes.push({
  id: "junction:a:b",
  type: "junction",
  position: { x: 0, y: 0 },
  data: {},
});
const edges = [
  { id: "couple", source: "a", target: "b", type: "marriage" },
  { id: "child", source: "junction:a:b", target: "child", type: "smoothstep" },
  {
    id: "grandchild",
    source: "child",
    target: "grandchild",
    type: "smoothstep",
  },
];
test("Focus waves begin at the card border and spread into all connected branches", () => {
  const wave = getFocusWaveSchedule(nodes, edges, "a");
  assert.equal(wave.nodes.get("a"), 0);
  assert.equal(wave.edges.get("couple").origin, "source");
  assert.equal(wave.edges.get("couple").delay, 140);
  assert.ok(wave.edges.get("child").delay > wave.edges.get("couple").delay);
  assert.ok(wave.nodes.get("grandchild") > wave.nodes.get("child"));
  assert.equal(wave.nodes.has("unrelated"), false);
  assert.equal(wave.edges.size, edges.length);
});
test("Focusing a child reveals the parents’ couple line from its midpoint in both directions", () => {
  const wave = getFocusWaveSchedule(nodes, edges, "child");
  assert.equal(wave.edges.get("child").origin, "target");
  assert.equal(wave.edges.get("couple").origin, "middle");
  assert.equal(wave.nodes.get("a"), wave.nodes.get("b"));
  assert.ok(
    wave.edges.has("grandchild"),
    "The wave also travels down the other branch",
  );
  assert.equal(getFocusWaveSchedule(nodes, edges, null).edges.size, 0);
});

test("Mandailing partuturon mode respects patrilineal hierarchy, cross-cousins, and in-laws", () => {
  const labels = getKinshipLabels("focus", family, "mandailing");
  assert.equal(labels.get("father"), "Ayah");
  assert.equal(labels.get("mother"), "Umak");
  assert.equal(labels.get("grandpa"), "Ompung");
  assert.equal(labels.get("grandma"), "Nenek");
  assert.equal(labels.get("great-grandpa"), "Ompung Nini");
  assert.equal(labels.get("great-grandma"), "Ompung Nini");
  assert.equal(labels.get("sister"), "Ito");
  assert.equal(labels.get("son"), "Anak");
  assert.equal(labels.get("grandchild"), "Pahompu");
  assert.equal(labels.get("nephew"), "Bere"); // Child of sister (Ito) for male ego is Bere
  assert.equal(labels.get("aunt"), "Bou"); // Father's sister
  assert.equal(labels.get("cousin"), "Tunggane"); // Male cousin from Bou for male ego
  assert.equal(labels.get("wife-brother"), "Tunggane"); // Wife's brother for male ego
  assert.equal(labels.get("wife-father"), "Tulang");
  assert.equal(labels.get("wife-mother"), "Nantulang");
  assert.equal(labels.get("daughter-in-law"), "Parumaen");
});

test("Mandailing cross-cousin Pariban detection for both male and female Ego", () => {
  const customFamily = {
    schemaVersion: 1,
    name: "Cross-cousin fixture",
    persons: [
      { id: "ego-male", fullName: "Ego Male", gender: "male", tags: [] },
      { id: "ego-female", fullName: "Ego Female", gender: "female", tags: [] },
      { id: "father", fullName: "Father", gender: "male", tags: [] },
      { id: "mother", fullName: "Mother", gender: "female", tags: [] },
      {
        id: "tulang",
        fullName: "Tulang (Mother brother)",
        gender: "male",
        tags: [],
      },
      {
        id: "bou",
        fullName: "Bou (Father sister)",
        gender: "female",
        tags: [],
      },
      {
        id: "tulang-daughter",
        fullName: "Tulang Daughter",
        gender: "female",
        tags: [],
      },
      { id: "tulang-son", fullName: "Tulang Son", gender: "male", tags: [] },
      {
        id: "bou-daughter",
        fullName: "Bou Daughter",
        gender: "female",
        tags: [],
      },
      { id: "bou-son", fullName: "Bou Son", gender: "male", tags: [] },
      { id: "grandpa-pat", fullName: "Grandpa Pat", gender: "male", tags: [] },
      { id: "grandpa-mat", fullName: "Grandpa Mat", gender: "male", tags: [] },
    ],
    relationships: [
      {
        id: "r1",
        type: "parent",
        from: "father",
        to: "ego-male",
        metadata: {},
      },
      {
        id: "r2",
        type: "parent",
        from: "mother",
        to: "ego-male",
        metadata: {},
      },
      {
        id: "r3",
        type: "parent",
        from: "father",
        to: "ego-female",
        metadata: {},
      },
      {
        id: "r4",
        type: "parent",
        from: "mother",
        to: "ego-female",
        metadata: {},
      },
      // Paternal line: grandpa-pat -> father, bou
      {
        id: "r5",
        type: "parent",
        from: "grandpa-pat",
        to: "father",
        metadata: {},
      },
      {
        id: "r6",
        type: "parent",
        from: "grandpa-pat",
        to: "bou",
        metadata: {},
      },
      // Maternal line: grandpa-mat -> mother, tulang
      {
        id: "r7",
        type: "parent",
        from: "grandpa-mat",
        to: "mother",
        metadata: {},
      },
      {
        id: "r8",
        type: "parent",
        from: "grandpa-mat",
        to: "tulang",
        metadata: {},
      },
      // Bou children
      {
        id: "r9",
        type: "parent",
        from: "bou",
        to: "bou-daughter",
        metadata: {},
      },
      { id: "r10", type: "parent", from: "bou", to: "bou-son", metadata: {} },
      // Tulang children
      {
        id: "r11",
        type: "parent",
        from: "tulang",
        to: "tulang-daughter",
        metadata: {},
      },
      {
        id: "r12",
        type: "parent",
        from: "tulang",
        to: "tulang-son",
        metadata: {},
      },
    ],
    familyUnits: [],
    media: [],
    events: [],
    updatedAt: "",
  };

  // For Ego Male:
  // - Tulang's daughter is Pariban (can marry)
  // - Tulang's son is Tunggane / Lae
  // - Bou's daughter is Ito
  // - Bou's son is Tunggane / Lae
  const maleLabels = getKinshipLabels("ego-male", customFamily, "mandailing");
  assert.equal(maleLabels.get("tulang-daughter"), "Pariban");
  assert.equal(maleLabels.get("tulang-son"), "Tunggane");
  assert.equal(maleLabels.get("bou-daughter"), "Ito");
  assert.equal(maleLabels.get("bou-son"), "Tunggane");

  // For Ego Female:
  // - Bou's son is Pariban (can marry)
  // - Bou's daughter is Eda
  // - Tulang's son is Ito
  // - Tulang's daughter is Eda
  const femaleLabels = getKinshipLabels(
    "ego-female",
    customFamily,
    "mandailing",
  );
  assert.equal(femaleLabels.get("bou-son"), "Pariban");
  assert.equal(femaleLabels.get("bou-daughter"), "Eda");
  assert.equal(femaleLabels.get("tulang-son"), "Ito");
  assert.equal(femaleLabels.get("tulang-daughter"), "Eda");
});

test("Javanese mode respects kejawen kinship terms", () => {
  const labels = getKinshipLabels("focus", family, "jawa");
  assert.equal(labels.get("father"), "Bapak");
  assert.equal(labels.get("mother"), "Ibu");
  assert.equal(labels.get("grandpa"), "Mbah Kakung");
  assert.equal(labels.get("grandma"), "Mbah Putri");
  assert.equal(labels.get("great-grandpa"), "Mbah Buyut (Kakung)");
  assert.equal(labels.get("great-grandma"), "Mbah Buyut (Putri)");
  assert.equal(labels.get("son"), "Anak Lanang");
  assert.equal(labels.get("grandchild"), "Putu");
  assert.equal(labels.get("nephew"), "Ponakan");
  assert.equal(labels.get("wife"), "Garwa (Putri)");
  assert.equal(labels.get("wife-father"), "Bapak Maratuwa");
  assert.equal(labels.get("wife-mother"), "Ibu Maratuwa");
  assert.equal(labels.get("daughter-in-law"), "Mantu");
  assert.equal(labels.get("besan-father"), "Besan");
  assert.equal(labels.get("besan-mother"), "Besan");
});

test("Batak Toba and Mandailing keep separate labels and cache entries", () => {
  const mandailing = getKinshipLabels("focus", family, "mandailing");
  const batak = getKinshipLabels("focus", family, "batak");
  for (const [id, expected] of Object.entries({
    father: "Amang",
    mother: "Inang",
    aunt: "Namboru",
    cousin: "Lae",
    "wife-brother": "Lae",
    "wife-father": "Tulang / Simatua Doli",
    "wife-mother": "Nantulang / Simatua Boru",
    "aunt-partner": "Amangboru",
  }))
    assert.equal(batak.get(id), expected, id);
  assert.equal(mandailing.get("father"), "Ayah");
  assert.equal(mandailing.get("aunt"), "Bou");
  assert.equal(mandailing.get("wife-brother"), "Tunggane");
  assert.equal(getKinshipLabels("focus", family, "mandailing"), mandailing);
  assert.notEqual(batak, mandailing);
  assert.equal(getKinshipLabels("son", family, "batak").get("focus"), "Amang");
});
