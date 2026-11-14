import type { Person } from "@/src/types/family";
import { comparePersonAges } from "@/src/services/kinship/age";
import type {
  Kinship,
  ParentLine,
  RelativeContext,
  Tradition,
} from "@/src/services/kinship/types";

/** Classify the common-ancestor path once, then delegate wording to a tradition. */
export function bloodLabel(
  tradition: Tradition,
  up: number,
  down: number,
  target: Person,
  reference?: Person,
  line?: ParentLine,
  targetParent?: Person,
  connectingParent?: Person,
): string {
  if (down === 0) return tradition.ancestor(up, target.gender, line);
  if (up === 0) return tradition.descendant(down, target.gender);
  const context: RelativeContext = {
    gender: target.gender,
    age: comparePersonAges(reference?.birthDate, target.birthDate),
    reference,
    line,
    targetParent,
  };
  if (up === 1 && down === 1)
    return tradition.sibling(target.gender, context.age, reference?.gender);
  if (up === 2 && down === 1)
    return tradition.uncleOrAunt({
      ...context,
      age: comparePersonAges(connectingParent?.birthDate, target.birthDate),
    });
  if (up >= 3 && down === 1)
    return tradition.greatUncleOrAunt(up, target.gender);
  if (up === 1 && down === 2) return tradition.nephewOrNiece(context);
  if (up === 1 && down === 3) return tradition.grandnephew;
  if (up === 2 && down === 2) return tradition.cousin(context);
  if (up === down && up >= 3) return tradition.distantCousin(up);
  if (up === 2 && down === 3) return tradition.cousinChild;
  if (up === 3 && down === 2) return tradition.parentCousin(target.gender);
  return tradition.differentGenerationCousin(Math.abs(up - down));
}

export function spouseOfRelativeLabel(
  tradition: Tradition,
  anchor: Kinship,
  spouse: Person,
  focus: Person,
): string {
  const { gender } = spouse;
  if (anchor.up === 0 && anchor.down === 0) return tradition.spouse(gender);
  if (anchor.up === 0 && anchor.down === 1) return tradition.childInLaw(gender);
  if (anchor.up === 1 && anchor.down === 1)
    return tradition.siblingInLaw(
      gender,
      comparePersonAges(focus.birthDate, spouse.birthDate),
      focus.gender,
    );
  if (anchor.down === 0) return tradition.stepAncestor(anchor.up, gender);
  if (anchor.down === 1 && anchor.up === 2)
    return tradition.uncleOrAuntSpouse(anchor, gender);
  return `${tradition.spouse(gender)} ${anchor.label.toLowerCase()}`;
}

export function relativeOfSpouseLabel(
  tradition: Tradition,
  relative: Kinship,
  target: Person,
  focus: Person,
  spouseLabel: string,
): string {
  if (relative.down === 0 && relative.up === 1)
    return tradition.parentInLaw(target.gender, focus.gender);
  if (relative.down !== 0 && relative.up === 0)
    return `${relative.label} Sambung`;
  if (relative.up === 1 && relative.down === 1)
    return tradition.siblingInLaw(
      target.gender,
      comparePersonAges(focus.birthDate, target.birthDate),
      focus.gender,
    );
  return `${relative.label} dari ${spouseLabel.toLowerCase()}`;
}
