import type { FamilyData } from "@/src/types/family";

const graphs = new WeakMap<FamilyData, ReturnType<typeof buildFamilyGraph>>();

/** FamilyData must be replaced when people or relationships change (store convention). */
export function getFamilyGraph(family: FamilyData) {
  const cached = graphs.get(family);
  if (cached) return cached;
  const graph = buildFamilyGraph(family);
  graphs.set(family, graph);
  return graph;
}

function buildFamilyGraph(family: FamilyData) {
  const persons = new Map(family.persons.map((person) => [person.id, person]));
  const parents = new Map(
    family.persons.map((person) => [person.id, new Set<string>()]),
  );
  const children = new Map(
    family.persons.map((person) => [person.id, new Set<string>()]),
  );
  const partners = new Map(
    family.persons.map((person) => [person.id, new Set<string>()]),
  );
  const siblings = new Map(
    family.persons.map((person) => [person.id, new Set<string>()]),
  );
  for (const relation of family.relationships) {
    if (!persons.has(relation.from) || !persons.has(relation.to)) continue;
    if (["parent", "adoption", "stepParent"].includes(relation.type)) {
      parents.get(relation.to)!.add(relation.from);
      children.get(relation.from)!.add(relation.to);
    } else if (relation.type === "marriage") {
      partners.get(relation.from)!.add(relation.to);
      partners.get(relation.to)!.add(relation.from);
    } else if (relation.type === "sibling") {
      siblings.get(relation.from)!.add(relation.to);
      siblings.get(relation.to)!.add(relation.from);
    }
  }
  for (const group of children.values()) {
    for (const a of group)
      for (const b of group) {
        if (a !== b) siblings.get(a)!.add(b);
      }
  }
  const walk = (start: string, neighbors: Map<string, Set<string>>) => {
    const distances = new Map([[start, 0]]);
    const queue = [start];
    for (let index = 0; index < queue.length; index += 1) {
      for (const next of neighbors.get(queue[index]) ?? []) {
        if (distances.has(next)) continue;
        distances.set(next, distances.get(queue[index])! + 1);
        queue.push(next);
      }
    }
    return distances;
  };
  const ancestors = new Map<string, Map<string, number>>();
  const descendants = new Map<string, Map<string, number>>();
  // Share BFS results across focus/mode changes; the WeakMap releases them with the family.
  const distancesFor = (id: string, neighbors: Map<string, Set<string>>, memo: Map<string, Map<string, number>>) => {
    const cached = memo.get(id);
    if (cached) return cached;
    const distances = walk(id, neighbors);
    memo.set(id, distances);
    return distances;
  };
  const ancestorDistances = (id: string) => {
    return distancesFor(id, parents, ancestors);
  };
  const descendantDistances = (id: string) => {
    return distancesFor(id, children, descendants);
  };

  return { persons, parents, children, partners, siblings, ancestorDistances, descendantDistances };
}
