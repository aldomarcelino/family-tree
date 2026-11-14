"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import ReactFlow, {
  Background,
  MiniMap,
  useReactFlow,
  useViewport,
  useNodesInitialized,
  ReactFlowProvider,
  type NodeTypes,
  type EdgeTypes,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { PersonNode } from "@/src/components/FamilyCanvas/PersonNode";
import { FamilyJunction } from "@/src/components/FamilyCanvas/FamilyJunction";
import { FamilyRelationshipEdge } from "@/src/components/FamilyCanvas/FamilyRelationshipEdge";
import { MarriageEdge } from "@/src/components/FamilyCanvas/MarriageEdge";
import { RelationGuide } from "@/src/components/UI/RelationGuide";
import { TuturModeSelector } from "@/src/components/UI/TuturModeSelector";
import { CanvasToolbar } from "@/src/components/UI/CanvasToolbar";
import { Camera, Loader2 } from "lucide-react";
import { exportCurrentBoardAsImage } from "@/src/services/exportImage";
import { getFocusWaveSchedule } from "@/src/services/focusWave";
import { FAMILY_LINE_COLOR } from "@/src/services/familyLineColors";
import { getTreeLayout } from "@/src/services/layoutEngine";
import { useFamilyStore } from "@/src/store/familyStore";
import type {
  FamilyData,
  Person,
  FolderDirectoryHandle,
} from "@/src/types/family";

const nodeTypes: NodeTypes = {
  person: PersonNode,
  junction: FamilyJunction,
};

const edgeTypes: EdgeTypes = {
  marriage: MarriageEdge,
  family: FamilyRelationshipEdge,
};
const emptyCollapsedPersons = new Set<string>();

interface FamilyTreeProps {
  family: FamilyData;
  onEditPerson: (person: Person) => void;
  onDeletePerson?: (id: string) => void;
  onSelectPerson?: (person: Person) => void;
  onFocusPerson?: (id: string) => void;
  onAddRelative?: (
    person: Person,
    defaultRole?: "parent" | "spouse" | "child" | "sibling",
  ) => void;
  focusPersonId?: string | null;
  focusRequest?: number;
  arrangeRequest?: number;
  selectedDetailPersonId?: string;
  viewMode?: "full" | "ancestor" | "descendant" | "branch";
  dirHandle?: FolderDirectoryHandle;
  layoutMode?: "auto" | "manual";
  onLayoutModeChange?: (mode: "auto" | "manual") => void;
  snapToGrid?: boolean;
  onSnapToGridChange?: (val: boolean) => void;
  collapsedPersonIds?: Set<string>;
  onToggleCollapse?: (id: string) => void;
  onAutoArrange?: () => void;
  onAddPerson?: () => void;
  onAddRelationship?: () => void;
  onFeedback?: (message: string, type?: "success" | "error" | "info") => void;
}

