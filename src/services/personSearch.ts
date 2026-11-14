import type { Person } from "@/src/types/family";

const normalize = (value: string) => value.normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");

export function createPersonSearchIndex(persons: Person[]) {
  return persons.map((person) => {
    const name = normalize(person.fullName);
    const nickname = normalize(person.nickname ?? "");
    return { person, name, nickname, text: `${name} ${nickname} ${person.tags.map(normalize).join(" ")}` };
  });
}

/** Match every query word across name, nickname and tags; prefer exact/prefix names. */
export function searchPeople(index: ReturnType<typeof createPersonSearchIndex>, query: string, limit = 8) {
  const term = normalize(query).replace(/(^|\s)#(?=\S)/g, "$1");
  const tokens = term.split(" ");
  const matches = term ? index.filter((entry) => tokens.every((token) => entry.text.includes(token))) : index;
  const score = (entry: (typeof index)[number]) => {
    if (entry.name === term || (entry.nickname && entry.nickname === term)) return 0;
    if (entry.name.startsWith(term) || (entry.nickname && entry.nickname.startsWith(term))) return 1;
    if (tokens.every((token) => entry.name.includes(token))) return 2;
    return 3;
  };
  const ranked = term ? [...matches].sort((a, b) => score(a) - score(b)) : matches;
  return { total: ranked.length, persons: ranked.slice(0, limit).map((entry) => entry.person) };
}
