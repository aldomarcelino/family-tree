import type { FamilyData, Person } from "@/src/types/family";

/**
 * Gets all parents of a person (biological, adoptive, or stepParent).
 */
export const getParents = (personId: string, family: FamilyData): Person[] => {
  const parentIds = family.relationships
    .filter(
      (r) =>
        r.to === personId &&
        (r.type === "parent" || r.type === "adoption" || r.type === "stepParent")
    )
    .map((r) => r.from);
  
  return family.persons.filter((p) => parentIds.includes(p.id));
};

/**
 * Gets all children of a person.
 */
export const getChildren = (personId: string, family: FamilyData): Person[] => {
  const childIds = family.relationships
    .filter(
      (r) =>
        r.from === personId &&
        (r.type === "parent" || r.type === "adoption" || r.type === "stepParent")
    )
    .map((r) => r.to);

  return family.persons.filter((p) => childIds.includes(p.id));
};

/**
 * Gets all partners/spouses of a person.
 */
export const getPartners = (personId: string, family: FamilyData): Person[] => {
  const partnerIds = family.relationships
    .filter((r) => r.type === "marriage" && (r.from === personId || r.to === personId))
    .map((r) => (r.from === personId ? r.to : r.from));

  return family.persons.filter((p) => partnerIds.includes(p.id));
};

/**
 * Calculates siblings automatically (sharing at least one parent).
 */
export const getSiblings = (personId: string, family: FamilyData): Person[] => {
  const parents = getParents(personId, family);
  const siblingIds = new Set<string>();

  for (const parent of parents) {
    const children = getChildren(parent.id, family);
    for (const child of children) {
      if (child.id !== personId) {
        siblingIds.add(child.id);
      }
    }
  }

  // Also include explicit siblings relationships if any are recorded
  const explicitSiblings = family.relationships
    .filter((r) => r.type === "sibling" && (r.from === personId || r.to === personId))
    .map((r) => (r.from === personId ? r.to : r.from));
  
  for (const sibId of explicitSiblings) {
    if (sibId !== personId) {
      siblingIds.add(sibId);
    }
  }

  return family.persons.filter((p) => siblingIds.has(p.id));
};

/**
 * Formats relationship labels dynamically based on generation depth and gender in Indonesian.
 */
export const getRelationshipLabel = (
  gender: string,
  generation: number,
  type: "ancestor" | "descendant",
): string => {
  if (generation === 0) return "Fokus";

  if (type === "ancestor") {
    if (generation === 1) {
      if (gender === "female") return "Ibu";
      if (gender === "male") return "Ayah";
      return "Orang Tua";
    }
    if (generation === 2) {
      if (gender === "female") return "Nenek";
      if (gender === "male") return "Kakek";
      return "Kakek/Nenek";
    }
    if (generation === 3) {
      if (gender === "female") return "Nenek Buyut";
      if (gender === "male") return "Kakek Buyut";
      return "Buyut";
    }
    const prefix = "Buyut-".repeat(generation - 3);
    if (gender === "female") return `${prefix}Nenek`;
    if (gender === "male") return `${prefix}Kakek`;
    return `${prefix}Leluhur`;
  } else {
    if (generation === 1) {
      if (gender === "female") return "Anak (P)";
      if (gender === "male") return "Anak (L)";
      return "Anak";
    }
    if (generation === 2) {
      if (gender === "female") return "Cucu (P)";
      if (gender === "male") return "Cucu (L)";
      return "Cucu";
    }
    if (generation === 3) {
      return "Cicit";
    }
    const prefix = "Cicit-".repeat(generation - 3);
    return `${prefix}Keturunan`;
  }
};

export interface TraversedPerson {
  person: Person;
  generation: number;
  relation: string;
}

/**
 * Gets all ancestors of a person up to a certain depth.
 */
export const getAncestors = (
  personId: string,
  family: FamilyData,
  maxDepth = 10,
): TraversedPerson[] => {
  const result: TraversedPerson[] = [];
  const visited = new Set<string>();

  const traverse = (currentId: string, depth: number) => {
    if (depth > maxDepth || visited.has(currentId)) return;
    visited.add(currentId);

    const parents = getParents(currentId, family);
    for (const parent of parents) {
      result.push({
        person: parent,
        generation: depth,
        relation: getRelationshipLabel(parent.gender, depth, "ancestor"),
      });
      traverse(parent.id, depth + 1);
    }
  };

  traverse(personId, 1);
  return result;
};

/**
 * Gets all descendants of a person.
 */
export const getDescendants = (personId: string, family: FamilyData): TraversedPerson[] => {
  const result: TraversedPerson[] = [];
  const visited = new Set<string>();

  const traverse = (currentId: string, depth: number) => {
    if (visited.has(currentId)) return;
    visited.add(currentId);

    const children = getChildren(currentId, family);
    for (const child of children) {
      result.push({
        person: child,
        generation: depth,
        relation: getRelationshipLabel(child.gender, depth, "descendant"),
      });
      traverse(child.id, depth + 1);
    }
  };

  traverse(personId, 1);
  return result;
};

/**
 * Returns the father line and mother line branches for a person.
 */
export const getFamilyBranch = (
  personId: string,
  family: FamilyData,
): { paternal: Person[]; maternal: Person[] } => {
  const parents = getParents(personId, family);
  
  // Distinguish father and mother by gender or order
  const father = parents.find((p) => p.gender === "male") || parents[0];
  const mother = parents.find((p) => p.gender === "female") || (parents[0] !== father ? parents[0] : parents[1]);

  const getLine = (rootId: string | undefined): Person[] => {
    if (!rootId) return [];
    const ancestors = getAncestors(rootId, family);
    const rootPerson = family.persons.find((p) => p.id === rootId);
    const list = rootPerson ? [rootPerson] : [];
    return [...list, ...ancestors.map((a) => a.person)];
  };

  return {
    paternal: father ? getLine(father.id) : [],
    maternal: mother ? getLine(mother.id) : [],
  };
};
