/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-img-element */
"use client";

import { getRelationshipError, type RelativeRole } from "@/src/services/relationshipEligibility";
import { getPersonInitials } from "@/src/services/personInitials";
import { comparePersonAges, siblingLabel } from "@/src/services/kinship";
import { FIELD_LIMITS } from "@/src/schema/fieldLimits";
import { personInputSchema } from "@/src/schema/family";
import { nanoid } from "nanoid";
import { Trash2, Upload, Plus, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/src/components/UI/Button";
import { Modal } from "@/src/components/UI/Modal";
import { Input } from "@/src/components/UI/Input";
import { Select } from "@/src/components/UI/Select";
import { Textarea } from "@/src/components/UI/Textarea";
import { DatePicker } from "@/src/components/UI/DatePicker";
import { getImageURL } from "@/src/services/mediaStorage";
import type {
  Person,
  PersonGender,
  PersonInput,
  Relationship,
  RelationshipType,
  FolderDirectoryHandle,
} from "@/src/types/family";

const genderOptions: Array<{ value: PersonGender; label: string }> = [
  { value: "male", label: "Laki-laki" },
  { value: "female", label: "Perempuan" },
];

const emptyForm: PersonInput = {
  fullName: "",
  nickname: "",
  gender: "male",
  birthDate: "",
  birthPlace: "",
  deathDate: "",
  deathPlace: "",
  primaryPhotoId: "",
  notes: "",
  tags: [],
};

interface PersonFormModalProps {
  isOpen: boolean;
  person: Person | null;
  onClose: () => void;
  onSave: (person: PersonInput, personId?: string, photoBlob?: Blob) => void;
  onDelete: (personId: string) => void;
  relationships?: Relationship[];
  persons?: Person[];
  onAddRelationship?: (relationship: {
    type: RelationshipType;
    from: string;
    to: string;
  }) => void;
  onDeleteRelationship?: (relationshipId: string) => void;
  dirHandle?: FolderDirectoryHandle;
}

const toFormState = (person: Person | null): PersonInput =>
  person
    ? {
        fullName: person.fullName,
        nickname: person.nickname ?? "",
        gender: person.gender,
        birthDate: person.birthDate ?? "",
        birthPlace: person.birthPlace ?? "",
        deathDate: person.deathDate ?? "",
        deathPlace: person.deathPlace ?? "",
        primaryPhotoId: person.primaryPhotoId ?? "",
        notes: person.notes ?? "",
        tags: person.tags,
      }
    : emptyForm;

const normalizeOptional = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parseTags = (tags: string[]) =>
  tags
    .join(",")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

export function PersonFormModal({
  isOpen,
  person,
  onClose,
  onSave,
  onDelete,
  relationships = [],
  persons = [],
  onAddRelationship,
  onDeleteRelationship,
  dirHandle,
}: PersonFormModalProps) {
  const [form, setForm] = useState<PersonInput>(toFormState(person));
  const [tagText, setTagText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDeceased, setIsDeceased] = useState(false);
  const [section, setSection] = useState("profile");
  const [connectionRole, setConnectionRole] = useState<RelativeRole>("child");
  const [connectionTarget, setConnectionTarget] = useState("");

  useEffect(() => {
    const nextForm = toFormState(person);
    setForm(nextForm);
    setTagText(nextForm.tags.join(", "));
    setIsDeceased(!!(nextForm.deathDate || nextForm.deathPlace));
    setError(null);
    setFieldErrors({});
    setSection("profile");
    setConnectionTarget("");
    setPhotoBlob(null);
    setPreviewUrl(null);
  }, [person, isOpen]);

  useEffect(() => {
    let active = true;
    if (photoBlob) {
      const url = URL.createObjectURL(photoBlob);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else if (form.primaryPhotoId) {
      getImageURL(form.primaryPhotoId, dirHandle).then((url) => {
        if (active) setPreviewUrl(url);
      });
    } else {
      setPreviewUrl(null);
    }
    return () => {
      active = false;
    };
  }, [photoBlob, form.primaryPhotoId, dirHandle]);

  const updateField = (field: keyof PersonInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: "" }));
  };

  const handleSubmit = () => {
    const input = {
      fullName: form.fullName,
      nickname: normalizeOptional(form.nickname ?? ""),
      gender: form.gender,
      birthDate: normalizeOptional(form.birthDate ?? ""),
      birthPlace: normalizeOptional(form.birthPlace ?? ""),
      deathDate: isDeceased ? normalizeOptional(form.deathDate ?? "") : undefined,
      deathPlace: isDeceased ? normalizeOptional(form.deathPlace ?? "") : undefined,
      primaryPhotoId: normalizeOptional(form.primaryPhotoId ?? ""),
      notes: normalizeOptional(form.notes ?? ""),
      tags: parseTags([tagText]),
    };
    const result = personInputSchema.safeParse(input);
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = String(issue.path[0]);
        errors[field] ??= issue.message;
      }
      setFieldErrors(errors);
      setError("Periksa kolom yang ditandai sebelum menyimpan.");
      const firstField = String(result.error.issues[0].path[0]);
      setSection(["notes", "tags", "deathDate", "deathPlace"].includes(firstField) ? "history" : "profile");
      return;
    }
    setFieldErrors({});
    setError(null);
    onSave(result.data, person?.id || undefined, photoBlob || undefined);
  };

  const currentTags = parseTags([tagText]);
  const tagError = currentTags.length > FIELD_LIMITS.tagCount
    ? `Maksimal ${FIELD_LIMITS.tagCount} label per anggota.`
    : currentTags.some((tag) => tag.length > FIELD_LIMITS.tag)
    ? `Setiap label maksimal ${FIELD_LIMITS.tag} karakter.`
    : undefined;
  const connections = person ? relationships.filter((rel) => rel.from === person.id || rel.to === person.id) : [];
  const connectionCandidates = person ? persons.filter((candidate) => !getRelationshipError(person.id, candidate.id, connectionRole, relationships, persons)) : [];
  const validConnectionTarget = connectionCandidates.some((candidate) => candidate.id === connectionTarget) ? connectionTarget : "";
  const addConnection = () => {
    if (!person || !connectionTarget || !onAddRelationship) return;
    const type = connectionRole === "spouse" ? "marriage" : "parent";
    const from = connectionRole === "parent" ? connectionTarget : person.id;
    const to = connectionRole === "parent" ? person.id : connectionTarget;
    const relationError = getRelationshipError(person.id, connectionTarget, connectionRole, relationships, persons);
    if (relationError) { setError(relationError); return; }
    if (relationships.some((rel) => rel.type === type && ((rel.from === from && rel.to === to) || (type === "marriage" && rel.from === to && rel.to === from)))) { setError("Hubungan ini sudah tercatat."); return; }
    onAddRelationship({ type, from, to });
    setConnectionTarget(""); setError(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={person ? "Edit anggota" : "Tambah anggota keluarga"} subtitle={person ? person.fullName : "Isi identitas anggota yang ingin ditambahkan ke silsilah."} eyebrow={person ? "Catatan anggota" : "Anggota baru"} maxWidth="max-w-2xl">
      <div className="person-editor min-h-0 flex-1">
        <aside className="editor-sidebar">
          <div className="editor-photo">{previewUrl ? <img src={previewUrl} alt="Foto anggota" /> : <span>{getPersonInitials(form.fullName)}</span>}</div>
          <label className="editor-photo-upload"><Upload size={13} /> {previewUrl ? "Ganti foto" : "Tambah foto"}<input type="file" accept="image/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; setPhotoBlob(file); updateField("primaryPhotoId", `person_${nanoid(10)}.${file.name.split(".").pop() || "jpg"}`); }} /></label>
          <nav aria-label="Bagian formulir anggota" className="editor-nav">{[{ id: "profile", label: "Identitas", number: "01" }, { id: "history", label: "Riwayat & catatan", number: "02" }, ...(person ? [{ id: "family", label: "Hubungan keluarga", number: "03" }] : [])].map((item) => <button key={item.id} type="button" aria-current={section === item.id ? "step" : undefined} onClick={() => { setSection(item.id); setError(null); }}><span>{item.number}</span>{item.label}</button>)}</nav>
          <p className="editor-note">Foto, tanggal, dan catatan dapat dilengkapi kapan saja.</p>
        </aside>
        <div className="editor-content">
          {section === "profile" && <div className="space-y-5"><div><h3 className="editor-section-title">Identitas anggota</h3><p className="editor-section-description">Nama lengkap wajib diisi. Selebihnya bisa menyusul.</p></div><Input label="Nama lengkap" maxLength={FIELD_LIMITS.fullName} error={fieldErrors.fullName} required placeholder="Nama lengkap anggota" value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} autoFocus /><div className="grid gap-4 sm:grid-cols-2"><Input label="Nama panggilan" maxLength={FIELD_LIMITS.nickname} error={fieldErrors.nickname} placeholder="Biasa dipanggil…" value={form.nickname ?? ""} onChange={(event) => updateField("nickname", event.target.value)} /><Select label="Jenis kelamin" value={form.gender} onValueChange={(value) => setForm((current) => ({ ...current, gender: value as PersonGender }))} options={genderOptions} /></div><div className="editor-divider" /><h4 className="text-[13px] font-medium text-zinc-700">Kelahiran</h4><div className="grid gap-4 sm:grid-cols-2"><DatePicker label="Tanggal lahir" value={form.birthDate ?? ""} onChange={(value) => updateField("birthDate", value)} /><Input label="Tempat lahir" maxLength={FIELD_LIMITS.place} error={fieldErrors.birthPlace} placeholder="Kota atau daerah" value={form.birthPlace ?? ""} onChange={(event) => updateField("birthPlace", event.target.value)} /></div><button type="button" className="editor-next" onClick={() => setSection("history")}>Lengkapi riwayat & catatan <ArrowRight size={14} /></button></div>}
          {section === "history" && <div className="space-y-5"><div><h3 className="editor-section-title">Riwayat & catatan</h3><p className="editor-section-description">Tambahkan riwayat hidup dan catatan keluarga.</p></div><label className="flex items-center gap-2.5 text-[13px] text-zinc-600"><input type="checkbox" checked={isDeceased} onChange={(event) => setIsDeceased(event.target.checked)} className="accent-[#862d33]" /> Anggota ini telah wafat</label>{isDeceased && <div className="grid gap-4 sm:grid-cols-2"><DatePicker label="Tanggal wafat" value={form.deathDate ?? ""} onChange={(value) => updateField("deathDate", value)} /><Input label="Tempat wafat" maxLength={FIELD_LIMITS.place} error={fieldErrors.deathPlace} placeholder="Kota atau daerah" value={form.deathPlace ?? ""} onChange={(event) => updateField("deathPlace", event.target.value)} /></div>}<Textarea label="Catatan & cerita" maxLength={FIELD_LIMITS.notes} error={fieldErrors.notes} placeholder="Kenangan, perjalanan hidup, atau hal kecil yang berarti…" rows={5} value={form.notes ?? ""} onChange={(event) => updateField("notes", event.target.value)} /><Input label="Label" counterLabel={`${currentTags.length} / ${FIELD_LIMITS.tagCount} label`} maxLength={FIELD_LIMITS.tagInput} error={fieldErrors.tags || tagError} placeholder="Contoh: Bandung, musisi, keluarga ibu" hint={`Maksimal ${FIELD_LIMITS.tagCount} label, masing-masing ${FIELD_LIMITS.tag} karakter. Pisahkan dengan koma.`} value={tagText} onChange={(event) => { setTagText(event.target.value); setFieldErrors((current) => ({ ...current, tags: "" })); }} /></div>}
          {section === "family" && person && <div className="space-y-5"><div><h3 className="editor-section-title">Hubungan keluarga</h3><p className="editor-section-description">Hubungan yang tercatat untuk {person.nickname || person.fullName}.</p></div><div className="editor-connections">{connections.length ? connections.map((rel) => { const other = persons.find((p) => p.id === (rel.from === person.id ? rel.to : rel.from)); const relLabel = rel.type === "marriage" ? (other?.gender === "female" ? "Istri" : "Suami") : rel.type === "sibling" ? (other ? siblingLabel(other.gender, comparePersonAges(person.birthDate, other.birthDate)) : "Saudara") : `${rel.to === person.id ? "Orang tua" : "Anak"}${rel.type === "adoption" ? " · adopsi" : rel.type === "stepParent" ? " · tiri" : ""}`; return <div key={rel.id}><span><strong>{other?.fullName || "Tidak dikenal"}</strong><small>{relLabel}</small></span>{onDeleteRelationship && <button aria-label={`Lepas hubungan dengan ${other?.fullName}`} onClick={() => onDeleteRelationship(rel.id)}><Trash2 size={14} /></button>}</div>; }) : <p className="text-[13px] text-zinc-500">Belum ada hubungan yang tercatat.</p>}</div>{onAddRelationship && <section className="space-y-3 border-t border-zinc-200 pt-5"><h4 className="text-[13px] font-medium">Hubungkan anggota lain</h4><div className="grid gap-3 sm:grid-cols-2"><Select label="Tambahkan sebagai" value={connectionRole} onValueChange={(value) => { setConnectionRole(value as RelativeRole); setConnectionTarget(""); }} options={[{ value: "parent", label: "Orang tua" }, { value: "spouse", label: person.gender === "female" ? "Suami" : "Istri" }, { value: "child", label: "Anak" }]} /><Select label="Anggota keluarga" searchable hint="Hanya anggota dengan hubungan yang sesuai yang ditampilkan." value={validConnectionTarget} onValueChange={setConnectionTarget} placeholder="Pilih anggota" emptyMessage="Belum ada anggota yang sesuai untuk hubungan ini." options={connectionCandidates.map((candidate) => ({ value: candidate.id, label: candidate.fullName }))} /></div><Button disabled={!validConnectionTarget} onClick={addConnection}><Plus size={14} /> Hubungkan</Button></section>}</div>}
          {error && <p role="alert" className="mt-5 rounded-lg bg-[#fbf4f5] border border-[#eed2d5] p-3 text-xs text-[#862d33]">{error}</p>}
        </div>
      </div>
      <footer className="modal-footer">
        <div>
          {person ? (
            <button
              type="button"
              className="modal-delete"
              onClick={() => onDelete(person.id)}
            >
              <Trash2 size={14} /> Hapus anggota
            </button>
          ) : (
            <span className="text-xs text-zinc-400">
              Tersimpan hanya di perangkat Anda.
            </span>
          )}
        </div>
        <div className="flex w-full sm:w-auto gap-2">
          <Button
            onClick={onClose}
            variant="ghost"
            className="flex-1 sm:flex-initial"
          >
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            variant="primary"
            className="flex-1 sm:flex-initial"
          >
            {person ? "Simpan perubahan" : "Tambah anggota"}
          </Button>
        </div>
      </footer>
    </Modal>
  );
}
