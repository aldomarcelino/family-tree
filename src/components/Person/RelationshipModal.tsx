/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState, useMemo } from "react";
import { Users, Baby, Heart, GitBranch } from "lucide-react";
import { Button } from "@/src/components/UI/Button";
import { FIELD_LIMITS } from "@/src/schema/fieldLimits";
import { personInputSchema } from "@/src/schema/family";
import { Modal } from "@/src/components/UI/Modal";
import { Input } from "@/src/components/UI/Input";
import { Select } from "@/src/components/UI/Select";
import { DatePicker } from "@/src/components/UI/DatePicker";
import type {
  Person,
  PersonGender,
  PersonInput,
  Relationship,
  RelationshipType,
} from "@/src/types/family";

type RelativeRole = "child" | "spouse" | "parent" | "sibling";

interface RelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  persons: Person[];
  relationships: Relationship[];
  onAddRelationship?: (relationship: {
    type: RelationshipType;
    from: string;
    to: string;
  }) => void;
  onAddRelationships?: (
    relationships: Array<{ type: RelationshipType; from: string; to: string }>
  ) => void;
  onAddPersonAndRelationships?: (
    person: PersonInput,
    relationships: Array<{ type: RelationshipType; from: string; to: string }>
  ) => void;
  initialPersonId?: string;
  initialSecondPersonId?: string;
  initialRole?: RelativeRole;
}

const isAncestor = (
  ancestorId: string,
  descendantId: string,
  relationships: Relationship[],
): boolean => {
  const parentRelationships = relationships.filter(
    (r) => r.type === "parent" || r.type === "adoption",
  );
  const visited = new Set<string>();
  const stack = [descendantId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === ancestorId) {
      return true;
    }
    if (!visited.has(current)) {
      visited.add(current);
      const parents = parentRelationships
        .filter((r) => r.to === current)
        .map((r) => r.from);
      for (const p of parents) {
        if (!visited.has(p)) {
          stack.push(p);
        }
      }
    }
  }

  return false;
};

