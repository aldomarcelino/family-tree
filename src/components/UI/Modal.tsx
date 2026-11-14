"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

let openModalCount = 0;
let previousBodyOverflow = "";

interface ModalProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  maxWidth?: string;
  eyebrow?: string;
  role?: "dialog" | "alertdialog";
}

export function Modal({ title, subtitle, children, isOpen, onClose, maxWidth = "max-w-2xl", eyebrow = "Markoum · Arsip silsilah", role = "dialog" }: ModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const element = dialog.current;
    if (!element || !isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    element.showModal();
    if (openModalCount === 0) previousBodyOverflow = document.body.style.overflow;
    openModalCount += 1;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      openModalCount -= 1;
      if (openModalCount === 0) document.body.style.overflow = previousBodyOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <dialog ref={dialog} role={role} aria-labelledby={titleId} aria-describedby={subtitle ? descriptionId : undefined} onCancel={(event) => { event.preventDefault(); closeRef.current(); }} onClick={(event) => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose(); } }} className={`family-modal m-auto w-[calc(100%-32px)] ${maxWidth} max-h-[calc(100dvh-48px)] overflow-hidden rounded-xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-zinc-950/30`}>
      <div className="flex max-h-[calc(100dvh-48px)] flex-col">
        <header className="modal-heading">
          <div><p className="modal-eyebrow">{eyebrow}</p><h2 id={titleId} className="modal-title">{title}</h2>{subtitle && <p id={descriptionId} className="modal-description">{subtitle}</p>}</div>
          <button type="button" aria-label="Tutup modal" onClick={onClose} className="dock-button -mr-1 -mt-1"><X size={18} /></button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
