"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Copy, Download, MessageCircle, Share2 } from "lucide-react";
import { Modal } from "@/src/components/UI/Modal";
import { Button } from "@/src/components/UI/Button";
import { Textarea } from "@/src/components/UI/Textarea";
import { canShareTransfer, createShareFile, createWhatsAppShareURL, downloadTransfer, shareTransfer, type FamilyTransfer } from "@/src/services/familyTransfer";

export function ShareFamilyModal({ transfer, onClose }: { transfer: FamilyTransfer; onClose: () => void }) {
  const file = useMemo(() => createShareFile(transfer), [transfer]);
  const whatsappURL = useMemo(() => createWhatsAppShareURL(transfer), [transfer]);
  const [whatsappReady, setWhatsappReady] = useState(false);
  const [nativeShareFailed, setNativeShareFailed] = useState(false);
  const canShare = !nativeShareFailed && canShareTransfer(file);
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
      if (result === "shared") setFeedback({ text: "File diteruskan ke aplikasi pilihan Anda." });
    } catch {
      setNativeShareFailed(true);
      setFeedback({ text: "Menu berbagi tidak tersedia. Gunakan salin atau unduh." });
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopy = async (forWhatsApp = false) => {
    if (copyState === "copying") return false;
    setCopyState("copying");
    setFeedback(null);
    try {
      await navigator.clipboard.writeText(transfer.contents);
      setCopyState("copied");
      setFeedback({ text: forWhatsApp ? "JSON tersalin. Buka WhatsApp, lalu tempel ke chat." : "JSON tersalin." });
      return true;
    } catch {
      setCopyState("manual");
      setFeedback({ text: "Pilih teks JSON di bawah, lalu salin secara manual." });
      return false;
    }
  };

  const handleDownload = () => {
    try {
      downloadTransfer(transfer);
      setFeedback({ text: "File JSON siap diunduh." });
    } catch {
      setFeedback({ text: "Unduhan gagal. Coba Salin JSON.", error: true });
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Bagikan silsilah" eyebrow="" maxWidth="max-w-md">
      <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
        <div>
          <p className="break-words text-sm font-medium text-zinc-900">{transfer.name}</p>
          <p className="mt-1 text-xs text-zinc-500">{transfer.personCount} anggota{transfer.hasPhotos && " · Foto tidak disertakan"}</p>
        </div>

        <div className="space-y-3">
          {whatsappURL || whatsappReady || copyState === "manual" ? <a
            href={whatsappURL || "https://wa.me/"} target="_blank" rel="noopener noreferrer"
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#128c7e] px-4 py-3 text-[13px] font-semibold text-white hover:bg-[#0d766a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#128c7e]">
            <MessageCircle size={18} /> {whatsappURL ? "Kirim ke WhatsApp" : "Buka WhatsApp"}
          </a> : <>
            <Button className="min-h-12 w-full !border-[#128c7e] !bg-[#128c7e] !text-white hover:!bg-[#0d766a]"
              disabled={copyState === "copying"} onClick={async () => { if (await handleCopy(true)) setWhatsappReady(true); }}>
              <MessageCircle size={18} /> {copyState === "copying" ? "Menyiapkan…" : "Kirim ke WhatsApp"}
            </Button>
            <p className="text-center text-[11px] text-zinc-500">Salin data, lalu buka WhatsApp.</p>
          </>}
          <div className="grid grid-cols-2 gap-2">
            <Button className="min-h-11" onClick={() => handleCopy()} disabled={copyState === "copying"}>
              {copyState === "copied" ? <Check size={15} /> : <Copy size={15} />}
              {copyState === "copied" ? "Tersalin" : copyState === "copying" ? "Menyalin…" : "Salin JSON"}
            </Button>
            <Button className="min-h-11" onClick={handleDownload}><Download size={15} /> Unduh file</Button>
          </div>
        </div>

        {feedback && <p role={feedback.error ? "alert" : "status"} className={`rounded-lg px-3.5 py-3 text-xs leading-5 ${feedback.error ? "bg-[#fbf4f5] text-[#862d33]" : "bg-zinc-50 text-zinc-600"}`}>{feedback.text}</p>}
        {copyState === "manual" && <div className="space-y-2">
          <Textarea ref={manualInput} label="JSON untuk disalin" readOnly value={transfer.contents} rows={5} className="json-import-input" onFocus={(event) => event.currentTarget.select()} />
          <Button onClick={() => { manualInput.current?.focus(); manualInput.current?.select(); }} className="min-h-11 w-full">Pilih seluruh JSON</Button>
        </div>}

        <details className="group border-t border-zinc-100 pt-3">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 rounded text-xs text-zinc-500 focus-visible:outline-2 focus-visible:outline-[#862d33] [&::-webkit-details-marker]:hidden">
            Cara membuka & opsi lain
            <ChevronDown size={14} className="transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="space-y-3 pt-2 pb-1 text-xs leading-5 text-zinc-500">
            <p>Penerima: buka Markoum → Berkas → Pilih file atau Tempel JSON.</p>
            <p>Salinan ini tidak tersinkron otomatis.</p>
            {canShare && <Button variant="secondary" className="min-h-11 w-full" onClick={handleShare} disabled={isSharing}>
              <Share2 size={15} /> {isSharing ? "Membuka…" : "Bagikan file lewat aplikasi lain"}
            </Button>}
          </div>
        </details>
      </div>
    </Modal>
  );
}
