"use client";

import { useId, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, ClipboardPaste } from "lucide-react";
import { Modal } from "@/src/components/UI/Modal";
import { Button } from "@/src/components/UI/Button";
import { Textarea } from "@/src/components/UI/Textarea";
import { parseFamilyJSON } from "@/src/services/fileStorage";
import type { FamilyData } from "@/src/types/family";

interface ImportJSONModalProps {
  currentFamilyName: string;
  hasCurrentData: boolean;
  onClose: () => void;
  onImport: (family: FamilyData) => void;
}

// Mount only while open so a new import always starts with an empty draft.
export function ImportJSONModal({ currentFamilyName, hasCurrentData, onClose, onImport }: ImportJSONModalProps) {
  const [contents, setContents] = useState("");
  const [preview, setPreview] = useState<FamilyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (preview) {
      onImport(preview);
      return;
    }
    try {
      setPreview(parseFamilyJSON(contents));
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "JSON belum bisa dibaca. Periksa kembali isinya.");
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Tempel JSON" eyebrow="Buka silsilah" maxWidth="max-w-xl"
      subtitle="Salin JSON silsilah, lalu tempel di sini. Tidak perlu memilih atau mengunggah file.">
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
        <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-5 sm:px-7">
          <Textarea label="Data JSON" value={contents} required spellCheck={false} autoCorrect="off" autoCapitalize="off"
            placeholder={'{\n  "schemaVersion": 1,\n  "name": "Keluarga saya",\n  ...\n}'}
            rows={8} className="json-import-input" aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
            hint="Gunakan format JSON hasil ekspor Markoum. Data akan diperiksa sebelum dibuka."
            onChange={(event) => { setContents(event.target.value); setPreview(null); setError(null); }} />

          {error && <div id={`${id}-error`} role="alert" className="max-h-36 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-[#eed2d5] bg-[#fbf4f5] px-3.5 py-3 text-xs leading-5 text-[#862d33]">{error}</div>}

          {preview && <section aria-label="Pratinjau silsilah" role="status" className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="flex items-center gap-2 text-xs font-medium text-zinc-600"><CheckCircle2 size={15} className="text-[#862d33]" /> JSON siap dibuka</p>
            <p className="mt-2 break-words text-sm font-semibold text-zinc-900">{preview.name}</p>
            <p className="mt-1 text-xs text-zinc-500">{preview.persons.length} anggota · {preview.relationships.length} hubungan</p>
            {hasCurrentData && <p className="mt-3 border-t border-zinc-200 pt-3 text-xs leading-5 text-zinc-600">Silsilah “{currentFamilyName}” yang sedang dibuka akan diganti. Unduh cadangan terlebih dahulu jika masih diperlukan.</p>}
          </section>}
        </div>
        <footer className="modal-footer json-import-footer">
          <Button onClick={onClose} variant="secondary">Batal</Button>
          <Button type="submit" variant="primary" disabled={!contents.trim()}>
            {preview ? <><ArrowRight size={15} /> Buka silsilah</> : <><ClipboardPaste size={15} /> Periksa JSON</>}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
