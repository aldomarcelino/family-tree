import { getKinshipLabels, type TuturMode } from "@/src/services/kinship";
import { getFamilyLineGroups, FAMILY_LINE_COLOR } from "@/src/services/familyLineColors";
import { packFamilyCouples } from "@/src/services/packFamilyCouples";
import type { Edge, Node } from "reactflow";
import type { FamilyData, Person, FolderDirectoryHandle } from "@/src/types/family";
import {
  getChildren,
  getParents,
  getPartners,
  getSiblings,
} from "@/src/services/familyGraph";

const NODE_WIDTH = 236;
const PARTNER_GAP = 68;
const SIBLING_GAP = 50;
const GROUP_GAP = 140;
const BRANCH_GAP = 180;
const COMPONENT_GAP = 420;
const GENERATION_GAP = 240;

/**
 * Calculates relationship badge labels relative to the focused member.
 */
export const getRelativeRelationLabel = (
  personId: string,
  focusPersonId: string | null,
  family: FamilyData,
  tuturMode: TuturMode = "indonesia",
): string | undefined => {
  if (!focusPersonId || personId === focusPersonId) return undefined;
  return getKinshipLabels(focusPersonId, family, tuturMode).get(personId);
};

const getAncestorSubtreeWidth = (
  personId: string,
  family: FamilyData,
  visited: Set<string>,
): number => {
  if (visited.has(personId)) return 0;
  visited.add(personId);

  const parents = getParents(personId, family);
  if (parents.length === 0) return NODE_WIDTH + 40;

  let sum = 0;
  for (const parent of parents) {
    sum += getAncestorSubtreeWidth(parent.id, family, new Set(visited));
  }
  return Math.max(sum, NODE_WIDTH + 40);
};

const getDescendantSubtreeWidth = (
  personId: string,
  family: FamilyData,
  visited: Set<string>,
): number => {
  if (visited.has(personId)) return 0;
  visited.add(personId);

  const children = getChildren(personId, family);
  if (children.length === 0) return NODE_WIDTH + 40;

  let sum = 0;
  for (const child of children) {
    sum += getDescendantSubtreeWidth(child.id, family, new Set(visited));
  }
  return Math.max(sum, NODE_WIDTH + 40);
};

const layoutAncestorsRecursive = (
  personId: string,
  family: FamilyData,
  x: number,
  y: number,
  w: number,
  nodes: Node[],
  edges: Edge[],
  visited: Set<string>,
  focusPersonId: string | null,
  onEdit: (person: Person) => void,
  onSelect?: (person: Person) => void,
  onFocus?: (id: string) => void,
  dirHandle?: FolderDirectoryHandle,
  tuturMode: TuturMode = "indonesia",
) => {
  if (visited.has(personId)) return;
  visited.add(personId);

  const person = family.persons.find((p) => p.id === personId);
  if (!person) return;

  const relationLabel = getRelativeRelationLabel(person.id, focusPersonId, family, tuturMode);

  nodes.push({
    id: person.id,
    type: "person",
    position: { x, y },
    data: {
      person,
      onEdit,
      onSelect,
      onFocus,
      dirHandle,
      relationLabel,
      isFocus: person.id === focusPersonId,
    },
  });

  const parents = getParents(personId, family);
  if (parents.length === 0) return;

  const father = parents.find((p) => p.gender === "male") || parents[0];
  const mother = parents.find((p) => p.gender === "female") || (parents[0] !== father ? parents[0] : parents[1]);

  if (father) {
    const nextX = x - w / 2;
    const nextY = y - GENERATION_GAP;
    layoutAncestorsRecursive(
      father.id,
      family,
      nextX,
      nextY,
      w / 2,
      nodes,
      edges,
      visited,
      focusPersonId,
      onEdit,
      onSelect,
      onFocus,
      dirHandle,
      tuturMode,
    );
    edges.push({
      id: `edge-${father.id}-${person.id}`,
      source: father.id,
      target: person.id,
      type: "smoothstep",
      sourceHandle: "child-source",
      targetHandle: "parent-target",
      style: { stroke: FAMILY_LINE_COLOR, strokeWidth: 2 },
    });
  }

  if (mother) {
    const nextX = x + w / 2;
    const nextY = y - GENERATION_GAP;
    layoutAncestorsRecursive(
      mother.id,
      family,
      nextX,
      nextY,
      w / 2,
      nodes,
      edges,
      visited,
      focusPersonId,
      onEdit,
      onSelect,
      onFocus,
      dirHandle,
      tuturMode,
    );
    edges.push({
      id: `edge-${mother.id}-${person.id}`,
      source: mother.id,
      target: person.id,
      type: "smoothstep",
      sourceHandle: "child-source",
      targetHandle: "parent-target",
      style: { stroke: FAMILY_LINE_COLOR, strokeWidth: 2 },
    });
  }

  if (father && mother) {
    edges.push({
      id: `edge-${father.id}-marriage-${mother.id}`,
      source: father.id,
      target: mother.id,
      type: "marriage",
      sourceHandle: "spouse-right",
      targetHandle: "spouse-left",
      style: { stroke: FAMILY_LINE_COLOR, strokeWidth: 2.5 },
    });
  }
};

