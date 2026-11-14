"use client";

import { getPersonInitials } from "@/src/services/personInitials";
import { FIELD_LIMITS } from "@/src/schema/fieldLimits";
import { useState } from "react";
import Image from "next/image";
import markoumLogo from "@/public/assets/logos/logo.webp";
import {
  GitBranch,
  PanelLeftClose,
  Search,
  Plus,
  ChevronRight,
} from "lucide-react";
import { StoragePanel } from "@/src/components/Layout/Sidebar/StoragePanel";
import { Select } from "@/src/components/UI/Select";
import type {
  Person,
  Relationship,
  FolderDirectoryHandle,
} from "@/src/types/family";
import type { WritableFamilyFileHandle } from "@/src/services/fileStorage";

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
  familyName: string;
  fileName: string;
  canOpenDirectory: boolean;
  dirHandle?: FolderDirectoryHandle | null;
  fileHandle?: WritableFamilyFileHandle | null;
  viewMode: "full" | "ancestor" | "descendant" | "branch";
  onViewModeChange: (
    mode: "full" | "ancestor" | "descendant" | "branch",
  ) => void;
  onFocusPersonChange?: (id: string) => void;
  onLoadFile: () => void;
  onPasteJSON: () => void;
  onSaveFile: () => void;
  onLoadDirectory: () => void;
  onNewTree: () => void;
  onExportBackup: () => void;
}

