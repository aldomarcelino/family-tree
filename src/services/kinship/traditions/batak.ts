import { femaleOrMale, type Tradition } from "@/src/services/kinship/types";
import { comparePersonAges } from "@/src/services/kinship/age";

// This tradition owns its vocabulary and rules; do not inherit another tradition.
const terms = {
  father: "Amang",
  mother: "Inang",
  olderBrother: "Haha",
  olderSister: "Angkang",
  brotherInLaw: "Lae",
  sisterInLaw: "Eda",
  olderMaternalUncle: "Tulang",
  youngerMaternalUncle: "Tulang",
  olderPaternalUncle: "Amang Tua",
  youngerPaternalUncle: "Amang Uda",
  paternalUncle: "Amang Tua / Amang Uda",
  olderPaternalAunt: "Namboru",
  youngerPaternalAunt: "Namboru",
  paternalAunt: "Namboru",
  olderMaternalAunt: "Inang Tua",
  youngerMaternalAunt: "Inang Uda",
  maternalAunt: "Inang Tua / Inang Uda",
  olderUncleWife: "Inang Tua",
  youngerUncleWife: "Inang Uda",
  youngerAuntHusband: "Amang Uda",
  stepFather: "Amang Sambung",
  stepMother: "Inang Sambung",
  fatherInLaw: "Tulang / Simatua Doli",
  motherInLaw: "Nantulang / Simatua Boru",
};

const sibling: Tradition["sibling"] = (gender, age, egoGender) => {
  if (egoGender && egoGender !== gender) return "Ito";
  if (age === "younger") return "Anggi";
  return femaleOrMale(gender, terms.olderBrother, terms.olderSister);
};
export const batak: Tradition = {
  name: "Batak Toba",
  spouse: (gender) =>
    gender === "female" ? "Istri" : gender === "male" ? "Suami" : "Pasangan",
  sibling,
  siblingInLaw: (gender, age, egoGender) => {
    if (egoGender === "male") {
      if (gender === "male") return terms.brotherInLaw;
      if (age === "older") return "Angkang Boru";
      if (age === "younger") return "Anggi Boru";
      return "Angkang / Anggi Boru";
    }
    return femaleOrMale(gender, terms.brotherInLaw, terms.sisterInLaw);
  },
  ancestor: (depth, gender, line) => {
    if (depth === 1) return femaleOrMale(gender, terms.father, terms.mother);
    if (depth === 2) return femaleOrMale(gender, "Ompung", "Nenek");
    return line === "father" ? "Ompung Nini" : "Ompung Nono";
  },
  descendant: (depth, gender) => {
    if (depth === 1) return femaleOrMale(gender, "Anak", "Boru");
    return (
      ["", "", "Pahompu", "Pahompu Nini", "Pahompu Nono"][depth] ??
      `Pahompu ke-${depth - 1}`
    );
  },
  uncleOrAunt: ({ gender, age, line }) => {
    if (line === "father") {
      if (gender === "male") {
        if (age === "older") return terms.olderPaternalUncle;
        if (age === "younger") return terms.youngerPaternalUncle;
        return terms.paternalUncle;
      }
      if (age === "older") return terms.olderPaternalAunt;
      if (age === "younger") return terms.youngerPaternalAunt;
      return terms.paternalAunt;
    }
    if (gender === "male") {
      if (age === "older") return terms.olderMaternalUncle;
      if (age === "younger") return terms.youngerMaternalUncle;
      return "Tulang";
    }
    if (age === "older") return terms.olderMaternalAunt;
    if (age === "younger") return terms.youngerMaternalAunt;
    return terms.maternalAunt;
  },
  greatUncleOrAunt: () => "Ompung",
  nephewOrNiece: ({ gender, reference, targetParent }) =>
    reference && targetParent && targetParent.gender !== reference.gender
      ? "Bere"
      : femaleOrMale(gender, "Anak", "Boru"),
  grandnephew: "Pahompu",
  cousin: ({ gender, age, reference, line, targetParent }) => {
    if (line === "mother" && targetParent?.gender === "male") {
      if (reference?.gender === "male")
        return gender === "female" ? "Pariban" : terms.brotherInLaw;
      return gender === "male" ? "Ito" : terms.sisterInLaw;
    }
    if (line === "father" && targetParent?.gender === "female") {
      if (reference?.gender === "male")
        return gender === "female" ? "Ito" : terms.brotherInLaw;
      return gender === "male" ? "Pariban" : terms.sisterInLaw;
    }
    return sibling(gender, age, reference?.gender);
  },
  distantCousin: () => "Sepupu",
  coParentInLaw: "Besan",
  differentGenerationCousin: (gap) => `Sepupu beda ${gap} generasi`,
  cousinChild: "Bere",
  parentCousin: (gender) => femaleOrMale(gender, "Tulang", terms.paternalAunt),
  childInLaw: (gender) => femaleOrMale(gender, "Hela", "Parumaen"),
  parentInLaw: (gender, egoGender) =>
    egoGender === "male"
      ? femaleOrMale(gender, terms.fatherInLaw, terms.motherInLaw)
      : femaleOrMale(gender, "Simatua Doli", "Simatua Boru"),
  stepAncestor: (_, gender) =>
    femaleOrMale(gender, terms.stepFather, terms.stepMother),
  uncleOrAuntSpouse: (anchor, gender) => {
    if (
      [
        terms.paternalAunt,
        terms.olderPaternalAunt,
        terms.youngerPaternalAunt,
      ].includes(anchor.label)
    )
      return "Amangboru";
    if (anchor.label.includes("Tulang")) return "Nantulang";
    if (anchor.label === terms.youngerMaternalAunt)
      return terms.youngerAuntHusband;
    if (anchor.label === terms.olderMaternalAunt)
      return femaleOrMale(
        gender,
        terms.olderPaternalUncle,
        terms.olderUncleWife,
      );
    if (anchor.label === terms.olderPaternalUncle) return terms.olderUncleWife;
    if (anchor.label === terms.youngerPaternalUncle)
      return terms.youngerUncleWife;
    return femaleOrMale(gender, terms.paternalUncle, terms.maternalAunt);
  },
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
