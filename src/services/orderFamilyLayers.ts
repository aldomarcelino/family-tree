export interface FamilyLayerBlock {
  members: string[];
  offsets: Map<string, number>;
  width: number;
  center: number;
}
interface LineageLink { parents: string[]; child: string; sourceLevel: number; targetLevel: number }
interface Score { gaps: number; crossings: number; span: number }

/** Order whole couples and sibling cohorts before assigning final coordinates. */
export function orderFamilyLayers(
  rows: Map<number, FamilyLayerBlock[]>,
  parents: Map<string, Set<string>>,
  childGroups: { parents: string[]; children: string[] }[],
  levelsByPerson: Map<string, number>,
  spacing: { nodeWidth: number; siblingGap: number; groupGap: number },
) {
  const { siblingGap, groupGap } = spacing;
  const gap = (a: FamilyLayerBlock, b: FamilyLayerBlock) => a.members.some((member) => b.members.some((other) =>
    [...parents.get(member)!].some((parent) => parents.get(other)!.has(parent)))) ? siblingGap : groupGap;
  const points = new Map<string, number>();
  const rowPoints = (order: FamilyLayerBlock[]) => {
    const result = new Map<string, number>();
    let x = 0;
    for (let index = 0; index < order.length; index += 1) {
      const block = order[index];
      if (index > 0) x += gap(order[index - 1], block);
      const center = x + block.width / 2;
      for (const member of block.members) result.set(member, center + block.offsets.get(member)!);
      x += block.width;
    }
    for (const [id, value] of result) result.set(id, value - x / 2);
    return result;
  };
  for (const row of rows.values()) for (const [id, x] of rowPoints(row)) points.set(id, x);
  const links: LineageLink[] = [];
  for (const [child, parentIds] of parents) {
    const above = [...parentIds].filter((parent) => levelsByPerson.get(parent)! < levelsByPerson.get(child)!);
    if (above.length === 0) continue;
    // Uneven parent depths remain separate routing constraints.
    const byLevel = new Map<number, string[]>();
    for (const parent of above) {
      const level = levelsByPerson.get(parent)!;
      byLevel.set(level, [...(byLevel.get(level) ?? []), parent]);
    }
    for (const [sourceLevel, group] of byLevel) links.push({ parents: group, child, sourceLevel, targetLevel: levelsByPerson.get(child)! });
  }
  const pairs: [LineageLink, LineageLink][] = [];
  for (let a = 0; a < links.length; a += 1) for (let b = a + 1; b < links.length; b += 1) {
    if (links[a].sourceLevel === links[b].sourceLevel && links[a].targetLevel === links[b].targetLevel) pairs.push([links[a], links[b]]);
  }
  const sourceX = (link: LineageLink, x: (id: string) => number) => link.parents.reduce((sum, parent) => sum + x(parent), 0) / link.parents.length;
  const better = (a: Score, b: Score) => a.gaps < b.gaps || (a.gaps === b.gaps &&
    (a.crossings < b.crossings || (a.crossings === b.crossings && a.span < b.span - .01)));
  const keys = new Map([...rows.values()].flat().map((block, index) => [block, index]));
  const optimizeRow = (level: number) => {
    const row = rows.get(level)!;
    const groups = childGroups.map((group) => new Set(row.filter((block) => block.members.some((id) => group.children.includes(id)))))
      .filter((group) => group.size > 1);
    const affectedLinks = links.filter((link) => link.sourceLevel === level || link.targetLevel === level);
    const affectedPairs = pairs.filter(([link]) => link.sourceLevel === level || link.targetLevel === level);
    const gapCount = (order: FamilyLayerBlock[]) => groups.reduce((sum, group) => {
      const indices = order.flatMap((block, index) => group.has(block) ? [index] : []);
      return sum + Math.max(...indices) - Math.min(...indices) + 1 - indices.length;
    }, 0);
    const score = (order: FamilyLayerBlock[]): Score => {
      const candidate = rowPoints(order);
      const x = (id: string) => candidate.get(id) ?? points.get(id)!;
      const gaps = gapCount(order);
      let crossings = 0;
      for (const [a, b] of affectedPairs) {
        if ((sourceX(a, x) - sourceX(b, x)) * (x(a.child) - x(b.child)) < -.001) crossings += 1;
      }
      const span = affectedLinks.reduce((sum, link) => sum + Math.abs(sourceX(link, x) - x(link.child)), 0);
      return { gaps, crossings, span };
    };
    let bestScore = score(row);
    let best = [...row];
    const seen = new Set<string>();
    const consider = (candidate: FamilyLayerBlock[]) => {
      const key = candidate.map((block) => keys.get(block)).join(',');
      if (seen.has(key)) return;
      seen.add(key);
      if (gapCount(candidate) > bestScore.gaps) return;
      const next = score(candidate);
      if (better(next, bestScore)) { best = candidate; bestScore = next; }
    };
    consider([...row].reverse());
    const targets = (length: number, origin: number) => length <= 32 ? Array.from({ length: length + 1 }, (_, index) => index) :
      [...new Set([0, length, ...Array.from({ length: 13 }, (_, index) => Math.max(0, Math.min(length, origin + index - 6)))])];
    for (let from = 0; from < row.length; from += 1) {
      const rest = row.filter((_, index) => index !== from);
      for (const to of targets(rest.length, from)) consider([...rest.slice(0, to), row[from], ...rest.slice(to)]);
      for (const to of targets(row.length - 1, from).filter((index) => index > from)) consider([...row.slice(0, from), ...row.slice(from, to + 1).reverse(), ...row.slice(to + 1)]);
    }
    for (const group of groups) {
      const members = row.filter((block) => group.has(block));
      const rest = row.filter((block) => !group.has(block));
      for (const to of targets(rest.length, row.findIndex((block) => group.has(block)))) {
        consider([...rest.slice(0, to), ...members, ...rest.slice(to)]);
        consider([...rest.slice(0, to), ...[...members].reverse(), ...rest.slice(to)]);
      }
    }
    const changed = best.some((block, index) => row[index] !== block);
    row.splice(0, row.length, ...best);
    for (const [id, x] of rowPoints(row)) points.set(id, x);
    // Mirror couples only when this improves the same crossing objective.
    let flipped = false;
    for (const block of row) {
      if (block.members.length < 2) continue;
      const previous = score(row);
      for (const [id, offset] of block.offsets) block.offsets.set(id, -offset);
      const next = score(row);
      if (better(next, previous)) { block.members.reverse(); flipped = true; }
      else for (const [id, offset] of block.offsets) block.offsets.set(id, -offset);
      for (const [id, x] of rowPoints(row)) points.set(id, x);
    }
    return changed || flipped;
  };
  const levels = [...rows.keys()].sort((a, b) => a - b);
  // Bounded alternating sweeps optimize crossings across generations together.
  for (let pass = 0; pass < 8; pass += 1) {
    let changed = false;
    const order = pass % 2 === 0 ? [...levels].reverse() : levels;
    for (const level of order) changed = optimizeRow(level) || changed;
    if (!changed && pass > 1) break;
  }
}
