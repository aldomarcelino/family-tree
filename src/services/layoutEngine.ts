import type { Edge, Node } from "reactflow";
import type { FamilyData, Person, FolderDirectoryHandle } from "@/src/types/family";
import {
  getChildren,
  getParents,
  getPartners,
  getSiblings,
  getAncestors,
  getDescendants,
} from "@/src/services/familyGraph";

const NODE_WIDTH = 236;
const PARTNER_GAP = 68;
const GROUP_GAP = 140;
const GENERATION_GAP = 260;

/**
 * Calculates relationship badge labels relative to the focused member.
 */
export const getRelativeRelationLabel = (
  personId: string,
  focusPersonId: string | null,
  family: FamilyData,
): string | undefined => {
  if (!focusPersonId || personId === focusPersonId) return undefined;

  const parents = getParents(focusPersonId, family);
  const parentMatch = parents.find((p) => p.id === personId);
  if (parentMatch) {
    if (parentMatch.gender === "male") return "Ayah";
    if (parentMatch.gender === "female") return "Ibu";
    return "Orang Tua";
  }

  const partners = getPartners(focusPersonId, family);
  if (partners.some((p) => p.id === personId)) {
    return "Pasangan";
  }

  const children = getChildren(focusPersonId, family);
  const childMatch = children.find((c) => c.id === personId);
  if (childMatch) {
    if (childMatch.gender === "male") return "Anak (L)";
    if (childMatch.gender === "female") return "Anak (P)";
    return "Anak";
  }

  const siblings = getSiblings(focusPersonId, family);
  const siblingMatch = siblings.find((s) => s.id === personId);
  if (siblingMatch) {
    if (siblingMatch.gender === "male") return "Saudara";
    if (siblingMatch.gender === "female") return "Saudari";
    return "Saudara";
  }

  const ancestors = getAncestors(focusPersonId, family);
  const ancestorMatch = ancestors.find((a) => a.person.id === personId);
  if (ancestorMatch) {
    return ancestorMatch.relation;
  }

  const descendants = getDescendants(focusPersonId, family);
  const descendantMatch = descendants.find((d) => d.person.id === personId);
  if (descendantMatch) {
    return descendantMatch.relation;
  }

  return undefined;
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
) => {
  if (visited.has(personId)) return;
  visited.add(personId);

  const person = family.persons.find((p) => p.id === personId);
  if (!person) return;

  const relationLabel = getRelativeRelationLabel(person.id, focusPersonId, family);

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
    );
    edges.push({
      id: `edge-${father.id}-${person.id}`,
      source: father.id,
      target: person.id,
      type: "smoothstep",
      sourceHandle: "child-source",
      targetHandle: "parent-target",
      style: { stroke: "#2563eb", strokeWidth: 2 },
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
    );
    edges.push({
      id: `edge-${mother.id}-${person.id}`,
      source: mother.id,
      target: person.id,
      type: "smoothstep",
      sourceHandle: "child-source",
      targetHandle: "parent-target",
      style: { stroke: "#2563eb", strokeWidth: 2 },
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
      style: { stroke: "#2563eb", strokeWidth: 2.5 },
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
) => {
  if (visited.has(personId)) return;
  visited.add(personId);

  const person = family.persons.find((p) => p.id === personId);
  if (!person) return;

  const relationLabel = getRelativeRelationLabel(person.id, focusPersonId, family);

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
    );

    edges.push({
      id: `edge-${person.id}-${child.id}`,
      source: person.id,
      target: child.id,
      type: "smoothstep",
      sourceHandle: "child-source",
      targetHandle: "parent-target",
      style: { stroke: "#2563eb", strokeWidth: 2 },
    });

    startX += childWidth;
  }
};

const computeFullTreeGenerations = (family: FamilyData): Map<string, number> => {
  const generations = new Map(family.persons.map((person) => [person.id, 0]));
  const lineageRelationships = family.relationships.filter(
    (relationship) => relationship.type === "parent" || relationship.type === "adoption" || relationship.type === "stepParent",
  );

  for (let iteration = 0; iteration < family.persons.length; iteration += 1) {
    let changed = false;

    for (const relationship of lineageRelationships) {
      const parentGeneration = generations.get(relationship.from) ?? 0;
      const childGeneration = generations.get(relationship.to) ?? 0;
      const nextChildGeneration = Math.max(childGeneration, parentGeneration + 1);

      if (nextChildGeneration !== childGeneration) {
        generations.set(relationship.to, nextChildGeneration);
        changed = true;
      }
    }

    // Partners and explicitly recorded siblings share a generation.
    for (const relationship of family.relationships) {
      if (relationship.type !== "marriage" && relationship.type !== "sibling") continue;
      const generation = Math.max(generations.get(relationship.from) ?? 0, generations.get(relationship.to) ?? 0);
      for (const id of [relationship.from, relationship.to]) {
        if (generations.get(id) !== generation) { generations.set(id, generation); changed = true; }
      }
    }
    if (!changed) break;
  }

  return generations;
};

