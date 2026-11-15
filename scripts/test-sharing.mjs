import assert from "node:assert/strict";
import { test } from "node:test";
import { loadService } from "./load-service.mjs";

const { createFamilyTransfer, createTransferFile, createShareFile, createWhatsAppShareURL, canShareTransfer, getShareFailureMessage, shareTransfer } = loadService("familyTransfer");
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

test("WhatsApp prepares importable JSON and uses copy/paste for larger data without truncating it", () => {
  const transfer = createFamilyTransfer(fixture());
  const url = new URL(createWhatsAppShareURL(transfer));
  assert.equal(url.origin, "https://wa.me");
  assert.deepEqual(parseFamilyJSON(url.searchParams.get("text")), parseFamilyJSON(transfer.contents));
  const large = createFamilyTransfer({ ...fixture(), persons: Array.from({ length: 100 }, (_, i) => ({
    id: String(i), fullName: `Anggota keluarga ${i}`, gender: "male", tags: [],
  })), relationships: [] });
  const original = large.contents;
  assert.equal(createWhatsAppShareURL(large), null);
  assert.equal(large.contents, original);
  assert.equal(parseFamilyJSON(large.contents).persons.length, 100);
});

test("Native sharing uses an allowed plain-text file containing unchanged, importable JSON", async () => {
  const transfer = createFamilyTransfer(fixture());
  const shared = createShareFile(transfer);
  assert.equal(shared.name, "keluarga-siregar.txt");
  assert.equal(shared.type, "text/plain");
  assert.equal(await shared.text(), transfer.contents);
  assert.equal(parseFamilyJSON(await shared.text()).name, transfer.name);
  assert.equal(createTransferFile(transfer).name, "keluarga-siregar.json", "JSON downloads keep their original format");
  let payload;
  await shareTransfer(shared, { share: async (data) => { payload = data; } });
  assert.equal(payload.files[0].type, "text/plain");
  assert.equal(payload.files[0].name.endsWith(".txt"), true);
});

test("Permission, format and unavailable native-share errors provide specific fallback guidance", () => {
  assert.match(getShareFailureMessage({ name: "NotAllowedError" }), /tidak mengizinkan/);
  assert.match(getShareFailureMessage({ name: "SecurityError" }), /tidak mengizinkan/);
  assert.match(getShareFailureMessage({ name: "TypeError" }), /tidak mendukung/);
  assert.match(getShareFailureMessage({ name: "InvalidStateError" }), /masih terbuka/);
  assert.match(getShareFailureMessage(undefined), /unduh file atau salin JSON/);
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
  assert.equal(await shareTransfer(file, { share: async () => { throw { name: "AbortError" }; } }), "cancelled");
  await assert.rejects(shareTransfer(file, { share: async () => { throw new Error("permission denied"); } }), /permission denied/);
});
