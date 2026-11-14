"use client";

import { Trash2 } from "lucide-react";
import { Modal } from "@/src/components/UI/Modal";
import { Button } from "@/src/components/UI/Button";
import type { Person } from "@/src/types/family";

interface DeletePersonModalProps {
  person: Person | null;
  relationshipCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeletePersonModal({ person, relationshipCount, onCancel, onConfirm }: DeletePersonModalProps) {
  return (
    <Modal isOpen={Boolean(person)} onClose={onCancel} role="alertdialog" title="Hapus anggota keluarga?" eyebrow="Konfirmasi hapus" maxWidth="max-w-lg">
      <div className="min-h-0 overflow-y-auto px-6 py-6 sm:px-8">
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-zinc-500"><Trash2 size={19} /></span>
          <div className="min-w-0"><p className="break-words text-sm font-medium text-zinc-900">{person?.fullName}</p><p className="mt-1 text-xs text-zinc-500">{relationshipCount} hubungan keluarga terhubung</p></div>
        </div>
        <p className="mt-5 text-[13px] leading-6 text-zinc-600">Anggota ini beserta seluruh hubungannya akan dihapus dari silsilah. Anggota keluarga lainnya tetap tersimpan.</p>
        <p className="mt-2 text-xs leading-5 text-zinc-500">Anda dapat memulihkannya melalui tombol Urungkan.</p>
      </div>
      <footer className="modal-footer !justify-end">
        <Button onClick={onCancel} variant="secondary">Batal</Button>
        <Button onClick={onConfirm} variant="dark"><Trash2 size={14} /> Hapus anggota</Button>
      </footer>
    </Modal>
  );
}
