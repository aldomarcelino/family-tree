"use client";

import { Children, isValidElement, useCallback, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export interface SelectOption { value: string; label: string; disabled?: boolean; group?: string }
export interface SelectProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value" | "onChange" | "children"> {
  value: string | number;
  onValueChange: (value: string) => void;
  label?: string;
  error?: string;
  hint?: string;
  options?: SelectOption[];
  children?: ReactNode;
  required?: boolean;
  searchable?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  compact?: boolean;
}

function readOptions(children: ReactNode, group?: string): SelectOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ value?: string; label?: string; disabled?: boolean; children?: ReactNode }>(child)) return [];
    if (child.type === "optgroup") return readOptions(child.props.children, child.props.label);
    if (child.type !== "option") return [];
    return [{ value: String(child.props.value ?? ""), label: String(child.props.children ?? ""), disabled: child.props.disabled, group }];
  });
}

export function Select({ value, onValueChange, label, error, hint, options, children, required, searchable, placeholder = "Pilih opsi", emptyMessage = "Tidak ada pilihan yang sesuai.", compact = false, className = "", id, disabled, ...props }: SelectProps) {
  const uid = useId();
  const selectId = id ?? uid;
  const popupId = `${uid}-popup`, listId = `${uid}-list`, hintId = `${uid}-hint`;
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const choices = options ?? readOptions(children);
  const selected = choices.find((option) => option.value === String(value));
  const showSearch = searchable ?? choices.length > 7;
  const filtered = choices.filter((option) => option.label.toLocaleLowerCase("id-ID").includes(query.trim().toLocaleLowerCase("id-ID")));
  const enabled = filtered.map((option, index) => option.disabled ? -1 : index).filter((index) => index >= 0);
  const activeId = active >= 0 && filtered[active] ? `${uid}-option-${active}` : undefined;

  const positionPopup = useCallback(() => {
    if (!popup.current || !trigger.current) return;
    const bounds = trigger.current.getBoundingClientRect();
    const panel = popup.current;
    panel.style.width = `${Math.min(Math.max(bounds.width, compact ? 170 : 220), window.innerWidth - 24)}px`;
    const below = window.innerHeight - bounds.bottom - 16;
    const above = bounds.top - 16;
    const upwards = below < 230 && above > below;
    panel.style.maxHeight = `${Math.min(330, Math.max(100, upwards ? above : below))}px`;
    const height = panel.getBoundingClientRect().height;
    panel.style.left = `${Math.max(12, Math.min(bounds.left, window.innerWidth - panel.offsetWidth - 12))}px`;
    panel.style.top = `${Math.max(12, upwards ? bounds.top - height - 6 : bounds.bottom + 6)}px`;
  }, [compact]);

  useEffect(() => {
    if (!open) return;
    positionPopup();
    const reposition = (event: Event) => { if (!popup.current?.contains(event.target as Node)) positionPopup(); };
    window.addEventListener("resize", positionPopup);
    document.addEventListener("scroll", reposition, true);
    return () => { window.removeEventListener("resize", positionPopup); document.removeEventListener("scroll", reposition, true); };
  }, [open, query, positionPopup]);

  useEffect(() => {
    if (open && activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [open, activeId]);

  const close = (restore = true) => {
    popup.current?.hidePopover();
    if (restore) trigger.current?.focus({ preventScroll: true });
  };
  const choose = (index: number) => {
    const option = filtered[index];
    if (!option || option.disabled) return;
    onValueChange(option.value);
    close();
  };
  const show = (last = false) => {
    if (disabled) return;
    setQuery("");
    const index = choices.findIndex((option) => option.value === String(value) && !option.disabled);
    const available = choices.map((option, i) => option.disabled ? -1 : i).filter((i) => i >= 0);
    setActive(last ? available.at(-1) ?? -1 : index >= 0 ? index : available[0] ?? -1);
    popup.current?.showPopover();
    positionPopup();
    if (showSearch) search.current?.focus({ preventScroll: true });
    else list.current?.focus({ preventScroll: true });
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (event.key === "Tab") { close(false); return; }
    const inSearch = event.target === search.current;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const index = inSearch ? -1 : enabled.indexOf(active);
      const next = index < 0 ? event.key === "ArrowDown" ? 0 : enabled.length - 1 :
        event.key === "ArrowDown" ? (index + 1) % enabled.length : (index - 1 + enabled.length) % enabled.length;
      setActive(enabled[next] ?? -1);
      list.current?.focus({ preventScroll: true });
    } else if (event.key === "Enter" || (!inSearch && event.key === " ")) {
      event.preventDefault(); choose(active);
    } else if (!inSearch && (event.key === "Home" || event.key === "End")) {
      event.preventDefault(); setActive(event.key === "Home" ? enabled[0] ?? -1 : enabled.at(-1) ?? -1);
    } else if (!inSearch && event.key.length === 1 && event.key !== " ") {
      event.preventDefault();
      if (showSearch) { setQuery(event.key); setActive(-1); search.current?.focus(); }
      else setActive(filtered.findIndex((option) => !option.disabled && option.label.toLowerCase().startsWith(event.key.toLowerCase())));
    }
  };

  return <div className={`family-select ${compact ? "family-select-compact" : ""}`}>
    {label && <label htmlFor={selectId} className="family-select-label">{label}{required && <span aria-hidden="true"> *</span>}</label>}
    <button {...props} ref={trigger} id={selectId} type="button" disabled={disabled} className={`family-select-trigger ${error ? "has-error" : ""} ${className}`} role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-invalid={Boolean(error)} aria-describedby={error || hint ? hintId : undefined} onClick={() => open ? close() : show()} onKeyDown={(event) => { if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) { event.preventDefault(); show(event.key === "ArrowUp" || event.key === "End"); } }}>
      <span className={!selected || selected.value === "" ? "select-placeholder" : ""}>{selected?.label ?? placeholder}</span><ChevronDown size={14} aria-hidden="true" />
    </button>
    <div ref={popup} id={popupId} popover="auto" className="family-select-popup" onKeyDown={onKeyDown} onToggle={(event) => setOpen(event.newState === "open")}>
      {showSearch && <div className="family-select-search"><Search size={14} aria-hidden="true" /><input ref={search} aria-label={`Cari ${label?.toLowerCase() ?? "pilihan"}`} placeholder="Cari pilihan…" autoComplete="off" value={query} onChange={(event) => { setQuery(event.target.value); setActive(-1); }} /></div>}
      <div ref={list} id={listId} role="listbox" tabIndex={-1} aria-label={label ?? props["aria-label"] ?? "Pilihan"} aria-activedescendant={activeId} className="family-select-options">
        {filtered.map((option, index) => <div key={option.value}>
          {option.group && option.group !== filtered[index - 1]?.group && <p className="family-select-group">{option.group}</p>}
          <button type="button" role="option" id={`${uid}-option-${index}`} tabIndex={-1} aria-selected={option.value === String(value)} disabled={option.disabled} className={`family-select-option ${active === index ? "is-active" : ""}`} onPointerMove={() => setActive(index)} onClick={() => choose(index)}><span>{option.label}</span>{option.value === String(value) && <Check size={14} aria-hidden="true" />}</button>
        </div>)}
        {filtered.length === 0 && <p className="family-select-empty" role="status">{emptyMessage}</p>}
      </div>
    </div>
    {(error || hint) && <p id={hintId} className={`family-select-hint ${error ? "has-error" : ""}`}>{error || hint}</p>}
  </div>;
}
