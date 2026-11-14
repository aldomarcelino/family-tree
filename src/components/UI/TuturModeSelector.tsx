"use client";

import { Check, Languages, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useFamilyStore } from "@/src/store/familyStore";
import { tuturOptions } from "@/src/services/kinship/registry";

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
        <div id={id} role="dialog" aria-labelledby={`${id}-title`} className="relation-guide-tooltip tutur-popover">
          <div className="tutur-heading">
            <h2 id={`${id}-title`}>Sistem Tutur &amp; Sapaan</h2>
            <button type="button" className="tutur-close" aria-label="Tutup pilihan tutur" onClick={close}><X size={16} /></button>
          </div>
          <fieldset className="tutur-options">
            <legend className="sr-only">Pilih sistem tutur</legend>
            {tuturOptions.map((option) => (
              <label key={option.id} className={`tutur-option${tuturMode === option.id ? " is-selected" : ""}`}>
                <input type="radio" name={`${id}-mode`} value={option.id} checked={tuturMode === option.id} onChange={() => setTuturMode(option.id)} />
                <span className="tutur-option-name">{option.name}</span>
                <span className="tutur-radio" aria-hidden="true">{tuturMode === option.id && <Check size={11} strokeWidth={3} />}</span>
              </label>
            ))}
          </fieldset>
        </div>
      )}
    </div>
  );
}
