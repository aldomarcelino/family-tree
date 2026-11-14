/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import {
  Pencil,
  Trash2,
  X,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { getImageURL } from "@/src/services/mediaStorage";
import {
  getChildren,
  getParents,
  getPartners,
  getSiblings,
} from "@/src/services/familyGraph";
import type { FamilyData, Person, FolderDirectoryHandle } from "@/src/types/family";

interface PersonDetailPanelProps {
  person: Person | null;
  family: FamilyData;
  dirHandle?: FolderDirectoryHandle;
  onClose: () => void;
  onEdit: (person: Person) => void;
  onDelete: (id: string) => void;
  onSelectPerson?: (person: Person) => void;
  onAddRelative?: (
    person: Person,
    defaultRole?: "parent" | "spouse" | "child" | "sibling",
  ) => void;
  onAddChildOfCouple?: (parent1: Person, parent2: Person) => void;
  focusPersonId?: string | null;
}

export function PersonDetailPanel({
  person,
  family,
  dirHandle,
  onClose,
  onEdit,
  onDelete,
  onSelectPerson,
  onAddRelative,
  onAddChildOfCouple,
}: PersonDetailPanelProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (person?.primaryPhotoId) {
      getImageURL(person.primaryPhotoId, dirHandle).then((url) => {
        if (active) setPhotoUrl(url);
      });
    } else {
      setPhotoUrl(null);
    }
    return () => {
      active = false;
    };
  }, [person, dirHandle]);

  if (!person) return null;

  const parents = getParents(person.id, family);
  const partners = getPartners(person.id, family);
  const children = getChildren(person.id, family);
  const siblings = getSiblings(person.id, family);

  const lifeYears = [person.birthDate?.slice(0, 4), person.deathDate?.slice(0, 4)].filter(Boolean).join(" — ");
  const groups = [{ title: "Orang tua", people: parents, role: "parent" as const }, { title: "Pasangan", people: partners, role: "spouse" as const }, { title: "Anak", people: children, role: "child" as const }, { title: "Saudara", people: siblings, role: "sibling" as const }];

  return (
    <aside className="person-detail-drawer" aria-label={`Profil ${person.fullName}`}>
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-5"><span className="modal-eyebrow !mb-0">Catatan anggota</span><button type="button" className="dock-button" aria-label="Tutup profil" onClick={onClose}><X size={17} /></button></header>
      <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-6 py-7">
        <section><div className="detail-portrait">{photoUrl ? <img src={photoUrl} alt="" /> : person.fullName.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("")}</div><h2 className="mt-5 font-serif text-2xl leading-tight text-[#27272a]">{person.fullName}</h2><p className="mt-2 text-xs text-zinc-400">{person.nickname ? `${person.nickname} · ` : ""}{lifeYears || "Tanggal belum dicatat"}</p></section>
        {(person.birthDate || person.birthPlace || person.deathDate || person.deathPlace) && <section className="detail-timeline">{[{ label: "Lahir", date: person.birthDate, place: person.birthPlace }, { label: "Wafat", date: person.deathDate, place: person.deathPlace }].filter((event) => event.date || event.place).map((event) => <div key={event.label}><span>{event.label}</span><p>{event.date || "Tanggal belum dicatat"}{event.place && <small>{event.place}</small>}</p></div>)}</section>}
        {groups.map(({ title, people, role }) => <section key={role}><div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-medium text-[#52525b]">{title} <span className="ml-1 font-normal text-zinc-400">{people.length}</span></h3>{onAddRelative && <button type="button" className="dock-button" aria-label={`Tambah ${title.toLowerCase()} untuk ${person.fullName}`} onClick={() => onAddRelative(person, role)}><Plus size={14} /></button>}</div>{people.length ? people.map((relative) => <div key={relative.id} className="detail-relative"><button type="button" onClick={() => onSelectPerson?.(relative)}><span>{relative.fullName}</span><ArrowUpRight size={12} /></button>{role === "spouse" && onAddChildOfCouple && <button type="button" className="detail-couple-child" onClick={() => onAddChildOfCouple(person, relative)}>Tambah anak bersama</button>}</div>) : <p className="text-[11px] text-zinc-400">Belum dicatat</p>}</section>)}
        {person.notes && <section><h3 className="mb-3 text-xs font-medium text-[#52525b]">Catatan & cerita</h3><p className="whitespace-pre-line text-xs leading-6 text-zinc-500">{person.notes}</p></section>}
        {person.tags.length > 0 && <div className="flex flex-wrap gap-2">{person.tags.map((tag) => <span key={tag} className="rounded border border-zinc-200 px-2 py-1 text-[10px] text-zinc-400">{tag}</span>)}</div>}
      </div>
      <footer className="flex items-center justify-between border-t border-zinc-200 px-6 py-4"><button type="button" className="modal-delete" aria-label="Hapus anggota" onClick={() => onDelete(person.id)}><Trash2 size={15} /></button><button type="button" className="detail-edit" onClick={() => onEdit(person)}><Pencil size={13} /> Edit anggota</button></footer>
    </aside>
  );
}
