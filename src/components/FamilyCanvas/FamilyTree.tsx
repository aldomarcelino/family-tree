"use client";

import React, { useMemo, useState } from "react";
import ReactFlow, {
  Background,
  MiniMap,
  MarkerType,
  ReactFlowProvider,
  type NodeTypes,
  type EdgeTypes,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { PersonNode } from "@/src/components/FamilyCanvas/PersonNode";
import { FamilyJunction } from "@/src/components/FamilyCanvas/FamilyJunction";
import { MarriageEdge } from "@/src/components/FamilyCanvas/MarriageEdge";
import { RelationGuide } from "@/src/components/UI/RelationGuide";
import { CanvasToolbar } from "@/src/components/UI/CanvasToolbar";
import { FamilySearchBar } from "@/src/components/UI/FamilySearchBar";
import { getTreeLayout } from "@/src/services/layoutEngine";
import { useFamilyStore } from "@/src/store/familyStore";
import type { FamilyData, Person, FolderDirectoryHandle } from "@/src/types/family";

const nodeTypes: NodeTypes = {
  person: PersonNode,
  junction: FamilyJunction,
};

const edgeTypes: EdgeTypes = {
  marriage: MarriageEdge,
};

interface FamilyTreeProps {
  showSearch?: boolean;
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
}

function FamilyTreeInner({
  family,
  showSearch = false,
  onEditPerson,
  onDeletePerson,
  onSelectPerson,
  onFocusPerson,
  onAddRelative,
  focusPersonId = null,
  viewMode = "full",
  dirHandle,
  layoutMode = "auto",
  onLayoutModeChange,
  snapToGrid = false,
  onSnapToGridChange,
  collapsedPersonIds = new Set(),
  onToggleCollapse,
  onAutoArrange,
  onAddRelationship,
}: FamilyTreeProps) {
  const [showMinimap, setShowMinimap] = useState(false);
  const updatePersonLayout = useFamilyStore((state) => state.updatePersonLayout);

  const { nodes, edges } = getTreeLayout(
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
  );

  // Style relationships for clean light mode
  const styledEdges = useMemo(() => {
    return edges.map((edge) => {
      const rel = family.relationships.find(
        (r) =>
          r.id === edge.id ||
          (r.from === edge.source && r.to === edge.target),
      );

      const type = rel?.type ?? edge.data?.relationshipType;
      if (!type) return { ...edge, label: undefined, labelShowBg: false };

      if (type === "marriage") {
        return {
          ...edge,
          type: "marriage",
          label: undefined,
          labelShowBg: false,
          style: { stroke: "#2563eb", strokeWidth: 1.5 },
        };
      }

      let style: React.CSSProperties = { stroke: "#2563eb", strokeWidth: 1.5 };
      let label: string | undefined = undefined;

      if (type === "adoption") {
        style = { stroke: "#2563eb", strokeWidth: 1.5, strokeDasharray: "5,5" };
        label = "Anak adopsi";
      } else if (type === "stepParent") {
        style = { stroke: "#71717a", strokeWidth: 1.5, strokeDasharray: "3,4" };
        label = "Anak tiri";
      } else if (type === "parent") {
        style = { stroke: "#2563eb", strokeWidth: 1.5 };
        label = "Anak";
      } else if (type === "sibling") {
        style = { stroke: "#27272a", strokeWidth: 1.5, strokeDasharray: "8,5" };
        label = "Saudara";
      }

      return {
        ...edge,
        ...(type === "sibling" ? { type: "smoothstep", sourceHandle: "sibling-source", targetHandle: "sibling-target", pathOptions: { offset: 36, borderRadius: 8 } } : {}),
        markerEnd: ["parent", "adoption", "stepParent"].includes(type) ? { type: MarkerType.ArrowClosed, color: style.stroke as string, width: 12, height: 12 } : undefined,
        style,
        label: undefined,
        ariaLabel: `${label || "Hubungan"}: ${family.persons.find((person) => person.id === edge.source)?.fullName || "Orang tua"} ke ${family.persons.find((person) => person.id === edge.target)?.fullName || "anggota"}`,
        labelShowBg: false,
      };
    });
  }, [edges, family.relationships, family.persons]);

  const handleNodeDragStop = (_event: React.MouseEvent, node: Node) => {
    const initial = nodes.find((item) => item.id === node.id);
    if (initial && Math.abs(initial.position.x - node.position.x) < 0.5 && Math.abs(initial.position.y - node.position.y) < 0.5) return;
    if (layoutMode === "auto" && onLayoutModeChange) {
      onLayoutModeChange("manual");
    }
    updatePersonLayout(node.id, { x: node.position.x, y: node.position.y });
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
      {showMinimap && <MiniMap
        maskColor="rgba(241, 245, 249, 0.7)"
        nodeColor="#2563eb"
        nodeStrokeWidth={2}
        pannable
        position="bottom-left"
        zoomable
      />}


      {/* Floating Canvas Search */}
      {showSearch && <FamilySearchBar family={family} onSelectPerson={onSelectPerson} />}

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

      <RelationGuide />
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