export function AppSidebar({
  isOpen,
  onClose,
  persons,
  relationships,
  selectedDetailPersonId,
  focusPersonId,
  onSelectPerson,
  onAddMember,
  validationErrors,
  onShowValidationErrors,
  familyName,
  fileName,
  canOpenDirectory,
  dirHandle,
  fileHandle,
  viewMode,
  onViewModeChange,
  onFocusPersonChange,
  onLoadFile,
  onPasteJSON,
  onSaveFile,
  onLoadDirectory,
  onNewTree,
  onExportBackup,
}: AppSidebarProps) {
  const [tab, setTab] = useState("members");
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("all");
  const filtered = persons.filter(
    (person) =>
      (gender === "all" || person.gender === gender) &&
      `${person.fullName} ${person.nickname ?? ""} ${person.tags.join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  return (
    <aside
      aria-label="Panel keluarga"
      inert={!isOpen}
      className={`family-sidebar ${isOpen ? "sidebar-open" : "sidebar-closed"}`}
    >
      <div className="flex h-full w-full min-w-0 flex-col">
        <header className="flex items-center justify-between px-5 py-6 bg-transparent">
          <div className="flex items-center gap-1">
            <Image
              src={markoumLogo}
              alt="Logo Markoum"
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-full object-contain"
              priority
            />
            <span className="text-lg font-semibold tracking-tight">
              markoum<span className="text-[#862d33]">.</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="dock-button"
            aria-label="Tutup panel samping"
            title="Tutup panel samping"
          >
            <PanelLeftClose size={17} />
          </button>
        </header>
        <nav
          aria-label="Navigasi panel"
          className="mx-5 flex gap-5 border-b border-zinc-200"
        >
          {[
            { id: "members", label: "Anggota" },
            { id: "storage", label: "Berkas" },
          ].map((item) => (
            <button
              type="button"
              key={item.id}
              aria-current={tab === item.id ? "page" : undefined}
              onClick={() => setTab(item.id)}
              className={`pb-3 text-[13px] border-b-2 transition-colors ${tab === item.id ? "border-zinc-800 font-semibold text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900"}`}
            >
              {item.label}
              {item.id === "members" && (
                <span className="ml-2 text-xs font-normal text-zinc-400">
                  {persons.length}
                </span>
              )}
            </button>
          ))}
        </nav>
        {tab === "members" ? (
          <>
            <div className="space-y-3 px-5 pt-5 pb-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[13px] font-medium">Keluarga Anda</h2>
                <button
                  type="button"
                  onClick={onAddMember}
                  className="flex items-center gap-1 text-xs font-medium text-[#862d33] hover:text-[#18181b]"
                >
                  <Plus size={14} /> Tambah
                </button>
              </div>
              <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5">
                <Search size={15} className="shrink-0 text-zinc-400" />
                <input
                  maxLength={FIELD_LIMITS.search}
                  aria-label="Cari anggota"
                  placeholder="Cari nama atau tag…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full min-w-0 bg-transparent text-[13px] outline-none placeholder:text-zinc-400"
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Bersihkan pencarian"
                    onClick={() => setSearch("")}
                    className="text-xs text-zinc-400"
                  >
                    ×
                  </button>
                )}
              </label>
              <div className="flex gap-3">
                {[
                  { id: "all", label: "Semua" },
                  { id: "male", label: "Laki-laki" },
                  { id: "female", label: "Perempuan" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={gender === item.id}
                    onClick={() => setGender(item.id)}
                    className={`text-[11px] ${gender === item.id ? "font-medium text-zinc-900" : "text-zinc-400 hover:text-zinc-700"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
              {filtered.length ? (
                filtered.map((person) => (
                  <div
                    key={person.id}
                    className={`group flex w-full items-center gap-1 rounded-lg transition-colors ${selectedDetailPersonId === person.id ? "bg-[#fbf4f5] text-[#18181b]" : "hover:bg-zinc-100/80"}`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectPerson(person)}
                      aria-label={`Lihat detail ${person.fullName}`}
                      aria-pressed={selectedDetailPersonId === person.id}
                      title="Lihat detail anggota"
                      className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f4f4f5] text-xs font-medium text-zinc-600">
                        {getPersonInitials(person.fullName)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">
                          {person.fullName}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-zinc-400">
                          {person.nickname ||
                            (person.birthDate
                              ? `Lahir ${person.birthDate.slice(0, 4)}`
                              : "Tanggal lahir belum diisi")}
                        </span>
                      </span>
                      <ChevronRight
                        size={13}
                        className="shrink-0 text-zinc-300 opacity-0 group-hover:opacity-100"
                      />
                    </button>
                  </div>
                ))
              ) : (
                <p className="px-3 py-10 text-center text-xs leading-5 text-zinc-500">
                  {persons.length
                    ? "Tidak ada anggota yang cocok."
                    : "Belum ada anggota."}
                </p>
              )}
            </div>
            <section className="space-y-3 border-t border-zinc-200 px-5 py-4">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-600">
                <GitBranch size={14} /> Tampilan pohon
              </div>
              <Select
                aria-label="Tampilan pohon"
                value={viewMode}
                onValueChange={(value) =>
                  onViewModeChange(value as AppSidebarProps["viewMode"])
                }
                options={[
                  { value: "full", label: "Seluruh keluarga" },
                  { value: "ancestor", label: "Leluhur" },
                  { value: "descendant", label: "Keturunan" },
                  { value: "branch", label: "Cabang keluarga" },
                ]}
              />
              {viewMode !== "full" && onFocusPersonChange && (
                <Select
                  label="Berpusat pada"
                  value={focusPersonId || ""}
                  onValueChange={(value) => onFocusPersonChange(value)}
                  options={persons.map((p) => ({
                    value: p.id,
                    label: p.fullName,
                  }))}
                />
              )}
            </section>
          </>
        ) : (
          <StoragePanel
            familyName={familyName}
            fileName={fileName}
            personCount={persons.length}
            relationshipCount={relationships.length}
            directoryName={dirHandle?.name}
            hasFileHandle={Boolean(fileHandle)}
            canOpenDirectory={canOpenDirectory}
            onLoadFile={onLoadFile}
            onPasteJSON={onPasteJSON}
            onLoadDirectory={onLoadDirectory}
            onSaveFile={onSaveFile}
            onExportBackup={onExportBackup}
            onNewTree={onNewTree}
          />
        )}
        {validationErrors.length > 0 && (
          <footer className="border-t border-zinc-200 px-5 py-3">
            <button
              type="button"
              onClick={onShowValidationErrors}
              className="block w-full text-center text-xs text-[#862d33] hover:underline"
            >
              Tinjau {validationErrors.length} peringatan data
            </button>
          </footer>
        )}
      </div>
    </aside>
  );
}
