import { z } from "zod";
import { FIELD_LIMITS } from "@/src/schema/fieldLimits";
import type { FamilyData } from "@/src/types/family";

export const personGenderSchema = z.enum([
  "female",
  "male",
]);

export const relationshipTypeSchema = z.enum([
  "parent",
  "marriage",
  "adoption",
  "sibling",
  "stepParent",
  "guardian",
]);

export const mediaTypeSchema = z.enum([
  "image",
  "document",
  "video",
  "audio",
  "other",
]);

const optionalTextSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === "" ? undefined : value));

const limitedOptionalText = (limit: number, label: string) => z.string().trim()
  .max(limit, `${label} maksimal ${limit.toLocaleString("id-ID")} karakter.`)
  .optional().transform((value) => value === "" ? undefined : value);

export const personSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().trim().min(1, "Nama lengkap wajib diisi.").max(FIELD_LIMITS.fullName, `Nama lengkap maksimal ${FIELD_LIMITS.fullName} karakter.`),
  nickname: limitedOptionalText(FIELD_LIMITS.nickname, "Nama panggilan"),
  gender: personGenderSchema.default("male"),
  birthDate: limitedOptionalText(10, "Tanggal lahir"),
  birthPlace: limitedOptionalText(FIELD_LIMITS.place, "Tempat lahir"),
  deathDate: limitedOptionalText(10, "Tanggal wafat"),
  deathPlace: limitedOptionalText(FIELD_LIMITS.place, "Tempat wafat"),
  primaryPhotoId: optionalTextSchema,
  notes: limitedOptionalText(FIELD_LIMITS.notes, "Catatan"),
  tags: z.array(z.string().trim().min(1, "Label tidak boleh kosong.").max(FIELD_LIMITS.tag, `Setiap label maksimal ${FIELD_LIMITS.tag} karakter.`)).max(FIELD_LIMITS.tagCount, `Maksimal ${FIELD_LIMITS.tagCount} label per anggota.`).default([]),
  layout: z.object({ x: z.number(), y: z.number() }).optional(),
});

export const personInputSchema = personSchema.omit({ id: true });

export const relationshipSchema = z.object({
  id: z.string().min(1),
  type: relationshipTypeSchema,
  from: z.string().min(1),
  to: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const familyUnitSchema = z.object({
  id: z.string().min(1),
  partners: z.array(z.string().min(1)).default([]),
  children: z.array(z.string().min(1)).default([]),
});

export const mediaSchema = z.object({
  id: z.string().min(1),
  type: mediaTypeSchema,
  path: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const familyEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().trim().min(1),
  person: z.string().min(1),
  date: optionalTextSchema,
  description: z.string().trim().min(1),
});

export const familyDataSchema = z
  .object({
    schemaVersion: z.literal(1),
    name: z.string().trim().min(1, "Nama keluarga wajib diisi.").max(FIELD_LIMITS.familyName, `Nama keluarga maksimal ${FIELD_LIMITS.familyName} karakter.`).default("Untitled Family"),
    persons: z.array(personSchema).default([]),
    relationships: z.array(relationshipSchema).default([]),
    familyUnits: z.array(familyUnitSchema).default([]),
    media: z.array(mediaSchema).default([]),
    events: z.array(familyEventSchema).default([]),
    updatedAt: z.string().min(1),
  })
  .superRefine((family, context) => {
    const personIds = new Set(family.persons.map((person) => person.id));

    for (const relationship of family.relationships) {
      if (!personIds.has(relationship.from)) {
        context.addIssue({
          code: "custom",
          message: `Relationship ${relationship.id} references missing source person ${relationship.from}.`,
          path: ["relationships", relationship.id, "from"],
        });
      }

      if (!personIds.has(relationship.to)) {
        context.addIssue({
          code: "custom",
          message: `Relationship ${relationship.id} references missing target person ${relationship.to}.`,
          path: ["relationships", relationship.id, "to"],
        });
      }
    }

    for (const familyUnit of family.familyUnits) {
      for (const partnerId of familyUnit.partners) {
        if (!personIds.has(partnerId)) {
          context.addIssue({
            code: "custom",
            message: `Family unit ${familyUnit.id} references missing partner ${partnerId}.`,
            path: ["familyUnits", familyUnit.id, "partners"],
          });
        }
      }

      for (const childId of familyUnit.children) {
        if (!personIds.has(childId)) {
          context.addIssue({
            code: "custom",
            message: `Family unit ${familyUnit.id} references missing child ${childId}.`,
            path: ["familyUnits", familyUnit.id, "children"],
          });
        }
      }
    }
  });

export type FamilyDataSchema = z.infer<typeof familyDataSchema>;

export const validateFamilyData = (family: FamilyData): string[] => {
  const errors: string[] = [];
  const personIds = new Set<string>();
  const duplicates = new Set<string>();

  for (const person of family.persons) {
    if (personIds.has(person.id)) {
      duplicates.add(person.id);
    }
    personIds.add(person.id);
  }

  if (duplicates.size > 0) {
    errors.push(`Duplicate Person IDs found: ${Array.from(duplicates).join(", ")}`);
  }

  for (const rel of family.relationships) {
    const fromExists = personIds.has(rel.from);
    const toExists = personIds.has(rel.to);

    if (!fromExists) {
      errors.push(`Relationship ${rel.id} references missing person: ${rel.from}`);
    }
    if (!toExists) {
      errors.push(`Relationship ${rel.id} references missing person: ${rel.to}`);
    }

    if (rel.type === "marriage" && rel.from === rel.to) {
      const name = family.persons.find((p) => p.id === rel.from)?.fullName || rel.from;
      errors.push(`Marriage cannot connect same person: ${name}`);
    }

    if ((rel.type === "parent" || rel.type === "adoption") && rel.from === rel.to) {
      const name = family.persons.find((p) => p.id === rel.from)?.fullName || rel.from;
      errors.push(`Parent cannot be their own child: ${name}`);
    }
  }

  const parentRels = family.relationships.filter(
    (r) => r.type === "parent" || r.type === "adoption",
  );

  const visited = new Set<string>();
  const recStack = new Set<string>();
  let hasCycle = false;
  let cyclePerson = "";

  const dfs = (personId: string): boolean => {
    if (recStack.has(personId)) {
      cyclePerson = family.persons.find((p) => p.id === personId)?.fullName || personId;
      return true;
    }
    if (visited.has(personId)) return false;

    visited.add(personId);
    recStack.add(personId);

    const children = parentRels.filter((r) => r.from === personId).map((r) => r.to);
    for (const childId of children) {
      if (dfs(childId)) return true;
    }

    recStack.delete(personId);
    return false;
  };

  for (const person of family.persons) {
    recStack.clear();
    if (dfs(person.id)) {
      hasCycle = true;
      break;
    }
  }

  if (hasCycle) {
    errors.push(`Circular parent lineage detected starting near: ${cyclePerson}`);
  }

  return errors;
};