const layoutDescendantsRecursive = (
  personId: string,
  family: FamilyData,
  x: number,
  y: number,
  nodes: Node[],
  edges: Edge[],
  visited: Set<string>,
  focusPersonId: string | null,
  onEdit: (person: Person) => void,
  onSelect?: (person: Person) => void,
  onFocus?: (id: string) => void,
  dirHandle?: FolderDirectoryHandle,
  tuturMode: TuturMode = "indonesia",
) => {
  if (visited.has(personId)) return;
  visited.add(personId);

  const person = family.persons.find((p) => p.id === personId);
  if (!person) return;

  const relationLabel = getRelativeRelationLabel(person.id, focusPersonId, family, tuturMode);

  nodes.push({
    id: person.id,
    type: "person",
    position: { x, y },
    data: {
      person,
      onEdit,
      onSelect,
      onFocus,
      dirHandle,
      relationLabel,
      isFocus: person.id === focusPersonId,
    },
  });

  const children = getChildren(personId, family);
  if (children.length === 0) return;

  const widths = children.map((c) => getDescendantSubtreeWidth(c.id, family, new Set([personId])));
  const totalWidth = widths.reduce((s, w) => s + w, 0);

  let startX = x - totalWidth / 2;

  for (let i = 0; i < children.length; i += 1) {
    const child = children[i];
    const childWidth = widths[i];
    const childX = startX + childWidth / 2;
    const childY = y + GENERATION_GAP;

    layoutDescendantsRecursive(
      child.id,
      family,
      childX,
      childY,
      nodes,
      edges,
      visited,
      focusPersonId,
      onEdit,
      onSelect,
      onFocus,
      dirHandle,
      tuturMode,
    );

    edges.push({
      id: `edge-${person.id}-${child.id}`,
      source: person.id,
      target: child.id,
      type: "smoothstep",
      sourceHandle: "child-source",
      targetHandle: "parent-target",
      style: { stroke: FAMILY_LINE_COLOR, strokeWidth: 2 },
    });

    startX += childWidth;
  }
};

/**
 * Partition persons into connected family components (disconnected graphs).
 */
export const findConnectedComponents = (family: FamilyData): Person[][] => {
  const neighbors = new Map<string, Set<string>>();
  for (const p of family.persons) neighbors.set(p.id, new Set());

  for (const r of family.relationships) {
    if (neighbors.has(r.from) && neighbors.has(r.to)) {
      neighbors.get(r.from)!.add(r.to);
      neighbors.get(r.to)!.add(r.from);
    }
  }

  for (const u of family.familyUnits) {
    for (const p1 of u.partners) {
      for (const p2 of u.partners) {
        if (p1 !== p2 && neighbors.has(p1) && neighbors.has(p2)) {
          neighbors.get(p1)!.add(p2);
          neighbors.get(p2)!.add(p1);
        }
      }
      for (const c of u.children) {
        if (neighbors.has(p1) && neighbors.has(c)) {
          neighbors.get(p1)!.add(c);
          neighbors.get(c)!.add(p1);
        }
      }
    }
  }

  const visited = new Set<string>();
  const components: Person[][] = [];

  for (const person of family.persons) {
    if (visited.has(person.id)) continue;
    const comp: Person[] = [];
    const queue = [person.id];
    visited.add(person.id);

    while (queue.length > 0) {
      const id = queue.shift()!;
      const p = family.persons.find((x) => x.id === id);
      if (p) comp.push(p);

      for (const neighborId of neighbors.get(id) ?? []) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
    }
    components.push(comp);
  }

  return components;
};

