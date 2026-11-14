"use client";

import { Modal } from "@/src/components/UI/Modal";
import { Button } from "@/src/components/UI/Button";

interface IntegrityWarningModalProps { isOpen: boolean; onClose: () => void; errors: string[]; }
export function IntegrityWarningModal({ isOpen, onClose, errors }: IntegrityWarningModalProps) {
  return <Modal isOpen={isOpen} onClose={onClose} title="Ada catatan yang perlu ditinjau." subtitle="Periksa hubungan atau tanggal berikut sebelum menyimpan keluarga." eyebrow="Pemeriksaan data" maxWidth="max-w-lg"><ol className="min-h-0 flex-1 space-y-4 overflow-y-auto px-8 py-6">{errors.map((error, index) => <li key={index} className="flex gap-4 border-b border-zinc-100 pb-4 text-[13px] leading-6 text-zinc-600"><span className="text-zinc-400">{String(index + 1).padStart(2, "0")}</span>{error}</li>)}</ol><footer className="modal-footer justify-end"><Button onClick={onClose}>Kembali ke keluarga</Button></footer></Modal>;
}
