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

/** Native share supports text files more widely than .json (including Chromium). */
export function createShareFile(transfer: FamilyTransfer): File {
  return new File([transfer.contents], transfer.fileName.replace(/\.json$/i, ".txt"), { type: "text/plain" });
}

/** Keep deep links short; larger snapshots use copy/paste rather than a huge URL. */
export function createWhatsAppShareURL(transfer: FamilyTransfer): string | null {
  const compactJSON = JSON.stringify(JSON.parse(transfer.contents));
  const url = `https://wa.me/?text=${encodeURIComponent(compactJSON)}`;
  return url.length <= 6000 ? url : null;
}

const errorName = (error: unknown): string =>
  typeof error === "object" && error !== null && "name" in error && typeof error.name === "string" ? error.name : "";

export function getShareFailureMessage(error: unknown): string {
  switch (errorName(error)) {
    case "NotAllowedError":
    case "SecurityError":
      return "Browser tidak mengizinkan menu berbagi di halaman ini. Unduh file atau salin JSON untuk mengirimkannya.";
    case "InvalidStateError":
      return "Menu berbagi sedang tidak tersedia atau masih terbuka. Anda tetap bisa mengunduh file atau menyalin JSON.";
    case "TypeError":
      return "Browser tidak mendukung berbagi file ini. Gunakan unduh file atau salin JSON.";
    default:
      return "Menu berbagi belum berhasil dibuka. Lanjutkan dengan unduh file atau salin JSON.";
  }
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
    if (errorName(error) === "AbortError") return "cancelled";
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
