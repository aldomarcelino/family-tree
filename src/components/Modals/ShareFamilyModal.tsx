"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Copy, Download, FileJson, Share2 } from "lucide-react";
import { Modal } from "@/src/components/UI/Modal";
import { Button } from "@/src/components/UI/Button";
import { Textarea } from "@/src/components/UI/Textarea";
import { canShareTransfer, createTransferFile, downloadTransfer, shareTransfer, type FamilyTransfer } from "@/src/services/familyTransfer";

export function ShareFamilyModal({ transfer, onClose }: { transfer: FamilyTransfer; onClose: () => void }) {
  const file = useMemo(() => createTransferFile(transfer), [transfer]);
  const canShare = canShareTransfer(file);
  const [isSharing, setIsSharing] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied" | "manual">("idle");
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);
  const manualInput = useRef<HTMLTextAreaElement>(null);

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    setFeedback(null);
    try {
      const result = await shareTransfer(file);
      if (result === "shared") setFeedback({ text: "File silsilah diteruskan ke aplikasi pilihan Anda." });
    } catch {
      setFeedback({ text: "Menu berbagi belum bisa dibuka. Gunakan Unduh JSON atau Salin JSON di bawah.", error: true });
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopy = async () => {
    if (copyState === "copying") return;
    setCopyState("copying");
    setFeedback(null);
    try {
      await navigator.clipboard.writeText(transfer.contents);
      setCopyState("copied");
      setFeedback({ text: "JSON tersalin. Kirim sebagai teks; penerima dapat memilih Tempel JSON di Markoum." });
    } catch {
      setCopyState("manual");
      setFeedback({ text: "Salin otomatis belum diizinkan. Pilih teks JSON di bawah, lalu salin melalui menu perangkat." });
    }
  };

  const handleDownload = () => {
    try {
      downloadTransfer(transfer);
      setFeedback({ text: "File JSON siap diunduh. Kirim file tersebut melalui aplikasi pilihan Anda." });
    } catch {
      setFeedback({ text: "File belum bisa diunduh. Coba Salin JSON sebagai alternatif.", error: true });
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Bagikan silsilah" eyebrow="Kirim salinan keluarga" maxWidth="max-w-lg"
      subtitle="Kirim lewat aplikasi pilihan Anda. Penerima mendapat salinan yang bisa dibuka dan diedit sendiri.">
      <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
          <FileJson size={22} className="shrink-0 text-[#862d33]" />
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold">{transfer.name}</p>
            <p className="mt-1 text-xs text-zinc-500">{transfer.personCount} anggota · {transfer.relationshipCount} hubungan</p>
          </div>
        </div>

        <div className="space-y-3">
          {canShare ? <Button variant="primary" className="min-h-12 w-full" onClick={handleShare} disabled={isSharing}>
            <Share2 size={17} /> {isSharing ? "Membuka menu berbagi…" : "Bagikan file JSON"}
          </Button> : <>
            <Button variant="primary" className="min-h-12 w-full" onClick={handleDownload}><Download size={17} /> Unduh file JSON</Button>
            <p className="text-xs leading-5 text-zinc-500">Menu berbagi file belum tersedia di browser ini. Unduh file, lalu kirim melalui WhatsApp, email, atau aplikasi lain.</p>
          </>}
          <div className="flex gap-2">
            <Button className="min-h-11 flex-1" onClick={handleCopy} disabled={copyState === "copying"}>
              {copyState === "copied" ? <Check size={15} /> : <Copy size={15} />}
              {copyState === "copied" ? "JSON tersalin" : copyState === "copying" ? "Menyalin…" : "Salin JSON"}
            </Button>
            {canShare && <Button className="min-h-11 flex-1" onClick={handleDownload}><Download size={15} /> Unduh JSON</Button>}
          </div>
        </div>

        {feedback && <p role={feedback.error ? "alert" : "status"} className={`rounded-lg px-3.5 py-3 text-xs leading-5 ${feedback.error ? "bg-[#fbf4f5] text-[#862d33]" : "bg-zinc-50 text-zinc-600"}`}>{feedback.text}</p>}
        {copyState === "manual" && <div className="space-y-2">
          <Textarea ref={manualInput} label="JSON untuk disalin" readOnly value={transfer.contents} rows={5} className="json-import-input" onFocus={(event) => event.currentTarget.select()} />
          <Button onClick={() => { manualInput.current?.focus(); manualInput.current?.select(); }} className="min-h-11 w-full">Pilih seluruh JSON</Button>
        </div>}

        <section className="border-t border-zinc-200 pt-4">
          <h3 className="text-xs font-semibold text-zinc-800">Cara membuka di perangkat lain</h3>
          <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs leading-5 text-zinc-500"><span>Buka Markoum</span><ArrowRight size={12} aria-hidden="true" /><span>Berkas</span><ArrowRight size={12} aria-hidden="true" /><span>Pilih file JSON / Tempel JSON</span></p>
          <p className="mt-3 text-[11px] leading-5 text-zinc-500">Perubahan setelah dibagikan tidak otomatis mengikuti. Bagikan salinan terbaru jika ada pembaruan.{transfer.hasPhotos && " File foto dan media perlu dikirim terpisah; JSON hanya menyimpan referensinya."}</p>
        </section>
      </div>
      <footer className="modal-footer !justify-end"><Button onClick={onClose} className="min-h-11">Selesai</Button></footer>
    </Modal>
  );
}
