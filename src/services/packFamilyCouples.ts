import { orderFamilyLayers } from "@/src/services/orderFamilyLayers";
import type { FamilyData } from "@/src/types/family";

type Point = { x: number; y: number };
interface Spacing { nodeWidth: number; partnerGap: number; siblingGap: number; groupGap: number }
interface CoupleBlock {
  members: string[];
  offsets: Map<string, number>;
  width: number;
  center: number;
}

/** Compact intermarried branches by moving entire spouse groups, never one spouse. */
export function packFamilyCouples(family: FamilyData, initial: Map<string, Point>, spacing: Spacing): Map<string, Point> {
  const { nodeWidth, partnerGap, siblingGap, groupGap } = spacing;
  const parents = new Map([...initial.keys()].map((id) => [id, new Set<string>()]));
  const partners = new Map([...initial.keys()].map((id) => [id, new Set<string>()]));
  for (const relation of family.relationships) {
    if (!initial.has(relation.from) || !initial.has(relation.to)) continue;
    if (["parent", "adoption", "stepParent"].includes(relation.type)) parents.get(relation.to)!.add(relation.from);
    if (relation.type === "marriage" && initial.get(relation.from)!.y === initial.get(relation.to)!.y) {
      partners.get(relation.from)!.add(relation.to);
      partners.get(relation.to)!.add(relation.from);
    }
  }

  // Preserve the established layout when partners are already unobstructed.
  const needsPacking = [...partners].some(([id, spouses]) => [...spouses].some((spouse) => {
    const a = initial.get(id)!, b = initial.get(spouse)!;
    return [...initial].some(([other, point]) => other !== id && other !== spouse && point.y === a.y &&
      point.x > Math.min(a.x, b.x) && point.x < Math.max(a.x, b.x));
  }));
  const lineageLinks = [...parents].filter(([, ids]) => ids.size > 0).map(([child, ids]) => ({
    child, parents: [...ids], sourceY: initial.get([...ids][0])!.y, targetY: initial.get(child)!.y,
    sourceX: [...ids].reduce((sum, id) => sum + initial.get(id)!.x, 0) / ids.size, targetX: initial.get(child)!.x,
  }));
  const hasCrossedLineage = lineageLinks.some((a, index) => lineageLinks.slice(index + 1).some((b) =>
    a.sourceY === b.sourceY && a.targetY === b.targetY && (a.sourceX - b.sourceX) * (a.targetX - b.targetX) < -.001));
  if (!needsPacking && !hasCrossedLineage) return initial;

  const positions = new Map([...initial].map(([id, point]) => [id, { ...point }]));
  const rows = new Map<number, CoupleBlock[]>();
  const visited = new Set<string>();
  for (const [id, point] of initial) {
    if (visited.has(id)) continue;
    const members = [id];
    visited.add(id);
    for (let index = 0; index < members.length; index += 1) {
      for (const spouse of partners.get(members[index])!) {
        if (!visited.has(spouse)) { visited.add(spouse); members.push(spouse); }
      }
    }
    // Endpoint traversal puts the shared partner between two spouses.
    const endpoints = members.filter((member) => partners.get(member)!.size <= 1)
      .sort((a, b) => initial.get(a)!.x - initial.get(b)!.x);
    const ordered: string[] = [];
    if (endpoints.length > 0 && members.every((member) => partners.get(member)!.size <= 2)) {
      let current: string | undefined = endpoints[0];
      const pending = new Set(members);
      while (current) {
        ordered.push(current); pending.delete(current);
        current = [...partners.get(current)!].find((spouse) => pending.has(spouse));
      }
    } else ordered.push(...members.sort((a, b) => initial.get(a)!.x - initial.get(b)!.x));
    const width = ordered.length * nodeWidth + (ordered.length - 1) * partnerGap;
    const offsets = new Map(ordered.map((member, index) => [member,
      index * (nodeWidth + partnerGap) + nodeWidth / 2 - width / 2]));
    const center = ordered.reduce((sum, member) => sum + initial.get(member)!.x + nodeWidth / 2 - offsets.get(member)!, 0) / ordered.length;
    const row = rows.get(point.y) ?? [];
    row.push({ members: ordered, offsets, width, center });
    rows.set(point.y, row);
  }
  for (const row of rows.values()) row.sort((a, b) => a.center - b.center);

  const childGroups = new Map<string, { parents: string[]; children: string[] }>();
  for (const [child, parentIds] of parents) {
    if (parentIds.size === 0) continue;
    const key = JSON.stringify([...parentIds].sort());
    const group = childGroups.get(key) ?? { parents: [...parentIds], children: [] };
    group.children.push(child);
    childGroups.set(key, group);
  }
  const gap = (a: CoupleBlock, b: CoupleBlock) => a.members.some((member) => b.members.some((other) =>
    [...parents.get(member)!].some((parent) => parents.get(other)!.has(parent)))) ? siblingGap : groupGap;

  orderFamilyLayers(rows, parents, [...childGroups.values()], new Map([...initial].map(([id, point]) => [id, point.y])), spacing);

  // Isotonic compaction minimizes displacement while reserving the full width
  // of every couple. Unlike a right-only collision sweep, it centers siblings
  // around their parents and never pushes an individual spouse out of the pair.
  const compact = (row: CoupleBlock[], desired: Map<CoupleBlock, number>) => {
    const offsets: number[] = [];
    let distance = 0;
    for (let index = 0; index < row.length; index += 1) {
      if (index > 0) distance += row[index - 1].width / 2 + gap(row[index - 1], row[index]) + row[index].width / 2;
      offsets.push(distance);
    }
    const pools: { start: number; end: number; sum: number; count: number }[] = [];
    row.forEach((block, index) => {
      pools.push({ start: index, end: index, sum: desired.get(block)! - offsets[index], count: 1 });
      while (pools.length > 1) {
        const a = pools[pools.length - 2], b = pools[pools.length - 1];
        if (a.sum / a.count <= b.sum / b.count) break;
        a.end = b.end; a.sum += b.sum; a.count += b.count;
        pools.pop();
      }
    });
    for (const pool of pools) for (let index = pool.start; index <= pool.end; index += 1) {
      const block = row[index];
      block.center = pool.sum / pool.count + offsets[index];
      for (const member of block.members) positions.get(member)!.x = block.center + block.offsets.get(member)! - nodeWidth / 2;
    }
  };

  const levels = [...rows.keys()].sort((a, b) => a - b);
  for (const row of rows.values()) compact(row, new Map(row.map((block) => [block, block.center])));
  const iterations = Math.min(64, Math.max(16, levels.length * 3));
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    // Bring each ancestral family over the member who married into this row.
    for (const level of [...levels].reverse()) {
      const row = rows.get(level)!;
      const desired = new Map<CoupleBlock, number>();
      for (const block of row) {
        const anchors: number[] = [];
        for (const group of childGroups.values()) {
          const linkedParents = group.parents.filter((parent) => block.offsets.has(parent));
          const children = group.children.filter((child) => positions.get(child)!.y > level);
          if (linkedParents.length === 0 || children.length === 0) continue;
          const center = (Math.min(...children.map((child) => positions.get(child)!.x)) +
            Math.max(...children.map((child) => positions.get(child)!.x + nodeWidth))) / 2;
          const parentOffset = linkedParents.reduce((sum, parent) => sum + block.offsets.get(parent)!, 0) / linkedParents.length;
          anchors.push(center - parentOffset);
        }
        desired.set(block, anchors.length > 0 ? anchors.reduce((sum, x) => sum + x, 0) / anchors.length : block.center);
      }
      compact(row, desired);
    }
    // Place the next generation below its actual parent couples. Spouses with
    // their own ancestors contribute anchors without splitting the spouse block.
    for (const level of levels) {
      const row = rows.get(level)!;
      const desired = new Map<CoupleBlock, number>();
      for (const block of row) {
        const anchors: number[] = [];
        for (const member of block.members) {
          const above = [...parents.get(member)!].filter((parent) => positions.get(parent)!.y < level);
          if (above.length === 0) continue;
          const center = above.reduce((sum, parent) => sum + positions.get(parent)!.x + nodeWidth / 2, 0) / above.length;
          anchors.push(center - block.offsets.get(member)!);
        }
        desired.set(block, anchors.length > 0 ? anchors.reduce((sum, x) => sum + x, 0) / anchors.length : block.center);
      }
      compact(row, desired);
    }
  }
  const minX = Math.min(...[...positions.values()].map((point) => point.x));
  for (const point of positions.values()) point.x -= minX;
  return positions;
}
