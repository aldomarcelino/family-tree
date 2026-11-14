import type { Person, PersonGender, Relationship } from "@/src/types/family";

export type RelativeRole = "parent" | "child" | "spouse" | "sibling";
const lineageTypes = new Set(["parent", "adoption", "stepParent"]);

/** Traversal is unbounded by generation count and safe for cyclic imports. */
export function isRecordedAncestor(ancestor: string, descendant: string, relationships: Relationship[]): boolean {
  const visited = new Set<string>();
  const pending = [descendant];
  while (pending.length) {
    const id = pending.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    for (const relation of relationships) {
      if (!lineageTypes.has(relation.type) || relation.to !== id) continue;
      if (relation.from === ancestor) return true;
      pending.push(relation.from);
    }
  }
  return false;
}

function areSiblings(a: string, b: string, relationships: Relationship[]) {
  const parents = new Set(relationships.filter((r) => lineageTypes.has(r.type) && r.to === a).map((r) => r.from));
  return relationships.some((r) => (r.type === "sibling" &&
    ((r.from === a && r.to === b) || (r.from === b && r.to === a))) ||
    (lineageTypes.has(r.type) && r.to === b && parents.has(r.from)));
}

// Marriage and sibling links preserve generation; parent links move one level.
// This also catches grandparents/in-laws reached through another spouse branch.
function relativeGeneration(reference: string, target: string, relationships: Relationship[]): number | null {
  const visited = new Set([reference]);
  const queue = [{ id: reference, generation: 0 }];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (current.id === target) return current.generation;
    for (const relation of relationships) {
      const lineage = lineageTypes.has(relation.type);
      if (!lineage && relation.type !== "marriage" && relation.type !== "sibling") continue;
      if (relation.from !== current.id && relation.to !== current.id) continue;
      const forward = relation.from === current.id;
      const id = forward ? relation.to : relation.from;
      if (visited.has(id)) continue;
      visited.add(id);
      queue.push({ id, generation: current.generation + (lineage ? forward ? 1 : -1 : 0) });
    }
  }
  return null;
}

export function getSpouseGenderError(reference: PersonGender | undefined, target: PersonGender | undefined): string | null {
  return reference && target && reference === target ? "Pilih pasangan dengan jenis kelamin berbeda." : null;
}

export function getRelationshipError(reference: string, target: string, role: RelativeRole, relationships: Relationship[], persons: Pick<Person, "id" | "gender">[] = []): string | null {
  if (!reference || !target) return "Pilih anggota keluarga yang ingin dihubungkan.";
  if (reference === target) return "Anggota tidak dapat dihubungkan dengan dirinya sendiri.";
  const married = relationships.some((r) => r.type === "marriage" &&
    ((r.from === reference && r.to === target) || (r.from === target && r.to === reference)));
  const siblings = areSiblings(reference, target, relationships);
  const relatedByLineage = isRecordedAncestor(reference, target, relationships) || isRecordedAncestor(target, reference, relationships);
  if (relatedByLineage) return "Anggota ini sudah berada dalam garis leluhur atau keturunan. Pilih anggota lain.";
  if (role === "spouse") {
    const genderError = getSpouseGenderError(persons.find((person) => person.id === reference)?.gender, persons.find((person) => person.id === target)?.gender);
    if (genderError) return genderError;
    if (married) return "Kedua anggota ini sudah tercatat sebagai pasangan.";
    if (siblings) return "Saudara tidak dapat dicatat sebagai pasangan.";
  } else if (role === "sibling") {
    if (siblings) return "Kedua anggota ini sudah tercatat sebagai saudara.";
    if (married) return "Pasangan tidak dapat dicatat sebagai saudara.";
  } else {
    if (married) return "Pasangan tidak dapat dicatat sebagai orang tua atau anak.";
    if (siblings) return "Saudara tidak dapat dicatat sebagai orang tua atau anak.";
  }
  const generation = relativeGeneration(reference, target, relationships);
  const expected = role === "parent" ? -1 : role === "child" ? 1 : 0;
  if (generation !== null && generation !== expected) return "Tingkat generasi anggota ini tidak sesuai dengan hubungan yang dipilih.";
  return null;
}

/** Co-parents may already be spouses, but cannot be ancestors or siblings. */
export function canBeCoParent(reference: string, target: string, relationships: Relationship[], persons: Pick<Person, "id" | "gender">[] = []): boolean {
  const generation = relativeGeneration(reference, target, relationships);
  const genderError = getSpouseGenderError(persons.find((person) => person.id === reference)?.gender, persons.find((person) => person.id === target)?.gender);
  return !genderError && (generation === null || generation === 0) && reference !== target && !areSiblings(reference, target, relationships) &&
    !isRecordedAncestor(reference, target, relationships) && !isRecordedAncestor(target, reference, relationships);
}

export function hasParentLink(parent: string, child: string, relationships: Relationship[]): boolean {
  return relationships.some((r) => lineageTypes.has(r.type) && r.from === parent && r.to === child);
}