/** Keep couples and sibling groups aligned before calculating ancestry depth. */
const computeComponentGenerations = (
  family: FamilyData,
  persons: Person[],
): Map<string, number> => {
  const group = new Map(persons.map((person) => [person.id, person.id]));
  const find = (id: string): string => {
    const parent = group.get(id)!;
    if (parent === id) return id;
    const root = find(parent);
    group.set(id, root);
    return root;
  };
  const join = (a: string, b: string) => {
    if (group.has(a) && group.has(b)) group.set(find(b), find(a));
  };
  for (const relation of family.relationships) {
    if (relation.type === "marriage" || relation.type === "sibling") join(relation.from, relation.to);
  }
  for (const person of persons) {
    const children = getChildren(person.id, family).filter((child) => group.has(child.id));
    for (const child of children.slice(1)) join(children[0].id, child.id);
  }

  const levels = new Map(persons.map((person) => [find(person.id), 0]));
  const lineage = family.relationships.filter((relation) =>
    group.has(relation.from) && group.has(relation.to) &&
    (relation.type === "parent" || relation.type === "adoption" || relation.type === "stepParent"))
    .map((relation) => ({ parent: find(relation.from), child: find(relation.to) }))
    .filter((relation) => relation.parent !== relation.child);

  // Work across all recorded generations, bounded even for cyclic imports.
  for (let iteration = 0; iteration < levels.size; iteration += 1) {
    let changed = false;
    for (const { parent, child } of lineage) {
      const next = levels.get(parent)! + 1;
      if (levels.get(child)! < next) { levels.set(child, next); changed = true; }
    }
    if (!changed) break;
  }

  // A shorter ancestral family starts lower when its children marry into a
  // deeper tree. Move the entire couple/sibling group, never one card alone.
  const childrenByGroup = new Map<string, Set<string>>();
  for (const { parent, child } of lineage) {
    const children = childrenByGroup.get(parent) ?? new Set<string>();
    children.add(child);
    childrenByGroup.set(parent, children);
  }
  for (let iteration = 0; iteration < levels.size; iteration += 1) {
    let changed = false;
    for (const [parent, children] of childrenByGroup) {
      const next = Math.min(...[...children].map((child) => levels.get(child)!)) - 1;
      if (next > levels.get(parent)!) { levels.set(parent, next); changed = true; }
    }
    if (!changed) break;
  }

  const min = Math.min(...levels.values());
  return new Map(persons.map((person) => [person.id, levels.get(find(person.id))! - min]));
};

/**
 * Keep ancestral families in separate lanes at every generation. Marriage links
 * lanes; it does not merge their sibling rows. Children of both lanes are placed
 * below the connecting couple rather than appended to either family's siblings.
 */
