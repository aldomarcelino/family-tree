"use client";

import { personSchema } from "@/src/schema/family";
import { nanoid } from "nanoid";
import { create } from "zustand";
import { sampleFamily } from "@/src/data/sampleFamily";
import type {
  FamilyData,
  FamilyUnit,
  Person,
  PersonInput,
  Relationship,
} from "@/src/types/family";

const withUpdatedAt = (family: FamilyData): FamilyData => ({
  ...family,
  updatedAt: new Date().toISOString(),
});

const pushHistory = (state: {
  family: FamilyData;
  past: FamilyData[];
  future: FamilyData[];
}): { past: FamilyData[]; future: FamilyData[] } => {
  return {
    past: [...state.past.slice(-49), state.family],
    future: [],
  };
};

interface FamilyStore {
  family: FamilyData;
  past: FamilyData[];
  future: FamilyData[];
  loadFamily: (family: FamilyData) => void;
  setFamily: (family: FamilyData) => void;
  addPerson: (person: PersonInput) => Person;
  updatePerson: (personId: string, updates: Partial<PersonInput>) => void;
  deletePerson: (personId: string) => void;
  addRelationship: (
    relationship: Omit<Relationship, "id" | "metadata"> & {
      metadata?: Record<string, unknown>;
    },
  ) => Relationship;
  deleteRelationship: (relationshipId: string) => void;
  addFamilyUnit: (familyUnit: Omit<FamilyUnit, "id">) => FamilyUnit;
  resetFamily: (name?: string) => void;
  updatePersonLayout: (
    personId: string,
    layout: { x: number; y: number } | undefined,
  ) => void;
  setLayoutPositions: (positions: Record<string, { x: number; y: number }>) => void;
  undo: () => void;
  redo: () => void;
}