function FamilyTreeInner({
  family,
  onEditPerson,
  onDeletePerson,
  onSelectPerson,
  onFocusPerson,
  onAddRelative,
  focusPersonId = null,
  focusRequest = 0,
  arrangeRequest = 0,
  selectedDetailPersonId,
  viewMode = "full",
  dirHandle,
  layoutMode = "auto",
  onLayoutModeChange,
  snapToGrid = false,
  onSnapToGridChange,
  collapsedPersonIds = emptyCollapsedPersons,
  onToggleCollapse,
  onAutoArrange,
  onAddRelationship,
  onFeedback,
}: FamilyTreeProps) {
  const [showMinimap, setShowMinimap] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const updatePersonLayout = useFamilyStore(
    (state) => state.updatePersonLayout,
  );
  const tuturMode = useFamilyStore((state) => state.tuturMode);

  const { nodes: layoutNodes, edges } = useMemo(
    () =>
      getTreeLayout(
        family,
        viewMode,
        focusPersonId,
        onEditPerson,
        onSelectPerson,
        onFocusPerson,
        dirHandle,
        collapsedPersonIds,
        onToggleCollapse,
        layoutMode,
        onAddRelative,
        onDeletePerson,
        tuturMode,
      ),
    [
      family,
      viewMode,
      focusPersonId,
      onEditPerson,
      onSelectPerson,
      onFocusPerson,
      dirHandle,
      collapsedPersonIds,
      onToggleCollapse,
      layoutMode,
      onAddRelative,
      onDeletePerson,
      tuturMode,
    ],
  );
  const waveSchedule = useMemo(
    () => getFocusWaveSchedule(layoutNodes, edges, focusPersonId),
    [layoutNodes, edges, focusPersonId],
  );
  const waveKey =
    focusRequest > 0 && focusPersonId
      ? `${focusPersonId}:${focusRequest}`
      : undefined;
  const nodes = useMemo(
    () =>
      layoutNodes.map((node) =>
        node.type === "person"
          ? {
              ...node,
              data: {
                ...node.data,
                isDetailOpen: node.id === selectedDetailPersonId,
                waveKey: waveSchedule.nodes.has(node.id) ? waveKey : undefined,
                waveArrival: waveSchedule.nodes.get(node.id),
                waveIsOrigin: node.id === focusPersonId,
              },
            }
          : node,
      ),
    [layoutNodes, selectedDetailPersonId, waveSchedule, waveKey, focusPersonId],
  );
  const { getNode, getViewport, setCenter, fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const handledFocus = useRef(0);
  const handledArrange = useRef(0);
  const focusNode = nodes.find((node) => node.id === focusPersonId);
  const focusX = focusNode?.position.x;
  const focusY = focusNode?.position.y;

  useEffect(() => {
    if (
      !focusRequest ||
      handledFocus.current === focusRequest ||
      !focusPersonId ||
      !nodesInitialized ||
      focusX === undefined ||
      focusY === undefined
    )
      return;
    const frame = requestAnimationFrame(() => {
      const node = getNode(focusPersonId);
      if (!node) return;
      handledFocus.current = focusRequest;
      const zoom = Math.min(1.15, Math.max(0.85, getViewport().zoom));
      setCenter(
        node.position.x + (node.width ?? 236) / 2,
        node.position.y + (node.height ?? 128) / 2,
        { zoom, duration: 400 },
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [
    focusRequest,
    focusPersonId,
    focusX,
    focusY,
    nodesInitialized,
    getNode,
    getViewport,
    setCenter,
  ]);

  useEffect(() => {
    if (
      !arrangeRequest ||
      handledArrange.current === arrangeRequest ||
      !nodesInitialized
    )
      return;
    let frame = 0;
    let attempts = 0;
    const arrange = () => {
      const fitted = fitView({
        nodes: layoutNodes.filter((node) => node.type === "person"),
        padding: 0.15,
        duration: 450,
      });
      if (fitted) handledArrange.current = arrangeRequest;
      else if (attempts++ < 5) frame = requestAnimationFrame(arrange);
    };
    // Controlled node positions and measured dimensions reach ReactFlow on
    // separate frames. Do not mark the request handled before fitting succeeds.
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(arrange);
    });
    return () => cancelAnimationFrame(frame);
  }, [arrangeRequest, nodesInitialized, layoutNodes, fitView]);

  const { zoom } = useViewport();
  const lineScale = 1 / Math.max(zoom, 0.15);

  // Style relationships for clean light mode
  const styledEdges = useMemo(() => {
    return edges.map((edge) => {
      const rel = family.relationships.find(
        (r) =>
          r.id === edge.id || (r.from === edge.source && r.to === edge.target),
      );

      const type = rel?.type ?? edge.data?.relationshipType;
      if (!type) return { ...edge, label: undefined, labelShowBg: false };

      const color = FAMILY_LINE_COLOR;
      const timing = waveKey ? waveSchedule.edges.get(edge.id) : undefined;
      const data = {
        ...edge.data,
        relationshipType: type,
        visualScale: lineScale,
        wave: timing ? { ...timing, key: waveKey } : undefined,
      };
      if (type === "marriage") {
        return {
          ...edge,
          type: "marriage",
          data,
          label: undefined,
          labelShowBg: false,
          style: { stroke: color, strokeWidth: 1.4 * lineScale },
          ariaLabel: `Pasangan: ${edge.data?.familyLabel ?? "anggota keluarga"}`,
        };
      }

      let style: React.CSSProperties = {
        stroke: color,
        strokeWidth: 1.4 * lineScale,
      };
      let label: string | undefined = undefined;

      if (type === "adoption") {
        style = {
          stroke: color,
          strokeWidth: 1.4 * lineScale,
          strokeDasharray: `${5 * lineScale},${4 * lineScale}`,
        };
        label = "Anak adopsi";
      } else if (type === "stepParent") {
        style = {
          stroke: color,
          strokeWidth: 1.4 * lineScale,
          strokeDasharray: `${lineScale},${5 * lineScale}`,
          strokeLinecap: "round",
        };
        label = "Anak Sambung";
      } else if (type === "parent") {
        style = { stroke: color, strokeWidth: 1.4 * lineScale };
        label = "Anak";
      } else if (type === "sibling") {
        style = {
          stroke: color,
          strokeWidth: 1.4 * lineScale,
          strokeDasharray: `${8 * lineScale},${5 * lineScale}`,
        };
        label = "Saudara";
      }

      return {
        ...edge,
        type: "family",
        data,
        ...(type === "sibling"
          ? {
              sourceHandle: "sibling-source",
              targetHandle: "sibling-target",
              pathOptions: { offset: 36, borderRadius: 8 },
            }
          : {}),
        markerEnd: undefined,
        style,
        label: undefined,
        ariaLabel: `${label || "Hubungan"}: ${family.persons.find((person) => person.id === edge.source)?.fullName || "Orang tua"} ke ${family.persons.find((person) => person.id === edge.target)?.fullName || "anggota"} · Keluarga ${edge.data?.familyLabel ?? "anggota"}`,
        labelShowBg: false,
      };
    });
  }, [
    edges,
    family.relationships,
    family.persons,
    lineScale,
    waveKey,
    waveSchedule,
  ]);

  const handleNodeDragStop = (_event: React.MouseEvent, node: Node) => {
    const initial = nodes.find((item) => item.id === node.id);
    if (
      initial &&
      Math.abs(initial.position.x - node.position.x) < 0.5 &&
      Math.abs(initial.position.y - node.position.y) < 0.5
    )
      return;
    if (layoutMode === "auto" && onLayoutModeChange) {
      onLayoutModeChange("manual");
    }
    updatePersonLayout(node.id, { x: node.position.x, y: node.position.y });
  };

  const handleExportImage = async () => {
    if (isExportingImage) return;
    setIsExportingImage(true);
    try {
      await exportCurrentBoardAsImage(family.name);
      onFeedback?.(
        "Tampilan kanvas silsilah berhasil diekspor sebagai gambar PNG.",
        "success",
      );
    } catch (error) {
      onFeedback?.(
        error instanceof Error
          ? error.message
          : "Gagal mengekspor gambar kanvas.",
        "error",
      );
    } finally {
      setIsExportingImage(false);
    }
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={styledEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      maxZoom={1.6}
      minZoom={0.12}
      nodesDraggable={true}
      nodesFocusable={true}
      proOptions={{ hideAttribution: true }}
      snapToGrid={snapToGrid}
      snapGrid={[15, 15]}
      onNodeDragStop={handleNodeDragStop}
    >
      <Background color="#d4d4d8" gap={28} size={0.8} />
      {showMinimap && (
        <MiniMap
          maskColor="rgba(241, 245, 249, 0.7)"
          nodeColor="#862d33"
          nodeStrokeWidth={2}
          pannable
          position="bottom-left"
          zoomable
        />
      )}

      {/* Floating Canvas Toolbar */}
      <CanvasToolbar
        layoutMode={layoutMode}
        onLayoutModeChange={onLayoutModeChange || (() => {})}
        onAutoArrange={onAutoArrange || (() => {})}
        snapToGrid={snapToGrid}
        onSnapToGridChange={onSnapToGridChange || (() => {})}
        showMinimap={showMinimap}
        onShowMinimapChange={setShowMinimap}
        onAddRelationship={onAddRelationship || (() => {})}
      />

      {/* Bottom-left tools: Relation Guide, Tutur Mode Selector & Export Board View as Image */}
      <div className="relation-guide-group nodrag nopan nowheel">
        <RelationGuide />
        <TuturModeSelector />
        <button
          type="button"
          onClick={handleExportImage}
          disabled={isExportingImage}
          className="relation-guide-trigger"
          aria-label="Ekspor tampilan kanvas saat ini sebagai gambar"
          title="Ekspor tampilan kanvas saat ini sebagai gambar (PNG)"
        >
          {isExportingImage ? (
            <Loader2 size={18} className="animate-spin text-[#862d33]" />
          ) : (
            <Camera size={18} strokeWidth={1.6} />
          )}
        </button>
      </div>
    </ReactFlow>
  );
}

export function FamilyTree(props: FamilyTreeProps) {
  return (
    <ReactFlowProvider>
      <FamilyTreeInner {...props} />
    </ReactFlowProvider>
  );
}
