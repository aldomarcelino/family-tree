import type { FamilyData, Person, PersonGender } from "@/src/types/family";

export type TuturMode = "indonesia" | "mandailing" | "batak" | "jawa";

// Batak here specifically means Toba. Keep each tradition's vocabulary separate
// while sharing the graph traversal and relationship classification.
const mandailingTerms = {
  father: "Ayah",
  mother: "Umak",
  olderBrother: "Angkang",
  olderSister: "Kakak",
  brotherInLaw: "Tunggane",
  sisterInLaw: "Eda",
  olderMaternalUncle: "Tulang Tobang",
  youngerMaternalUncle: "Tulang",
  olderPaternalUncle: "Uwak",
  youngerPaternalUncle: "Udak",
  paternalUncle: "Uwak / Udak",
  olderPaternalAunt: "Tobang",
  youngerPaternalAunt: "Bou",
  paternalAunt: "Bou",
  olderMaternalAunt: "Uwak",
  youngerMaternalAunt: "Etek",
  maternalAunt: "Uwak / Etek",
  olderUncleWife: "Uwak Boru",
  youngerUncleWife: "Nanguda",
  youngerAuntHusband: "Amang Etek",
  stepFather: "Ayah Tiri",
  stepMother: "Umak Tiri",
  fatherInLaw: "Tulang",
  motherInLaw: "Nantulang",
};
const batakTerms: Record<keyof typeof mandailingTerms, string> = {
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
  stepFather: "Amang Tiri",
  stepMother: "Inang Tiri",
  fatherInLaw: "Tulang / Simatua Doli",
  motherInLaw: "Nantulang / Simatua Boru",
};
const termsFor = (mode: TuturMode) =>
  mode === "batak" ? batakTerms : mandailingTerms;
const isPartuturon = (mode: TuturMode) =>
  mode === "mandailing" || mode === "batak";

interface Kinship {
  label: string;
  up: number;
  down: number;
  score: number;
}
const cache = new WeakMap<FamilyData, Map<string, Map<string, string>>>();

export const femaleOrMale = (
  gender: PersonGender,
  male: string,
  female: string,
) => (gender === "female" ? female : male);

export const spouseLabelFor = (
  gender?: string,
  mode: TuturMode = "indonesia",
) => {
  if (mode === "jawa") {
    if (gender === "female") return "Garwa (Putri)";
    if (gender === "male") return "Garwa (Kakung)";
    return "Garwa";
  }
  if (gender === "female") return "Istri";
  if (gender === "male") return "Suami";
  return "Pasangan";
};

function parseDateParts(
  dateStr: string,
): { year: number; month: number; day: number } | null {
  const parts = dateStr.trim().split(/[-/]/);
  if (parts.length === 0 || !parts[0]) return null;
  const year = parseInt(parts[0], 10);
  if (isNaN(year)) return null;
  const month = parts.length > 1 ? parseInt(parts[1], 10) : 1;
  const day = parts.length > 2 ? parseInt(parts[2], 10) : 1;
  return { year, month: isNaN(month) ? 1 : month, day: isNaN(day) ? 1 : day };
}

export type AgeComparison = "older" | "younger" | "same" | "unknown";

export function comparePersonAges(
  refDateStr?: string,
  targetDateStr?: string,
): AgeComparison {
  if (!refDateStr || !targetDateStr) return "unknown";
  const refParts = parseDateParts(refDateStr);
  const targetParts = parseDateParts(targetDateStr);
  if (!refParts || !targetParts) return "unknown";

  if (targetParts.year !== refParts.year) {
    return targetParts.year < refParts.year ? "older" : "younger";
  }
  const refHasMonth = refDateStr.includes("-") || refDateStr.includes("/");
  const targetHasMonth =
    targetDateStr.includes("-") || targetDateStr.includes("/");
  if (!refHasMonth || !targetHasMonth) {
    return "same";
  }
  if (targetParts.month !== refParts.month) {
    return targetParts.month < refParts.month ? "older" : "younger";
  }
  if (targetParts.day !== refParts.day) {
    return targetParts.day < refParts.day ? "older" : "younger";
  }
  return "same";
}

