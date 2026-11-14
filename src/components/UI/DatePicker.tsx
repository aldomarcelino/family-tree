"use client";

import { Select } from "@/src/components/UI/Select";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createCalendarDate, formatCalendarValue, getCalendarDays, parseCalendarValue, shiftCalendarMonth } from "@/src/services/calendar";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const weekdays = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const dateLabel = (date: Date) => `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;

export function DatePicker({ value, onChange, placeholder = "Pilih tanggal", label, error, hint, required }: DatePickerProps) {
  const id = useId();
  const selected = parseCalendarValue(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => selected ?? createCalendarDate(2000, 0));
  const [focused, setFocused] = useState(() => formatCalendarValue(selected ?? createCalendarDate(2000, 0)));
  const [yearText, setYearText] = useState(() => String(view.getFullYear()));
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const days = useRef(new Map<string, HTMLButtonElement>());
  const focusDay = useRef(false);
  const today = open ? formatCalendarValue(new Date()) : "";
  const cells = getCalendarDays(view.getFullYear(), view.getMonth());

  const positionPopup = useCallback(() => {
    const panel = popup.current;
    const button = trigger.current;
    if (!panel || !button) return;
    panel.style.width = `${Math.min(306, window.innerWidth - 24)}px`;
    panel.style.maxHeight = `${window.innerHeight - 24}px`;
    const anchor = button.getBoundingClientRect();
    const bounds = panel.getBoundingClientRect();
    const below = anchor.bottom + 8;
    const above = anchor.top - bounds.height - 8;
    panel.style.left = `${Math.max(12, Math.min(anchor.left, window.innerWidth - bounds.width - 12))}px`;
    panel.style.top = `${below + bounds.height <= window.innerHeight - 12 ? below : above >= 12 ? above : Math.max(12, window.innerHeight - bounds.height - 12)}px`;
  }, []);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      positionPopup();
      if (focusDay.current) { days.current.get(focused)?.focus({ preventScroll: true }); focusDay.current = false; }
    });
    return () => cancelAnimationFrame(frame);
  }, [open, focused, positionPopup]);

  useEffect(() => {
    if (!open) return;
    const reposition = (event: Event) => { if (!popup.current?.contains(event.target as Node)) positionPopup(); };
    window.addEventListener("resize", positionPopup);
    document.addEventListener("scroll", reposition, true);
    return () => { window.removeEventListener("resize", positionPopup); document.removeEventListener("scroll", reposition, true); };
  }, [open, positionPopup]);

  const close = () => {
    if (popup.current?.matches(":popover-open")) popup.current.hidePopover();
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  };
  const show = () => {
    if (popup.current?.matches(":popover-open")) { close(); return; }
    const initial = selected ?? new Date();
    setView(initial);
    setFocused(formatCalendarValue(initial));
    setYearText(String(initial.getFullYear()));
    focusDay.current = true;
    popup.current?.showPopover();
    positionPopup();
    setOpen(true);
  };
  const choose = (date: Date) => { onChange(formatCalendarValue(date)); close(); };
  const navigate = (date: Date, moveFocus = false) => {
    if (date.getFullYear() < 1 || date.getFullYear() > 9999) return;
    focusDay.current = moveFocus;
    setView(date);
    setFocused(formatCalendarValue(date));
    setYearText(String(date.getFullYear()));
  };
  const onCalendarKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = parseCalendarValue(focused) ?? view;
    let next: Date | null = null;
    const dayOffset: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key in dayOffset) next = createCalendarDate(current.getFullYear(), current.getMonth(), current.getDate() + dayOffset[event.key]);
    if (event.key === "Home") next = createCalendarDate(current.getFullYear(), current.getMonth(), current.getDate() - (current.getDay() + 6) % 7);
    if (event.key === "End") next = createCalendarDate(current.getFullYear(), current.getMonth(), current.getDate() + 6 - (current.getDay() + 6) % 7);
    if (event.key === "PageUp" || event.key === "PageDown") next = shiftCalendarMonth(current, (event.key === "PageUp" ? -1 : 1) * (event.shiftKey ? 12 : 1));
    if (next) { event.preventDefault(); navigate(next, true); }
  };

  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-zinc-600">{label || "Tanggal"}{required && <span className="ml-0.5 text-[#862d33]">*</span>}</label>
      <button ref={trigger} id={id} type="button" className={`date-trigger ${error ? "date-trigger-error" : ""}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={`${id}-calendar`} aria-describedby={error || hint ? `${id}-hint` : undefined} onClick={show} onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); show(); } }}><span className={value ? "" : "text-zinc-400"}>{selected ? dateLabel(selected) : value || placeholder}</span><CalendarDays size={15} strokeWidth={1.6} /></button>
      <div ref={popup} id={`${id}-calendar`} popover="auto" role="dialog" aria-label={`Pilih ${label?.toLowerCase() || "tanggal"}`} className="date-popover" onToggle={() => setOpen(Boolean(popup.current?.matches(":popover-open")))} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); } }}>
        <header className="date-popup-heading"><span>{label || "Pilih tanggal"}</span><button type="button" aria-label="Tutup kalender" onClick={close}><X size={15} /></button></header>
        <div className="date-navigation">
          <button type="button" aria-label="Bulan sebelumnya" className="date-nav-button" disabled={view.getFullYear() === 1 && view.getMonth() === 0} onClick={() => navigate(shiftCalendarMonth(createCalendarDate(view.getFullYear(), view.getMonth()), -1))}><ChevronLeft size={16} /></button>
          <div className="date-month"><Select compact aria-label="Bulan kalender" value={view.getMonth()} onValueChange={(value) => navigate(createCalendarDate(view.getFullYear(), Number(value)))} options={months.map((month, index) => ({ value: String(index), label: month }))} /></div>
          <input aria-label="Tahun kalender" title="Ketik tahun, misalnya 1942" className="date-year" inputMode="numeric" maxLength={4} value={yearText} onChange={(event) => { const text = event.target.value.replace(/\D/g, "").slice(0, 4); setYearText(text); if (text.length === 4 && Number(text) > 0) { setView(createCalendarDate(Number(text), view.getMonth())); setFocused(formatCalendarValue(createCalendarDate(Number(text), view.getMonth()))); } }} onBlur={() => { const year = Number(yearText); if (year >= 1 && year <= 9999) navigate(createCalendarDate(year, view.getMonth())); else setYearText(String(view.getFullYear())); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); const year = Number(yearText); if (year >= 1 && year <= 9999) navigate(createCalendarDate(year, view.getMonth()), true); } }} />
          <button type="button" aria-label="Bulan berikutnya" className="date-nav-button" disabled={view.getFullYear() === 9999 && view.getMonth() === 11} onClick={() => navigate(shiftCalendarMonth(createCalendarDate(view.getFullYear(), view.getMonth()), 1))}><ChevronRight size={16} /></button>
        </div>
        <p className="sr-only" aria-live="polite">{months[view.getMonth()]} {view.getFullYear()}</p>
        <div className="date-weekdays" aria-hidden="true">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
        <div role="grid" aria-label={`${months[view.getMonth()]} ${view.getFullYear()}`} className="date-grid" onKeyDown={onCalendarKeyDown}>
          {Array.from({ length: 6 }, (_, row) => <div role="row" key={row}>{cells.slice(row * 7, row * 7 + 7).map((date) => { const key = formatCalendarValue(date); const isSelected = value === key; return <div role="gridcell" key={key} aria-selected={isSelected}><button ref={(element) => { if (element) days.current.set(key, element); else days.current.delete(key); }} type="button" tabIndex={focused === key ? 0 : -1} aria-label={dateLabel(date)} aria-current={key === today ? "date" : undefined} disabled={date.getFullYear() < 1 || date.getFullYear() > 9999} className={`date-day ${date.getMonth() !== view.getMonth() ? "date-outside" : ""} ${isSelected ? "date-selected" : ""}`} onClick={() => choose(date)}>{date.getDate()}</button></div>; })}</div>)}
        </div>
        <footer className="date-popup-footer"><button type="button" onClick={() => choose(new Date())}>Hari ini</button><button type="button" disabled={!value} onClick={() => { onChange(""); close(); }}>Kosongkan</button></footer>
      </div>
      {(error || hint) && <p id={`${id}-hint`} className={`text-[11px] ${error ? "text-[#862d33]" : "text-zinc-400"}`}>{error || hint}</p>}
    </div>
  );
}
