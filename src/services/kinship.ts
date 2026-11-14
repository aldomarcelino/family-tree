import type { FamilyData, Person, PersonGender } from "@/src/types/family";

interface Kinship { label: string; up: number; down: number; score: number }
const cache = new WeakMap<FamilyData, Map<string, Map<string, string>>>();
export const femaleOrMale = (gender: PersonGender, male: string, female: string) => gender === "female" ? female : male;
export const spouseLabelFor = (gender?: string) => {
  if (gender === "female") return "Istri";
  if (gender === "male") return "Suami";
  return "Pasangan";
};

function parseDateParts(dateStr: string): { year: number; month: number; day: number } | null {
  const parts = dateStr.trim().split(/[-/]/);
  if (parts.length === 0 || !parts[0]) return null;
  const year = parseInt(parts[0], 10);
  if (isNaN(year)) return null;
  const month = parts.length > 1 ? parseInt(parts[1], 10) : 1;
  const day = parts.length > 2 ? parseInt(parts[2], 10) : 1;
  return { year, month: isNaN(month) ? 1 : month, day: isNaN(day) ? 1 : day };
}

export type AgeComparison = "older" | "younger" | "same" | "unknown";

export function comparePersonAges(refDateStr?: string, targetDateStr?: string): AgeComparison {
  if (!refDateStr || !targetDateStr) return "unknown";
  const refParts = parseDateParts(refDateStr);
  const targetParts = parseDateParts(targetDateStr);
  if (!refParts || !targetParts) return "unknown";

  if (targetParts.year !== refParts.year) {
    return targetParts.year < refParts.year ? "older" : "younger";
  }
  const refHasMonth = refDateStr.includes("-") || refDateStr.includes("/");
  const targetHasMonth = targetDateStr.includes("-") || targetDateStr.includes("/");
  if (!refHasMonth || !targetHasMonth) {
    return "same";
  }
  if (targetParts.month !== refParts.month) {
    return targetParts.month < refParts.month ? "older" : "younger";
  }
  if (targetParts.day !== refParts.day) {
    return targetParts.day < refParts.day ? "older" : "younger";
  }
  return "same";
}

export function siblingLabel(gender: PersonGender, ageComp: AgeComparison): string {
  if (ageComp === "younger") return "Adik";
  if (ageComp === "older") return femaleOrMale(gender, "Abang", "Kakak");
  return femaleOrMale(gender, "Saudara", "Saudari");
}

export function inLawSiblingLabel(gender: PersonGender, ageComp: AgeComparison): string {
  if (ageComp === "younger") return "Adik ipar";
  if (ageComp === "older") return femaleOrMale(gender, "Abang ipar", "Kakak ipar");
  return femaleOrMale(gender, "Saudara ipar", "Saudari ipar");
}

function ancestorLabel(depth: number, gender: PersonGender) {
  if (depth === 1) return femaleOrMale(gender, "Ayah", "Ibu");
  if (depth === 2) return femaleOrMale(gender, "Kakek", "Nenek");
  const base = femaleOrMale(gender, "Kakek buyut", "Nenek buyut");
  return depth === 3 ? base : `${base} ke-${depth - 2}`;
}
function descendantLabel(depth: number) {
  return ["", "Anak", "Cucu", "Cicit", "Piut"][depth] ?? `Keturunan ke-${depth}`;
}
function bloodLabel(up: number, down: number, target: Person | PersonGender, ref?: Person) {
  const gender = typeof target === "string" ? target : target.gender;
  if (down === 0) return ancestorLabel(up, gender);
  if (up === 0) return descendantLabel(down);
  if (up === 1 && down === 1) {
    const targetBirthDate = typeof target === "object" ? target.birthDate : undefined;
    const ageComp = comparePersonAges(ref?.birthDate, targetBirthDate);
    return siblingLabel(gender, ageComp);
  }
  if (down === 1) {
    const base = femaleOrMale(gender, "Paman", "Tante");
    return up === 2 ? base : up === 3 ? `${base} buyut` : `${base} buyut ke-${up - 2}`;
  }
  if (up === 1) return down === 2 ? "Keponakan" : down === 3 ? "Cucu keponakan" : `Keturunan keponakan ke-${down - 1}`;
  if (up === down) return up === 2 ? "Sepupu" : up === 3 ? "Sepupu kedua" : `Sepupu ke-${up - 1}`;
  if (up === 2 && down === 3) return "Keponakan sepupu";
  if (up === 3 && down === 2) return femaleOrMale(gender, "Paman sepupu", "Tante sepupu");
  return `Sepupu beda ${Math.abs(up - down)} generasi`;
}

