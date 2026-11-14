import { getSmoothStepPath, type EdgeProps } from "reactflow";
import { FocusWavePath, WaveEndpoint, type WaveData } from "@/src/components/FamilyCanvas/FocusWavePath";
import { FAMILY_LINE_COLOR } from "@/src/services/familyLineColors";

export function MarriageEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, style = {} }: EdgeProps) {
  const [path, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 10 });
  const scale = data?.visualScale ?? 1;
  const wave: WaveData | undefined = data?.wave;
  const r = 2.8 * scale;
  const circle = `M ${labelX - r} ${labelY} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`;
  const circleDelay = wave ? wave.delay + (wave.origin === "middle" ? 0 : wave.duration / 2) : 0;
  return <g><title>{data?.familyLabel ? `Pasangan ${data.familyLabel}` : "Pasangan"}</title>
    <path id={id} d={path} style={{ ...style, fill: "none", stroke: FAMILY_LINE_COLOR }} className="react-flow__edge-path" />
    <FocusWavePath path={path} style={style} wave={wave} sourceX={sourceX} sourceY={sourceY} targetX={targetX} targetY={targetY} />
    <path d={circle} fill="white" stroke={FAMILY_LINE_COLOR} strokeWidth={1.2 * scale} />
    <WaveEndpoint path={circle} wave={wave} scale={scale} delay={circleDelay} strokeWidth={1.2} />
  </g>;
}
