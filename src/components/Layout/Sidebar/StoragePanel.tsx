"use client";

import { ClipboardPaste, Download, FileJson, FilePlus, FolderOpen, HardDrive, Save, Share2, ChevronRight, type LucideIcon } from "lucide-react";

interface StoragePanelProps {
  familyName: string;
  fileName: string;
  personCount: number;
  relationshipCount: number;
  directoryName?: string;
  hasFileHandle: boolean;
  canOpenDirectory: boolean;
  onLoadFile: () => void;
  onPasteJSON: () => void;
  onLoadDirectory: () => void;
  onSaveFile: () => void;
  onShare: () => void;
  onExportBackup: () => void;
  onNewTree: () => void;
}

function StorageAction({ icon: Icon, title, description, onClick, featured = false, disabled = false }: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  featured?: boolean;
  disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`storage-action ${featured ? "storage-action-featured" : ""}`}>
      <span className="storage-action-icon"><Icon size={17} strokeWidth={1.7} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium">{title}</span>
        <span className="mt-1 block text-[11px] leading-4 text-zinc-500">{description}</span>
      </span>
      {!disabled && <ChevronRight size={14} className="shrink-0 text-zinc-400" />}
    </button>
  );
}

export function StoragePanel({ familyName, fileName, personCount, relationshipCount, directoryName,
  hasFileHandle, canOpenDirectory, onLoadFile, onPasteJSON, onLoadDirectory, onSaveFile, onShare, onExportBackup, onNewTree,
}: StoragePanelProps) {
  const hasDestination = Boolean(directoryName || hasFileHandle);

  return (
    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Kelola silsilah</h2>
        <p className="mt-1.5 text-xs leading-5 text-zinc-500">Buka data keluarga atau simpan cadangan untuk perangkat lain.</p>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-3.5" aria-labelledby="storage-current-title">
        <h3 id="storage-current-title" className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Silsilah aktif</h3>
        <p className="mt-2 break-words text-[13px] font-semibold text-zinc-900">{familyName || "Silsilah Keluarga"}</p>
        <p className="mt-1 text-[11px] text-zinc-500">{personCount} anggota <span className="px-1 text-zinc-300">·</span> {relationshipCount} hubungan</p>
        <div className="mt-3 border-t border-zinc-100 pt-3">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-600">
            {directoryName ? <FolderOpen size={13} /> : hasFileHandle ? <FileJson size={13} /> : <HardDrive size={13} />}
            {directoryName ? "Folder terhubung" : hasFileHandle ? "Berkas terhubung" : "Browser perangkat ini"}
          </p>
          {hasDestination && <p className="mt-1 break-words text-[11px] text-zinc-500">{directoryName || fileName}</p>}
          <p className="mt-1.5 text-[11px] leading-4 text-zinc-500">
            {hasDestination ? "Gunakan Simpan perubahan untuk memperbarui berkas." : "Disimpan otomatis di browser ini. Unduh cadangan agar bisa dibuka di perangkat lain."}
          </p>
        </div>
      </section>

      <section aria-labelledby="storage-open-title">
        <h3 id="storage-open-title" className="mb-2 text-xs font-semibold text-zinc-800">Buka silsilah</h3>
        <div className="space-y-1">
          <StorageAction icon={ClipboardPaste} title="Tempel JSON" description="Buka dari teks, tanpa memilih file." onClick={onPasteJSON} featured />
          <StorageAction icon={FileJson} title="Pilih file JSON" description="Buka file cadangan dari perangkat." onClick={onLoadFile} />
          <StorageAction icon={FolderOpen} title="Buka folder keluarga"
            description={canOpenDirectory ? "Buka data dan foto dari folder lokal." : "Perlu browser yang mendukung akses folder."}
            onClick={onLoadDirectory} disabled={!canOpenDirectory} />
        </div>
      </section>

      <section className="border-t border-zinc-200 pt-4" aria-labelledby="storage-save-title">
        <h3 id="storage-save-title" className="mb-2 text-xs font-semibold text-zinc-800">Bagikan & simpan</h3>
        <div className="space-y-1">
          <StorageAction icon={Share2} title="Bagikan silsilah" description="Kirim file atau salin JSON untuk perangkat lain." onClick={onShare} featured />
          {hasDestination && <StorageAction icon={Save} title="Simpan perubahan" description="Perbarui berkas yang terhubung." onClick={onSaveFile} />}
          <StorageAction icon={Download} title="Unduh cadangan JSON" description="Simpan data untuk dibuka kembali atau dibagikan." onClick={onExportBackup} />
        </div>
      </section>

      <section className="border-t border-zinc-200 pt-4">
        <StorageAction icon={FilePlus} title="Buat silsilah baru" description="Mulai lagi dengan kanvas kosong." onClick={onNewTree} />
      </section>
    </div>
  );
}
