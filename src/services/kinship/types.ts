import type { Person, PersonGender } from "@/src/types/family";
import type { AgeComparison } from "@/src/services/kinship/age";

export type ParentLine = "father" | "mother";

export interface Kinship {
  label: string;
  up: number;
  down: number;
  score: number;
}

export interface RelativeContext {
  gender: PersonGender;
  age: AgeComparison;
  reference?: Person;
  line?: ParentLine;
  targetParent?: Person;
}

/** Each tradition supplies vocabulary/rules; graph traversal stays independent. */
export interface Tradition {
  name: string;
  spouse: (gender?: string) => string;
  sibling: (gender: PersonGender, age: AgeComparison, egoGender?: PersonGender) => string;
  siblingInLaw: (gender: PersonGender, age: AgeComparison, egoGender?: PersonGender) => string;
  ancestor: (depth: number, gender: PersonGender, line?: ParentLine) => string;
  descendant: (depth: number, gender: PersonGender) => string;
  uncleOrAunt: (context: RelativeContext) => string;
  greatUncleOrAunt: (up: number, gender: PersonGender) => string;
  nephewOrNiece: (context: RelativeContext) => string;
  grandnephew: string;
  cousin: (context: RelativeContext) => string;
  distantCousin: (up: number) => string;
  cousinChild: string;
  differentGenerationCousin: (gap: number) => string;
  coParentInLaw: string;
  parentCousin: (gender: PersonGender) => string;
  childInLaw: (gender: PersonGender) => string;
  parentInLaw: (gender: PersonGender, egoGender?: PersonGender) => string;
  stepAncestor: (depth: number, gender: PersonGender) => string;
  uncleOrAuntSpouse: (anchor: Kinship, gender: PersonGender) => string;
  extendedSpouseLabel: (currentLabel: string, target: Person, focus: Person) => string | undefined;
}

export const femaleOrMale = (gender: PersonGender, male: string, female: string) =>
  gender === "female" ? female : male;
