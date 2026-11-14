// Public API: keep callers independent of the resolver and tradition modules.
import type { PersonGender } from "@/src/types/family";
import type { AgeComparison } from "@/src/services/kinship/age";
import { getTradition, type TuturMode } from "@/src/services/kinship/registry";

export { getKinshipLabels } from "@/src/services/kinship/resolve";
export { comparePersonAges, type AgeComparison } from "@/src/services/kinship/age";
export { tuturOptions, type TuturMode } from "@/src/services/kinship/registry";
export { femaleOrMale } from "@/src/services/kinship/types";

export const spouseLabelFor = (gender?: string, mode: TuturMode = "indonesia") =>
  getTradition(mode).spouse(gender);

export function siblingLabel(
  gender: PersonGender,
  age: AgeComparison,
  mode: TuturMode = "indonesia",
  egoGender?: PersonGender,
): string {
  return getTradition(mode).sibling(gender, age, egoGender);
}

export function inLawSiblingLabel(
  gender: PersonGender,
  age: AgeComparison,
  mode: TuturMode = "indonesia",
  egoGender?: PersonGender,
): string {
  return getTradition(mode).siblingInLaw(gender, age, egoGender);
}