const layoutComponent = (
  compPersons: Person[],
  family: FamilyData,
): Map<string, { x: number; y: number }> => {
  const pos = new Map<string, { x: number; y: number }>();
  if (compPersons.length === 0) return pos;

  const ids = new Set(compPersons.map((person) => person.id));
  const parents = new Map(compPersons.map((person) => [person.id,
    getParents(person.id, family).filter((parent) => ids.has(parent.id)).map((parent) => parent.id),
  ]));
  const partners = new Map(compPersons.map((person) => [person.id,
    getPartners(person.id, family).filter((partner) => ids.has(partner.id)).map((partner) => partner.id),
  ]));
  const generations = computeComponentGenerations(family, compPersons);
  const origins = new Map(compPersons.map((person) => [person.id, new Set<string>()]));
  // Resolve the whole spouse group before seeding an ancestral origin. With
  // spouse A — shared partner — spouse B, adding parents to A also anchors B.
  // Checking only direct spouses incorrectly gives B a new founding lane.
  const foundingIds = new Set<string>();
  const checkedPartners = new Set<string>();
  for (const person of compPersons) {
    if (checkedPartners.has(person.id)) continue;
    const coupleGroup = [person.id];
    checkedPartners.add(person.id);
    for (let index = 0; index < coupleGroup.length; index += 1) {
      for (const partner of partners.get(coupleGroup[index])!) {
        if (!checkedPartners.has(partner)) {
          checkedPartners.add(partner);
          coupleGroup.push(partner);
        }
      }
    }
    if (coupleGroup.every((id) => parents.get(id)!.length === 0)) {
      for (const id of coupleGroup) foundingIds.add(id);
    }
  }
  const roots = compPersons.filter((person) => foundingIds.has(person.id));
  const rootIds = new Set(roots.map((person) => person.id));

  // Founding couples and explicitly recorded root siblings share one origin.
  for (const root of roots) {
    if (origins.get(root.id)!.size > 0) continue;
    const queue = [root.id];
    origins.get(root.id)!.add(root.id);
    for (let index = 0; index < queue.length; index += 1) {
      const id = queue[index];
      const neighbors = [...partners.get(id)!, ...getSiblings(id, family).map((person) => person.id)];
      for (const neighbor of neighbors) {
        if (rootIds.has(neighbor) && origins.get(neighbor)!.size === 0) {
          origins.get(neighbor)!.add(root.id);
          queue.push(neighbor);
        }
      }
    }
  }

  for (let iteration = 0; iteration < compPersons.length; iteration += 1) {
    let changed = false;
    for (const person of compPersons) {
      const parentIds = parents.get(person.id)!;
      const sources = parentIds.length > 0 ? parentIds : partners.get(person.id)!;
      // A root with its own ancestry lane keeps it when it marries another root.
      if (rootIds.has(person.id)) continue;
      const own = origins.get(person.id)!;
      for (const source of sources) {
        for (const origin of origins.get(source)!) {
          if (!own.has(origin)) { own.add(origin); changed = true; }
        }
      }
    }
    if (!changed) break;
  }

  interface Branch {
    origins: Set<string>;
    rows: Map<number, string[]>;
    width: number;
    left: number;
  }
  const branches = new Map<string, Branch>();
  const branchByPerson = new Map<string, Branch>();
  for (const person of compPersons) {
    const own = origins.get(person.id)!;
    if (own.size === 0) own.add(person.id); // Isolated or cyclic imported data.
    const key = JSON.stringify([...own].sort());
    let branch = branches.get(key);
    if (!branch) {
      branch = { origins: own, rows: new Map(), width: NODE_WIDTH, left: 0 };
      branches.set(key, branch);
    }
    const generation = generations.get(person.id)!;
    const row = branch.rows.get(generation) ?? [];
    row.push(person.id);
    branch.rows.set(generation, row);
    branchByPerson.set(person.id, branch);
  }

  const lanes = [...branches.values()].filter((branch) => branch.origins.size === 1);
  // Keep families joined by marriage next to each other, independent of file order.
  for (let index = 0; index < lanes.length - 1; index += 1) {
    const connected = lanes.findIndex((candidate, otherIndex) => otherIndex > index &&
      compPersons.some((person) => branchByPerson.get(person.id) === lanes[index] &&
        partners.get(person.id)!.some((id) => branchByPerson.get(id) === candidate)));
    if (connected > index + 1) lanes.splice(index + 1, 0, lanes.splice(connected, 1)[0]);
  }
  const laneIndex = new Map(lanes.map((branch, index) => [branch, index]));
  const sameSiblingGroup = (a: string, b: string) => {
    const aParents = parents.get(a)!;
    const bParents = parents.get(b)!;
    if (aParents.length > 0 || bParents.length > 0) {
      return aParents.length === bParents.length && aParents.every((id) => bParents.includes(id));
    }
    return getSiblings(a, family).some((person) => person.id === b);
  };
  const gap = (a: string, b: string) => partners.get(a)!.includes(b) ? PARTNER_GAP :
    sameSiblingGroup(a, b) ? SIBLING_GAP : GROUP_GAP;
  const rowWidth = (row: string[]) => row.reduce((width, id, index) =>
    width + NODE_WIDTH + (index > 0 ? gap(row[index - 1], id) : 0), 0);

  // A spouse connecting two families faces the other lane. The remaining
  // siblings stay together, retaining their original order within the block.
  for (const branch of branches.values()) {
    const facing = (id: string) => {
      const ownIndex = laneIndex.get(branch);
      if (ownIndex === undefined) return 0;
      for (const partner of partners.get(id)!) {
        const other = laneIndex.get(branchByPerson.get(partner)!);
        if (other !== undefined && other !== ownIndex) return other < ownIndex ? -1 : 1;
      }
      return 0;
    };
    for (const [generation, row] of [...branch.rows].sort(([a], [b]) => a - b)) {
      const remaining = new Set(row);
      const blocks: string[][] = [];
      for (const id of row) {
        if (!remaining.delete(id)) continue;
        const block = [id];
        for (let index = 0; index < block.length; index += 1) {
          const neighbors = [...partners.get(block[index])!,
            ...row.filter((id) => sameSiblingGroup(block[index], id))];
          for (const neighbor of neighbors) {
            if (remaining.delete(neighbor)) block.push(neighbor);
          }
        }
        blocks.push(block);
      }
      const blockFacing = (block: string[]) => block.reduce((sum, id) => sum + facing(id), 0);
      const parentRow = branch.rows.get(generation - 1) ?? [];
      const parentOrder = (block: string[]) => {
        const indices = [...new Set(block.flatMap((id) => parents.get(id)!))]
          .map((id) => parentRow.indexOf(id)).filter((index) => index >= 0);
        return indices.length > 0 ? indices.reduce((sum, index) => sum + index, 0) / indices.length : 0;
      };
      blocks.sort((a, b) => parentOrder(a) - parentOrder(b) || blockFacing(a) - blockFacing(b));
      row.splice(0, row.length, ...blocks.flatMap((block) => {
        block.sort((a, b) => facing(a) - facing(b));
        // A two-spouse family is a path: spouse — shared partner — spouse.
        // Starting at the shared partner would put a spouse across another
        // marriage line, and put the child junction inside that spouse's card.
        const ordered: string[] = [];
        const pending = new Set(block);
        for (const id of block) {
          if (!pending.has(id)) continue;
          const component = [id];
          const seen = new Set([id]);
          for (let index = 0; index < component.length; index += 1) {
            for (const partner of partners.get(component[index])!) {
              if (pending.has(partner) && !seen.has(partner)) {
                seen.add(partner);
                component.push(partner);
              }
            }
          }
          const adjacent = (personId: string) => partners.get(personId)!.filter((partner) => seen.has(partner));
          const endpoint = component.find((personId) => adjacent(personId).length <= 1);
          if (endpoint && component.every((personId) => adjacent(personId).length <= 2)) {
            let current: string | undefined = endpoint;
            while (current) {
              ordered.push(current);
              pending.delete(current);
              current = adjacent(current).find((partner) => pending.has(partner));
            }
          } else {
            for (const personId of component) { ordered.push(personId); pending.delete(personId); }
          }
        }
        return ordered;
      }));
      branch.width = Math.max(branch.width, rowWidth(row));
    }
    const extraPartners = Math.max(0, ...[...branch.rows.values()].flatMap((row) =>
      row.map((id) => partners.get(id)!.filter((partner) => row.includes(partner)).length - 1)));
    branch.width += extraPartners * (NODE_WIDTH + PARTNER_GAP);
  }

  let left = 0;
  for (const lane of lanes) {
    lane.left = left;
    left += lane.width + BRANCH_GAP;
  }

  const placeRow = (row: string[], generation: number, start: number) => {
    let x = start;
    row.forEach((id, index) => {
      if (index > 0) x += gap(row[index - 1], id);
      pos.set(id, { x, y: generation * GENERATION_GAP });
      x += NODE_WIDTH;
    });
  };
  for (const lane of lanes) {
    for (const [generation, row] of [...lane.rows].sort(([a], [b]) => a - b)) {
      const parentPositions = [...new Set(row.flatMap((id) => parents.get(id)!))]
        .map((id) => pos.get(id)).filter((position) => position !== undefined);
      const width = rowWidth(row);
      const center = parentPositions.length > 0
        ? parentPositions.reduce((sum, position) => sum + position.x + NODE_WIDTH / 2, 0) / parentPositions.length
        : lane.left + lane.width / 2;
      placeRow(row, generation, Math.max(lane.left, Math.min(lane.left + lane.width - width, center - width / 2)));
    }
  }

  // Shared descendants belong under the joining couple. Reserve each whole
  // sibling row as a block so collision handling cannot scatter its members.
  const shared = [...branches.values()].filter((branch) => branch.origins.size > 1);
  const maxGeneration = Math.max(...generations.values());
  for (let generation = 0; generation <= maxGeneration; generation += 1) {
    for (const branch of shared) {
      const row = branch.rows.get(generation);
      if (!row) continue;
      const parentPositions = [...new Set(row.flatMap((id) => parents.get(id)!))]
        .map((id) => pos.get(id)).filter((position) => position !== undefined);
      const center = parentPositions.length > 0
        ? parentPositions.reduce((sum, position) => sum + position.x + NODE_WIDTH / 2, 0) / parentPositions.length
        : left / 2;
      const width = rowWidth(row);
      const desired = center - width / 2;
      const occupied = [...pos.values()].filter((position) => position.y === generation * GENERATION_GAP)
        .map((position) => ({ left: position.x - GROUP_GAP, right: position.x + NODE_WIDTH + GROUP_GAP }));
      const candidates = [desired, ...occupied.flatMap((span) => [span.left - width, span.right])];
      const available = candidates.filter((candidate) => occupied.every((span) =>
        candidate + width <= span.left || candidate >= span.right));
      const start = available.sort((a, b) => Math.abs(a - desired) - Math.abs(b - desired))[0] ?? desired;
      placeRow(row, generation, start);
    }
  }

  // Center smaller ancestor rows over their own children inside the same lane.
  for (let generation = maxGeneration - 1; generation >= 0; generation -= 1) {
    for (const lane of lanes) {
      const row = lane.rows.get(generation);
      if (!row) continue;
      const children = [...new Set(row.flatMap((id) => getChildren(id, family).map((person) => person.id)))]
        .filter((id) => branchByPerson.get(id) === lane && pos.has(id));
      if (children.length === 0) continue;
      const center = (Math.min(...children.map((id) => pos.get(id)!.x)) +
        Math.max(...children.map((id) => pos.get(id)!.x + NODE_WIDTH))) / 2;
      const contributingParents = row.filter((id) => getChildren(id, family)
        .some((child) => branchByPerson.get(child.id) === lane));
      const parentCenter = contributingParents.reduce((sum, id) => sum + pos.get(id)!.x + NODE_WIDTH / 2, 0) / contributingParents.length;
      const width = rowWidth(row);
      const desired = pos.get(row[0])!.x + center - parentCenter;
      placeRow(row, generation, Math.max(lane.left, Math.min(lane.left + lane.width - width, desired)));
    }
  }

  const minX = Math.min(...[...pos.values()].map((position) => position.x));
  for (const position of pos.values()) position.x -= minX;
  return pos;
};

