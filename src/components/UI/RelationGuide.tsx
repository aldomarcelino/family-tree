"use client";

import { Book, BookOpen } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

const relations = [
  { style: "child", title: "Orang tua → anak", description: "Garis biru utuh. Panah mengarah ke anak." },
  { style: "sibling", title: "Saudara", description: "Garis hitam putus-putus di atas kartu." },
  { style: "couple", title: "Pasangan", description: "Garis biru horizontal dengan titik penghubung." },
  { style: "adoption", title: "Anak adopsi", description: "Garis biru putus-putus menuju anak." },
  { style: "step", title: "Anak tiri", description: "Garis abu-abu putus-putus menuju anak." },
];

export function RelationGuide() {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) { setOpen(false); setPinned(false); } };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); setPinned(false); } };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [open]);

  return (
    <div ref={root} className="relation-guide nodrag nopan nowheel" onPointerEnter={(event) => { if (event.pointerType === "mouse") setOpen(true); }} onPointerLeave={() => { if (!pinned) setOpen(false); }} onBlur={(event) => { if (!pinned && !event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
      <button type="button" className="relation-guide-trigger" aria-label="Panduan garis hubungan keluarga" aria-describedby={open ? id : undefined} aria-expanded={open} onFocus={() => setOpen(true)} onClick={() => { setPinned(!pinned); setOpen(!pinned); }}>{open ? <BookOpen size={19} strokeWidth={1.6} /> : <Book size={19} strokeWidth={1.6} />}</button>
      {open && <div id={id} role="tooltip" className="relation-guide-tooltip"><p className="mb-4 text-[13px] font-semibold text-zinc-900">Panduan garis keluarga</p><ul className="space-y-4">{relations.map((relation) => <li key={relation.style} className="flex items-start gap-3"><i className={`relation-guide-swatch relation-guide-${relation.style}`} aria-hidden="true" /><span><strong className="block text-xs font-medium text-zinc-800">{relation.title}</strong><span className="mt-1 block text-[11px] leading-5 text-zinc-500">{relation.description}</span></span></li>)}</ul></div>}
    </div>
  );
}
