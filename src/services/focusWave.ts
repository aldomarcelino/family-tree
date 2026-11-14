import type { Edge, Node } from "reactflow";

export type WaveOrigin = "source" | "target" | "middle";
export interface EdgeWave { delay: number; duration: number; origin: WaveOrigin }
export interface FocusWaveSchedule { nodes: Map<string, number>; edges: Map<string, EdgeWave>; duration: number }

/** Propagate through every visible relationship, including both sides of a couple. */
export function getFocusWaveSchedule(nodes: Node[], edges: Edge[], focusId: string | null): FocusWaveSchedule {
  const result: FocusWaveSchedule = { nodes: new Map(), edges: new Map(), duration: 0 };
  const byId = new Map(nodes.map((node) => [node.id, node]));
  if (!focusId || !byId.has(focusId)) return result;
  const neighbors = new Map(nodes.map((node) => [node.id, [] as { id: string; duration: number }[]]));
  const link = (a: string, b: string, duration: number) => {
    if (!neighbors.has(a) || !neighbors.has(b)) return;
    neighbors.get(a)!.push({ id: b, duration }); neighbors.get(b)!.push({ id: a, duration });
  };
  const junctions = new Map<string, string>();
  for (const edge of edges) {
    const junction = `junction:${[edge.source, edge.target].sort().join(":")}`;
    if (edge.type === "marriage" && byId.has(junction)) {
      link(edge.source, junction, 150); link(junction, edge.target, 150);
      junctions.set(edge.id, junction);
    } else link(edge.source, edge.target, 300);
  }
  const borderTime = (id: string) => byId.get(id)?.type === "person" ? 140 : 0;
  const distance = new Map(nodes.map((node) => [node.id, Infinity]));
  const remaining = new Set(byId.keys());
  distance.set(focusId, 0);
  while (remaining.size > 0) {
    let closest: string | undefined;
    let time = Infinity;
    for (const id of remaining) if (distance.get(id)! < time) { closest = id; time = distance.get(id)!; }
    if (!closest) break;
    remaining.delete(closest);
    for (const next of neighbors.get(closest)!) {
      const arrival = time + borderTime(closest) + next.duration;
      if (arrival < distance.get(next.id)!) distance.set(next.id, arrival);
    }
  }
  const reached = [...distance].filter(([, time]) => Number.isFinite(time));
  const lastArrival = Math.max(0, ...reached.map(([, time]) => time));
  const scale = Math.min(1, 3000 / Math.max(1, lastArrival));
  for (const [id, time] of reached) result.nodes.set(id, time * scale);
  for (const edge of edges) {
    const source = distance.get(edge.source) ?? Infinity;
    const target = distance.get(edge.target) ?? Infinity;
    if (!Number.isFinite(source) || !Number.isFinite(target)) continue;
    const fromSource = source + borderTime(edge.source);
    const fromTarget = target + borderTime(edge.target);
    const junction = junctions.get(edge.id);
    const middle = junction ? distance.get(junction)! : Infinity;
    const origin: WaveOrigin = middle < Math.min(fromSource, fromTarget) ? "middle" : fromSource <= fromTarget ? "source" : "target";
    const start = origin === "middle" ? middle : origin === "source" ? fromSource : fromTarget;
    const duration = (origin === "middle" ? 150 : 300) * scale;
    result.edges.set(edge.id, { delay: start * scale, duration, origin });
    result.duration = Math.max(result.duration, start * scale + duration);
  }
  return result;
}
