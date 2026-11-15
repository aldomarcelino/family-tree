import assert from "node:assert/strict";
import { test } from "node:test";
import { loadService } from "./load-service.mjs";

const { parseFamilyJSON, loadJSONFile } = loadService("fileStorage");
const family = {
  schemaVersion: 1,
  name: "Keluarga dari HP",
  persons: [
    { id: "parent", fullName: "Orang tua", gender: "female" },
    { id: "child", fullName: "Anak", gender: "male" },
  ],
  relationships: [{ id: "r1", type: "parent", from: "parent", to: "child" }],
  updatedAt: "2026-11-14T00:00:00.000Z",
};

test("Pasted JSON preserves family data and applies the same defaults as file import", () => {
  const result = parseFamilyJSON(`\n ${JSON.stringify(family, null, 2)} \n`);
  assert.equal(result.name, family.name);
  assert.equal(result.persons.length, 2);
  assert.deepEqual(result.persons[0].tags, []);
  assert.deepEqual(result.relationships[0].metadata, {});
  for (const key of ["familyUnits", "media", "events"]) assert.deepEqual(result[key], []);
  assert.deepEqual(parseFamilyJSON(JSON.stringify(result)), result);
});

test("Empty, malformed, and non-family JSON return actionable errors", () => {
  assert.throws(() => parseFamilyJSON(" \n "), /masih kosong/);
  assert.throws(() => parseFamilyJSON('{"name":'), /JSON belum valid/);
  for (const value of [null, [], "hello", {}, { ...family, schemaVersion: 2 }]) {
    assert.throws(() => parseFamilyJSON(JSON.stringify(value)), /format Markoum/);
  }
});

test("Invalid members and relationships are rejected before import", () => {
  assert.throws(() => parseFamilyJSON(JSON.stringify({ ...family, persons: [{ id: "p", fullName: "" }] })), /persons\.0\.fullName/);
  assert.throws(() => parseFamilyJSON(JSON.stringify({ ...family, relationships: [{ id: "r1", type: "parent", from: "missing", to: "child" }] })), /missing source person missing/);
});

test("JSON copied from a file can include a byte order mark", () => {
  assert.equal(parseFamilyJSON(`\uFEFF${JSON.stringify(family)}`).name, family.name);
});

test("The native file picker accepts shared TXT files and imports their JSON contents", async () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousReader = Object.getOwnPropertyDescriptor(globalThis, "FileReader");
  let pickerOptions;
  const file = new File([JSON.stringify(family)], "keluarga-dari-hp.txt", { type: "text/plain" });
  const handle = { name: file.name, getFile: async () => file };
  class Reader {
    handlers = {};
    result = null;
    addEventListener(type, callback) { this.handlers[type] = callback; }
    readAsText(file) {
      file.text().then((text) => { this.result = text; this.handlers.load(); });
    }
  }
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: {
      showOpenFilePicker: async (options) => { pickerOptions = options; return [handle]; },
    } });
    Object.defineProperty(globalThis, "FileReader", { configurable: true, value: Reader });
    const result = await loadJSONFile();
    assert.deepEqual(pickerOptions.types[0].accept["text/plain"], [".txt"]);
    assert.deepEqual(pickerOptions.types[0].accept["application/json"], [".json"]);
    assert.equal(result.family.name, family.name);
    assert.equal(result.family.persons.length, 2);
    assert.equal(result.fileName, file.name);
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else delete globalThis.window;
    if (previousReader) Object.defineProperty(globalThis, "FileReader", previousReader);
    else delete globalThis.FileReader;
  }
});
