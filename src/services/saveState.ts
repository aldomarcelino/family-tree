import type { FamilyData } from "@/src/types/family";

export type SaveStatus = "synced" | "modified" | "saving" | "error";

export const getFamilySnapshot = (family: FamilyData): string => {
  // Timestamps change during loading and saving, without changing user data.
  const { updatedAt, ...data } = family;
  void updatedAt;
  return JSON.stringify(data);
};

export const getSaveStatus = ({ saving, error, current, local, external, hasExternalDestination }: {
  saving: boolean;
  error: boolean;
  current: string;
  local: string;
  external: string;
  hasExternalDestination: boolean;
}): SaveStatus => saving ? "saving" : error ? "error" : current === (hasExternalDestination ? external : local) ? "synced" : "modified";

export const getSaveErrorMessage = (error: unknown): string | null => {
  if (error instanceof Error) {
    if (error.name === "AbortError") return null;
    if (error.name === "NotAllowedError" || error.name === "SecurityError") return "Izinkan akses penyimpanan, lalu coba simpan kembali.";
    if (error.name === "ZodError") return "Data keluarga belum lengkap. Periksa informasi anggota, lalu coba simpan kembali.";
  }
  return "Perubahan belum berhasil disimpan. Silakan coba lagi.";
};
