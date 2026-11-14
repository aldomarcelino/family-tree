import assert from "node:assert/strict";
import { test } from "node:test";
import { loadService } from "./load-service.mjs";

const { createFamilyTransfer, createTransferFile, canShareTransfer, shareTransfer } = loadService("familyTransfer");
const { parseFamilyJSON } = loadService("fileStorage");
const fixture = () => ({
  schemaVersion: 1, name: "Keluarga Siregar", updatedAt: "2026-01-01",
  persons: [{ id: "ibu", fullName: "Ibu", gender: "female" }, { id: "anak", fullName: "Anak", gender: "male" }],
  relationships: [{ id: "r1", type: "parent", from: "ibu", to: "anak" }],
});

test("File, clipboard, and download share one importable snapshot without changing the family", async () => {
  const family = fixture();
  const original = JSON.stringify(family);
  const transfer = createFamilyTransfer(family);
  const file = createTransferFile(transfer);
  assert.equal(file.name, "keluarga-siregar.json");
  assert.equal(file.type, "application/json");
  assert.equal(await file.text(), transfer.contents);
  const parsed = parseFamilyJSON(transfer.contents);
  assert.equal(parsed.name, family.name);
  assert.equal(parsed.persons.length, transfer.personCount);
  assert.equal(parsed.relationships.length, transfer.relationshipCount);
  assert.equal(JSON.stringify(family), original);
});

test("Portable filenames normalize accents, path punctuation, and non-Latin fallback", () => {
  assert.equal(createFamilyTransfer({ ...fixture(), name: " Keluarga Éka / Putri " }).fileName, "keluarga-eka-putri.json");
  assert.equal(createFamilyTransfer({ ...fixture(), name: "家族" }).fileName, "silsilah-keluarga.json");
});

test("Photos are identified as external references and invalid data cannot be shared", () => {
  assert.equal(createFamilyTransfer(fixture()).hasPhotos, false);
  const family = fixture();
  family.persons[0].primaryPhotoId = "photo-id";
  assert.equal(createFamilyTransfer(family).hasPhotos, true);
  assert.equal(JSON.parse(createFamilyTransfer(family).contents).persons[0].primaryPhotoId, "photo-id");
  assert.throws(() => createFamilyTransfer({ ...fixture(), name: "" }));
  assert.throws(() => createFamilyTransfer({ ...fixture(), relationships: [{ id: "bad", type: "parent", from: "missing", to: "ibu" }] }));
});

test("Native file sharing requires both API and file support; rejected capability probes are safe", () => {
  const file = createTransferFile(createFamilyTransfer(fixture()));
  assert.equal(canShareTransfer(file, {}), false);
  assert.equal(canShareTransfer(file, { share: async () => {} }), false);
  assert.equal(canShareTransfer(file, { share: async () => {}, canShare: () => false }), false);
  assert.equal(canShareTransfer(file, { share: async () => {}, canShare: () => { throw new Error("blocked"); } }), false);
  assert.equal(canShareTransfer(file, { share: async () => {}, canShare: ({ files }) => files[0] === file }), true);
});

test("Share opens synchronously from the click, uses a JSON file, and treats cancellation quietly", async () => {
  const file = createTransferFile(createFamilyTransfer(fixture()));
  let payload;
  const pending = shareTransfer(file, { share: async (data) => { payload = data; } });
  assert.equal(payload.files[0], file);
  assert.equal(await pending, "shared");
  const aborted = Object.assign(new Error("dismissed"), { name: "AbortError" });
  assert.equal(await shareTransfer(file, { share: async () => { throw aborted; } }), "cancelled");
  await assert.rejects(shareTransfer(file, { share: async () => { throw new Error("permission denied"); } }), /permission denied/);
});
