"use client";

import { useState } from "react";
import Link from "next/link";
import type { NetworkFirmNode, NetworkEdge } from "@/server/network";
import { FIRM_TYPE_LABELS } from "@/lib/schemas";
import type { FirmTypeEnum } from "@/lib/schemas";

interface NetworkGraphProps {
  nodes: NetworkFirmNode[];
  edges: NetworkEdge[];
}

type NodeLayout = {
  node: NetworkFirmNode;
  x: number;
  y: number;
  radius: number;
};

function layoutNodes(nodes: NetworkFirmNode[]): NodeLayout[] {
  // Separate parent firms (no parentFirmId) from spin-offs
  const parents = nodes.filter((n) => !n.parentFirmId);
  const spinOffs = nodes.filter((n) => n.parentFirmId);

  const layouts: NodeLayout[] = [];
  const centerX = 450;
  const parentY = 120;
  const spinOffY = 320;

  // Layout parent firms in a row at the top
  const parentSpacing = 900 / (parents.length + 1);
  parents.forEach((node, i) => {
    layouts.push({
      node,
      x: parentSpacing * (i + 1),
      y: parentY,
      radius: 45,
    });
  });

  // Layout spin-offs below their parents
  const spinOffSpacing = 900 / (spinOffs.length + 1);
  spinOffs.forEach((node, i) => {
    // Try to position below parent
    const parentLayout = layouts.find(
      (l) => l.node.id === node.parentFirmId
    );
    const x = parentLayout
      ? parentLayout.x + (i % 2 === 0 ? -60 : 60)
      : spinOffSpacing * (i + 1);

    layouts.push({
      node,
      x,
      y: spinOffY,
      radius: 35,
    });
  });

  return layouts;
}

