import { BaseEdge, getSmoothStepPath, Position, type EdgeProps } from "reactflow";
import { FocusWavePath, WaveEndpoint, type WaveData } from "@/src/components/FamilyCanvas/FocusWavePath";
import { FAMILY_LINE_COLOR } from "@/src/services/familyLineColors";

export function FamilyRelationshipEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, data }: EdgeProps) {
  const scale = data?.visualScale ?? 1;
  const wave: WaveData | undefined = data?.wave;
  const hasStrip = ["parent", "adoption", "stepParent"].includes(data?.relationshipType);
  const vertical = targetPosition === Position.Top || targetPosition === Position.Bottom;
  const x = targetX + (hasStrip && !vertical ? (targetPosition === Position.Left ? -3 : 3) * scale : 0);
  const y = targetY + (hasStrip && vertical ? (targetPosition === Position.Top ? -3 : 3) * scale : 0);
  const [path] = getSmoothStepPath({ sourceX, sourceY, targetX: x, targetY: y, sourcePosition, targetPosition,
    offset: data?.relationshipType === "sibling" ? 36 : 20, borderRadius: 8 });
  const strip = vertical ? `M ${x - 4 * scale} ${y} h ${8 * scale}` : `M ${x} ${y - 4 * scale} v ${8 * scale}`;
  const stripDelay = wave ? wave.delay + (wave.origin === "target" ? 0 : wave.duration) : 0;
  return <g><title>{data?.familyLabel ? `Keluarga ${data.familyLabel}` : "Hubungan keluarga"}</title>
    <BaseEdge id={id} path={path} style={style} interactionWidth={20} />
    <FocusWavePath path={path} style={style} wave={wave} sourceX={sourceX} sourceY={sourceY} targetX={x} targetY={y} />
    {hasStrip && <><path d={strip} fill="none" stroke={FAMILY_LINE_COLOR} strokeWidth={1.4 * scale} className="family-line-strip" />
      <WaveEndpoint path={strip} wave={wave} scale={scale} delay={stripDelay} />
    </>}
  </g>;
}
