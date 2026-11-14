"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useReactFlow, useStore } from "reactflow";
import { Minus, Plus, Maximize, GripVertical, ChevronDown, ChevronUp, SlidersHorizontal, Undo2, Redo2, Link2, AlignVerticalSpaceAround } from "lucide-react";
import { useFamilyStore } from "@/src/store/familyStore";

interface CanvasToolbarProps {
  layoutMode: "auto" | "manual";
  onLayoutModeChange: (mode: "auto" | "manual") => void;
  onAutoArrange: () => void;
  snapToGrid: boolean;
  onSnapToGridChange: (value: boolean) => void;
  onAddRelationship: () => void;
  showMinimap: boolean;
  onShowMinimapChange: (value: boolean) => void;
}

export function CanvasToolbar({ layoutMode, onLayoutModeChange, onAutoArrange, snapToGrid, onSnapToGridChange, onAddRelationship, showMinimap, onShowMinimapChange }: CanvasToolbarProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const zoom = useStore((state) => Math.round(state.transform[2] * 100));
  const undo = useFamilyStore((state) => state.undo);
  const redo = useFamilyStore((state) => state.redo);
  const canUndo = useFamilyStore((state) => state.past.length > 0);
  const canRedo = useFamilyStore((state) => state.future.length > 0);
  const [minimized, setMinimized] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  const moveTo = (x: number, y: number) => {
    const element = ref.current;
    const parent = element?.parentElement;
    if (!element || !parent) return;
    setPosition({ x: Math.max(8, Math.min(x, parent.clientWidth - element.offsetWidth - 8)), y: Math.max(8, Math.min(y, parent.clientHeight - element.offsetHeight - 8)) });
  };

  useEffect(() => {
    const element = ref.current;
    const parent = element?.parentElement;
    if (!element || !parent) return;
    const observer = new ResizeObserver(() => {
      setPosition((current) => current ? { x: Math.max(8, Math.min(current.x, parent.clientWidth - element.offsetWidth - 8)), y: Math.max(8, Math.min(current.y, parent.clientHeight - element.offsetHeight - 8)) } : null);
    });
    observer.observe(parent);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    const close = (event: globalThis.PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setSettingsOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setSettingsOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [settingsOpen]);

  const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || !ref.current) return;
    const element = ref.current;
    drag.current = { x: event.clientX, y: event.clientY, left: element.offsetLeft - (position ? 0 : element.offsetWidth / 2), top: element.offsetTop };
    event.currentTarget.setPointerCapture(event.pointerId);
    setSettingsOpen(false);
  };
  const iconClass = "dock-button";

  return (
    <div ref={ref} className="canvas-dock nodrag nopan nowheel" style={position ? { left: position.x, top: position.y, bottom: "auto", transform: "none" } : undefined}>
      {settingsOpen && !minimized && (
        <section className="dock-settings" aria-label="Pengaturan kanvas" style={position && position.y < 300 ? { top: "calc(100% + 10px)", bottom: "auto" } : undefined}>
          <p className="mb-3 text-xs font-semibold text-zinc-900">Pengaturan kanvas</p>
          <label className="dock-setting"><span>Susunan otomatis</span><input type="checkbox" checked={layoutMode === "auto"} onChange={(e) => onLayoutModeChange(e.target.checked ? "auto" : "manual")} /></label>
          <label className="dock-setting"><span>Tempel ke kisi</span><input type="checkbox" checked={snapToGrid} onChange={(e) => onSnapToGridChange(e.target.checked)} /></label>
          <label className="dock-setting"><span>Peta mini</span><input type="checkbox" checked={showMinimap} onChange={(e) => onShowMinimapChange(e.target.checked)} /></label>
          <div className="mt-3 border-t border-zinc-100 pt-2">
            <button type="button" className="dock-menu-action" onClick={() => { onAutoArrange(); setSettingsOpen(false); }}><AlignVerticalSpaceAround size={15} /> Rapikan susunan</button>
            <button type="button" className="dock-menu-action" onClick={() => { onAddRelationship(); setSettingsOpen(false); }}><Link2 size={15} /> Hubungkan anggota</button>
          </div>
          <button className="mt-3 text-xs text-zinc-500 hover:text-zinc-900" onClick={() => { setPosition(null); setSettingsOpen(false); }}>Kembalikan posisi panel</button>
        </section>
      )}
      <button type="button" className={`${iconClass} touch-none cursor-grab active:cursor-grabbing`} aria-label="Geser panel kontrol; gunakan tombol panah untuk memindahkan" title="Geser panel · tombol panah untuk memindahkan" onPointerDown={startDrag} onPointerMove={(e) => { if (drag.current) moveTo(drag.current.left + e.clientX - drag.current.x, drag.current.top + e.clientY - drag.current.y); }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }} onKeyDown={(e) => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(e.key)) return;
        e.preventDefault();
        if (e.key === 'Home') { setPosition(null); return; }
        const element = ref.current;
        if (element) moveTo((position?.x ?? element.offsetLeft - element.offsetWidth / 2) + (e.key === 'ArrowLeft' ? -20 : e.key === 'ArrowRight' ? 20 : 0), (position?.y ?? element.offsetTop) + (e.key === 'ArrowUp' ? -20 : e.key === 'ArrowDown' ? 20 : 0));
      }}><GripVertical size={16} /></button>
      {minimized ? (
        <button className="px-2 text-xs font-medium" onClick={() => setMinimized(false)}>
          Kontrol kanvas <span className="ml-1 text-zinc-400">{zoom}%</span>
        </button>
      ) : (
        <>
          <button
            className={`${iconClass} hidden md:inline-flex`}
            aria-label="Urungkan"
            title="Urungkan (Ctrl/Cmd+Z)"
            disabled={!canUndo}
            onClick={undo}
          >
            <Undo2 size={16} />
          </button>
          <button
            className={`${iconClass} hidden md:inline-flex`}
            aria-label="Ulangi"
            title="Ulangi (Ctrl/Cmd+Shift+Z)"
            disabled={!canRedo}
            onClick={redo}
          >
            <Redo2 size={16} />
          </button>
          <span className="dock-divider hidden md:block" />
          <button
            className={iconClass}
            aria-label="Perkecil"
            title="Perkecil"
            onClick={() => zoomOut({ duration: 180 })}
          >
            <Minus size={16} />
          </button>
          <span className="w-10 text-center text-xs tabular-nums text-zinc-600">{zoom}%</span>
          <button
            className={iconClass}
            aria-label="Perbesar"
            title="Perbesar"
            onClick={() => zoomIn({ duration: 180 })}
          >
            <Plus size={16} />
          </button>
          <button
            className={`${iconClass} hidden sm:inline-flex`}
            aria-label="Tampilkan seluruh pohon"
            title="Tampilkan seluruh pohon"
            onClick={() => fitView({ padding: 0.2, duration: 250 })}
          >
            <Maximize size={16} />
          </button>
          <span className="dock-divider hidden sm:block" />
          <button
            className={iconClass}
            aria-label="Pengaturan kanvas"
            title="Pengaturan kanvas"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen(!settingsOpen)}
          >
            <SlidersHorizontal size={16} />
          </button>
        </>
      )}
      <button className={iconClass} aria-label={minimized ? "Perluas panel kontrol" : "Minimalkan panel kontrol"} title={minimized ? "Perluas" : "Minimalkan"} onClick={() => { setMinimized(!minimized); setSettingsOpen(false); }}>{minimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
    </div>
  );
}
