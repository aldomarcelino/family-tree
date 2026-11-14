import type { FamilyData, Person } from "@/src/types/family";
import { comparePersonAges } from "@/src/services/kinship/age";
import { getFamilyGraph } from "@/src/services/kinship/graph";
import {
  bloodLabel,
  spouseOfRelativeLabel,
  relativeOfSpouseLabel,
} from "@/src/services/kinship/labels";
import { getTradition, type TuturMode } from "@/src/services/kinship/registry";
import { type Kinship, type ParentLine } from "@/src/services/kinship/types";

const cache = new WeakMap<FamilyData, Map<string, Map<string, string>>>();

/** Resolve blood, in-law, and extended relations throughout the connected graph. */
export function getKinshipLabels(
  focusId: string,
  family: FamilyData,
  mode: TuturMode = "indonesia",
): Map<string, string> {
  const cacheKey = `${focusId}:${mode}`;
  const cached = cache.get(family)?.get(cacheKey);
  if (cached) return cached;
  const tradition = getTradition(mode);
  const {
    persons,
    parents,
    children,
    partners,
    siblings,
    ancestorDistances,
    descendantDistances,
  } = getFamilyGraph(family);
  const focus = persons.get(focusId);
  if (!focus) return new Map();

  // Determine paternal vs maternal lines of ancestors
  const parentOfOrigin = new Map<string, ParentLine>();
  const connectingParentOfAncestor = new Map<string, Person>();
  const parentsOfFocus = parents.get(focusId) ?? new Set<string>();
  for (const pId of parentsOfFocus) {
    const p = persons.get(pId);
    if (!p) continue;
    const line: ParentLine = p.gender === "female" ? "mother" : "father";
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
        tradition,
        up,
        down,
        targetPerson,
        refPerson,
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

  for (const [anchorId, anchor] of blood) {
    for (const spouseId of partners.get(anchorId)!) {
      const spouseLabel = spouseOfRelativeLabel(
        tradition,
        anchor,
        persons.get(spouseId)!,
        focus,
      );
      assign(spouseId, spouseLabel, anchor.score + 1 + 0.1);
      for (const [id, relative] of bloodRelations(spouseId)) {
        if (id === spouseId) continue;
        let label = `${relative.label} dari ${spouseLabel.toLowerCase()}`;
        if (anchorId === focusId) {
          label = relativeOfSpouseLabel(
            tradition,
            relative,
            persons.get(id)!,
            focus,
            spouseLabel,
          );
        } else if (
          anchor.up === 0 &&
          anchor.down === 1 &&
          relative.up === 1 &&
          relative.down === 0
        ) {
          label = tradition.coParentInLaw;
        }
        assign(id, label, anchor.score + 1 + relative.score + 0.1);
      }
    }
  }

  // Preserve directly recorded roles over more distant alternative paths.
  for (const partner of partners.get(focusId)!) {
    const spouseGender = persons.get(partner)?.gender;
    result.set(partner, {
      label: tradition.spouse(spouseGender),
      score: 1,
    });
  }

  for (const relation of family.relationships) {
    if (relation.to !== focusId || !persons.has(relation.from)) continue;
    const gender = persons.get(relation.from)!.gender;
    if (relation.type === "stepParent" || relation.type === "adoption") {
      result.set(relation.from, {
        label: `${tradition.ancestor(1, gender)} ${relation.type === "adoption" ? "angkat" : "Sambung"}`,
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
        label: tradition.ancestor(1, persons.get(id)!.gender),
      })),
      ...[...children.get(current)!].map((id) => ({
        id,
        label: tradition.descendant(1, persons.get(id)!.gender),
      })),
      ...[...partners.get(current)!].map((id) => ({
        id,
        label: tradition.spouse(persons.get(id)?.gender),
        isSpouse: true,
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
          label: tradition.sibling(
            target.gender,
            ageComp,
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
        const spouseLabel =
          "isSpouse" in next && currentLabel
            ? tradition.extendedSpouseLabel(
                currentLabel,
                persons.get(next.id)!,
                focus,
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