export function NetworkGraph({ nodes, edges }: NetworkGraphProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const layouts = layoutNodes(nodes);

  const getNodeLayout = (id: string) => layouts.find((l) => l.node.id === id);

  // Get edges for the selected/hovered node
  const activeEdges = (hoveredNode ?? selectedNode)
    ? edges.filter(
        (e) =>
          e.fromFirmId === (hoveredNode ?? selectedNode) ||
          e.toFirmId === (hoveredNode ?? selectedNode)
      )
    : edges;

  // Parent-spinoff connections
  const lineageConnections = layouts
    .filter((l) => l.node.parentFirmId)
    .map((child) => {
      const parent = getNodeLayout(child.node.parentFirmId!);
      if (!parent) return null;
      return { from: parent, to: child };
    })
    .filter(Boolean) as { from: NodeLayout; to: NodeLayout }[];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <svg
        viewBox="0 0 900 440"
        className="w-full"
        style={{ minHeight: 400 }}
      >
        {/* Lineage connections (dashed) */}
        {lineageConnections.map((conn, i) => (
          <line
            key={`lineage-${i}`}
            x1={conn.from.x}
            y1={conn.from.y + conn.from.radius}
            x2={conn.to.x}
            y2={conn.to.y - conn.to.radius}
            stroke="#d1d5db"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
        ))}

        {/* Lawyer movement edges */}
        {activeEdges.map((edge) => {
          const from = getNodeLayout(edge.fromFirmId);
          const to = getNodeLayout(edge.toFirmId);
          if (!from || !to) return null;

          const isHighlighted =
            hoveredNode === edge.fromFirmId ||
            hoveredNode === edge.toFirmId;

          // Curved path
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2 - 30;

          return (
            <g key={edge.id}>
              <path
                d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
                fill="none"
                stroke={isHighlighted ? "#f59e0b" : "#94a3b8"}
                strokeWidth={isHighlighted ? 2.5 : 1.5}
                opacity={isHighlighted ? 1 : 0.4}
                markerEnd="url(#arrowhead)"
              />
              {isHighlighted && (
                <text
                  x={midX}
                  y={midY - 8}
                  textAnchor="middle"
                  className="fill-amber-600 text-[10px] font-medium"
                >
                  {edge.lawyerName}
                </text>
              )}
            </g>
          );
        })}

        {/* Arrow marker */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 8 3, 0 6"
              fill="#94a3b8"
            />
          </marker>
        </defs>

        {/* Firm nodes */}
        {layouts.map((layout) => {
          const isParent = !layout.node.parentFirmId;
          const isHovered = hoveredNode === layout.node.id;
          const isSelected = selectedNode === layout.node.id;
          const isActive = isHovered || isSelected;

          const fillColor = isActive
            ? isParent
              ? "#0d9488"
              : "#f59e0b"
            : isParent
            ? "#0f766e"
            : "#d97706";

          const npsColor =
            layout.node.nps.score > 50
              ? "#16a34a"
              : layout.node.nps.score >= 0
              ? "#ca8a04"
              : "#dc2626";

          return (
            <g
              key={layout.node.id}
              onMouseEnter={() => setHoveredNode(layout.node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() =>
                setSelectedNode(
                  selectedNode === layout.node.id ? null : layout.node.id
                )
              }
              className="cursor-pointer"
            >
              {/* Node circle */}
              <circle
                cx={layout.x}
                cy={layout.y}
                r={layout.radius + (isActive ? 3 : 0)}
                fill={fillColor}
                opacity={isActive ? 1 : 0.85}
                stroke={isActive ? "#fff" : "none"}
                strokeWidth={2}
              />

              {/* Firm name */}
              <text
                x={layout.x}
                y={layout.y - 4}
                textAnchor="middle"
                className="fill-white text-[11px] font-semibold"
                style={{ pointerEvents: "none" }}
              >
                {layout.node.shortName ?? layout.node.name.slice(0, 12)}
              </text>

              {/* Firm type label */}
              <text
                x={layout.x}
                y={layout.y + 10}
                textAnchor="middle"
                className="fill-white/70 text-[9px]"
                style={{ pointerEvents: "none" }}
              >
                {FIRM_TYPE_LABELS[layout.node.firmType as FirmTypeEnum]}
              </text>

              {/* NPS badge */}
              {layout.node.nps.total > 0 && (
                <>
                  <circle
                    cx={layout.x + layout.radius - 5}
                    cy={layout.y - layout.radius + 5}
                    r={12}
                    fill={npsColor}
                    stroke="white"
                    strokeWidth={2}
                  />
                  <text
                    x={layout.x + layout.radius - 5}
                    y={layout.y - layout.radius + 9}
                    textAnchor="middle"
                    className="fill-white text-[9px] font-bold"
                    style={{ pointerEvents: "none" }}
                  >
                    {layout.node.nps.score > 0 ? "+" : ""}
                    {layout.node.nps.score}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* Labels */}
        <text x={20} y={30} className="fill-gray-400 text-[11px] font-medium">
          Parent Firms
        </text>
        <text x={20} y={280} className="fill-gray-400 text-[11px] font-medium">
          Boutique Spin-offs
        </text>

        {/* Legend */}
        <g transform="translate(680, 390)">
          <line
            x1={0}
            y1={5}
            x2={30}
            y2={5}
            stroke="#d1d5db"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
          <text x={36} y={9} className="fill-gray-400 text-[10px]">
            Parent → Spin-off
          </text>
          <line
            x1={0}
            y1={22}
            x2={30}
            y2={22}
            stroke="#f59e0b"
            strokeWidth={2}
          />
          <text x={36} y={26} className="fill-gray-400 text-[10px]">
            Lawyer Movement
          </text>
        </g>
      </svg>

      {/* Selected node details */}
      {selectedNode && (
        <SelectedNodeDetail
          node={layouts.find((l) => l.node.id === selectedNode)?.node ?? null}
          edges={edges.filter(
            (e) =>
              e.fromFirmId === selectedNode || e.toFirmId === selectedNode
          )}
        />
      )}
    </div>
  );
}

function SelectedNodeDetail({
  node,
  edges,
}: {
  node: NetworkFirmNode | null;
  edges: NetworkEdge[];
}) {
  if (!node) return null;

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/firms/${node.id}`}
            className="text-sm font-semibold text-teal-700 hover:underline"
          >
            {node.name}
          </Link>
          <p className="text-xs text-gray-500">
            {FIRM_TYPE_LABELS[node.firmType as FirmTypeEnum]} ·{" "}
            {node.city}, {node.country}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{node.lawyerCount} lawyers</span>
          <span>{node.rankingCount} rankings</span>
          {node.nps.total > 0 && (
            <span
              className={
                node.nps.score > 50
                  ? "text-green-600 font-medium"
                  : node.nps.score >= 0
                  ? "text-amber-600 font-medium"
                  : "text-red-600 font-medium"
              }
            >
              NPS {node.nps.score > 0 ? "+" : ""}
              {node.nps.score}
            </span>
          )}
        </div>
      </div>

      {edges.length > 0 && (
        <div className="mt-3 border-t border-gray-200 pt-3">
          <p className="mb-2 text-xs font-medium text-gray-500">
            Lawyer Movements
          </p>
          <div className="space-y-1.5">
            {edges.map((edge) => (
              <div
                key={edge.id}
                className="flex items-center gap-2 text-xs text-gray-600"
              >
                <Link
                  href={`/lawyers/${edge.lawyerId}`}
                  className="font-medium text-teal-700 hover:underline"
                >
                  {edge.lawyerName}
                </Link>
                <span className="text-gray-400">
                  {edge.fromFirmName} → {edge.toFirmName}
                </span>
                {edge.endDate && (
                  <span className="text-gray-400">
                    ({new Date(edge.endDate).getFullYear()})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
