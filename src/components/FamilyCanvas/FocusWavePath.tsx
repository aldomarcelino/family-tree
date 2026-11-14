"use client";

import { useId, type CSSProperties } from "react";
import type { EdgeWave } from "@/src/services/focusWave";
import { FOCUS_LINE_COLOR } from "@/src/services/familyLineColors";

export interface WaveData extends EdgeWave { key: string }
export function FocusWavePath({ path, style, wave, sourceX, sourceY, targetX, targetY }: {
  path: string; style?: CSSProperties; wave?: WaveData;
  sourceX: number; sourceY: number; targetX: number; targetY: number;
}) {
  const id = `wave-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  if (!wave) return null;
  const width = Number(style?.strokeWidth ?? 2);
  const padding = Math.max(160, width * 3);
  const variables = { "--wave-delay": `${wave.delay}ms`, "--wave-duration": `${wave.duration}ms`,
    "--wave-from": wave.origin === "target" ? -1 : 1 } as CSSProperties;
  return <g key={wave.key} aria-hidden="true" className="focus-wave-overlay">
    <defs><mask id={id} maskUnits="userSpaceOnUse" x={Math.min(sourceX, targetX) - padding} y={Math.min(sourceY, targetY) - padding}
      width={Math.abs(targetX - sourceX) + padding * 2} height={Math.abs(targetY - sourceY) + padding * 2}>
      <path d={path} pathLength={1} fill="none" stroke="white" strokeWidth={width + 2} strokeLinecap="round"
        strokeDasharray="1 1" className={`focus-wave-mask ${wave.origin === "middle" ? "focus-wave-middle" : ""}`} style={variables} />
    </mask></defs>
    <path d={path} style={{ ...style, fill: "none", stroke: FOCUS_LINE_COLOR }} mask={`url(#${id})`} />
  </g>;
}

export function WaveEndpoint({ path, wave, scale, delay, strokeWidth = 1.4 }: {
  path: string; wave?: WaveData; scale: number; delay: number; strokeWidth?: number;
}) {
  if (!wave) return null;
  return <path key={wave.key} d={path} fill="none" stroke={FOCUS_LINE_COLOR} strokeWidth={strokeWidth * scale}
    className="focus-wave-endpoint" style={{ "--wave-delay": `${delay}ms` } as CSSProperties} aria-hidden="true" />;
}
