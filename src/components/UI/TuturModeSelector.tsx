"use client";

import { Check, Languages, Sparkles, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useFamilyStore } from "@/src/store/familyStore";
import type { TuturMode } from "@/src/services/kinship";

const tuturOptions: { id: TuturMode; name: string; description: string; examples: string[] }[] = [
  { id: "indonesia", name: "Bahasa Indonesia", description: "Sapaan keluarga sehari-hari", examples: ["Ayah", "Ibu", "Paman", "Sepupu"] },
  { id: "mandailing", name: "Mandailing / Angkola", description: "Tutur dari garis ayah dan ibu", examples: ["Umak", "Uwak", "Udak", "Bou", "Tunggane"] },
  { id: "batak", name: "Batak Toba", description: "Partuturon dalam keluarga Toba", examples: ["Amang", "Inang", "Namboru", "Lae"] },
  { id: "jawa", name: "Kekerabatan Jawa", description: "Sapaan menurut generasi dan usia", examples: ["Mbah", "Pakde", "Bulek", "Adhik"] },
];

export function TuturModeSelector() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const tuturMode = useFamilyStore((state) => state.tuturMode);
  const setTuturMode = useFamilyStore((state) => state.setTuturMode);
  const selected = tuturOptions.find((option) => option.id === tuturMode) ?? tuturOptions[0];
  const close = () => { setOpen(false); trigger.current?.focus(); };

  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLInputElement>("input:checked")?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div ref={root} className="relation-guide nodrag nopan nowheel" onBlur={(event) => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button ref={trigger} type="button" className="relation-guide-trigger" aria-label={`Sistem tutur: ${selected.name}`} aria-haspopup="dialog" aria-controls={open ? id : undefined} aria-expanded={open} onClick={() => setOpen((value) => !value)} title={`Sistem tutur: ${selected.name}`}>
        <Languages size={18} strokeWidth={1.6} />
      </button>
      {open && (
        <div id={id} role="dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} className="relation-guide-tooltip tutur-popover">
          <div className="tutur-heading">
            <span className="tutur-heading-icon"><Languages size={19} /></span>
            <div><p className="tutur-eyebrow">PREFERENSI SILSILAH</p><h2 id={`${id}-title`}>Sistem Tutur &amp; Sapaan</h2></div>
            <button type="button" className="tutur-close" aria-label="Tutup pilihan tutur" onClick={close}><X size={16} /></button>
          </div>
          <p id={`${id}-description`} className="tutur-description">Pilih tradisi sapaan untuk melihat hubungan keluarga dari anggota yang dipusatkan.</p>
          <fieldset className="tutur-options">
            <legend className="sr-only">Pilih sistem tutur</legend>
            {tuturOptions.map((option) => (
              <label key={option.id} className={`tutur-option${tuturMode === option.id ? " is-selected" : ""}`}>
                <input type="radio" name={`${id}-mode`} value={option.id} checked={tuturMode === option.id} onChange={() => setTuturMode(option.id)} />
                <span className="tutur-option-body"><span className="tutur-option-name">{option.name}</span><span className="tutur-option-description">{option.description}</span><span className="tutur-examples">{option.examples.map((example) => <span key={example}>{example}</span>)}</span></span>
                <span className="tutur-radio" aria-hidden="true">{tuturMode === option.id && <Check size={11} strokeWidth={3} />}</span>
              </label>
            ))}
          </fieldset>
          <div className="tutur-hint"><Sparkles size={15} /><p>Pusatkan salah satu anggota lewat tombol bintang. Sapaan pada kartu langsung mengikuti pilihan ini.</p></div>
          <p className="tutur-footnote">Sapaan dapat berbeda menurut kebiasaan keluarga.</p>
        </div>
      )}
    </div>
  );
}