export function RelationshipModal({
  isOpen,
  onClose,
  persons,
  relationships,
  onAddRelationship,
  onAddRelationships,
  onAddPersonAndRelationships,
  initialPersonId,
  initialSecondPersonId,
  initialRole,
}: RelationshipModalProps) {
  const [targetMode, setTargetMode] = useState<"new" | "existing">("new");
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [secondParentId, setSecondParentId] = useState("");
  const [targetPersonId, setTargetPersonId] = useState("");
  const [role, setRole] = useState<RelativeRole>(initialRole ?? "child");
  const [linkParentsAsSpouses, setLinkParentsAsSpouses] = useState(false);

  // New member form fields
  const [newFullName, setNewFullName] = useState("");
  const [newGender, setNewGender] = useState<PersonGender>("female");
  const [newBirthDate, setNewBirthDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Partners of selected primary person
  const partnersOfSelected = useMemo(() => {
    if (!selectedPersonId) return [];
    const partnerIds = relationships
      .filter(
        (r) =>
          r.type === "marriage" &&
          (r.from === selectedPersonId || r.to === selectedPersonId)
      )
      .map((r) => (r.from === selectedPersonId ? r.to : r.from));
    return persons.filter((p) => partnerIds.includes(p.id));
  }, [selectedPersonId, relationships, persons]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      const defaultId = initialPersonId || persons[0]?.id || "";
      setSelectedPersonId(defaultId);

      const pIds = relationships
        .filter(
          (r) =>
            r.type === "marriage" &&
            (r.from === defaultId || r.to === defaultId)
        )
        .map((r) => (r.from === defaultId ? r.to : r.from));

      if (initialSecondPersonId) {
        setSecondParentId(initialSecondPersonId);
      } else if (pIds.length > 0) {
        setSecondParentId(pIds[0]);
      } else {
        setSecondParentId("");
      }

      const otherPersons = persons.filter((p) => p.id !== defaultId);
      setTargetPersonId(otherPersons[0]?.id || "");
      setRole(initialRole ?? "child");
      setTargetMode("new");
      setNewFullName("");
      setNewGender("female");
      setNewBirthDate("");
      setLinkParentsAsSpouses(false);
    }
  }, [isOpen, initialPersonId, initialSecondPersonId, initialRole, persons, relationships]);

  const handleSelectPrimary = (personId: string) => {
    if (initialRole && initialPersonId) return;
    setSelectedPersonId(personId);
    const pIds = relationships
      .filter(
        (r) =>
          r.type === "marriage" &&
          (r.from === personId || r.to === personId)
      )
      .map((r) => (r.from === personId ? r.to : r.from));

    if (pIds.length > 0) {
      setSecondParentId(pIds[0]);
    } else {
      setSecondParentId("");
    }

    if (targetPersonId === personId) {
      const remaining = persons.filter((p) => p.id !== personId);
      setTargetPersonId(remaining[0]?.id || "");
    }
  };

  const selectedPerson = persons.find((p) => p.id === selectedPersonId);

  // Check if parents are already married
  const areParentsMarried = useMemo(() => {
    if (!selectedPersonId || !secondParentId) return false;
    return relationships.some(
      (r) =>
        r.type === "marriage" &&
        ((r.from === selectedPersonId && r.to === secondParentId) ||
          (r.from === secondParentId && r.to === selectedPersonId))
    );
  }, [selectedPersonId, secondParentId, relationships]);

  const handleSubmit = () => {
    setError(null);

    if (!selectedPersonId) {
      setError("Pilih anggota keluarga rujukan.");
      return;
    }

    if (targetMode === "new") {
      if (!newFullName.trim()) {
        setError("Nama lengkap anggota baru wajib diisi.");
        return;
      }

      const newPersonInput: PersonInput = {
        fullName: newFullName.trim(),
        gender: newGender,
        birthDate: newBirthDate || undefined,
        tags: [],
      };
      const validatedPerson = personInputSchema.safeParse(newPersonInput);
      if (!validatedPerson.success) {
        setError(validatedPerson.error.issues[0].message);
        return;
      }


      const relsToCreate: Array<{ type: RelationshipType; from: string; to: string }> = [];

      if (role === "child") {
        relsToCreate.push({
          type: "parent",
          from: selectedPersonId,
          to: "NEW_PERSON_ID",
        });

        if (secondParentId && secondParentId !== selectedPersonId) {
          relsToCreate.push({
            type: "parent",
            from: secondParentId,
            to: "NEW_PERSON_ID",
          });

          if (!areParentsMarried && linkParentsAsSpouses) {
            relsToCreate.push({
              type: "marriage",
              from: selectedPersonId,
              to: secondParentId,
            });
          }
        }
      } else if (role === "spouse") {
        relsToCreate.push({
          type: "marriage",
          from: selectedPersonId,
          to: "NEW_PERSON_ID",
        });
      } else if (role === "parent") {
        relsToCreate.push({
          type: "parent",
          from: "NEW_PERSON_ID",
          to: selectedPersonId,
        });
      } else if (role === "sibling") {
        relsToCreate.push({
          type: "sibling",
          from: selectedPersonId,
          to: "NEW_PERSON_ID",
        });
      }

      if (onAddPersonAndRelationships) {
        onAddPersonAndRelationships(newPersonInput, relsToCreate);
        onClose();
      }
    } else {
      if (!targetPersonId) {
        setError("Pilih anggota keluarga yang ingin dihubungkan.");
        return;
      }

      if (targetPersonId === selectedPersonId) {
        setError("Tidak dapat menghubungkan anggota dengan dirinya sendiri.");
        return;
      }

      const relsToCreate: Array<{ type: RelationshipType; from: string; to: string }> = [];

      if (role === "child") {
        if (isAncestor(targetPersonId, selectedPersonId, relationships)) {
          setError("Gagal: Hubungan ini akan menyebabkan siklus leluhur.");
          return;
        }

        relsToCreate.push({
          type: "parent",
          from: selectedPersonId,
          to: targetPersonId,
        });

        if (secondParentId && secondParentId !== selectedPersonId && secondParentId !== targetPersonId) {
          if (!isAncestor(targetPersonId, secondParentId, relationships)) {
            relsToCreate.push({
              type: "parent",
              from: secondParentId,
              to: targetPersonId,
            });
          }

          if (!areParentsMarried && linkParentsAsSpouses) {
            relsToCreate.push({
              type: "marriage",
              from: selectedPersonId,
              to: secondParentId,
            });
          }
        }
      } else if (role === "spouse") {
        const alreadyMarried = relationships.some(
          (r) =>
            r.type === "marriage" &&
            ((r.from === selectedPersonId && r.to === targetPersonId) ||
              (r.from === targetPersonId && r.to === selectedPersonId))
        );
        if (alreadyMarried) {
          setError("Kedua anggota ini sudah tercatat sebagai pasangan.");
          return;
        }
        relsToCreate.push({
          type: "marriage",
          from: selectedPersonId,
          to: targetPersonId,
        });
      } else if (role === "parent") {
        if (isAncestor(selectedPersonId, targetPersonId, relationships)) {
          setError("Gagal: Hubungan ini akan menyebabkan siklus leluhur.");
          return;
        }
        relsToCreate.push({
          type: "parent",
          from: targetPersonId,
          to: selectedPersonId,
        });
      } else if (role === "sibling") {
        relsToCreate.push({
          type: "sibling",
          from: selectedPersonId,
          to: targetPersonId,
        });
      }

      if (onAddRelationships) {
        onAddRelationships(relsToCreate);
        onClose();
      } else if (onAddRelationship) {
        relsToCreate.forEach((r) => onAddRelationship(r));
        onClose();
      }
    }
  };

  const roles: Array<{ id: RelativeRole; label: string; icon: typeof Users }> = [{ id: "child", label: "Anak", icon: Baby }, { id: "spouse", label: "Pasangan", icon: Heart }, { id: "parent", label: "Orang tua", icon: Users }, { id: "sibling", label: "Saudara", icon: GitBranch }];
  const targetName = targetMode === "new" ? newFullName : persons.find((person) => person.id === targetPersonId)?.fullName;
  const roleLabel = roles.find((item) => item.id === role)?.label.toLowerCase();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialRole ? `Tambah ${roleLabel}` : "Tambah hubungan keluarga"} subtitle={initialRole ? `Lengkapi informasi ${roleLabel} yang ingin ditambahkan.` : "Tentukan hubungan, lalu pilih siapa yang ingin ditambahkan."} eyebrow="Hubungan keluarga" maxWidth="max-w-xl">
      <div className="relationship-editor min-h-0 flex-1 overflow-y-auto">
        {!initialRole && <fieldset><legend className="editor-field-legend">Tambahkan sebagai</legend><div className="relationship-roles">{roles.map(({ id, label, icon: Icon }) => <label key={id} className={role === id ? "is-selected" : ""}><input type="radio" name="relative-role" value={id} checked={role === id} onChange={() => { setRole(id); setError(null); if (id === "spouse") setNewGender(selectedPerson?.gender === "male" ? "female" : "male"); }} /><Icon size={19} strokeWidth={1.5} /><span>{label}</span></label>)}</div></fieldset>}
        <div className={role === "child" ? "grid gap-4 sm:grid-cols-2" : "space-y-4"}>{initialRole && initialPersonId ? <Input label={role === "child" ? "Orang tua" : "Dihubungkan dengan"} value={selectedPerson?.fullName ?? ""} readOnly className="!bg-zinc-50 cursor-default" /> : <Select label={role === "child" ? "Orang tua" : "Dihubungkan dengan"} value={selectedPersonId} onChange={(event) => handleSelectPrimary(event.target.value)} options={persons.map((person) => ({ value: person.id, label: person.fullName }))} />}{role === "child" && <><Select label="Orang tua kedua (opsional)" value={secondParentId} onChange={(event) => setSecondParentId(event.target.value)}><option value="">Belum dicatat</option>{partnersOfSelected.length > 0 && <optgroup label="Pasangan">{partnersOfSelected.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}</optgroup>}<optgroup label="Anggota lain">{persons.filter((person) => person.id !== selectedPersonId && !partnersOfSelected.some((partner) => partner.id === person.id)).map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}</optgroup></Select>{secondParentId && !areParentsMarried && <label className="sm:col-span-2 flex items-start gap-2 text-xs leading-5 text-zinc-500"><input type="checkbox" checked={linkParentsAsSpouses} onChange={(event) => setLinkParentsAsSpouses(event.target.checked)} className="mt-1 accent-blue-600" /> Catat kedua orang tua sebagai pasangan</label>}</>}</div>
        <section className="space-y-5 border-t border-zinc-200 pt-5"><fieldset className="relationship-target-mode"><legend className="sr-only">Sumber anggota</legend>{[{ id: "new", label: "Anggota baru" }, { id: "existing", label: "Sudah tercatat" }].map((item) => <label key={item.id}><input type="radio" name="target-mode" checked={targetMode === item.id} onChange={() => setTargetMode(item.id as "new" | "existing")} />{item.label}</label>)}</fieldset>{targetMode === "new" ? <><Input label="Nama lengkap" maxLength={FIELD_LIMITS.fullName} placeholder="Nama orang yang ingin ditambahkan" required value={newFullName} onChange={(event) => setNewFullName(event.target.value)} /><div className="grid gap-4 sm:grid-cols-2"><Select label="Jenis kelamin" value={newGender} onChange={(event) => setNewGender(event.target.value as PersonGender)} options={[{ value: "male", label: "Laki-laki" }, { value: "female", label: "Perempuan" }]} /><DatePicker label="Tanggal lahir (opsional)" value={newBirthDate} onChange={setNewBirthDate} /></div></> : <Select label="Pilih anggota" value={targetPersonId} onChange={(event) => setTargetPersonId(event.target.value)}><option value="">Pilih nama anggota</option>{persons.filter((person) => person.id !== selectedPersonId).map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}</Select>}</section>
        <section className="relationship-preview" aria-label="Ringkasan hubungan" aria-live="polite">
          <h3><GitBranch size={14} aria-hidden="true" /> Ringkasan hubungan</h3>
          <p><strong>{targetName?.trim() || (targetMode === "new" ? "Anggota baru" : "Anggota yang dipilih")}</strong> akan dicatat sebagai <span className="relationship-preview-role">{roleLabel}</span> dari <strong>{selectedPerson?.fullName || "anggota rujukan"}{role === "child" && secondParentId ? ` dan ${persons.find((person) => person.id === secondParentId)?.fullName || "orang tua kedua"}` : ""}</strong>.</p>
          <small>Hubungan dibuat setelah Anda menyimpan.</small>
        </section>
        {error && <p role="alert" className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700">{error}</p>}
      </div>
      <footer className="modal-footer"><span className="text-xs text-zinc-400">Hubungan bisa diperbarui nanti.</span><div className="flex gap-2"><Button onClick={onClose} variant="ghost">Batal</Button><Button onClick={handleSubmit} variant="primary">{targetMode === "new" ? "Tambahkan ke keluarga" : "Simpan hubungan"}</Button></div></footer>
    </Modal>
  );
}
