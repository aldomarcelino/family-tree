"use client";

import { FIELD_LIMITS } from "@/src/schema/fieldLimits";
import { useState } from "react";
import { GitBranch, PanelLeftClose, Search, Plus, Save, FolderOpen, FilePlus, Download, FileJson, ChevronRight, Check, Circle, ChartNoAxesColumn } from "lucide-react";
import { Select } from "@/src/components/UI/Select";
import { Button } from "@/src/components/UI/Button";
import type { Person, Relationship } from "@/src/types/family";

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  persons: Person[];
  relationships: Relationship[];
  selectedDetailPersonId: string | null;
  focusPersonId: string | null;
  onSelectPerson: (person: Person) => void;
  onAddMember: () => void;
  validationErrors: string[];
  onShowValidationErrors: () => void;
  fileName: string;
  saveStatus: "synced" | "modified" | "saving" | "error";
  viewMode: "full" | "ancestor" | "descendant" | "branch";
  onViewModeChange: (mode: "full" | "ancestor" | "descendant" | "branch") => void;
  onFocusPersonChange?: (id: string) => void;
  onSaveFile: () => void;
  onLoadFile: () => void;
  onLoadDirectory: () => void;
  onNewTree: () => void;
  onExportBackup: () => void;
}

export function AppSidebar({ isOpen, onClose, persons, relationships, selectedDetailPersonId, focusPersonId, onSelectPerson, onAddMember, validationErrors, onShowValidationErrors, fileName, saveStatus, viewMode, onViewModeChange, onFocusPersonChange, onSaveFile, onLoadFile, onLoadDirectory, onNewTree, onExportBackup }: AppSidebarProps) {
  const [tab, setTab] = useState("members");
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("all");
  const filtered = persons.filter((person) => (gender === "all" || person.gender === gender) && `${person.fullName} ${person.nickname ?? ""} ${person.tags.join(" ")}`.toLowerCase().includes(search.toLowerCase()));
  const status = { synced: "Semua perubahan tersimpan", modified: "Perubahan belum disimpan", saving: "Menyimpan…", error: "Gagal menyimpan" }[saveStatus];

  return (
    <aside aria-label="Panel keluarga" inert={!isOpen} className={`family-sidebar ${isOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <div className="flex h-full w-72 flex-col">
        <header className="flex items-center justify-between px-5 py-6">
          <div className="flex items-center gap-2.5"><GitBranch size={23} strokeWidth={1.6} className="text-zinc-800" /><span className="text-lg font-semibold tracking-tight">kinflow<span className="text-blue-600">.</span></span></div>
          <button type="button" onClick={onClose} className="dock-button" aria-label="Tutup panel samping" title="Tutup panel samping"><PanelLeftClose size={17} /></button>
        </header>
        <nav aria-label="Navigasi panel" className="mx-5 flex gap-5 border-b border-zinc-200">
          {[{ id: "members", label: "Anggota" }, { id: "storage", label: "Berkas" }].map((item) => <button type="button" key={item.id} aria-current={tab === item.id ? "page" : undefined} onClick={() => setTab(item.id)} className={`pb-3 text-[13px] border-b-2 transition-colors ${tab === item.id ? "border-zinc-800 font-semibold text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900"}`}>{item.label}{item.id === "members" && <span className="ml-2 text-xs font-normal text-zinc-400">{persons.length}</span>}</button>)}
        </nav>
        {tab === "members" ? <>
          <div className="space-y-3 px-5 pt-5 pb-3">
            <div className="flex items-center justify-between"><h2 className="text-[13px] font-medium">Keluarga Anda</h2><button type="button" onClick={onAddMember} className="flex items-center gap-1 text-xs font-medium text-[#2563eb] hover:text-[#18181b]"><Plus size={14} /> Tambah</button></div>
            <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5"><Search size={15} className="shrink-0 text-zinc-400" /><input maxLength={FIELD_LIMITS.search} aria-label="Cari anggota" placeholder="Cari nama atau tag…" value={search} onChange={(event) => setSearch(event.target.value)} className="w-full min-w-0 bg-transparent text-[13px] outline-none placeholder:text-zinc-400" />{search && <button type="button" aria-label="Bersihkan pencarian" onClick={() => setSearch("")} className="text-xs text-zinc-400">×</button>}</label>
            <div className="flex gap-3">{[{ id: "all", label: "Semua" }, { id: "male", label: "Laki-laki" }, { id: "female", label: "Perempuan" }].map((item) => <button key={item.id} type="button" aria-pressed={gender === item.id} onClick={() => setGender(item.id)} className={`text-[11px] ${gender === item.id ? "font-medium text-zinc-900" : "text-zinc-400 hover:text-zinc-700"}`}>{item.label}</button>)}</div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            {filtered.length ? filtered.map((person) => <button key={person.id} type="button" onClick={() => onSelectPerson(person)} aria-pressed={selectedDetailPersonId === person.id} className={`group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors ${selectedDetailPersonId === person.id ? "bg-[#eff6ff] text-[#18181b]" : "hover:bg-zinc-100/80"}`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f4f4f5] text-xs font-medium text-zinc-600">{person.fullName.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("")}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{person.fullName}</span><span className="mt-0.5 block truncate text-[11px] text-zinc-400">{person.nickname || (person.birthDate ? `Lahir ${person.birthDate.slice(0, 4)}` : "Tanggal lahir belum diisi")}</span></span>
              <ChevronRight size={14} className="shrink-0 text-zinc-300 opacity-0 group-hover:opacity-100" />
            </button>) : <p className="px-3 py-10 text-center text-xs leading-5 text-zinc-500">{persons.length ? "Tidak ada anggota yang cocok." : "Belum ada anggota."}</p>}
          </div>
          <section className="space-y-3 border-t border-zinc-200 px-5 py-4">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-600"><GitBranch size={14} /> Tampilan pohon</div>
            <Select aria-label="Tampilan pohon" value={viewMode} onChange={(e) => onViewModeChange(e.target.value as AppSidebarProps["viewMode"])} options={[{ value: "full", label: "Seluruh keluarga" }, { value: "ancestor", label: "Leluhur" }, { value: "descendant", label: "Keturunan" }, { value: "branch", label: "Cabang keluarga" }]} />
            {viewMode !== "full" && onFocusPersonChange && <Select label="Berpusat pada" value={focusPersonId || ""} onChange={(e) => onFocusPersonChange(e.target.value)} options={persons.map((p) => ({ value: p.id, label: p.fullName }))} />}
          </section>
        </> : <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <section><p className="mb-2 text-xs text-zinc-500">Berkas aktif</p><p className="truncate text-[13px] font-medium" title={fileName}>{fileName}</p><p className="mt-2 text-xs text-zinc-400">{persons.length} anggota · {relationships.length} hubungan</p></section>
          <div className="space-y-1">{[{ icon: FileJson, label: "Buka berkas JSON", action: onLoadFile }, { icon: FolderOpen, label: "Buka folder keluarga", action: onLoadDirectory }, { icon: Download, label: "Unduh cadangan", action: onExportBackup }, { icon: FilePlus, label: "Buat pohon baru", action: onNewTree }].map(({ icon: Icon, label, action }) => <button key={label} type="button" onClick={action} className="flex w-full items-center gap-3 rounded-lg py-3 text-left text-[13px] text-zinc-600 hover:bg-zinc-100"><Icon size={16} />{label}</button>)}</div>
          <section className="border-t border-zinc-200 pt-5"><h2 className="mb-4 flex items-center gap-2 text-xs font-medium"><ChartNoAxesColumn size={15} /> Ringkasan keluarga</h2><dl className="space-y-3 text-xs text-zinc-500">{[["Anggota", persons.length], ["Pasangan", relationships.filter((r) => r.type === "marriage").length], ["Orang tua & anak", relationships.filter((r) => r.type === "parent" || r.type === "adoption").length]].map(([label, count]) => <div key={label} className="flex justify-between"><dt>{label}</dt><dd className="text-zinc-900 tabular-nums">{count}</dd></div>)}</dl></section>
        </div>}
        <footer className="space-y-3 border-t border-zinc-200 px-5 py-4">
          {validationErrors.length > 0 && <button type="button" onClick={onShowValidationErrors} className="text-xs text-blue-700">Tinjau {validationErrors.length} peringatan data</button>}
          <Button onClick={onSaveFile} disabled={saveStatus === "saving" || saveStatus === "synced"} className="w-full" variant="primary">{saveStatus === "synced" ? <Check size={14} /> : <Save size={14} />} {saveStatus === "synced" ? "Tersimpan" : saveStatus === "saving" ? "Menyimpan…" : "Simpan perubahan"}</Button>
          <p role="status" className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-400">{saveStatus === "synced" ? <Check size={11} /> : <Circle size={8} />} {status}</p>
        </footer>
      </div>
    </aside>
  );
}