export function siblingLabel(
  gender: PersonGender,
  ageComp: AgeComparison,
  mode: TuturMode = "indonesia",
  egoGender?: PersonGender,
): string {
  if (isPartuturon(mode)) {
    const terms = termsFor(mode);
    if (egoGender && egoGender !== gender) {
      return "Ito";
    }
    if (ageComp === "younger") return "Anggi";
    if (ageComp === "older")
      return femaleOrMale(gender, terms.olderBrother, terms.olderSister);
    return femaleOrMale(gender, terms.olderBrother, terms.olderSister);
  }

  if (mode === "jawa") {
    if (ageComp === "younger") return "Adhik";
    if (ageComp === "older") return femaleOrMale(gender, "Kangmas", "Mbakyu");
    return "Sedherek";
  }

  if (ageComp === "younger") return "Adik";
  if (ageComp === "older") return femaleOrMale(gender, "Abang", "Kakak");
  return femaleOrMale(gender, "Saudara", "Saudari");
}

export function inLawSiblingLabel(
  gender: PersonGender,
  ageComp: AgeComparison,
  mode: TuturMode = "indonesia",
  egoGender?: PersonGender,
): string {
  if (isPartuturon(mode)) {
    const terms = termsFor(mode);
    if (egoGender === "male") {
      if (gender === "male") return terms.brotherInLaw;
      if (ageComp === "older") return "Angkang Boru";
      if (ageComp === "younger") return "Anggi Boru";
      return "Angkang / Anggi Boru";
    }
    if (egoGender === "female") {
      if (gender === "female") return "Eda";
      return terms.brotherInLaw;
    }
    return femaleOrMale(gender, terms.brotherInLaw, "Eda");
  }

  if (mode === "jawa") {
    if (ageComp === "younger") return "Adhik Ipar";
    if (ageComp === "older")
      return femaleOrMale(gender, "Mas Ipar", "Mbak Ipar");
    return "Ipar";
  }

  if (ageComp === "younger") return "Adik ipar";
  if (ageComp === "older")
    return femaleOrMale(gender, "Abang ipar", "Kakak ipar");
  return femaleOrMale(gender, "Saudara ipar", "Saudari ipar");
}

function ancestorLabel(
  depth: number,
  gender: PersonGender,
  mode: TuturMode = "indonesia",
  line?: "father" | "mother",
) {
  if (isPartuturon(mode)) {
    const terms = termsFor(mode);
    if (depth === 1) return femaleOrMale(gender, terms.father, terms.mother);
    if (depth === 2) return femaleOrMale(gender, "Ompung", "Nenek");
    if (depth === 3) return line === "father" ? "Ompung Nini" : "Ompung Nono";
    return line === "father" ? "Ompung Nini" : "Ompung Nono";
  }

  if (mode === "jawa") {
    if (depth === 1) return femaleOrMale(gender, "Bapak", "Ibu");
    if (depth === 2) return femaleOrMale(gender, "Mbah Kakung", "Mbah Putri");
    if (depth === 3)
      return femaleOrMale(gender, "Mbah Buyut (Kakung)", "Mbah Buyut (Putri)");
    if (depth === 4) return "Canggah";
    return depth === 5 ? "Wareng" : `Leluhur ke-${depth}`;
  }

  if (depth === 1) return femaleOrMale(gender, "Ayah", "Ibu");
  if (depth === 2) return femaleOrMale(gender, "Kakek", "Nenek");
  const base = femaleOrMale(gender, "Kakek buyut", "Nenek buyut");
  return depth === 3 ? base : `${base} ke-${depth - 2}`;
}

