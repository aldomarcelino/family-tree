import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import ts from "typescript";
import { loadService } from "./load-service.mjs";

const { getKinshipLabels, comparePersonAges, tuturOptions } = loadService("kinship");
const { traditions } = loadService("kinship/registry");
const { getFamilyGraph } = loadService("kinship/graph");
const modes = ["indonesia", "mandailing", "batak", "jawa"];
const family = () => ({
  schemaVersion: 1, name: "Isolated traditions", familyUnits: [], media: [], events: [], updatedAt: "",
  persons: [
    { id: "father", fullName: "Father", gender: "male", tags: [] },
    { id: "focus", fullName: "Focus", gender: "male", tags: [] },
  ],
  relationships: [{ id: "parent", type: "parent", from: "father", to: "focus", metadata: {} }],
});

test("Each tradition owns every rule without importing or inheriting another tradition", () => {
  for (const mode of modes) {
    const url = new URL(`../src/services/kinship/traditions/${mode}.ts`, import.meta.url);
    const source = ts.createSourceFile(url.pathname, fs.readFileSync(url, "utf8"), ts.ScriptTarget.Latest, true);
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement)) continue;
      assert.ok([
        "@/src/services/kinship/types",
        "@/src/services/kinship/age",
      ].includes(statement.moduleSpecifier.text), `${mode} must not depend on another tradition or registry`);
    }
    const declaration = source.statements.flatMap((statement) => ts.isVariableStatement(statement)
      ? [...statement.declarationList.declarations] : []).find((declaration) => declaration.name.getText(source) === mode);
    assert.ok(declaration && ts.isObjectLiteralExpression(declaration.initializer));
    assert.ok(declaration.initializer.properties.every((property) => !ts.isSpreadAssignment(property)), `${mode} must define its own rules`);
  }
});

test("Changing one tradition's rule never changes the other three", () => {
  for (const editedMode of modes) {
    const original = traditions[editedMode].ancestor;
    try {
      traditions[editedMode].ancestor = () => `Edited ${editedMode}`;
      const data = family();
      for (const mode of modes) {
        const expected = mode === editedMode ? `Edited ${editedMode}` : {
          indonesia: "Ayah", mandailing: "Ayah", batak: "Amang", jawa: "Bapak",
        }[mode];
        assert.equal(getKinshipLabels("focus", data, mode).get("father"), expected);
      }
    } finally {
      traditions[editedMode].ancestor = original;
    }
  }
});

test("The selector and TuturMode registry have one entry for every tradition", () => {
  assert.deepEqual(tuturOptions, modes.map((id) => ({ id, name: traditions[id].name })));
});

test("Graph and distance indices are reused across focuses and modes, and replaced for new family data", () => {
  const data = family();
  const graph = getFamilyGraph(data);
  const ancestors = graph.ancestorDistances("focus");
  for (const mode of modes) {
    getKinshipLabels("focus", data, mode);
    getKinshipLabels("father", data, mode);
    assert.equal(getFamilyGraph(data), graph);
    assert.equal(graph.ancestorDistances("focus"), ancestors);
  }
  const updated = { ...data, persons: [...data.persons, { id: "child", fullName: "Child", gender: "female", tags: [] }],
    relationships: [...data.relationships, { id: "new", type: "parent", from: "focus", to: "child", metadata: {} }] };
  assert.notEqual(getFamilyGraph(updated), graph);
  assert.equal(getKinshipLabels("focus", updated).get("child"), "Anak");
  assert.equal(getKinshipLabels("focus", data).has("child"), false);
});

test("Missing focus, disconnected people, and dangling relationships produce no invented labels", () => {
  const data = family();
  data.persons.push({ id: "stranger", fullName: "Stranger", gender: "female", tags: [] });
  data.relationships.push({ id: "dangling", type: "parent", from: "missing", to: "focus", metadata: {} });
  assert.equal(getKinshipLabels("missing", data).size, 0);
  assert.deepEqual([...getKinshipLabels("focus", data)], [["father", "Ayah"]]);
});

test("Age comparisons preserve partial dates and unknown/equal dates", () => {
  for (const [reference, target, expected] of [
    [undefined, "2000", "unknown"], ["invalid", "2000", "unknown"],
    ["2000", "1999", "older"], ["2000", "2001", "younger"],
    ["2000", "2000-12-31", "same"], ["2000/02/20", "2000-02-19", "older"],
    ["2000-02-20", "2000-03-01", "younger"], ["2000-02-20", "2000-02-20", "same"],
  ]) assert.equal(comparePersonAges(reference, target), expected);
});
