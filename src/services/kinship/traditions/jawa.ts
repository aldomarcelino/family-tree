import { femaleOrMale, type Tradition } from "@/src/services/kinship/types";
import { comparePersonAges } from "@/src/services/kinship/age";

export const jawa: Tradition = {
  name: "Kekerabatan Jawa",
  spouse: (gender) => gender === "female" ? "Garwa (Putri)" : gender === "male" ? "Garwa (Kakung)" : "Garwa",
  sibling: (gender, age) => {
    if (age === "younger") return "Adhik";
    if (age === "older") return femaleOrMale(gender, "Kangmas", "Mbakyu");
    return "Sedherek";
  },
  siblingInLaw: (gender, age) => {
    if (age === "younger") return "Adhik Ipar";
    if (age === "older") return femaleOrMale(gender, "Mas Ipar", "Mbak Ipar");
    return "Ipar";
  },
  ancestor: (depth, gender) => {
    if (depth === 1) return femaleOrMale(gender, "Bapak", "Ibu");
    if (depth === 2) return femaleOrMale(gender, "Mbah Kakung", "Mbah Putri");
    if (depth === 3) return femaleOrMale(gender, "Mbah Buyut (Kakung)", "Mbah Buyut (Putri)");
    if (depth === 4) return "Canggah";
    return depth === 5 ? "Wareng" : `Leluhur ke-${depth}`;
  },
  descendant: (depth, gender) => {
    if (depth === 1) return femaleOrMale(gender, "Anak Lanang", "Anak Wadon");
    return ["", "", "Putu", "Buyut", "Canggah", "Wareng"][depth] ?? `Keturunan ke-${depth}`;
  },
  uncleOrAunt: ({ gender, age }) => {
    if (age === "older") return femaleOrMale(gender, "Pakde", "Bude");
    if (age === "younger") return femaleOrMale(gender, "Paklek", "Bulek");
    return femaleOrMale(gender, "Pakde / Paklek", "Bude / Bulek");
  },
  greatUncleOrAunt: (_, gender) => femaleOrMale(gender, "Mbah De", "Mbah Lek"),
  nephewOrNiece: () => "Ponakan",
  grandnephew: "Cucu Ponakan",
  cousin: ({ gender, age }) => {
    if (age === "older") return femaleOrMale(gender, "Mas Sepupu", "Mbak Sepupu");
    return age === "younger" ? "Adhik Sepupu" : "Sepupu";
  },
  distantCousin: () => "Nak-dulur",
  coParentInLaw: "Besan",
  differentGenerationCousin: (gap) => `Sepupu beda ${gap} generasi`,
  cousinChild: "Ponakan",
  parentCousin: (gender) => femaleOrMale(gender, "Pakde Sepupu", "Bude Sepupu"),
  childInLaw: () => "Mantu",
  parentInLaw: (gender) => femaleOrMale(gender, "Bapak Maratuwa", "Ibu Maratuwa"),
  stepAncestor: (_, gender) => femaleOrMale(gender, "Bapak Walon", "Ibu Walon"),
  uncleOrAuntSpouse: (anchor, gender) => {
    if (anchor.label.includes("Pakde")) return "Bude";
    if (anchor.label.includes("Bude")) return "Pakde";
    if (anchor.label.includes("Paklek")) return "Bulek";
    if (anchor.label.includes("Bulek")) return "Paklek";
    return femaleOrMale(gender, "Paman", "Tante");
  },
  extendedSpouseLabel(currentLabel, target, focus) {
    const auntOrUncle = currentLabel.match(
      /^(Paman|Tante|Pakde|Bude|Paklek|Bulek|Tulang|Bou|Uwak|Udak|Etek)(.*)$/,
    );
    if (auntOrUncle) return `${femaleOrMale(target.gender, "Paman", "Tante")}${auntOrUncle[2]}`;
    const inLaw = /^(Saudar[ai]|Abang|Kakak|Adik|Mas|Mbak) ipar$/.test(currentLabel)
      || /^(Tunggane|Lae|Eda)/.test(currentLabel);
    return inLaw ? this.siblingInLaw(
      target.gender, comparePersonAges(focus.birthDate, target.birthDate), focus.gender,
    ) : undefined;
  },

};
