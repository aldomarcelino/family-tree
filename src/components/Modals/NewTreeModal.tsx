"use client";

import { FilePlus } from "lucide-react";
import { Modal } from "@/src/components/UI/Modal";
import { Button } from "@/src/components/UI/Button";

interface NewTreeModalProps {
  isOpen: boolean;
  familyName: string;
  personCount: number;
  hasUnsavedChanges?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function NewTreeModal({
  isOpen,
  familyName,
  personCount,
  hasUnsavedChanges = false,
  onCancel,
  onConfirm,
}: NewTreeModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      role="alertdialog"
      title="Mulai pohon keluarga baru?"
      eyebrow="Konfirmasi pohon baru"
      maxWidth="max-w-lg"
    >
      <div className="min-h-0 overflow-y-auto px-6 py-6 sm:px-8">
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600">
            <FilePlus size={19} />
          </span>
          <div className="min-w-0">
            <p className="break-words text-sm font-medium text-zinc-900">
              {familyName || "Pohon Keluarga"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {personCount} anggota saat ini
            </p>
          </div>
        </div>
        <p className="mt-5 text-[13px] leading-6 text-zinc-600">
          Apakah Anda yakin ingin memulai pohon keluarga baru?
          {hasUnsavedChanges && " Perubahan yang belum disimpan akan hilang."}
        </p>
        <p className="mt-2 text-xs leading-5 text-zinc-500">
          Kanvas silsilah akan diatur ulang ke kanvas baru yang bersih.
        </p>
      </div>
      <footer className="modal-footer !justify-end">
        <Button onClick={onCancel} variant="secondary">
          Batal
        </Button>
        <Button onClick={onConfirm} variant="dark">
          <FilePlus size={14} /> Buat pohon baru
        </Button>
      </footer>
    </Modal>
  );
}
