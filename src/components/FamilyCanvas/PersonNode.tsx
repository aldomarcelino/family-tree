/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-img-element */
"use client";

import { getPersonInitials } from "@/src/services/personInitials";
import { ChevronDown, MoreHorizontal, Pencil, Plus, Eye, Crosshair, X, Users, Heart, Baby, Trash2 } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { getPersonAgeLabel } from "@/src/services/personAge";
import { getImageURL } from "@/src/services/mediaStorage";
import type { Person, FolderDirectoryHandle } from "@/src/types/family";

export interface PersonNodeData extends Record<string, unknown> {
  person: Person;
  onEdit: (person: Person) => void;
  onSelect?: (person: Person) => void;
  onDelete?: (id: string) => void;
  onFocus?: (id: string) => void;
  onAddRelative?: (person: Person, role?: "parent" | "spouse" | "child" | "sibling") => void;
  dirHandle?: FolderDirectoryHandle;
  relationLabel?: string;
  isFocus?: boolean;
  isDetailOpen?: boolean;
  waveKey?: string;
  waveArrival?: number;
  waveIsOrigin?: boolean;
  isCollapsed?: boolean;
  childrenCount?: number;
  onToggleCollapse?: (id: string) => void;
}

function PersonNodeComponent({ data }: NodeProps<PersonNodeData>) {
  const { person, onEdit, onSelect, onDelete, onFocus, onAddRelative, dirHandle, relationLabel, isFocus, isDetailOpen, isCollapsed, childrenCount, onToggleCollapse, waveKey, waveArrival, waveIsOrigin } = data;
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAbove, setMenuAbove] = useState(false);
  const card = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!waveKey || waveArrival === undefined || !card.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = card.current.animate(waveIsOrigin ? [
      { borderColor: "#eed2d5", boxShadow: "0 0 0 0 #862d3322" },
      { borderColor: "#862d33", boxShadow: "0 0 0 5px #862d3322", offset: .25 },
      { borderColor: "#862d33", boxShadow: "0 0 0 10px #862d3300" },
    ] : [
      { borderColor: isFocus ? "#862d33" : "#e4e4e7" },
      { borderColor: "#862d33", offset: .3 },
      { borderColor: isFocus ? "#862d33" : "#e4e4e7" },
    ], { duration: waveIsOrigin ? 650 : 500, delay: waveArrival, easing: "ease-out" });
    return () => animation.cancel();
  }, [waveKey, waveArrival, waveIsOrigin, isFocus]);

  const menu = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    setPhotoUrl(null);
    if (person.primaryPhotoId) getImageURL(person.primaryPhotoId, dirHandle).then((url) => { if (active) setPhotoUrl(url); });
    return () => { active = false; };
  }, [person.primaryPhotoId, dirHandle]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: PointerEvent) => { if (!menu.current?.contains(event.target as Node)) setMenuOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenuOpen(false); menuButton.current?.focus(); } };
    document.addEventListener("pointerdown", close, true);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close, true); document.removeEventListener("keydown", escape); };
  }, [menuOpen]);

  const lifeYears = person.birthDate ? `${person.birthDate.slice(0, 4)}${person.deathDate ? ` — ${person.deathDate.slice(0, 4)}` : ""}` : person.deathDate ? `Wafat ${person.deathDate.slice(0, 4)}` : "Tahun belum dicatat";
  const ageLabel = getPersonAgeLabel(person);
  const lifeSummary = `${lifeYears}${ageLabel ? ` · ${ageLabel}` : ""}`;
  const openDetails = () => onSelect?.(person);
  const relative = (role: "parent" | "spouse" | "child" | "sibling") => { setMenuOpen(false); onAddRelative?.(person, role); };
  const label = relationLabel?.replace(/ \([LP]\)/g, "");

  return (
    <article ref={card} className={`person-card ${isFocus ? "person-card-active" : ""} ${isDetailOpen ? "person-card-detail" : ""} ${menuOpen ? "person-card-menu-open" : ""}`}>
      <Handle id="parent-target" position={Position.Top} type="target" isConnectable={false} />
      <Handle id="sibling-source" position={Position.Top} type="source" isConnectable={false} />
      <Handle id="sibling-target" position={Position.Top} type="target" isConnectable={false} />
      <Handle id="child-source" position={Position.Bottom} type="source" isConnectable={false} />
      <Handle id="spouse-left" position={Position.Left} type="target" isConnectable={false} />
      <Handle id="spouse-right" position={Position.Right} type="source" isConnectable={false} />
      <Handle id="spouse-left-source" position={Position.Left} type="source" isConnectable={false} />
      <Handle id="spouse-right-target" position={Position.Right} type="target" isConnectable={false} />
      <button type="button" className="person-identity" onClick={openDetails} aria-label={`Lihat detail ${person.fullName}`} title="Lihat detail anggota">
        <span className="person-portrait">
          {photoUrl ? <img src={photoUrl} alt="" /> : <span>{getPersonInitials(person.fullName)}</span>}
        </span>
        <span className="min-w-0 flex-1"><span className="person-name" title={person.fullName}>{person.fullName}</span><span className="person-years" title={ageLabel ? `${lifeYears} · ${person.deathDate ? "Usia saat wafat" : "Usia"}: ${ageLabel.replace(" th", " tahun").replace(" bln", " bulan")}` : lifeYears}>{lifeSummary}</span></span>
      </button>
      <footer className="person-card-footer">
        <span className={`person-relation ${label || isFocus ? "person-relation-known" : ""}`} title={isFocus ? "Pusat pohon" : label}>{isFocus ? <><span className="focus-dot" /> Pusat pohon</> : label || person.nickname || (person.gender === "female" ? "Perempuan" : "Laki-laki")}</span>
        <div className="person-card-actions nodrag nopan">
          {onFocus && (
            <button
              type="button"
              className="person-focus-trigger"
              aria-label={isFocus ? `Batalkan pusatkan ${person.fullName}` : `Pusatkan ${person.fullName}`}
              aria-pressed={Boolean(isFocus)}
              title={isFocus ? "Batalkan pusatkan pohon" : "Pusatkan di pohon"}
              onClick={() => onFocus(person.id)}
            >
              <span className="relative flex h-full w-full items-center justify-center">
                <Crosshair
                  size={15}
                  className={`transition-all duration-200 ease-out ${
                    isFocus
                      ? "absolute scale-50 rotate-90 opacity-0 pointer-events-none"
                      : "scale-100 rotate-0 opacity-100"
                  }`}
                />
                <X
                  size={15}
                  strokeWidth={2}
                  className={`transition-all duration-200 ease-out ${
                    isFocus
                      ? "scale-100 rotate-0 opacity-100"
                      : "absolute scale-50 -rotate-90 opacity-0 pointer-events-none"
                  }`}
                />
              </span>
            </button>
          )}
          <div className="relative" ref={menu}>
          <button ref={menuButton} type="button" className="person-menu-trigger" aria-label={`Opsi ${person.fullName}`} title="Opsi anggota" aria-expanded={menuOpen} onClick={() => { setMenuAbove((menuButton.current?.getBoundingClientRect().bottom ?? 0) > window.innerHeight - 310); setMenuOpen(!menuOpen); }}><MoreHorizontal size={17} /></button>
          {menuOpen && <div className="person-menu nowheel" style={menuAbove ? { top: "auto", bottom: 32 } : undefined}>
            <p>{person.fullName}</p>
            <button onClick={() => { setMenuOpen(false); openDetails(); }}><Eye size={14} /> Lihat detail</button>
            <button onClick={() => { setMenuOpen(false); onEdit(person); }}><Pencil size={14} /> Edit anggota</button>
            <hr />
            {onAddRelative && <><button onClick={() => relative("parent")}><Users size={14} /> Tambah orang tua</button><button onClick={() => relative("spouse")}><Heart size={14} /> Tambah {person.gender === "female" ? "suami" : "istri"}</button><button onClick={() => relative("child")}><Baby size={14} /> Tambah anak</button><button onClick={() => relative("sibling")}><Plus size={14} /> Tambah saudara</button></>}
            {onDelete && <><hr /><button type="button" onClick={() => { setMenuOpen(false); onDelete(person.id); }}><Trash2 size={14} /> Hapus anggota</button></>}
          </div>}
          </div>
        </div>
      </footer>
      {!!childrenCount && onToggleCollapse && <button type="button" className="branch-toggle nodrag nopan" aria-label={`${isCollapsed ? "Buka" : "Lipat"} cabang ${person.fullName}`} aria-expanded={!isCollapsed} onClick={() => onToggleCollapse(person.id)} title={`${childrenCount} anak · ${isCollapsed ? "Buka" : "Lipat"} cabang`}><ChevronDown size={12} className={isCollapsed ? "-rotate-90" : ""} />{isCollapsed ? childrenCount : null}</button>}
    </article>
  );
}

export const PersonNode = memo(PersonNodeComponent);