const getFullTreePartnerGroups = (
  family: FamilyData,
  generation: number,
  generations: Map<string, number>,
) => {
  const generationPersonIds = new Set(
    family.persons
      .filter((person) => (generations.get(person.id) ?? 0) === generation)
      .map((person) => person.id),
  );
  const used = new Set<string>();
  const groups: string[][] = [];
  const neighbors = new Map([...generationPersonIds].map((id) => [id, new Set<string>()]));
  const connect = (a: string, b: string) => {
    if (neighbors.has(a) && neighbors.has(b)) { neighbors.get(a)!.add(b); neighbors.get(b)!.add(a); }
  };
  for (const rel of family.relationships) if (rel.type === "marriage") connect(rel.from, rel.to);
  for (const unit of family.familyUnits) for (const a of unit.partners) for (const b of unit.partners) if (a !== b) connect(a, b);
  for (const personId of generationPersonIds) {
    if (used.has(personId)) continue;
    const component: string[] = [];
    const queue = [personId];
    const discovered = new Set(queue);
    while (queue.length) {
      const id = queue.shift()!;
      component.push(id);
      for (const other of neighbors.get(id) ?? []) if (!discovered.has(other)) { discovered.add(other); queue.push(other); }
    }
    // Put a partner with one connection at the end of a multi-partner row.
    const first = component.find((id) => neighbors.get(id)!.size <= 1) ?? personId;
    const ordered: string[] = [];
    const visit = (id: string) => {
      if (used.has(id)) return;
      used.add(id); ordered.push(id);
      for (const other of neighbors.get(id) ?? []) visit(other);
    };
    visit(first);
    groups.push(ordered);
  }

  return groups;
};

const groupWidth = (group: string[]) =>
  group.length * NODE_WIDTH + Math.max(0, group.length - 1) * PARTNER_GAP;

const buildFullTreeNodes = (
  family: FamilyData,
  focusPersonId: string | null,
  onEdit: (person: Person) => void,
  onSelect?: (person: Person) => void,
  onFocus?: (id: string) => void,
  dirHandle?: FolderDirectoryHandle,
): Node[] => {
  const generations = computeFullTreeGenerations(family);
  const maxGeneration = Math.max(0, ...Array.from(generations.values()));
  const personById = new Map(family.persons.map((person) => [person.id, person]));
  const nodes: Node[] = [];

  for (let generation = 0; generation <= maxGeneration; generation += 1) {
    const groups = getFullTreePartnerGroups(family, generation, generations);
    const parentCenter = (id: string) => {
      const parents = getParents(id, family).map((parent) => nodes.find((node) => node.id === parent.id)).filter((node): node is Node => Boolean(node));
      return parents.length ? parents.reduce((sum, node) => sum + node.position.x, 0) / parents.length : undefined;
    };
    const groupCenter = (group: string[]) => {
      const centers = group.map(parentCenter).filter((value): value is number => value !== undefined);
      return centers.length ? centers.reduce((sum, value) => sum + value, 0) / centers.length : 0;
    };
    if (generation > 0) {
      groups.sort((a, b) => groupCenter(a) - groupCenter(b));
      for (const group of groups) {
        const anchors = group.map(parentCenter).filter((value): value is number => value !== undefined);
        if (anchors.length > 1 && anchors[0] > anchors[anchors.length - 1]) group.reverse();
      }
    }
    const totalWidth =
      groups.reduce((sum, group) => sum + groupWidth(group), 0) +
      Math.max(0, groups.length - 1) * GROUP_GAP;
    let cursorX = -totalWidth / 2;

    for (const group of groups) {
      for (const personId of group) {
        const person = personById.get(personId);

        if (!person) {
          continue;
        }

        const relationLabel = getRelativeRelationLabel(person.id, focusPersonId, family);

        nodes.push({
          id: person.id,
          type: "person",
          position: {
            x: cursorX,
            y: generation * GENERATION_GAP,
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

        cursorX += NODE_WIDTH + PARTNER_GAP;
      }

      cursorX += GROUP_GAP - PARTNER_GAP;
    }
  }

  return nodes;
};

const buildFullTreeEdges = (family: FamilyData): Edge[] =>
  family.relationships.map((relationship) => {
    const isMarriage = relationship.type === "marriage";
    const isAdoption = relationship.type === "adoption";

    let style = { stroke: "#2563eb", strokeWidth: 2 };
    if (isMarriage) {
      style = { stroke: "#2563eb", strokeWidth: 2.5 };
    } else if (isAdoption) {
      style = { stroke: "#2563eb", strokeWidth: 2 };
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
): { nodes: Node[]; edges: Edge[] } => {
  if (family.persons.length === 0) {
    return { nodes: [], edges: [] };
  }

  const rootId = focusPersonId || family.persons[0]?.id;
  let layoutResult: { nodes: Node[]; edges: Edge[] } = { nodes: [], edges: [] };

  if (mode === "full" || !rootId) {
    layoutResult = {
      nodes: buildFullTreeNodes(family, focusPersonId, onEditPerson, onSelectPerson, onFocusPerson, dirHandle),
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
    );
    layoutResult = { nodes, edges };
  } else if (mode === "branch") {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const visited = new Set<string>();

    const rootPerson = family.persons.find((p) => p.id === rootId);
    if (rootPerson) {
      const relationLabel = getRelativeRelationLabel(rootPerson.id, focusPersonId, family);
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
      );
      edges.push({
        id: `edge-${father.id}-${rootId}`,
        source: father.id,
        target: rootId,
        type: "smoothstep",
        sourceHandle: "child-source",
        targetHandle: "parent-target",
        style: { stroke: "#2563eb", strokeWidth: 2 },
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
      );
      edges.push({
        id: `edge-${mother.id}-${rootId}`,
        source: mother.id,
        target: rootId,
        type: "smoothstep",
        sourceHandle: "child-source",
        targetHandle: "parent-target",
        style: { stroke: "#2563eb", strokeWidth: 2 },
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
        style: { stroke: "#2563eb", strokeWidth: 2.5 },
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
  const edges = layout.edges.map((edge) => {
    const rel = relationships.get(edge.id);
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
    added.push({ ...a, id: `lineage:${a.id}:${b.id}`, source: junctionId, sourceHandle: "children", data: { relationshipType: relA.type }, type: "smoothstep" });
  }
  return { nodes, edges: [...edges.filter((edge) => !removed.has(edge.id)), ...added] };
}
