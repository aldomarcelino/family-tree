import assert from "node:assert/strict";
import { test } from "node:test";
import { loadService } from "./load-service.mjs";

const { createPersonSearchIndex, searchPeople } = loadService("personSearch");
const person = (id, fullName, nickname, tags = []) => ({ id, fullName, nickname, tags, gender: "female" });
const people = [person("tag", "Dewi", undefined, ["eka", "medan"]), person("prefix", "Eka Putri"),
  person("exact", "Éka"), person("nickname", "Siti Aminah", "Bunda", ["medan"]), person("middle", "Dian Eka")];
const index = createPersonSearchIndex(people);
const ids = (query) => searchPeople(index, query).persons.map((person) => person.id);

test("Search ignores casing, accent marks, and repeated surrounding whitespace", () => {
  assert.deepEqual(ids("   ÉKA  "), ["exact", "prefix", "middle", "tag"]);
  assert.deepEqual(ids("SITI   AMINAH"), ["nickname"]);
});

test("Every word must match across names, nicknames and tags", () => {
  assert.deepEqual(ids("bunda medan"), ["nickname"]);
  assert.deepEqual(ids("medan bunda"), ["nickname"]);
  assert.deepEqual(ids("eka medan"), ["tag"]);
  assert.deepEqual(ids("bunda #medan"), ["nickname"]);
  assert.deepEqual(ids("bunda bandung"), []);
});

test("Exact name and nickname matches rank above prefixes, substrings and tags", () => {
  assert.equal(ids("bunda")[0], "nickname");
  assert.deepEqual(ids("eka"), ["exact", "prefix", "middle", "tag"]);
});

test("Result limits retain the total count and never reorder the original family", () => {
  const many = Array.from({ length: 20 }, (_, i) => person(String(i), `Anggota ${i}`));
  const searchIndex = createPersonSearchIndex(many);
  const result = searchPeople(searchIndex, "anggota");
  assert.equal(result.total, 20);
  assert.equal(result.persons.length, 8);
  assert.deepEqual(result.persons.map((person) => person.id), many.slice(0, 8).map((person) => person.id));
  assert.deepEqual(searchPeople(index, "").persons, people);
  assert.deepEqual(people.map((person) => person.id), ["tag", "prefix", "exact", "nickname", "middle"]);
});

test("Empty families and unmatched text are handled, and a rebuilt index reflects edits", () => {
  assert.deepEqual(searchPeople([], "bunda"), { total: 0, persons: [] });
  assert.equal(searchPeople(index, "tidak ada").total, 0);
  const updated = createPersonSearchIndex([{ ...people[0], fullName: "Nama Baru" }]);
  assert.equal(searchPeople(updated, "nama baru").persons[0].id, "tag");
});
