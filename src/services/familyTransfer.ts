import { familyDataSchema } from "@/src/schema/family";
import type { FamilyData } from "@/src/types/family";

export interface FamilyTransfer {
  name: string;
  fileName: string;
  contents: string;
  personCount: number;
  relationshipCount: number;
  hasPhotos: boolean;
}

/** A portable snapshot, shared identically by download, clipboard, and native share. */
export function createFamilyTransfer(family: FamilyData): FamilyTransfer {
  const data = familyDataSchema.parse({ ...family, updatedAt: new Date().toISOString() });
  const slug = data.name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).toLowerCase();
  return {
    name: data.name,
    fileName: `${slug || "silsilah-keluarga"}.json`,
    contents: JSON.stringify(data, null, 2),
    personCount: data.persons.length,
    relationshipCount: data.relationships.length,
    hasPhotos: data.media.length > 0 || data.persons.some((person) => Boolean(person.primaryPhotoId)),
  };
}

export function createTransferFile(transfer: FamilyTransfer): File {
  return new File([transfer.contents], transfer.fileName, { type: "application/json" });
}

export function canShareTransfer(file: File, target: Pick<Navigator, "share" | "canShare"> = navigator): boolean {
  try {
    return typeof target.share === "function" && typeof target.canShare === "function" && target.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/** Invoke directly from the click handler to preserve native user activation. */
export async function shareTransfer(file: File, target: Pick<Navigator, "share"> = navigator): Promise<"shared" | "cancelled"> {
  try {
    await target.share({ files: [file], title: file.name });
    return "shared";
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return "cancelled";
    throw error;
  }
}

export function downloadTransfer(transfer: FamilyTransfer): void {
  const url = URL.createObjectURL(new Blob([transfer.contents], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = transfer.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser time to start reading the blob before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
