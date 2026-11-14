"use client";

import { FIELD_LIMITS } from "@/src/schema/fieldLimits";
import { useState, useRef, useEffect, useId, useMemo, type KeyboardEvent } from "react";
import { ArrowUpRight, Search, X } from "lucide-react";
import { getPersonInitials } from "@/src/services/personInitials";
import { createPersonSearchIndex, searchPeople } from "@/src/services/personSearch";
import type { FamilyData, Person } from "@/src/types/family";

interface FamilySearchBarProps {
  family: FamilyData;
  onSelectPerson: (person: Person) => void;
}

export function FamilySearchBar({ family, onSelectPerson }: FamilySearchBarProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const index = useMemo(() => createPersonSearchIndex(family.persons), [family.persons]);
  const { persons: results, total } = useMemo(() => searchPeople(index, query), [index, query]);
  const active = Math.min(activeIndex, results.length - 1);

  useEffect(() => {
    const shortcut = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.isContentEditable || target.closest("input, textarea, select, dialog")) return;
      if (event.key === "/" || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k")) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const outside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) optionRefs.current[active]?.scrollIntoView({ block: "nearest" });
  }, [active, isOpen, query]);

  const select = (person: Person) => {
    setQuery("");
    setIsOpen(false);
    inputRef.current?.blur();
    onSelectPerson(person);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      if (results.length) setActiveIndex(!isOpen ? 0 : (active + (event.key === "ArrowDown" ? 1 : -1) + results.length) % results.length);
    } else if (event.key === "Enter" && isOpen && results[active]) {
      event.preventDefault();
      select(results[active]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
    } else if (event.key === "Tab") {
      setIsOpen(false);
    }
  };

  return (
    <div className="family-search" ref={containerRef} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
    }}>
      <div className="family-search-field">
        <Search size={17} className="shrink-0 text-zinc-400" aria-hidden="true" />
        <input ref={inputRef} type="text" role="combobox" aria-label="Cari anggota keluarga"
          aria-autocomplete="list" aria-expanded={isOpen} aria-controls={isOpen ? `${id}-list` : undefined}
          aria-activedescendant={isOpen && active >= 0 ? `${id}-option-${active}` : undefined}
          autoComplete="off" spellCheck={false} enterKeyHint="search" maxLength={FIELD_LIMITS.search}
          placeholder="Cari anggota keluarga…" value={query}
          onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); setIsOpen(true); }}
          onFocus={() => { setIsOpen(true); setActiveIndex(0); }} onKeyDown={handleKeyDown} />
        {query ? <button type="button" aria-label="Hapus pencarian" className="family-search-clear"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => { setQuery(""); setActiveIndex(0); setIsOpen(true); inputRef.current?.focus(); }}><X size={15} /></button>
          : <kbd className="family-search-shortcut" aria-hidden="true">/</kbd>}
      </div>

      {isOpen && <div className="family-search-popover">
        <div className="family-search-caption" role="status" aria-live="polite">
          {query.trim() ? `${total} anggota ditemukan` : "Pilih anggota atau cari nama, panggilan, dan tag"}
        </div>
        <ul id={`${id}-list`} role="listbox" aria-label="Hasil pencarian anggota" className="family-search-results">
          {results.map((person, resultIndex) => (
            <li key={person.id} role="presentation">
              <button ref={(element) => { optionRefs.current[resultIndex] = element; }}
                id={`${id}-option-${resultIndex}`} type="button" role="option" aria-selected={active === resultIndex}
                tabIndex={-1} className={`family-search-result${active === resultIndex ? " is-active" : ""}`}
                onMouseDown={(event) => event.preventDefault()} onClick={() => select(person)}>
                <span className={`family-search-avatar${person.gender === "female" ? " is-female" : ""}`} aria-hidden="true">{getPersonInitials(person.fullName)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-zinc-900">{person.fullName}</span>
                  <span className="mt-1 block truncate text-[11px] text-zinc-500">
                    {[person.nickname, person.birthDate ? `Lahir ${person.birthDate.slice(0, 4)}` : null,
                      person.tags.length ? person.tags.map((tag) => `#${tag}`).join(" ") : null].filter(Boolean).join(" · ") || (person.gender === "female" ? "Perempuan" : "Laki-laki")}
                  </span>
                </span>
                <ArrowUpRight size={15} className="shrink-0 text-zinc-400" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        {!results.length && <div className="family-search-empty">
          <Search size={22} className="mx-auto mb-2 text-zinc-300" aria-hidden="true" />
          <p className="text-[13px] font-medium text-zinc-700">{family.persons.length ? "Tidak ada anggota yang cocok" : "Belum ada anggota keluarga"}</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">{family.persons.length ? "Coba nama lain, panggilan, atau tag keluarga." : "Tambahkan anggota untuk mulai mencari."}</p>
        </div>}
        {results.length > 0 && <p className="family-search-footer">{total > results.length ? `Menampilkan ${results.length} dari ${total}. Perjelas pencarian.` : "Pilih anggota untuk melihatnya di pohon."}</p>}
      </div>}
    </div>
  );
}