/** Resolve blood, in-law, and extended relations throughout the connected graph. */
export function getKinshipLabels(focusId: string, family: FamilyData): Map<string, string> {
  const cached = cache.get(family)?.get(focusId);
  if (cached) return cached;
  const persons = new Map(family.persons.map((person) => [person.id, person]));
  if (!persons.has(focusId)) return new Map();
  const parents = new Map(family.persons.map((person) => [person.id, new Set<string>()]));
  const children = new Map(family.persons.map((person) => [person.id, new Set<string>()]));
  const partners = new Map(family.persons.map((person) => [person.id, new Set<string>()]));
  const siblings = new Map(family.persons.map((person) => [person.id, new Set<string>()]));
  for (const relation of family.relationships) {
    if (!persons.has(relation.from) || !persons.has(relation.to)) continue;
    if (["parent", "adoption", "stepParent"].includes(relation.type)) {
      parents.get(relation.to)!.add(relation.from);
      children.get(relation.from)!.add(relation.to);
    } else if (relation.type === "marriage") {
      partners.get(relation.from)!.add(relation.to); partners.get(relation.to)!.add(relation.from);
    } else if (relation.type === "sibling") {
      siblings.get(relation.from)!.add(relation.to); siblings.get(relation.to)!.add(relation.from);
    }
  }
  for (const group of children.values()) for (const a of group) for (const b of group) {
    if (a !== b) siblings.get(a)!.add(b);
  }
  const walk = (start: string, neighbors: Map<string, Set<string>>) => {
    const distances = new Map([[start, 0]]);
    const queue = [start];
    for (let index = 0; index < queue.length; index += 1) {
      for (const next of neighbors.get(queue[index]) ?? []) {
        if (distances.has(next)) continue;
        distances.set(next, distances.get(queue[index])! + 1); queue.push(next);
      }
    }
    return distances;
  };
  const ancestors = new Map<string, Map<string, number>>();
  const descendants = new Map<string, Map<string, number>>();
  const ancestorDistances = (id: string) => {
    if (!ancestors.has(id)) ancestors.set(id, walk(id, parents));
    return ancestors.get(id)!;
  };
  const descendantDistances = (id: string) => {
    if (!descendants.has(id)) descendants.set(id, walk(id, children));
    return descendants.get(id)!;
  };
  const bloodMaps = new Map<string, Map<string, Kinship>>();
  const bloodRelations = (reference: string) => {
    if (bloodMaps.has(reference)) return bloodMaps.get(reference)!;
    const result = new Map<string, Kinship>([[reference, { label: "Diri sendiri", up: 0, down: 0, score: 0 }]]);
    const assign = (id: string, up: number, down: number) => {
      if (id === reference) return;
      const score = up + down;
      if (result.has(id) && result.get(id)!.score <= score) return;
      result.set(id, { up, down, score, label: bloodLabel(up, down, persons.get(id)!, persons.get(reference)) });
    };
    const above = ancestorDistances(reference);
    for (const person of family.persons) {
      for (const [ancestor, down] of ancestorDistances(person.id)) {
        const up = above.get(ancestor);
        if (up !== undefined) assign(person.id, up, down);
      }
    }
    // Explicit sibling records also work when their parents are not yet known.
    for (const [ancestor, depth] of above) for (const sibling of siblings.get(ancestor)!) {
      for (const [relative, down] of descendantDistances(sibling)) assign(relative, depth + 1, down + 1);
    }
    bloodMaps.set(reference, result);
    return result;
  };
  const blood = bloodRelations(focusId);
  const result = new Map([...blood].filter(([id]) => id !== focusId).map(([id, relation]) => [id, { label: relation.label, score: relation.score }]));
  const assign = (id: string, label: string, score: number) => {
    if (id === focusId || (result.has(id) && result.get(id)!.score <= score)) return;
    result.set(id, { label, score });
  };
  const spouseName = (anchor: Kinship, gender: PersonGender, spousePerson?: Person) => {
    if (anchor.up === 0 && anchor.down === 0) return spouseLabelFor(gender);
    if (anchor.up === 0 && anchor.down === 1) return "Menantu";
    if (anchor.up === 1 && anchor.down === 1) {
      const ageComp = comparePersonAges(persons.get(focusId)?.birthDate, spousePerson?.birthDate);
      return inLawSiblingLabel(gender, ageComp);
    }
    if (anchor.down === 0) return `${ancestorLabel(anchor.up, gender)} tiri`;
    if (anchor.down === 1 && anchor.up >= 2) return bloodLabel(anchor.up, 1, gender);
    return `${spouseLabelFor(gender)} ${anchor.label.toLowerCase()}`;
  };
  for (const [anchorId, anchor] of blood) for (const spouseId of partners.get(anchorId)!) {
    const spouseGender = persons.get(spouseId)!.gender;
    const spouseLabel = spouseName(anchor, spouseGender, persons.get(spouseId));
    assign(spouseId, spouseLabel, anchor.score + 1 + .1);
    for (const [id, relative] of bloodRelations(spouseId)) {
      if (id === spouseId) continue;
      const gender = persons.get(id)!.gender;
      let label = `${relative.label} dari ${spouseLabel.toLowerCase()}`;
      if (anchorId === focusId) {
        if (relative.down === 0) label = relative.up <= 2 ? `${ancestorLabel(relative.up, gender)} mertua` : `${relative.label} dari ${spouseLabel.toLowerCase()}`;
        else if (relative.up === 0) label = `${relative.label} tiri`;
        else if (relative.up === 1 && relative.down === 1) {
          const ageComp = comparePersonAges(persons.get(focusId)?.birthDate, persons.get(id)?.birthDate);
          label = inLawSiblingLabel(gender, ageComp);
        }
        else label = `${relative.label} dari ${spouseLabel.toLowerCase()}`;
      } else if (anchor.up === 0 && anchor.down === 1 && relative.up === 1 && relative.down === 0) label = "Besan";
      assign(id, label, anchor.score + 1 + relative.score + .1);
    }
  }
  // Preserve directly recorded roles over more distant alternative paths.
  for (const partner of partners.get(focusId)!) {
    const spouseGender = persons.get(partner)?.gender;
    result.set(partner, { label: spouseLabelFor(spouseGender), score: 1 });
  }
  for (const relation of family.relationships) {
    if (relation.to !== focusId || !persons.has(relation.from)) continue;
    const gender = persons.get(relation.from)!.gender;
    if (relation.type === "stepParent" || relation.type === "adoption") {
      result.set(relation.from, { label: `${ancestorLabel(1, gender)} ${relation.type === "adoption" ? "angkat" : "tiri"}`, score: 1 });
    }
  }
  // Further marriages can connect additional branches. Describe their relation
  // explicitly instead of inventing a blood relationship or leaving it blank.
  const visited = new Set([focusId]);
  const queue = [focusId];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const neighbors = [
      ...[...parents.get(current)!].map((id) => ({ id, label: ancestorLabel(1, persons.get(id)!.gender) })),
      ...[...children.get(current)!].map((id) => ({ id, label: "Anak" })),
      ...[...partners.get(current)!].map((id) => ({ id, label: spouseLabelFor(persons.get(id)?.gender) })),
      ...[...siblings.get(current)!].map((id) => {
        const target = persons.get(id)!;
        const currentPerson = persons.get(current);
        const ageComp = comparePersonAges(currentPerson?.birthDate, target.birthDate);
        return { id, label: siblingLabel(target.gender, ageComp) };
      }),
    ];
    for (const next of neighbors) {
      if (visited.has(next.id)) continue;
      visited.add(next.id); queue.push(next.id);
      if (!result.has(next.id)) {
        const currentLabel = result.get(current)?.label;
        const auntOrUncle = currentLabel?.match(/^(Paman|Tante)(.*)$/);
        const isSpouse = next.label === "Suami" || next.label === "Istri" || next.label === "Pasangan";
        const inLawMatch = /^(Saudar[ai]|Abang|Kakak|Adik) ipar$/.test(currentLabel ?? "");
        const spouseLabel = isSpouse && auntOrUncle ?
          `${femaleOrMale(persons.get(next.id)!.gender, "Paman", "Tante")}${auntOrUncle[2]}` :
          isSpouse && inLawMatch ?
            inLawSiblingLabel(persons.get(next.id)!.gender, comparePersonAges(persons.get(focusId)?.birthDate, persons.get(next.id)?.birthDate)) : undefined;
        result.set(next.id, { label: spouseLabel ?? (currentLabel ? `${next.label} dari ${currentLabel.toLowerCase()}` : next.label), score: Infinity });
      }
    }
  }
  const labels = new Map([...result].map(([id, relation]) => [id, relation.label]));
  const familyCache = cache.get(family) ?? new Map<string, Map<string, string>>();
  if (familyCache.size >= 8) familyCache.delete(familyCache.keys().next().value!);
  familyCache.set(focusId, labels); cache.set(family, familyCache);
  return labels;
}
