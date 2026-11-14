"use client";

import { Check, CircleAlert, HardDrive, LoaderCircle } from "lucide-react";
import { useId } from "react";
import type { SaveStatus } from "@/src/services/saveState";

export function SaveIndicator({ status, hasExternalDestination, restored }: {
  status: SaveStatus;
  hasExternalDestination: boolean;
  restored: boolean;
}) {
  const tooltipId = useId();
  const pending = !restored || status === "saving" || (status === "modified" && !hasExternalDestination);
  const state = pending ? "saving" : status;
  const label = !restored ? "Memuat arsip…" : pending ? "Menyimpan perubahan…" : status === "error" ? "Gagal menyimpan" : status === "modified" ? "Belum disimpan ke file" : "Semua perubahan tersimpan";
  const detail = !restored ? "Memulihkan arsip keluarga yang tersimpan." : status === "error" ? "Penyimpanan gagal. Coba simpan kembali melalui menu File." : status === "modified" && hasExternalDestination ? "Ada perubahan baru. Simpan melalui menu File atau tekan Ctrl/Cmd + S." : pending ? "Perubahan sedang disimpan." : hasExternalDestination ? "Perubahan tersimpan di file keluarga." : "Perubahan tersimpan otomatis di browser ini. Gunakan menu File untuk menyimpan salinan.";
  const Icon = pending ? LoaderCircle : status === "error" ? CircleAlert : status === "modified" ? HardDrive : Check;

  return (
    <div className="board-save-indicator" data-state={state} tabIndex={0} aria-describedby={tooltipId}>
      <div className="board-save-state" role="status" aria-live="polite" aria-atomic="true">
        <Icon size={13} aria-hidden="true" className={pending ? "save-spinner" : undefined} />
        <span>{label}</span>
      </div>
      <span id={tooltipId} className="save-info-tooltip" role="tooltip">{detail}</span>
    </div>
  );
}