/**
 * Builds ReactFlow nodes across all family components with generous spatial separation
 * and tidy vertical drops.
 */
const buildFullTreeNodes = (
  family: FamilyData,
  focusPersonId: string | null,
  onEdit: (person: Person) => void,
  onSelect?: (person: Person) => void,
  onFocus?: (id: string) => void,
  dirHandle?: FolderDirectoryHandle,
  tuturMode: TuturMode = "indonesia",
): Node[] => {
  const components = findConnectedComponents(family);
  if (components.length === 0) return [];

  const personById = new Map(family.persons.map((person) => [person.id, person]));
  const nodes: Node[] = [];
  const compLayouts: { pos: Map<string, { x: number; y: number }>; width: number }[] = [];

  // Compute layout for each independent family component
  for (const comp of components) {
    const compPos = packFamilyCouples(family, layoutComponent(comp, family), {
      nodeWidth: NODE_WIDTH, partnerGap: PARTNER_GAP, siblingGap: SIBLING_GAP, groupGap: GROUP_GAP,
    });
    const compWidths = Array.from(compPos.values()).map((p) => p.x + NODE_WIDTH);
    const width = Math.max(NODE_WIDTH, ...compWidths);
    compLayouts.push({ pos: compPos, width });
  }

  // Arrange components side-by-side with clear COMPONENT_GAP
  const totalTreeWidth =
    compLayouts.reduce((sum, c) => sum + c.width, 0) +
    Math.max(0, compLayouts.length - 1) * COMPONENT_GAP;

  let compOffsetX = -totalTreeWidth / 2;

  for (const { pos } of compLayouts) {
    for (const [pid, coord] of pos.entries()) {
      const person = personById.get(pid);
      if (!person) continue;

      const relationLabel = getRelativeRelationLabel(person.id, focusPersonId, family, tuturMode);

      nodes.push({
        id: person.id,
        type: "person",
        position: {
          x: coord.x + compOffsetX,
          y: coord.y,
        },
        data: {
          person,
          onEdit,
          onSelect,
          onFocus,
          dirHandle,
          relationLabel,
          isFocus: person.id === focusPersonId,
        },
      });
    }

    const currentCompWidth = Math.max(
      ...Array.from(pos.values()).map((p) => p.x + NODE_WIDTH),
    );
    compOffsetX += currentCompWidth + COMPONENT_GAP;
  }

  return nodes;
};

