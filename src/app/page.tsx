/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { PanelLeftOpen, Check, Circle, CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { EmptyFamilyState } from "@/src/components/FamilyCanvas/EmptyFamilyState";
import { FamilyTree } from "@/src/components/FamilyCanvas/FamilyTree";
import { PersonFormModal } from "@/src/components/Person/PersonFormModal";
import { RelationshipModal } from "@/src/components/Person/RelationshipModal";
import { PersonDetailPanel } from "@/src/components/UI/PersonDetailPanel";
import { AppSidebar } from "@/src/components/Layout/Sidebar/AppSidebar";
import { DeletePersonModal } from "@/src/components/Modals/DeletePersonModal";
import { IntegrityWarningModal } from "@/src/components/Modals/IntegrityWarningModal";
import {
  exportFamily,
  loadJSONFile,
  saveJSONFile,
  loadFamilyFromDirectory,
  saveFamilyToDirectory,
  type WritableFamilyFileHandle,
} from "@/src/services/fileStorage";
import { FIELD_LIMITS } from "@/src/schema/fieldLimits";
import { getFamilySnapshot, getSaveStatus, getSaveErrorMessage } from "@/src/services/saveState";
import { addImage } from "@/src/services/mediaStorage";
import { getTreeLayout } from "@/src/services/layoutEngine";
import { useFamilyStore } from "@/src/store/familyStore";
import { validateFamilyData } from "@/src/schema/family";
import type {
  Person,
  PersonInput,
  RelationshipType,
  FolderDirectoryHandle,
} from "@/src/types/family";

export default function Home() {
  const family = useFamilyStore((state) => state.family);
  const loadFamilyAction = useFamilyStore((state) => state.loadFamily);
  const addPerson = useFamilyStore((state) => state.addPerson);
  const updatePerson = useFamilyStore((state) => state.updatePerson);
  const deletePerson = useFamilyStore((state) => state.deletePerson);
  const addRelationship = useFamilyStore((state) => state.addRelationship);
  const deleteRelationship = useFamilyStore((state) => state.deleteRelationship);
  const resetFamily = useFamilyStore((state) => state.resetFamily);
  const setLayoutPositions = useFamilyStore((state) => state.setLayoutPositions);
  const setFamily = useFamilyStore((state) => state.setFamily);

  // File & Folder Handles
  const [fileName, setFileName] = useState<string>("sampleFamily.json");
  const [fileHandle, setFileHandle] = useState<WritableFamilyFileHandle | null>(null);
  const [dirHandle, setDirHandle] = useState<FolderDirectoryHandle | null>(null);
  const familySnapshot = useMemo(() => getFamilySnapshot(family), [family]);
  const [localSnapshot, setLocalSnapshot] = useState(() => getFamilySnapshot(family));
  const [savedFileSnapshot, setSavedFileSnapshot] = useState(() => getFamilySnapshot(family));
  const [isSavingFile, setIsSavingFile] = useState(false);
  const [localSaveError, setLocalSaveError] = useState(false);
  const [fileSaveError, setFileSaveError] = useState(false);
  const savingFileRef = useRef(false);
  const [hasRestored, setHasRestored] = useState(false);
  const saveStatus = getSaveStatus({ saving: isSavingFile, error: localSaveError || fileSaveError, current: familySnapshot, local: localSnapshot, external: savedFileSnapshot, hasExternalDestination: Boolean(fileHandle || dirHandle) });

  // Navigation & Layout View Mode States
  const [viewMode, setViewMode] = useState<"full" | "ancestor" | "descendant" | "branch">("full");
  const [focusPersonId, setFocusPersonId] = useState<string | null>(null);

  // Canvas Mode States
  const [layoutMode, setLayoutMode] = useState<"auto" | "manual">("auto");
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [collapsedPersonIds, setCollapsedPersonIds] = useState<Set<string>>(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Modals & Panels
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedDetailPerson, setSelectedDetailPerson] = useState<Person | null>(null);
  const [pendingDeletePersonId, setPendingDeletePersonId] = useState<string | null>(null);
  const pendingDeletePerson = family.persons.find((person) => person.id === pendingDeletePersonId) ?? null;
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [isRelModalOpen, setIsRelModalOpen] = useState(false);
  const [relModalInitialPersonId, setRelModalInitialPersonId] = useState<string | undefined>(undefined);
  const [relModalInitialSecondPersonId, setRelModalInitialSecondPersonId] = useState<string | undefined>(undefined);
  const [relModalInitialRole, setRelModalInitialRole] = useState<"parent" | "spouse" | "child" | "sibling" | undefined>(undefined);

  // Validation & Integrity Warnings
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showValidationOverlay, setShowValidationOverlay] = useState(false);

  // Feedback Toast State
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Re-run validation on family data change
  useEffect(() => {
    const errs = validateFamilyData(family);
    setValidationErrors(errs);
  }, [family]);

  // Restore the saved family before writing the initial render back to storage.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kinflow_persisted_family");
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.persons)) {
        loadFamilyAction(parsed);
        const savedName = localStorage.getItem("kinflow_persisted_filename");
        if (savedName) setFileName(savedName);
        setLocalSnapshot(getFamilySnapshot(parsed));
      }
    } catch {
      setLocalSaveError(true);
    } finally {
      setHasRestored(true);
    }
  }, [loadFamilyAction]);

  // The indicator follows successful persistence, including changes from Undo and layout edits.
  useEffect(() => {
    if (!hasRestored) return;
    try {
      localStorage.setItem("kinflow_persisted_family", JSON.stringify(family));
      setLocalSnapshot(familySnapshot);
      setLocalSaveError(false);
    } catch {
      setLocalSaveError(true);
    }
  }, [family, familySnapshot, hasRestored]);

  useEffect(() => {
    if (hasRestored && fileName) {
      try { localStorage.setItem("kinflow_persisted_filename", fileName); }
      catch { setLocalSaveError(true); }
    }
  }, [fileName, hasRestored]);

  useEffect(() => {
    if (selectedDetailPerson) {
      const current = family.persons.find((p) => p.id === selectedDetailPerson.id);
      if (current) {
        setSelectedDetailPerson(current);
      } else {
        setSelectedDetailPerson(null);
      }
    }
  }, [family.persons, selectedDetailPerson]);

  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showFeedback = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedback({ message, type });
    feedbackTimer.current = setTimeout(() => setFeedback(null), 5000);
  }, []);
  useEffect(() => () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); }, []);

  // Set initial focus person if none set and members exist
  useEffect(() => {
    if (!focusPersonId && family.persons.length > 0) {
      setFocusPersonId(family.persons[0].id);
    }
  }, [family.persons, focusPersonId]);

  // Select person handler: immediately selects AND sets as tree center/focus!
  const handleSelectPerson = (p: Person) => {
    setSelectedDetailPerson(p);
    setFocusPersonId(p.id);
  };

  // Keyboard shortcut listeners for Undo / Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.isContentEditable || target.closest("input, textarea, select, dialog")) return;
      const isZ = e.key.toLowerCase() === "z";
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd && isZ) {
        e.preventDefault();
        if (e.shiftKey) {
          useFamilyStore.getState().redo();
          showFeedback("Perubahan tata letak dikembalikan (Redo).", "info");
        } else {
          useFamilyStore.getState().undo();
          showFeedback("Perubahan tata letak dibatalkan (Undo).", "info");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showFeedback]);

  // File Handlers
  const handleLoadFile = async () => {
    try {
      const loaded = await loadJSONFile();
      loadFamilyAction(loaded.family);
      setFileName(loaded.fileName);
      setFileHandle(loaded.handle);
      setDirHandle(null);
      setSavedFileSnapshot(getFamilySnapshot(loaded.family));
      setFileSaveError(false);
      setLayoutMode("auto");
      setCollapsedPersonIds(new Set());
      if (loaded.family.persons.length > 0) {
        setFocusPersonId(loaded.family.persons[0].id);
      }
      showFeedback(`Berhasil memuat berkas "${loaded.fileName}"`);
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : "Gagal memuat berkas.", "error");
    }
  };

  const handleLoadDirectory = async () => {
    try {
      if (typeof window === "undefined" || !("showDirectoryPicker" in window)) {
        throw new Error(
          "Folder Access API tidak didukung di peramban ini. Silakan muat berkas JSON silsilah."
        );
      }
      const handle = await (window as unknown as {
        showDirectoryPicker: () => Promise<FolderDirectoryHandle>;
      }).showDirectoryPicker();
      const familyData = await loadFamilyFromDirectory(handle);
      loadFamilyAction(familyData);
      setDirHandle(handle);
      setFileHandle(null);
      setFileName(`${handle.name} (Folder)`);
      setSavedFileSnapshot(getFamilySnapshot(familyData));
      setFileSaveError(false);
      setLayoutMode("auto");
      setCollapsedPersonIds(new Set());
      if (familyData.persons.length > 0) {
        setFocusPersonId(familyData.persons[0].id);
      }
      showFeedback(`Berhasil membuka folder "${handle.name}"`);
    } catch (error) {
      showFeedback(
        error instanceof Error ? error.message : "Gagal memuat folder keluarga.",
        "error"
      );
    }
  };

  const handleSaveFile = async () => {
    if (savingFileRef.current) return;
    const familyToSave = useFamilyStore.getState().family;
    const snapshotToSave = getFamilySnapshot(familyToSave);
    const errs = validateFamilyData(familyToSave);
    if (errs.length > 0) {
      setValidationErrors(errs);
      setShowValidationOverlay(true);
      showFeedback("Periksa hubungan keluarga yang bermasalah sebelum menyimpan.", "error");
      return;
    }

    savingFileRef.current = true;
    setIsSavingFile(true);
    setFileSaveError(false);
    try {
      let downloaded = false;
      if (dirHandle) {
        await saveFamilyToDirectory(dirHandle, familyToSave);
      } else {
        const nextHandle = await saveJSONFile(familyToSave, fileHandle, fileName);
        if (nextHandle) {
          setFileHandle(nextHandle);
          setFileName(nextHandle.name);
        } else {
          downloaded = true;
        }
      }
      setSavedFileSnapshot(snapshotToSave);
      const hasNewChanges = getFamilySnapshot(useFamilyStore.getState().family) !== snapshotToSave;
      showFeedback(downloaded
        ? "Cadangan keluarga berhasil diunduh. Simpan file ini untuk membuka keluarga di perangkat lain."
        : hasNewChanges
        ? "Perubahan sebelumnya berhasil disimpan. Masih ada perubahan baru yang perlu disimpan."
        : "Semua perubahan keluarga berhasil disimpan.");
    } catch (error) {
      const message = getSaveErrorMessage(error);
      if (message) { setFileSaveError(true); showFeedback(message, "error"); }
    } finally {
      savingFileRef.current = false;
      setIsSavingFile(false);
    }
  };

  const handleNewTree = () => {
    if (
      confirm(
        "Apakah Anda yakin ingin memulai pohon keluarga baru? Perubahan yang belum disimpan akan hilang."
      )
    ) {
      resetFamily("Pohon Keluarga Baru");
      setFileName("untitled-family.json");
      setFileHandle(null);
      setDirHandle(null);
      setFocusPersonId(null);
      setSelectedDetailPerson(null);
      setLayoutMode("auto");
      setCollapsedPersonIds(new Set());
      showFeedback("Memulai silsilah keluarga baru yang bersih.", "info");
    }
  };

  const handleExportBackup = () => {
    try {
      exportFamily(family);
      showFeedback("Cadangan keluarga berhasil diunduh.");
    } catch {
      showFeedback("Gagal mengunduh cadangan.", "error");
    }
  };

  const handleSavePerson = async (input: PersonInput, id?: string, photoBlob?: Blob) => {
    try {
      let finalPhotoId = input.primaryPhotoId;
      if (photoBlob && input.primaryPhotoId) {
        finalPhotoId = await addImage(input.primaryPhotoId, photoBlob, dirHandle || undefined);
      }

      if (id) {
        updatePerson(id, { ...input, primaryPhotoId: finalPhotoId });
        showFeedback(`Perubahan data ${input.fullName} berhasil disimpan.`);
      } else {
        const newP = addPerson({ ...input, primaryPhotoId: finalPhotoId });
        if (!focusPersonId) {
          setFocusPersonId(newP.id);
        }
        showFeedback(`${newP.fullName} ditambahkan ke silsilah.`);
      }
      setIsPersonModalOpen(false);
    } catch (error) {
      showFeedback(
        `Gagal menyimpan anggota: ${error instanceof Error ? error.message : "Terjadi kesalahan"}`,
        "error"
      );
    }
  };

  const handleDeletePerson = (id: string) => {
    setPendingDeletePersonId(id);
  };

  const confirmDeletePerson = () => {
    if (!pendingDeletePerson) return;
    const { id, fullName } = pendingDeletePerson;
    deletePerson(id);
    if (focusPersonId === id) {
      setFocusPersonId(family.persons.find((person) => person.id !== id)?.id ?? null);
    }
    if (selectedDetailPerson?.id === id) setSelectedDetailPerson(null);
    if (selectedPerson?.id === id) {
      setIsPersonModalOpen(false);
      setSelectedPerson(null);
    }
    setCollapsedPersonIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setPendingDeletePersonId(null);
    showFeedback(`${fullName} dihapus dari silsilah.`, "info");
  };

  const handleAddRelationship = (rel: { type: RelationshipType; from: string; to: string }) => {
    addRelationship(rel);
    showFeedback("Hubungan keluarga berhasil dibuat.");
  };

  const handleAddRelationships = (
    rels: Array<{ type: RelationshipType; from: string; to: string }>
  ) => {
    for (const rel of rels) {
      addRelationship(rel);
    }
    showFeedback("Hubungan keluarga berhasil dibuat.");
  };

  const handleAddPersonAndRelationships = (
    personInput: PersonInput,
    rels: Array<{ type: RelationshipType; from: string; to: string }>
  ) => {
    const newPerson = addPerson(personInput);
    for (const rel of rels) {
      const fromId =
        rel.from === "__NEW_PERSON__" || rel.from === "NEW_PERSON_ID"
          ? newPerson.id
          : rel.from;
      const toId =
        rel.to === "__NEW_PERSON__" || rel.to === "NEW_PERSON_ID"
          ? newPerson.id
          : rel.to;
      addRelationship({
        type: rel.type,
        from: fromId,
        to: toId,
      });
    }
    showFeedback(`${newPerson.fullName} berhasil ditambahkan dan dihubungkan ke silsilah.`);
  };

  const handleDeleteRelationship = (id: string) => {
    deleteRelationship(id);
    showFeedback("Hubungan keluarga dilepas.", "info");
  };

  // Open Add Relative modal prefilled
  const handleOpenAddRelative = (
    person: Person,
    defaultRole: "parent" | "spouse" | "child" | "sibling" = "child"
  ) => {
    setRelModalInitialPersonId(person.id);
    setRelModalInitialSecondPersonId(undefined);
    setRelModalInitialRole(defaultRole);
    setIsRelModalOpen(true);
  };

  // Open Add Child of Couple modal prefilled with both parents
  const handleOpenAddChildOfCouple = (parent1: Person, parent2: Person) => {
    setRelModalInitialPersonId(parent1.id);
    setRelModalInitialSecondPersonId(parent2.id);
    setRelModalInitialRole("child");
    setIsRelModalOpen(true);
  };

  // Auto Arrange Layout logic
  const handleAutoArrange = () => {
    const { nodes } = getTreeLayout(
      family,
      viewMode,
      focusPersonId,
      (p) => {
        setSelectedPerson(p);
        setIsPersonModalOpen(true);
      },
      handleSelectPerson,
      (id) => setFocusPersonId(id),
      dirHandle || undefined,
      new Set(),
      undefined,
      "auto",
      handleOpenAddRelative
    );

    const positions: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n) => {
      positions[n.id] = { x: n.position.x, y: n.position.y };
    });

    setLayoutPositions(positions);
    setLayoutMode("manual");
    showFeedback("Tata letak silsilah dirapikan secara otomatis.", "info");
  };

  const handleToggleCollapse = (id: string) => {
    setCollapsedPersonIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-50 text-zinc-900 font-sans antialiased">
      {/* Refactored Sidebar Component with View Filter Tabs */}
      <AppSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        persons={family.persons}
        relationships={family.relationships}
        selectedDetailPersonId={selectedDetailPerson?.id || null}
        focusPersonId={focusPersonId}
        onSelectPerson={handleSelectPerson}
        onAddMember={() => {
          setSelectedPerson(null);
          setIsPersonModalOpen(true);
        }}
        validationErrors={validationErrors}
        onShowValidationErrors={() => setShowValidationOverlay(true)}
        fileName={fileName}
        saveStatus={saveStatus}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onFocusPersonChange={(id) => {
          setFocusPersonId(id);
          showFeedback("Fokus silsilah dialihkan.");
        }}
        onSaveFile={handleSaveFile}
        onLoadFile={handleLoadFile}
        onLoadDirectory={handleLoadDirectory}
        onNewTree={handleNewTree}
        onExportBackup={handleExportBackup}
      />

      {/* Main Content Area (Full-bleed Canvas, NO top header bar) */}
      <main className="workspace-main flex flex-1 flex-col relative w-full h-full min-w-0 overflow-hidden">
        <header className="board-header">
          <div className="flex min-w-0 items-center gap-4">
            {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} aria-label="Buka panel samping" title="Buka panel samping" className="dock-button"><PanelLeftOpen size={19} /></button>}
            <div className="min-w-0 family-title-field"><p className="board-eyebrow">Arsip keluarga <span>/</span> Silsilah</p><input maxLength={FIELD_LIMITS.familyName} title={`Maksimal ${FIELD_LIMITS.familyName} karakter`} aria-describedby="family-name-limit" aria-label="Nama pohon keluarga" value={family.name || ""} onChange={(event) => { setFamily({ ...family, name: event.target.value }); }} placeholder="Nama keluarga" className="board-title" /><span id="family-name-limit" className="family-title-limit">{(family.name || "").length} / {FIELD_LIMITS.familyName} karakter</span></div>
          </div>
          <div className="board-header-meta"><p>{family.persons.length} anggota <span>·</span> {family.relationships.length} hubungan</p><p className="board-save-state" role="status" aria-live="polite">{saveStatus === "modified" ? <><Circle size={6} className="fill-blue-500 text-blue-500" /> {fileHandle || dirHandle ? "Belum disimpan ke file" : "Menyimpan…"}</> : saveStatus === "saving" ? "Menyimpan…" : saveStatus === "error" ? "Gagal menyimpan" : <><Check size={12} /> Semua perubahan tersimpan</>}</p></div>
        </header>

        {feedback && (
          <div className="absolute top-24 right-5 z-40 w-[min(360px,calc(100%-40px))]" role={feedback.type === "error" ? "alert" : "status"} aria-live={feedback.type === "error" ? "assertive" : "polite"}>
            <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg shadow-black/5">
              <span className="mt-0.5 text-blue-600">{feedback.type === "success" ? <CheckCircle2 size={19} /> : feedback.type === "error" ? <CircleAlert size={19} /> : <Info size={19} />}</span>
              <p className="min-w-0 flex-1 text-[13px] leading-6 text-zinc-700">{feedback.message}</p>
              <button type="button" aria-label="Tutup notifikasi" className="mt-0.5 shrink-0 text-zinc-400 hover:text-zinc-900" onClick={() => setFeedback(null)}><X size={15} /></button>
            </div>
          </div>
        )}

        {/* Canvas Display */}
        <div className="board-surface flex-1 min-h-0 relative w-full">
          {family.persons.length === 0 ? (
            <EmptyFamilyState
              onAddPerson={() => { setSelectedPerson(null); setIsPersonModalOpen(true); }}
              onOpenFile={handleLoadFile}
              onOpenFolder={handleLoadDirectory}
            />
          ) : (
            <FamilyTree
              showSearch={!isSidebarOpen}
              family={family}
              viewMode={viewMode}
              focusPersonId={focusPersonId}
              dirHandle={dirHandle || undefined}
              layoutMode={layoutMode}
              onLayoutModeChange={setLayoutMode}
              snapToGrid={snapToGrid}
              onSnapToGridChange={setSnapToGrid}
              collapsedPersonIds={collapsedPersonIds}
              onToggleCollapse={handleToggleCollapse}
              onAutoArrange={handleAutoArrange}
              onAddPerson={() => {
                setSelectedPerson(null);
                setIsPersonModalOpen(true);
              }}
              onAddRelationship={() => {
                setRelModalInitialPersonId(focusPersonId || undefined);
                setRelModalInitialSecondPersonId(undefined);
                setRelModalInitialRole(undefined);
                setIsRelModalOpen(true);
              }}
              onDeletePerson={handleDeletePerson}
              onAddRelative={handleOpenAddRelative}
              onEditPerson={(p) => {
                setSelectedPerson(p);
                setIsPersonModalOpen(true);
              }}
              onSelectPerson={handleSelectPerson}
              onFocusPerson={(id) => {
                setFocusPersonId(id);
                showFeedback("Fokus silsilah dialihkan.");
              }}
            />
          )}
        </div>

        {/* Right Detail Panel Drawer */}
        <PersonDetailPanel
          person={selectedDetailPerson}
          family={family}
          dirHandle={dirHandle || undefined}
          onClose={() => setSelectedDetailPerson(null)}
          onEdit={(p) => {
            setSelectedPerson(p);
            setIsPersonModalOpen(true);
          }}
          onDelete={handleDeletePerson}
          onSelectPerson={handleSelectPerson}
          onAddRelative={handleOpenAddRelative}
          onAddChildOfCouple={handleOpenAddChildOfCouple}
          focusPersonId={focusPersonId}
        />
      </main>

      {/* Refactored Validation Integrity Warning Modal */}
      <IntegrityWarningModal
        isOpen={showValidationOverlay}
        onClose={() => setShowValidationOverlay(false)}
        errors={validationErrors}
      />

      {/* Person Form Modal */}
      <PersonFormModal
        isOpen={isPersonModalOpen}
        person={selectedPerson}
        onClose={() => {
          setIsPersonModalOpen(false);
          setSelectedPerson(null);
        }}
        onSave={handleSavePerson}
        onDelete={handleDeletePerson}
        relationships={family.relationships}
        persons={family.persons}
        onAddRelationship={handleAddRelationship}
        onDeleteRelationship={handleDeleteRelationship}
        dirHandle={dirHandle || undefined}
      />

      {/* Relationship & Relative Creation Modal */}
      <RelationshipModal
        isOpen={isRelModalOpen}
        onClose={() => setIsRelModalOpen(false)}
        persons={family.persons}
        relationships={family.relationships}
        onAddRelationship={handleAddRelationship}
        onAddRelationships={handleAddRelationships}
        onAddPersonAndRelationships={handleAddPersonAndRelationships}
        initialPersonId={relModalInitialPersonId}
        initialSecondPersonId={relModalInitialSecondPersonId}
        initialRole={relModalInitialRole}
      />
      <DeletePersonModal
        person={pendingDeletePerson}
        relationshipCount={family.relationships.filter((relationship) => relationship.from === pendingDeletePersonId || relationship.to === pendingDeletePersonId).length}
        onCancel={() => setPendingDeletePersonId(null)}
        onConfirm={confirmDeletePerson}
      />
    </div>
  );
}