function descendantLabel(
  depth: number,
  gender: PersonGender,
  mode: TuturMode = "indonesia",
) {
  if (isPartuturon(mode)) {
    if (depth === 1) return femaleOrMale(gender, "Anak", "Boru");
    if (depth === 2) return "Pahompu";
    if (depth === 3) return "Pahompu Nini";
    if (depth === 4) return "Pahompu Nono";
    return `Pahompu ke-${depth - 1}`;
  }

  if (mode === "jawa") {
    if (depth === 1) return femaleOrMale(gender, "Anak Lanang", "Anak Wadon");
    if (depth === 2) return "Putu";
    if (depth === 3) return "Buyut";
    if (depth === 4) return "Canggah";
    if (depth === 5) return "Wareng";
    return `Keturunan ke-${depth}`;
  }

  if (depth === 1) return "Anak";
  if (depth === 2) return "Cucu";
  if (depth === 3) return "Cicit";
  if (depth === 4) return "Piut";
  return `Keturunan ke-${depth}`;
}

function bloodLabel(
  up: number,
  down: number,
  target: Person | PersonGender,
  ref?: Person,
  mode: TuturMode = "indonesia",
  line?: "father" | "mother",
  targetParent?: Person,
  connectingParent?: Person,
) {
  const gender = typeof target === "string" ? target : target.gender;
  if (down === 0) return ancestorLabel(up, gender, mode, line);
  if (up === 0) return descendantLabel(down, gender, mode);

  // Sibling (up === 1, down === 1)
  if (up === 1 && down === 1) {
    const targetBirthDate =
      typeof target === "object" ? target.birthDate : undefined;
    const ageComp = comparePersonAges(ref?.birthDate, targetBirthDate);
    return siblingLabel(gender, ageComp, mode, ref?.gender);
  }

  // Uncle / Aunt (up === 2, down === 1)
  if (down === 1 && up === 2) {
    const targetBirthDate =
      typeof target === "object" ? target.birthDate : undefined;
    const ageComp = comparePersonAges(
      connectingParent?.birthDate,
      targetBirthDate,
    );

    if (isPartuturon(mode)) {
      const terms = termsFor(mode);
      if (line === "father") {
        if (gender === "male") {
          if (ageComp === "older") return terms.olderPaternalUncle;
          if (ageComp === "younger") return terms.youngerPaternalUncle;
          return terms.paternalUncle;
        }
        if (ageComp === "older") return terms.olderPaternalAunt;
        if (ageComp === "younger") return terms.youngerPaternalAunt;
        return terms.paternalAunt;
      }
      // line === "mother"
      if (gender === "male") {
        if (ageComp === "older") return terms.olderMaternalUncle;
        if (ageComp === "younger") return terms.youngerMaternalUncle;
        return "Tulang";
      }
      if (ageComp === "older") return terms.olderMaternalAunt;
      if (ageComp === "younger") return terms.youngerMaternalAunt;
      return terms.maternalAunt;
    }

    if (mode === "jawa") {
      if (ageComp === "older") return femaleOrMale(gender, "Pakde", "Bude");
      if (ageComp === "younger") return femaleOrMale(gender, "Paklek", "Bulek");
      return femaleOrMale(gender, "Pakde / Paklek", "Bude / Bulek");
    }

    const base = femaleOrMale(gender, "Paman", "Tante");
    return base;
  }

  // Grand-uncle / grand-aunt (up >= 3, down === 1)
  if (down === 1 && up >= 3) {
    if (isPartuturon(mode)) {
      return "Ompung";
    }
    if (mode === "jawa") {
      return femaleOrMale(gender, "Mbah De", "Mbah Lek");
    }
    const base = femaleOrMale(gender, "Paman", "Tante");
    return up === 3 ? `${base} buyut` : `${base} buyut ke-${up - 2}`;
  }

  // Nephew / Niece (up === 1, down === 2)
  if (up === 1 && down === 2) {
    if (isPartuturon(mode)) {
      if (ref && targetParent && targetParent.gender !== ref.gender) {
        return "Bere";
      }
      return femaleOrMale(gender, "Anak", "Boru");
    }
    if (mode === "jawa") {
      return "Ponakan";
    }
    return "Keponakan";
  }

  if (up === 1 && down === 3) {
    if (isPartuturon(mode)) return "Pahompu";
    if (mode === "jawa") return "Cucu Ponakan";
    return "Cucu keponakan";
  }

  // Cousin (up === 2, down === 2)
  if (up === 2 && down === 2) {
    const targetBirthDate =
      typeof target === "object" ? target.birthDate : undefined;
    const ageComp = comparePersonAges(ref?.birthDate, targetBirthDate);

    if (isPartuturon(mode)) {
      const terms = termsFor(mode);
      if (line === "mother" && targetParent?.gender === "male") {
        // Child of Tulang
        if (ref?.gender === "male") {
          return gender === "female" ? "Pariban" : terms.brotherInLaw;
        }
        return gender === "male" ? "Ito" : "Eda";
      }
      if (line === "father" && targetParent?.gender === "female") {
        // Child of Bou
        if (ref?.gender === "male") {
          return gender === "female" ? "Ito" : terms.brotherInLaw;
        }
        return gender === "male" ? "Pariban" : "Eda";
      }
      // Parallel cousin
      if (ref && ref.gender !== gender) {
        return "Ito";
      }
      if (ageComp === "younger") return "Anggi";
      if (ageComp === "older")
        return femaleOrMale(gender, terms.olderBrother, terms.olderSister);
      return femaleOrMale(gender, terms.olderBrother, terms.olderSister);
    }

    if (mode === "jawa") {
      if (ageComp === "older")
        return femaleOrMale(gender, "Mas Sepupu", "Mbak Sepupu");
      if (ageComp === "younger") return "Adhik Sepupu";
      return "Sepupu";
    }

    return "Sepupu";
  }

  if (up === down && up >= 3) {
    if (isPartuturon(mode)) return "Sepupu";
    if (mode === "jawa") return "Nak-dulur";
    return up === 3 ? "Sepupu kedua" : `Sepupu ke-${up - 1}`;
  }

  if (up === 2 && down === 3) {
    if (isPartuturon(mode)) return "Bere";
    if (mode === "jawa") return "Ponakan";
    return "Keponakan sepupu";
  }

  if (up === 3 && down === 2) {
    if (isPartuturon(mode))
      return femaleOrMale(gender, "Tulang", termsFor(mode).paternalAunt);
    if (mode === "jawa")
      return femaleOrMale(gender, "Pakde Sepupu", "Bude Sepupu");
    return femaleOrMale(gender, "Paman sepupu", "Tante sepupu");
  }

  return `Sepupu beda ${Math.abs(up - down)} generasi`;
}