const buildFullTreeEdges = (family: FamilyData): Edge[] =>
  family.relationships.map((relationship) => {
    const isMarriage = relationship.type === "marriage";
    const isAdoption = relationship.type === "adoption";

    let style = { stroke: FAMILY_LINE_COLOR, strokeWidth: 2 };
    if (isMarriage) {
      style = { stroke: FAMILY_LINE_COLOR, strokeWidth: 2.5 };
    } else if (isAdoption) {
      style = { stroke: FAMILY_LINE_COLOR, strokeWidth: 2 };
    }

    return {
      id: relationship.id,
      source: relationship.from,
      target: relationship.to,
      sourceHandle: isMarriage ? "spouse-right" : "child-source",
      targetHandle: isMarriage ? "spouse-left" : "parent-target",
      type: isMarriage ? "marriage" : "smoothstep",
      label: relationship.type === "adoption" ? "adoption" : undefined,
      style,
    };
  });

/**
 * Filter out subtrees of collapsed members from rendering.
 */
export const pruneCollapsedSubtrees = (
  layout: { nodes: Node[]; edges: Edge[] },
  collapsedPersonIds: Set<string>,
  family: FamilyData,
): { nodes: Node[]; edges: Edge[] } => {
  if (collapsedPersonIds.size === 0) return layout;

  const hiddenIds = new Set<string>();

  const hideDescendants = (parentId: string) => {
    const children = getChildren(parentId, family);
    for (const child of children) {
      if (!hiddenIds.has(child.id)) {
        hiddenIds.add(child.id);
        hideDescendants(child.id);
      }
    }
  };

  for (const collapsedId of collapsedPersonIds) {
    hideDescendants(collapsedId);
  }

  return {
    nodes: layout.nodes.filter((n) => !hiddenIds.has(n.id)),
    edges: layout.edges.filter((e) => !hiddenIds.has(e.source) && !hiddenIds.has(e.target)),
  };
};

/**
 * Primary layout engine entrypoint. Calculates positions for React Flow nodes/edges
 * depending on selected view mode, focused person, and action handlers.
 */
