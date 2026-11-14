import { femaleOrMale, type Tradition } from "@/src/services/kinship/types";
import { comparePersonAges } from "@/src/services/kinship/age";

const ancestor: Tradition["ancestor"] = (depth, gender) => {
  if (depth === 1) return femaleOrMale(gender, "Ayah", "Ibu");
  if (depth === 2) return femaleOrMale(gender, "Kakek", "Nenek");
  const base = femaleOrMale(gender, "Kakek buyut", "Nenek buyut");
  return depth === 3 ? base : `${base} ke-${depth - 2}`;
};

export const indonesia: Tradition = {
  name: "Bahasa Indonesia",
  spouse: (gender) =>
    gender === "female" ? "Istri" : gender === "male" ? "Suami" : "Pasangan",
  sibling: (gender, age) => {
    if (age === "younger") return "Adik";
    if (age === "older") return femaleOrMale(gender, "Abang", "Kakak");
    return femaleOrMale(gender, "Saudara", "Saudari");
  },
  siblingInLaw: (gender, age) => {
    if (age === "younger") return "Adik ipar";
    if (age === "older")
      return femaleOrMale(gender, "Abang ipar", "Kakak ipar");
    return femaleOrMale(gender, "Saudara ipar", "Saudari ipar");
  },
  ancestor,
  descendant: (depth) =>
    ["", "Anak", "Cucu", "Cicit", "Piut"][depth] ?? `Keturunan ke-${depth}`,
  uncleOrAunt: ({ gender }) => femaleOrMale(gender, "Paman", "Tante"),
  greatUncleOrAunt: (up, gender) => {
    const base = femaleOrMale(gender, "Paman", "Tante");
    return up === 3 ? `${base} buyut` : `${base} buyut ke-${up - 2}`;
  },
  nephewOrNiece: () => "Keponakan",
  grandnephew: "Cucu keponakan",
  cousin: () => "Sepupu",
  distantCousin: (up) => (up === 3 ? "Sepupu kedua" : `Sepupu ke-${up - 1}`),
  coParentInLaw: "Besan",
  differentGenerationCousin: (gap) => `Sepupu beda ${gap} generasi`,
  cousinChild: "Keponakan sepupu",
  parentCousin: (gender) =>
    femaleOrMale(gender, "Paman sepupu", "Tante sepupu"),
  childInLaw: () => "Menantu",
  parentInLaw: (gender) => femaleOrMale(gender, "Ayah mertua", "Ibu mertua"),
  stepAncestor: (depth, gender) => `${ancestor(depth, gender)} Sambung`,
  uncleOrAuntSpouse: (_, gender) => femaleOrMale(gender, "Paman", "Tante"),
  extendedSpouseLabel(currentLabel, target, focus) {
    const auntOrUncle = currentLabel.match(
      /^(Paman|Tante|Pakde|Bude|Paklek|Bulek|Tulang|Bou|Uwak|Udak|Etek)(.*)$/,
    );
    if (auntOrUncle)
      return `${femaleOrMale(target.gender, "Paman", "Tante")}${auntOrUncle[2]}`;
    const inLaw =
      /^(Saudar[ai]|Abang|Kakak|Adik|Mas|Mbak) ipar$/.test(currentLabel) ||
      /^(Tunggane|Lae|Eda)/.test(currentLabel);
    return inLaw
      ? this.siblingInLaw(
          target.gender,
          comparePersonAges(focus.birthDate, target.birthDate),
          focus.gender,
        )
      : undefined;
  },
};
