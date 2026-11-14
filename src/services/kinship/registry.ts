import { indonesia } from "@/src/services/kinship/traditions/indonesia";
import { jawa } from "@/src/services/kinship/traditions/jawa";
import { mandailing } from "@/src/services/kinship/traditions/mandailing";
import { batak } from "@/src/services/kinship/traditions/batak";
import type { Tradition } from "@/src/services/kinship/types";

export const traditions = {
  indonesia,
  mandailing,
  batak,
  jawa,
} satisfies Record<string, Tradition>;

export type TuturMode = keyof typeof traditions;

export const tuturOptions = (Object.keys(traditions) as TuturMode[]).map((id) => ({
  id,
  name: traditions[id].name,
}));

export function getTradition(mode: TuturMode): Tradition {
  // Preferences can outlive a renamed/removed tradition in local storage.
  return traditions[mode] ?? traditions.indonesia;
}