export const getTreeLayout = (
  family: FamilyData,
  mode: "full" | "ancestor" | "descendant" | "branch",
  focusPersonId: string | null,
  onEditPerson: (person: Person) => void,
  onSelectPerson?: (person: Person) => void,
  onFocusPerson?: (id: string) => void,
  dirHandle?: FolderDirectoryHandle,
  collapsedPersonIds: Set<string> = new Set(),
  onToggleCollapse?: (id: string) => void,
  layoutMode: "auto" | "manual" = "auto",
  onAddRelative?: (person: Person, defaultRole?: "parent" | "spouse" | "child" | "sibling") => void,
  onDeletePerson?: (id: string) => void,
  tuturMode: TuturMode = "indonesia",
): { nodes: Node[]; edges: Edge[] } => {
  if (family.persons.length === 0) {
    return { nodes: [], edges: [] };
  }

  const rootId = focusPersonId || family.persons[0]?.id;
  let layoutResult: { nodes: Node[]; edges: Edge[] } = { nodes: [], edges: [] };

  if (mode === "full" || !rootId) {
    layoutResult = {
      nodes: buildFullTreeNodes(family, focusPersonId, onEditPerson, onSelectPerson, onFocusPerson, dirHandle, tuturMode),
      edges: buildFullTreeEdges(family),
    };
  } else if (mode === "ancestor") {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const width = getAncestorSubtreeWidth(rootId, family, new Set()) * 2;
    layoutAncestorsRecursive(
      rootId,
      family,
      0,
      0,
      width,
      nodes,
      edges,
      new Set(),
      focusPersonId,
      onEditPerson,
      onSelectPerson,
      onFocusPerson,
      dirHandle,
      tuturMode,
    );
    layoutResult = { nodes, edges };
  } else if (mode === "descendant") {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    layoutDescendantsRecursive(
      rootId,
      family,
      0,
      0,
      nodes,
      edges,
      new Set(),
      focusPersonId,
      onEditPerson,
      onSelectPerson,
      onFocusPerson,
      dirHandle,
      tuturMode,
    );
    layoutResult = { nodes, edges };
  } else if (mode === "branch") {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const visited = new Set<string>();

    const rootPerson = family.persons.find((p) => p.id === rootId);
    if (rootPerson) {
      const relationLabel = getRelativeRelationLabel(rootPerson.id, focusPersonId, family, tuturMode);
      nodes.push({
        id: rootPerson.id,
        type: "person",
        position: { x: 0, y: 0 },
        data: {
          person: rootPerson,
          onEdit: onEditPerson,
          onSelect: onSelectPerson,
          onFocus: onFocusPerson,
          dirHandle,
          relationLabel,
          isFocus: rootPerson.id === focusPersonId,
        },
      });
      visited.add(rootId);
    }

    const parents = getParents(rootId, family);
    const father = parents.find((p) => p.gender === "male") || parents[0];
    const mother = parents.find((p) => p.gender === "female") || (parents[0] !== father ? parents[0] : parents[1]);

    if (father) {
      const fWidth = getAncestorSubtreeWidth(father.id, family, new Set()) * 1.5;
      layoutAncestorsRecursive(
        father.id,
        family,
        -fWidth / 2 - 80,
        -GENERATION_GAP,
        fWidth,
        nodes,
        edges,
        visited,
        focusPersonId,
        onEditPerson,
        onSelectPerson,
        onFocusPerson,
        dirHandle,
        tuturMode,
      );
      edges.push({
        id: `edge-${father.id}-${rootId}`,
        source: father.id,
        target: rootId,
        type: "smoothstep",
        sourceHandle: "child-source",
        targetHandle: "parent-target",
        style: { stroke: FAMILY_LINE_COLOR, strokeWidth: 2 },
      });
    }

    if (mother) {
      const mWidth = getAncestorSubtreeWidth(mother.id, family, new Set()) * 1.5;
      layoutAncestorsRecursive(
        mother.id,
        family,
        mWidth / 2 + 80,
        -GENERATION_GAP,
        mWidth,
        nodes,
        edges,
        visited,
        focusPersonId,
        onEditPerson,
        onSelectPerson,
        onFocusPerson,
        dirHandle,
        tuturMode,
      );
      edges.push({
        id: `edge-${mother.id}-${rootId}`,
        source: mother.id,
        target: rootId,
        type: "smoothstep",
        sourceHandle: "child-source",
        targetHandle: "parent-target",
        style: { stroke: FAMILY_LINE_COLOR, strokeWidth: 2 },
      });
    }

    if (father && mother) {
      edges.push({
        id: `edge-${father.id}-marriage-${mother.id}`,
        source: father.id,
        target: mother.id,
        type: "marriage",
        sourceHandle: "spouse-right",
        targetHandle: "spouse-left",
        style: { stroke: FAMILY_LINE_COLOR, strokeWidth: 2.5 },
      });
    }

    layoutResult = { nodes, edges };
  }

  // Overwrite layout positions if manual coordinates are locked
  if (layoutMode === "manual") {
    layoutResult.nodes = layoutResult.nodes.map((node) => {
      const p = family.persons.find((x) => x.id === node.id);
      if (p?.layout) {
        return {
          ...node,
          position: { x: p.layout.x, y: p.layout.y },
        };
      }
      return node;
    });
  }

  // Filter out children/descendants of collapsed cards
  const pruned = pruneCollapsedSubtrees(layoutResult, collapsedPersonIds, family);

  // Inject collapse states & action handlers back to nodes data payload
  pruned.nodes = pruned.nodes.map((node) => ({
    ...node,
    ariaLabel: `Anggota ${node.data.person.fullName}`,
    data: {
      ...node.data,
      isCollapsed: collapsedPersonIds.has(node.id),
      childrenCount: getChildren(node.id, family).length,
      onToggleCollapse,
      onAddRelative,
      onDelete: onDeletePerson,
    },
  }));

  return routeFamilyConnections(pruned, family);
};