export const useFamilyStore = create<FamilyStore>((set) => ({
  family: sampleFamily,
  past: [],
  future: [],
  loadFamily: (family) =>
    set({
      family: withUpdatedAt(family),
      past: [],
      future: [],
    }),
  setFamily: (family) =>
    set({
      family: withUpdatedAt(family),
      past: [],
      future: [],
    }),
  addPerson: (personInput) => {
    const person: Person = personSchema.parse({
      ...personInput,
      id: nanoid(),
      tags: personInput.tags ?? [],
    });

    set((state) => {
      const history = pushHistory(state);
      return {
        ...history,
        family: withUpdatedAt({
          ...state.family,
          persons: [...state.family.persons, person],
        }),
      };
    });

    return person;
  },
  updatePerson: (personId, updates) => {
    set((state) => {
      const history = pushHistory(state);
      return {
        ...history,
        family: withUpdatedAt({
          ...state.family,
          persons: state.family.persons.map((person) => {
            if (person.id !== personId) return person;
            const nextPerson = { ...person, ...updates };
            personSchema.parse(nextPerson);
            return nextPerson;
          }),
        }),
      };
    });
  },
  deletePerson: (personId) => {
    set((state) => {
      const history = pushHistory(state);
      return {
        ...history,
        family: withUpdatedAt({
          ...state.family,
          persons: state.family.persons.filter((person) => person.id !== personId),
          relationships: state.family.relationships.filter(
            (relationship) =>
              relationship.from !== personId && relationship.to !== personId,
          ),
          familyUnits: state.family.familyUnits
            .map((familyUnit) => ({
              ...familyUnit,
              partners: familyUnit.partners.filter((id) => id !== personId),
              children: familyUnit.children.filter((id) => id !== personId),
            }))
            .filter(
              (familyUnit) =>
                familyUnit.partners.length > 0 || familyUnit.children.length > 0,
            ),
          events: state.family.events.filter((event) => event.person !== personId),
        }),
      };
    });
  },
  addRelationship: (relationshipInput) => {
    const relationship: Relationship = {
      ...relationshipInput,
      id: nanoid(),
      metadata: relationshipInput.metadata ?? {},
    };

    set((state) => {
      const history = pushHistory(state);
      const nextRelationships = [...state.family.relationships, relationship];
      let nextFamilyUnits = [...state.family.familyUnits];

      if (relationship.type === "marriage") {
        const existing = nextFamilyUnits.find(
          (u) =>
            u.partners.includes(relationship.from) &&
            u.partners.includes(relationship.to),
        );
        if (!existing) {
          const fromUnit = nextFamilyUnits.find(
            (u) =>
              u.partners.includes(relationship.from) && u.partners.length === 1,
          );
          const toUnit = nextFamilyUnits.find(
            (u) =>
              u.partners.includes(relationship.to) && u.partners.length === 1,
          );

          if (fromUnit) {
            nextFamilyUnits = nextFamilyUnits.map((u) =>
              u.id === fromUnit.id
                ? { ...u, partners: [...u.partners, relationship.to] }
                : u,
            );
          } else if (toUnit) {
            nextFamilyUnits = nextFamilyUnits.map((u) =>
              u.id === toUnit.id
                ? { ...u, partners: [...u.partners, relationship.from] }
                : u,
            );
          } else {
            nextFamilyUnits.push({
              id: nanoid(),
              partners: [relationship.from, relationship.to],
              children: [],
            });
          }
        }
      } else if (relationship.type === "parent" || relationship.type === "adoption") {
        const parent = relationship.from;
        const child = relationship.to;

        const otherParents = nextRelationships
          .filter(
            (r) =>
              (r.type === "parent" || r.type === "adoption") &&
              r.to === child &&
              r.from !== parent,
          )
          .map((r) => r.from);

        let associatedUnit = nextFamilyUnits.find(
          (u) =>
            u.partners.includes(parent) &&
            u.partners.some((p) => otherParents.includes(p)),
        );

        if (!associatedUnit) {
          associatedUnit = nextFamilyUnits.find((u) => u.partners.includes(parent));
        }

        if (associatedUnit) {
          nextFamilyUnits = nextFamilyUnits.map((u) => {
            if (u.id === associatedUnit.id) {
              return {
                ...u,
                children: u.children.includes(child)
                  ? u.children
                  : [...u.children, child],
              };
            }
            return u;
          });
        } else {
          nextFamilyUnits.push({
            id: nanoid(),
            partners: [parent],
            children: [child],
          });
        }
      }

      return {
        ...history,
        family: withUpdatedAt({
          ...state.family,
          relationships: nextRelationships,
          familyUnits: nextFamilyUnits,
        }),
      };
    });

    return relationship;
  },
  deleteRelationship: (relationshipId) => {
    set((state) => {
      const relToDelete = state.family.relationships.find(
        (r) => r.id === relationshipId,
      );
      if (!relToDelete) return state;

      const history = pushHistory(state);
      const nextRelationships = state.family.relationships.filter(
        (r) => r.id !== relationshipId,
      );
      let nextFamilyUnits = [...state.family.familyUnits];

      const { from, to, type } = relToDelete;

      if (type === "marriage") {
        nextFamilyUnits = nextFamilyUnits.map((u) => {
          if (u.partners.includes(from) && u.partners.includes(to)) {
            return {
              ...u,
              partners: u.partners.filter((id) => id !== to),
            };
          }
          return u;
        });
      } else if (type === "parent" || type === "adoption") {
        nextFamilyUnits = nextFamilyUnits.map((u) => {
          if (u.partners.includes(from)) {
            return {
              ...u,
              children: u.children.filter((id) => id !== to),
            };
          }
          return u;
        });
      }

      nextFamilyUnits = nextFamilyUnits.filter(
        (u) => u.partners.length > 0 || u.children.length > 0,
      );

      return {
        ...history,
        family: withUpdatedAt({
          ...state.family,
          relationships: nextRelationships,
          familyUnits: nextFamilyUnits,
        }),
      };
    });
  },
  addFamilyUnit: (familyUnitInput) => {
    const familyUnit: FamilyUnit = {
      ...familyUnitInput,
      id: nanoid(),
    };

    set((state) => {
      const history = pushHistory(state);
      return {
        ...history,
        family: withUpdatedAt({
          ...state.family,
          familyUnits: [...state.family.familyUnits, familyUnit],
        }),
      };
    });

    return familyUnit;
  },
  resetFamily: (name = "New Family Tree") => {
    set(() => ({
      family: withUpdatedAt({
        schemaVersion: 1,
        name,
        persons: [],
        relationships: [],
        familyUnits: [],
        media: [],
        events: [],
        updatedAt: new Date().toISOString(),
      }),
      past: [],
      future: [],
    }));
  },
  updatePersonLayout: (personId, layout) => {
    set((state) => {
      const history = pushHistory(state);
      return {
        ...history,
        family: {
          ...state.family,
          persons: state.family.persons.map((p) =>
            p.id === personId ? { ...p, layout } : p,
          ),
        },
      };
    });
  },
  setLayoutPositions: (positions) => {
    set((state) => {
      const history = pushHistory(state);
      return {
        ...history,
        family: {
          ...state.family,
          persons: state.family.persons.map((p) => ({
            ...p,
            layout: positions[p.id] ? positions[p.id] : p.layout,
          })),
        },
      };
    });
  },
  undo: () => {
    set((state) => {
      if (state.past.length === 0) return {};
      const newPast = [...state.past];
      const previous = newPast.pop()!;
      return {
        past: newPast,
        future: [state.family, ...state.future],
        family: previous,
      };
    });
  },
  redo: () => {
    set((state) => {
      if (state.future.length === 0) return {};
      const newFuture = [...state.future];
      const next = newFuture.shift()!;
      return {
        past: [...state.past, state.family],
        future: newFuture,
        family: next,
      };
    });
  },
}));

export const getFamilySnapshot = (): FamilyData => useFamilyStore.getState().family;
