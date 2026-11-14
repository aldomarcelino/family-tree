import { getSmoothStepPath, type EdgeProps } from "reactflow";

export function MarriageEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {} }: EdgeProps) {
  const [path, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 10 });
  return <>
    <path id={id} d={path} fill="none" stroke={style.stroke || "#2563eb"} strokeWidth={1.5} className="react-flow__edge-path" />
    <circle cx={labelX} cy={labelY} r={4} fill="#f4f4f5" stroke={style.stroke || "#2563eb"} strokeWidth={1.4} />
  </>;
}
