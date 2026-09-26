"use client";

import "@xyflow/react/dist/style.css";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState
} from "@xyflow/react";
import { AlertCircle, ArrowLeft, X } from "lucide-react";
import { useParams } from "next/navigation";
import api from "@/lib/api";

const relationshipColors = {
  normative_reference: "#0B3D6E",
  test_method: "#7C3AED",
  terminology: "#0891B2",
  safety: "#B3261E",
  installation: "#B9770E",
  related_product: "#1E7B45"
};

const nodeTypes = { standard: StandardNode };

export default function StandardsGraphPage() {
  const { standardId } = useParams();
  const [graph, setGraph] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!standardId) return;
    let active = true;
    api
      .get(`/api/standards/${standardId}/graph`)
      .then(({ data }) => {
        if (active) setGraph(data);
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.status === 404
              ? "This standard graph could not be found."
              : "Unable to load the standards graph. Please try again."
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [standardId]);

  const { nodes: initialNodes, edges: initialEdges, primary } = useMemo(
    () => buildFlowGraph(graph, standardId),
    [graph, standardId]
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setSelectedNode(null);
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [graph, initialEdges, initialNodes, setEdges, setNodes]);

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-textMuted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to dashboard
      </Link>
      <header className="mb-6 mt-6 flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-accent">
            Knowledge graph
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-text">
            Standards Graph
          </h1>
          <p className="mt-2 text-textMuted">
            Explore the primary standard and its connected relationship mappings.
          </p>
        </div>
        {primary && (
          <div className="border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="technical-code text-sm font-semibold text-primary">{primary.is_number}</p>
            <p className="mt-1 text-sm font-medium text-text">{primary.title}</p>
          </div>
        )}
      </header>

      {error && (
        <div className="flex items-start gap-3 border border-error/30 bg-error/5 p-4 text-sm text-error" role="alert">
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      {isLoading ? (
        <GraphSkeleton />
      ) : (
        <div className="relative overflow-hidden border border-border bg-surface">
          <div className="border-b border-border px-5 py-4">
            <RelationshipLegend />
          </div>
          <div className="h-[min(70vh,680px)] min-h-[500px]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={(_, node) => setSelectedNode(node.data)}
              fitView
              fitViewOptions={{ padding: 0.2, maxZoom: 1.15 }}
              attributionPosition="bottom-left"
            >
              <Background color="#D7DEE5" gap={24} size={1} />
              <Controls />
            </ReactFlow>
          </div>
          {selectedNode && (
            <NodeDetails node={selectedNode} onClose={() => setSelectedNode(null)} />
          )}
        </div>
      )}
    </div>
  );
}

function StandardNode({ data }) {
  return (
    <div
      className={`min-w-[190px] max-w-[230px] rounded-md border bg-surface px-4 py-3 shadow-sm ${
        data.isPrimary ? "border-accent border-2" : "border-primary/30"
      }`}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} className="!border-0 !bg-transparent" />
      <p className="technical-code text-xs font-semibold text-primary">{data.is_number}</p>
      <p className="mt-1 text-sm font-semibold leading-5 text-text">{data.title}</p>
      {data.isPrimary && (
        <span className="mt-2 inline-block rounded-md bg-accent px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          Primary
        </span>
      )}
      <Handle type="source" position={Position.Bottom} isConnectable={false} className="!border-0 !bg-transparent" />
    </div>
  );
}

function buildFlowGraph(graph, standardId) {
  const sourceNodes = graph?.nodes || [];
  const primaryId = String(standardId);
  const primary = sourceNodes.find((node) => String(node.id) === primaryId) || sourceNodes[0];
  if (!primary) return { nodes: [], edges: [], primary: null };

  const relatedNodes = sourceNodes.filter((node) => String(node.id) !== String(primary.id));
  const center = { x: 470, y: 260 };
  const radiusX = 430;
  const radiusY = 270;
  const nodes = sourceNodes.map((node) => {
    const isPrimary = String(node.id) === String(primary.id);
    const index = relatedNodes.findIndex((item) => String(item.id) === String(node.id));
    const angle = relatedNodes.length
      ? (index / relatedNodes.length) * Math.PI * 2 - Math.PI / 2
      : 0;
    return {
      id: String(node.id),
      type: "standard",
      position: isPrimary
        ? center
        : {
            x: center.x + Math.cos(angle) * radiusX,
            y: center.y + Math.sin(angle) * radiusY
          },
      data: {
        ...node,
        isPrimary,
        scope: node.scope || node.product_domain || "Scope information is not available."
      },
      draggable: false
    };
  });

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = (graph?.edges || []).flatMap((edge, index) => {
    const fromId = String(edge.from_standard_id);
    const toId = String(edge.to_standard_id);
    if (!nodeIds.has(fromId) || !nodeIds.has(toId) || fromId === toId) return [];
    const relationshipType = edge.relationship_type || "related_product";
    const color = relationshipColors[relationshipType] || "#5B6B7A";
    const source = fromId === primaryId ? fromId : toId === primaryId ? toId : fromId;
    const target = source === fromId ? toId : fromId;
    return {
      id: `${source}-${target}-${relationshipType}-${index}`,
      source,
      target,
      label: formatLabel(relationshipType),
      type: "smoothstep",
      animated: false,
      style: { stroke: color, strokeWidth: 2 },
      labelStyle: { fill: color, fontWeight: 600, fontSize: 11 },
      labelBgStyle: { fill: "#FFFFFF", fillOpacity: 0.9 },
      labelBgPadding: [5, 3],
      labelBgBorderRadius: 4,
      markerEnd: { type: MarkerType.ArrowClosed, color }
    };
  });

  return { nodes, edges, primary };
}

function NodeDetails({ node, onClose }) {
  return (
    <div className="absolute right-4 top-20 z-10 w-72 border border-border bg-surface p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="technical-code text-xs font-semibold text-primary">{node.is_number}</p>
          <h2 className="mt-1 font-semibold text-text">{node.title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-textMuted hover:bg-bg hover:text-text"
          aria-label="Close standard details"
        >
          <X size={17} aria-hidden="true" />
        </button>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-textMuted">Scope</p>
      <p className="mt-1 text-sm leading-6 text-text">{node.scope}</p>
    </div>
  );
}

function RelationshipLegend() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-textMuted">
      {Object.entries(relationshipColors).map(([type, color]) => (
        <span key={type} className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          {formatLabel(type)}
        </span>
      ))}
    </div>
  );
}

function formatLabel(value) {
  return String(value).replaceAll("_", " ");
}

function GraphSkeleton() {
  return <div className="h-[min(70vh,680px)] min-h-[500px] animate-pulse border border-border bg-surface" />;
}
