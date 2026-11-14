"use client";

import { ArrowUpRight, FolderOpen, Plus } from "lucide-react";
import { Button } from "@/src/components/UI/Button";

interface EmptyFamilyStateProps {
  onAddPerson: () => void;
  onOpenFile: () => void;
  onOpenFolder: () => void;
}

export function EmptyFamilyState({ onAddPerson, onOpenFile, onOpenFolder }: EmptyFamilyStateProps) {
  return (
    <section className="empty-family" aria-labelledby="empty-family-title">
      <div className="empty-family-content">
        <svg className="empty-family-illustration" viewBox="0 0 360 190" fill="none" aria-hidden="true">
          <path d="M105 65V87C105 91 108 94 112 94H248C252 94 255 91 255 87V65M180 94V121" stroke="#b8c2d4" strokeWidth="1.2" />
          <rect x="44" y="16" width="122" height="50" rx="8" fill="white" stroke="#e4e4e7" />
          <rect x="57" y="29" width="23" height="24" rx="5" fill="#f4f4f5" /><path d="M91 35H146M91 45H125" stroke="#e4e4e7" strokeWidth="5" strokeLinecap="round" />
          <rect x="194" y="16" width="122" height="50" rx="8" fill="white" stroke="#e4e4e7" />
          <rect x="207" y="29" width="23" height="24" rx="5" fill="#f4f4f5" /><path d="M241 35H296M241 45H275" stroke="#e4e4e7" strokeWidth="5" strokeLinecap="round" />
          <circle cx="180" cy="94" r="3" fill="#f4f4f5" stroke="#a1a1aa" />
          <rect x="107" y="118" width="146" height="62" rx="9" fill="#eff6ff" stroke="#93c5fd" />
          <rect x="120" y="132" width="32" height="34" rx="6" fill="white" stroke="#dbeafe" />
          <path d="M136 142V156M129 149H143" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M166 140H233M166 152H211" stroke="#bfdbfe" strokeWidth="5" strokeLinecap="round" />
          <path d="M29 126H45M37 118V134M309 153H321M315 147V159" stroke="#d4d4d8" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <p className="empty-family-eyebrow">Silsilah baru</p>
        <h2 id="empty-family-title">Mulai silsilah keluarga Anda</h2>
        <p className="empty-family-description">Tambahkan diri Anda atau anggota keluarga lain, lalu hubungkan orang tua, pasangan, dan anak.</p>
        <Button variant="primary" onClick={onAddPerson} className="empty-family-add"><Plus size={16} /> Tambah anggota pertama</Button>
        <div className="empty-family-import"><p>Sudah punya data keluarga?</p><div><button type="button" onClick={onOpenFile}>Buka file <ArrowUpRight size={13} /></button><span aria-hidden="true">·</span><button type="button" onClick={onOpenFolder}><FolderOpen size={13} /> Buka folder</button></div></div>
      </div>
    </section>
  );
}