/** Merge a shared parent-child route at the visible couple's midpoint. */
export function routeFamilyConnections(layout: { nodes: Node[]; edges: Edge[] }, family: FamilyData): { nodes: Node[]; edges: Edge[] } {
  const nodes = [...layout.nodes];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const relationships = new Map(family.relationships.map((rel) => [rel.id, rel]));
  const { groups, relationshipGroups } = getFamilyLineGroups(family);
  const edges = layout.edges.map((original) => {
    const rel = relationships.get(original.id) ?? family.relationships.find((relation) =>
      original.type === "marriage" ? relation.type === "marriage" &&
        ((relation.from === original.source && relation.to === original.target) || (relation.from === original.target && relation.to === original.source)) :
        relation.type !== "marriage" && relation.from === original.source && relation.to === original.target);
    if (rel) relationships.set(original.id, rel);
    const group = relationshipGroups.get(rel?.id ?? original.id) ?? (original.type === "marriage" ?
      groups.find((candidate) => candidate.id === JSON.stringify([original.source, original.target].sort())) : undefined);
    const edge = group ? { ...original, style: { ...original.style, stroke: group.color },
      data: { ...original.data, relationshipType: rel?.type ?? (original.type === "marriage" ? "marriage" : undefined),
        familyGroupId: group.id, familyLabel: group.label, familyColor: group.color } } : original;
    const marriage = rel?.type === "marriage" || edge.type === "marriage";
    if (rel?.type === "sibling") return { ...edge, sourceHandle: "sibling-source", targetHandle: "sibling-target", data: { ...edge.data, relationshipType: "sibling" } };
    if (!marriage) return edge;
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    const leftToRight = (source?.position.x ?? 0) < (target?.position.x ?? 0);
    return { ...edge, type: "marriage", sourceHandle: leftToRight ? "spouse-right" : "spouse-left-source", targetHandle: leftToRight ? "spouse-left" : "spouse-right-target" };
  });
  const removed = new Set<string>();
  const added: Edge[] = [];
  for (const child of layout.nodes) {
    const incoming = edges.filter((edge) => edge.target === child.id && edge.type !== "marriage" && relationships.get(edge.id)?.type !== "sibling");
    if (incoming.length !== 2) continue;
    const [a, b] = incoming;
    const relA = relationships.get(a.id);
    const relB = relationships.get(b.id);
    // Keep special or mixed relationships separate so their meaning stays visible.
    if (!relA || !relB || relA.type !== relB.type || !["parent", "adoption"].includes(relA.type)) continue;
    const parentA = nodeById.get(a.source);
    const parentB = nodeById.get(b.source);
    if (!parentA || !parentB || parentA.position.y !== parentB.position.y) continue;
    const marriage = edges.find((edge) => edge.type === "marriage" && ((edge.source === a.source && edge.target === b.source) || (edge.source === b.source && edge.target === a.source)));
    if (!marriage) continue;
    const junctionId = `junction:${[a.source, b.source].sort().join(":")}`;
    if (!nodeById.has(junctionId)) {
      const junction: Node = { id: junctionId, type: "junction", position: { x: (parentA.position.x + parentB.position.x + NODE_WIDTH) / 2 - 1, y: parentA.position.y + 63 }, data: {}, draggable: false, selectable: false, focusable: false, connectable: false };
      nodes.push(junction); nodeById.set(junctionId, junction);
    }
    removed.add(a.id); removed.add(b.id);
    added.push({ ...a, id: `lineage:${a.id}:${b.id}`, source: junctionId, sourceHandle: "children", data: { ...a.data, relationshipType: relA.type }, type: "smoothstep" });
  }
  return { nodes, edges: [...edges.filter((edge) => !removed.has(edge.id)), ...added] };
}
