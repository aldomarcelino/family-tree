import type { FamilyData, Relationship } from "@/src/types/family";

export interface FamilyLineGroup { id: string; label: string; color: string; memberIds: string[] }
export const FAMILY_LINE_COLOR = "#a1a1aa";
export const FOCUS_LINE_COLOR = "#862d33";
const lineage = new Set(["parent", "adoption", "stepParent"]);
const keyFor = (ids: string[]) => JSON.stringify([...new Set(ids)].sort());

/** Family metadata is shared by each parent couple and its child lines. */
export function getFamilyLineGroups(family: FamilyData) {
  const people = new Map(family.persons.map((person) => [person.id, person]));
  const parents = new Map<string, string[]>();
  const couples = new Set<string>();
  for (const relation of family.relationships) {
    if (relation.type === "marriage") couples.add(keyFor([relation.from, relation.to]));
    if (lineage.has(relation.type)) parents.set(relation.to, [...new Set([...(parents.get(relation.to) ?? []), relation.from])]);
  }
  const parentGroup = (parent: string, child: string) => {
    const parentIds = parents.get(child) ?? [parent];
    const spouse = parentIds.find((id) => id !== parent && couples.has(keyFor([parent, id])));
    return spouse ? [parent, spouse] : parentIds.length <= 2 ? parentIds : [parent];
  };
  const groupMembers = (relation: Relationship) => {
    if (relation.type === "marriage") return [relation.from, relation.to];
    if (lineage.has(relation.type)) return parentGroup(relation.from, relation.to);
    if (relation.type === "sibling") {
      const shared = (parents.get(relation.from) ?? []).filter((id) => parents.get(relation.to)?.includes(id));
      if (shared.length > 0) return parentGroup(shared[0], relation.from);
    }
    return [relation.from, relation.to];
  };
  const groups = new Map<string, FamilyLineGroup>();
  const relationshipGroups = new Map<string, FamilyLineGroup>();
  for (const relation of family.relationships) {
    const memberIds = [...new Set(groupMembers(relation))].sort();
    const id = keyFor(memberIds);
    let group = groups.get(id);
    if (!group) {
      group = { id, memberIds, color: FAMILY_LINE_COLOR, label: memberIds.map((member) => {
        const person = people.get(member);
        return person?.nickname || person?.fullName || "Anggota";
      }).join(" & ") };
      groups.set(id, group);
    }
    relationshipGroups.set(relation.id, group);
  }
  return { groups: [...groups.values()], relationshipGroups };
}
