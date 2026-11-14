export type PersonGender = "female" | "male";

export type RelationshipType =
  | "parent"
  | "marriage"
  | "adoption"
  | "sibling"
  | "stepParent"
  | "guardian";

export type MediaType = "image" | "document" | "video" | "audio" | "other";

export interface ParentMetadata {
  biological?: boolean;
  adoptive?: boolean;
  stepParent?: boolean;
}

export interface MarriageMetadata {
  startDate?: string;
  endDate?: string;
  status?: "active" | "divorced" | "widowed";
}

export interface Person {
  id: string;
  fullName: string;
  nickname?: string;
  gender: PersonGender;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  primaryPhotoId?: string;
  notes?: string;
  tags: string[];
  layout?: { x: number; y: number };
}

export interface Relationship {
  id: string;
  type: RelationshipType;
  from: string;
  to: string;
  metadata: Record<string, unknown>;
}

export interface FamilyUnit {
  id: string;
  partners: string[];
  children: string[];
}

export interface Media {
  id: string;
  type: MediaType;
  path: string;
  metadata: Record<string, unknown>;
}

export interface FamilyEvent {
  id: string;
  type: string;
  person: string;
  date?: string;
  description: string;
}

export interface FamilyData {
  schemaVersion: 1;
  name: string;
  persons: Person[];
  relationships: Relationship[];
  familyUnits: FamilyUnit[];
  media: Media[];
  events: FamilyEvent[];
  updatedAt: string;
}

export type PersonInput = Omit<Person, "id">;

export interface FolderDirectoryHandle {
  name: string;
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<{
    getFile: () => Promise<File>;
    createWritable: () => Promise<{
      write: (data: string | Blob) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
  getDirectoryHandle: (name: string, options?: { create?: boolean }) => Promise<FolderDirectoryHandle>;
  removeEntry: (name: string) => Promise<void>;
}