/** Resolve blood, in-law, and extended relations throughout the connected graph. */
export function getKinshipLabels(
  focusId: string,
  family: FamilyData,
  mode: TuturMode = "indonesia",
): Map<string, string> {
  const cacheKey = `${focusId}:${mode}`;
  const cached = cache.get(family)?.get(cacheKey);
  if (cached) return cached;
  const persons = new Map(family.persons.map((person) => [person.id, person]));
  if (!persons.has(focusId)) return new Map();
  const parents = new Map(
    family.persons.map((person) => [person.id, new Set<string>()]),
  );
  const children = new Map(
    family.persons.map((person) => [person.id, new Set<string>()]),
  );
  const partners = new Map(
    family.persons.map((person) => [person.id, new Set<string>()]),
  );
  const siblings = new Map(
    family.persons.map((person) => [person.id, new Set<string>()]),
  );
  for (const relation of family.relationships) {
    if (!persons.has(relation.from) || !persons.has(relation.to)) continue;
    if (["parent", "adoption", "stepParent"].includes(relation.type)) {
      parents.get(relation.to)!.add(relation.from);
      children.get(relation.from)!.add(relation.to);
    } else if (relation.type === "marriage") {
      partners.get(relation.from)!.add(relation.to);
      partners.get(relation.to)!.add(relation.from);
    } else if (relation.type === "sibling") {
      siblings.get(relation.from)!.add(relation.to);
      siblings.get(relation.to)!.add(relation.from);
    }
  }
  for (const group of children.values()) {
    for (const a of group)
      for (const b of group) {
        if (a !== b) siblings.get(a)!.add(b);
      }
  }
  const walk = (start: string, neighbors: Map<string, Set<string>>) => {
    const distances = new Map([[start, 0]]);
    const queue = [start];
    for (let index = 0; index < queue.length; index += 1) {
      for (const next of neighbors.get(queue[index]) ?? []) {
        if (distances.has(next)) continue;
        distances.set(next, distances.get(queue[index])! + 1);
        queue.push(next);
      }
    }
    return distances;
  };
  const ancestors = new Map<string, Map<string, number>>();
  const descendants = new Map<string, Map<string, number>>();
  const ancestorDistances = (id: string) => {
    if (!ancestors.has(id)) ancestors.set(id, walk(id, parents));
    return ancestors.get(id)!;
  };
  const descendantDistances = (id: string) => {
    if (!descendants.has(id)) descendants.set(id, walk(id, children));
    return descendants.get(id)!;
  };

  // Determine paternal vs maternal lines of ancestors
  const parentOfOrigin = new Map<string, "father" | "mother">();
  const connectingParentOfAncestor = new Map<string, Person>();
  const parentsOfFocus = parents.get(focusId) ?? new Set<string>();
  for (const pId of parentsOfFocus) {
    const p = persons.get(pId);
    if (!p) continue;
    const line: "father" | "mother" =
      p.gender === "female" ? "mother" : "father";
    parentOfOrigin.set(pId, line);
    connectingParentOfAncestor.set(pId, p);
    for (const [ancId] of ancestorDistances(pId)) {
      parentOfOrigin.set(ancId, line);
      connectingParentOfAncestor.set(ancId, p);
    }
  }

  const bloodMaps = new Map<string, Map<string, Kinship>>();
  const bloodRelations = (reference: string) => {
    if (bloodMaps.has(reference)) return bloodMaps.get(reference)!;
    const result = new Map<string, Kinship>([
      [reference, { label: "Diri sendiri", up: 0, down: 0, score: 0 }],
    ]);
    const assign = (
      id: string,
      up: number,
      down: number,
      ancestorId?: string,
    ) => {
      if (id === reference) return;
      const score = up + down;
      if (result.has(id) && result.get(id)!.score <= score) return;

      const targetPerson = persons.get(id)!;
      const refPerson = persons.get(reference);
      const line = ancestorId ? parentOfOrigin.get(ancestorId) : undefined;
      const connectingParent = ancestorId
        ? connectingParentOfAncestor.get(ancestorId)
        : undefined;

      // Find target's parent that descends from ancestorId
      let targetParent: Person | undefined;
      if (ancestorId && down >= 2) {
        const ancChildren = children.get(ancestorId) ?? new Set<string>();
        const targetParents = parents.get(id) ?? new Set<string>();
        for (const tpid of targetParents) {
          if (ancChildren.has(tpid)) {
            targetParent = persons.get(tpid);
            break;
          }
        }
      } else if (down === 1 && ancestorId) {
        targetParent = persons.get(ancestorId);
      }

      const label = bloodLabel(
        up,
        down,
        targetPerson,
        refPerson,
        mode,
        line,
        targetParent,
        connectingParent,
      );
      result.set(id, { up, down, score, label });
    };
    const above = ancestorDistances(reference);
    for (const person of family.persons) {
      for (const [ancestor, down] of ancestorDistances(person.id)) {
        const up = above.get(ancestor);
        if (up !== undefined) assign(person.id, up, down, ancestor);
      }
    }
    // Explicit sibling records also work when their parents are not yet known.
    for (const [ancestor, depth] of above) {
      for (const sibling of siblings.get(ancestor)!) {
        for (const [relative, down] of descendantDistances(sibling)) {
          assign(relative, depth + 1, down + 1, ancestor);
        }
      }
    }
    bloodMaps.set(reference, result);
    return result;
  };

  const blood = bloodRelations(focusId);
  const result = new Map(
    [...blood]
      .filter(([id]) => id !== focusId)
      .map(([id, relation]) => [
        id,
        { label: relation.label, score: relation.score },
      ]),
  );
  const assign = (id: string, label: string, score: number) => {
    if (id === focusId || (result.has(id) && result.get(id)!.score <= score))
      return;
    result.set(id, { label, score });
  };

  const spouseName = (
    anchor: Kinship,
    gender: PersonGender,
    spousePerson?: Person,
  ) => {
    if (anchor.up === 0 && anchor.down === 0)
      return spouseLabelFor(gender, mode);
    if (anchor.up === 0 && anchor.down === 1) {
      if (isPartuturon(mode)) return femaleOrMale(gender, "Hela", "Parumaen");
      if (mode === "jawa") return "Mantu";
      return "Menantu";
    }
    if (anchor.up === 1 && anchor.down === 1) {
      const ageComp = comparePersonAges(
        persons.get(focusId)?.birthDate,
        spousePerson?.birthDate,
      );
      return inLawSiblingLabel(
        gender,
        ageComp,
        mode,
        persons.get(focusId)?.gender,
      );
    }
    if (anchor.down === 0) {
      if (isPartuturon(mode))
        return femaleOrMale(
          gender,
          termsFor(mode).stepFather,
          termsFor(mode).stepMother,
        );
      if (mode === "jawa")
        return femaleOrMale(gender, "Bapak Walon", "Ibu Walon");
      return `${ancestorLabel(anchor.up, gender, mode)} tiri`;
    }
    if (anchor.down === 1 && anchor.up === 2) {
      if (isPartuturon(mode)) {
        const terms = termsFor(mode);
        if (
          anchor.label === terms.paternalAunt ||
          anchor.label === terms.olderPaternalAunt ||
          anchor.label === terms.youngerPaternalAunt
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
        if (anchor.label === terms.olderPaternalUncle)
          return terms.olderUncleWife;
        if (anchor.label === terms.youngerPaternalUncle)
          return terms.youngerUncleWife;
        return femaleOrMale(gender, terms.paternalUncle, terms.maternalAunt);
      }
      if (mode === "jawa") {
        if (anchor.label.includes("Pakde")) return "Bude";
        if (anchor.label.includes("Bude")) return "Pakde";
        if (anchor.label.includes("Paklek")) return "Bulek";
        if (anchor.label.includes("Bulek")) return "Paklek";
      }
      return femaleOrMale(gender, "Paman", "Tante");
    }
    return `${spouseLabelFor(gender, mode)} ${anchor.label.toLowerCase()}`;
  };

  for (const [anchorId, anchor] of blood) {
    for (const spouseId of partners.get(anchorId)!) {
      const spouseGender = persons.get(spouseId)!.gender;
      const spouseLabel = spouseName(
        anchor,
        spouseGender,
        persons.get(spouseId),
      );
      assign(spouseId, spouseLabel, anchor.score + 1 + 0.1);
      for (const [id, relative] of bloodRelations(spouseId)) {
        if (id === spouseId) continue;
        const gender = persons.get(id)!.gender;
        let label = `${relative.label} dari ${spouseLabel.toLowerCase()}`;
        if (anchorId === focusId) {
          if (relative.down === 0) {
            if (relative.up === 1) {
              if (isPartuturon(mode)) {
                const terms = termsFor(mode);
                const ego = persons.get(focusId);
                if (ego?.gender === "male") {
                  label = femaleOrMale(
                    gender,
                    terms.fatherInLaw,
                    terms.motherInLaw,
                  );
                } else {
                  label = femaleOrMale(gender, "Simatua Doli", "Simatua Boru");
                }
              } else if (mode === "jawa") {
                label = femaleOrMale(gender, "Bapak Maratuwa", "Ibu Maratuwa");
              } else {
                label = femaleOrMale(gender, "Ayah mertua", "Ibu mertua");
              }
            } else {
              label = `${relative.label} dari ${spouseLabel.toLowerCase()}`;
            }
          } else if (relative.up === 0) {
            label = `${relative.label} tiri`;
          } else if (relative.up === 1 && relative.down === 1) {
            const ageComp = comparePersonAges(
              persons.get(focusId)?.birthDate,
              persons.get(id)?.birthDate,
            );
            label = inLawSiblingLabel(
              gender,
              ageComp,
              mode,
              persons.get(focusId)?.gender,
            );
          } else {
            label = `${relative.label} dari ${spouseLabel.toLowerCase()}`;
          }
        } else if (
          anchor.up === 0 &&
          anchor.down === 1 &&
          relative.up === 1 &&
          relative.down === 0
        ) {
          label = "Besan";
        }
        assign(id, label, anchor.score + 1 + relative.score + 0.1);
      }
    }
  }

  // Preserve directly recorded roles over more distant alternative paths.
  for (const partner of partners.get(focusId)!) {
    const spouseGender = persons.get(partner)?.gender;
    result.set(partner, {
      label: spouseLabelFor(spouseGender, mode),
      score: 1,
    });
  }

  for (const relation of family.relationships) {
    if (relation.to !== focusId || !persons.has(relation.from)) continue;
    const gender = persons.get(relation.from)!.gender;
    if (relation.type === "stepParent" || relation.type === "adoption") {
      result.set(relation.from, {
        label: `${ancestorLabel(1, gender, mode)} ${relation.type === "adoption" ? "angkat" : "tiri"}`,
        score: 1,
      });
    }
  }

  // Further marriages can connect additional branches.
  const visited = new Set([focusId]);
  const queue = [focusId];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const neighbors = [
      ...[...parents.get(current)!].map((id) => ({
        id,
        label: ancestorLabel(1, persons.get(id)!.gender, mode),
      })),
      ...[...children.get(current)!].map((id) => ({
        id,
        label: descendantLabel(1, persons.get(id)!.gender, mode),
      })),
      ...[...partners.get(current)!].map((id) => ({
        id,
        label: spouseLabelFor(persons.get(id)?.gender, mode),
      })),
      ...[...siblings.get(current)!].map((id) => {
        const target = persons.get(id)!;
        const currentPerson = persons.get(current);
        const ageComp = comparePersonAges(
          currentPerson?.birthDate,
          target.birthDate,
        );
        return {
          id,
          label: siblingLabel(
            target.gender,
            ageComp,
            mode,
            currentPerson?.gender,
          ),
        };
      }),
    ];
    for (const next of neighbors) {
      if (visited.has(next.id)) continue;
      visited.add(next.id);
      queue.push(next.id);
      if (!result.has(next.id)) {
        const currentLabel = result.get(current)?.label;
        const auntOrUncle = currentLabel?.match(
          /^(Paman|Tante|Pakde|Bude|Paklek|Bulek|Tulang|Bou|Uwak|Udak|Etek)(.*)$/,
        );
        const isSpouse =
          next.label === "Suami" ||
          next.label === "Istri" ||
          next.label === "Pasangan" ||
          next.label.startsWith("Garwa");
        const inLawMatch =
          /^(Saudar[ai]|Abang|Kakak|Adik|Mas|Mbak) ipar$/.test(
            currentLabel ?? "",
          ) || /^(Tunggane|Lae|Eda)/.test(currentLabel ?? "");
        const spouseLabel =
          isSpouse && auntOrUncle
            ? `${femaleOrMale(persons.get(next.id)!.gender, "Paman", "Tante")}${auntOrUncle[2]}`
            : isSpouse && inLawMatch
              ? inLawSiblingLabel(
                  persons.get(next.id)!.gender,
                  comparePersonAges(
                    persons.get(focusId)?.birthDate,
                    persons.get(next.id)?.birthDate,
                  ),
                  mode,
                  persons.get(focusId)?.gender,
                )
              : undefined;
        result.set(next.id, {
          label:
            spouseLabel ??
            (currentLabel
              ? `${next.label} dari ${currentLabel.toLowerCase()}`
              : next.label),
          score: Infinity,
        });
      }
    }
  }

  const labels = new Map(
    [...result].map(([id, relation]) => [id, relation.label]),
  );
  const familyCache =
    cache.get(family) ?? new Map<string, Map<string, string>>();
  if (familyCache.size >= 16)
    familyCache.delete(familyCache.keys().next().value!);
  familyCache.set(cacheKey, labels);
  cache.set(family, familyCache);
  return labels;
}
