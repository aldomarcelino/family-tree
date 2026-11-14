import { FIELD_LIMITS } from "@/src/schema/fieldLimits";
import React, { useState, useRef, useEffect } from "react";
import { Search, X, Mars, Venus, Eye } from "lucide-react";
import type { FamilyData, Person } from "@/src/types/family";

interface FamilySearchBarProps {
  family: FamilyData;
  onSelectPerson?: (person: Person) => void;
  className?: string;
}

export function FamilySearchBar({
  family,
  onSelectPerson,
  className = "absolute top-24 left-7 z-20 w-64 select-none font-sans",
}: FamilySearchBarProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = query.trim()
    ? family.persons.filter(
        (p) =>
          p.fullName.toLowerCase().includes(query.toLowerCase()) ||
          (p.nickname && p.nickname.toLowerCase().includes(query.toLowerCase())) ||
          p.tags.some((t) => t.toLowerCase().includes(query.toLowerCase())),
      )
    : [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (person: Person) => {
    onSelectPerson?.(person);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div className={className} ref={containerRef}>
      <div className="relative">
        <div className="flex items-center gap-2 bg-white/95 border border-zinc-200/90 rounded-lg px-3.5 py-2 shadow-sm backdrop-blur-md focus-within:ring-2 focus-within:ring-[#862d33]/20 focus-within:border-[#862d33] transition">
          <Search size={15} className="text-zinc-400 shrink-0" />
          <input
            maxLength={FIELD_LIMITS.search}
            type="text"
            placeholder="Cari nama, panggilan, atau tag..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="w-full text-xs bg-transparent border-none outline-none text-zinc-800 placeholder-zinc-400 font-medium"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setIsOpen(false);
              }}
              type="button"
              className="text-zinc-400 hover:text-zinc-700 transition cursor-pointer p-0.5 rounded-full hover:bg-zinc-100"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {isOpen && results.length > 0 && (
          <ul className="absolute left-0 right-0 mt-2 max-h-64 overflow-y-auto bg-white border border-zinc-200 rounded-lg shadow-xl py-1.5 z-30 divide-y divide-zinc-100 backdrop-blur-md">
            {results.map((p) => (
              <li key={p.id} className="flex items-center">
                <button
                  onClick={() => handleSelect(p)}
                  aria-label={`Lihat detail ${p.fullName}`}
                  title="Lihat detail anggota"
                  type="button"
                  className="min-w-0 flex-1 text-left px-3.5 py-2.5 hover:bg-zinc-50 transition cursor-pointer text-xs flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                        p.gender === "female"
                          ? "bg-[#fbf4f5] text-[#862d33]"
                          : "bg-zinc-100 text-zinc-900"
                      }`}
                    >
                      {p.gender === "female" ? <Venus size={13} /> : <Mars size={13} />}
                    </div>
                    <div className="min-w-0 truncate">
                      <p className="font-bold text-zinc-900 truncate">
                        {p.fullName}{" "}
                        {p.nickname && (
                          <span className="font-normal text-zinc-500 text-[11px]">
                            ({p.nickname})
                          </span>
                        )}
                      </p>
                      {p.tags.length > 0 && (
                        <p className="text-[10px] text-zinc-400 font-medium truncate mt-0.5">
                          #{p.tags.join(" #")}
                        </p>
                      )}
                    </div>
                  </div>
                  <Eye size={14} className="shrink-0 text-zinc-400" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
