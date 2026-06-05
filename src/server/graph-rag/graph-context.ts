// ─── Graph Context Extraction Engine ─────────────────────────────────────────
// Traverses the LegalKnowledgeGraph to extract focused subgraphs for
// Claude's context window. Uses BFS from start nodes, following specified
// edge types and applying filters.

import type Graph from "graphology";
import type {
  GraphNodeAttrs,
  GraphEdgeAttrs,
  GraphNodeType,
  GraphEdgeType,
  TraversalStrategy,
  TraversalStep,
  StartNodeSpec,
  SubgraphContext,
} from "./types";
import type { LegalKnowledgeGraph } from "./graph-builder";

// ─── Core Traversal ──────────────────────────────────────────────────────────

/**
 * Find nodes whose attributes match the given spec.
 * String values: case-insensitive substring match.
 * Numbers / booleans: strict equality.
 */
export function findStartNodes(
  graph: Graph<GraphNodeAttrs, GraphEdgeAttrs>,
  nodeType: GraphNodeType,
  match: Record<string, string | number | boolean>,
): string[] {
  const results: string[] = [];

  graph.forEachNode((id, attrs) => {
    if (attrs.nodeType !== nodeType) return;

    const allMatch = Object.entries(match).every(([key, value]) => {
      const nodeValue = (attrs as Record<string, unknown>)[key];
      if (nodeValue === undefined || nodeValue === null) return false;

      if (typeof value === "string") {
        // Case-insensitive contains
        if (typeof nodeValue === "string") {
          return nodeValue.toLowerCase().includes(value.toLowerCase());
        }
        if (Array.isArray(nodeValue)) {
          return nodeValue.some(
            (v) =>
              typeof v === "string" &&
              v.toLowerCase().includes(value.toLowerCase()),
          );
        }
        return false;
      }

      // Numbers and booleans: exact match
      return nodeValue === value;
    });

    if (allMatch) results.push(id);
  });

  return results;
}

/**
 * BFS traversal from a set of start nodes, following specified edge types
 * and directions across one or more steps.
 */
export function traverseFromNodes(
  graph: Graph<GraphNodeAttrs, GraphEdgeAttrs>,
  startNodeIds: string[],
  steps: TraversalStep[],
): { visitedIds: Set<string>; paths: string[][] } {
  const visitedIds = new Set<string>(startNodeIds);
  const paths: string[][] = startNodeIds.map((id) => [id]);

  let frontier = new Set<string>(startNodeIds);

  for (const step of steps) {
    const maxDepth = step.maxDepth ?? 1;
    let currentFrontier = new Set<string>(frontier);
    const nextGlobalFrontier = new Set<string>();

    for (let depth = 0; depth < maxDepth; depth++) {
      const nextFrontier = new Set<string>();

      for (const nodeId of currentFrontier) {
        if (!graph.hasNode(nodeId)) continue;

        const edgesToCheck: string[] = [];

        if (step.direction === "outbound" || step.direction === "both") {
          edgesToCheck.push(...graph.outEdges(nodeId));
        }
        if (step.direction === "inbound" || step.direction === "both") {
          edgesToCheck.push(...graph.inEdges(nodeId));
        }

        for (const edgeId of edgesToCheck) {
          const edgeAttrs = graph.getEdgeAttributes(edgeId) as GraphEdgeAttrs;

          if (!step.edgeTypes.includes(edgeAttrs.edgeType)) continue;

          // Apply edge filter if specified (case-insensitive for strings)
          if (step.edgeFilter) {
            const filterPass = Object.entries(step.edgeFilter).every(
              ([k, v]) => {
                const edgeVal = (edgeAttrs as Record<string, unknown>)[k];
                if (edgeVal === undefined || edgeVal === null) return false;
                if (typeof v === "string" && typeof edgeVal === "string") {
                  return edgeVal.toLowerCase().includes(v.toLowerCase());
                }
                return edgeVal === v;
              },
            );
            if (!filterPass) continue;
          }

          const source = graph.source(edgeId);
          const target = graph.target(edgeId);
          const neighbor = source === nodeId ? target : source;

          // Check target node type filter
          if (step.targetNodeType) {
            const neighborAttrs = graph.getNodeAttributes(
              neighbor,
            ) as GraphNodeAttrs;
            if (neighborAttrs.nodeType !== step.targetNodeType) continue;
          }

          if (!visitedIds.has(neighbor)) {
            visitedIds.add(neighbor);
            nextFrontier.add(neighbor);
            nextGlobalFrontier.add(neighbor);

            // Extend existing paths that end at nodeId
            const extended = paths
              .filter((p) => p[p.length - 1] === nodeId)
              .map((p) => [...p, neighbor]);

            if (extended.length > 0) {
              paths.push(...extended);
            } else {
              paths.push([nodeId, neighbor]);
            }
          }
        }
      }

      currentFrontier = nextFrontier;
    }

    frontier = nextGlobalFrontier;
  }

  return { visitedIds, paths };
}

/**
 * Extract a focused subgraph using a TraversalStrategy.
 * Finds start nodes, runs BFS traversal steps, applies filters,
 * and returns a SubgraphContext ready for serialization.
 */
export function extractSubgraph(
  graph: Graph<GraphNodeAttrs, GraphEdgeAttrs>,
  strategy: TraversalStrategy,
): SubgraphContext {
  // 1. Find all start nodes
  const allStartIds: string[] = [];
  for (const spec of strategy.startNodes) {
    const ids = findStartNodes(graph, spec.nodeType, spec.match);
    allStartIds.push(...ids);
  }

  if (allStartIds.length === 0) {
    return {
      nodes: [],
      edges: [],
      paths: [],
      summary: `No matching start nodes found for: ${strategy.intent}`,
    };
  }

  // 2. Execute traversal steps
  const { visitedIds, paths } = traverseFromNodes(
    graph,
    allStartIds,
    strategy.traversals,
  );

  // 3. Collect nodes
  let nodes: SubgraphContext["nodes"] = [];
  for (const id of visitedIds) {
    if (!graph.hasNode(id)) continue;
    const attrs = graph.getNodeAttributes(id) as GraphNodeAttrs;
    nodes.push({
      id,
      type: attrs.nodeType,
      label: attrs.label,
      attrs: { ...attrs } as Record<string, unknown>,
    });
  }

  // 4. Collect edges between visited nodes
  let edges: SubgraphContext["edges"] = [];
  graph.forEachEdge((edgeId, attrs, source, target) => {
    if (visitedIds.has(source) && visitedIds.has(target)) {
      edges.push({
        source,
        target,
        type: (attrs as GraphEdgeAttrs).edgeType,
        attrs: { ...attrs } as Record<string, unknown>,
      });
    }
  });

  // 5. Apply filters
  if (strategy.filters) {
    const { nodeTypes, minWeight, edgeTypes } = strategy.filters as {
      nodeTypes?: GraphNodeType[];
      minWeight?: number;
      edgeTypes?: GraphEdgeType[];
    };

    if (nodeTypes && nodeTypes.length > 0) {
      nodes = nodes.filter((n) => nodeTypes.includes(n.type));
    }

    if (edgeTypes && edgeTypes.length > 0) {
      edges = edges.filter((e) => edgeTypes.includes(e.type));
    }

    if (typeof minWeight === "number") {
      edges = edges.filter(
        (e) => (e.attrs as { weight?: number }).weight !== undefined &&
          ((e.attrs as { weight: number }).weight >= minWeight),
      );
    }
  }

  // Apply limit if specified (keep highest-scored nodes first)
  if (strategy.rankBy && strategy.limit) {
    const rankKey = strategy.rankBy;
    nodes.sort((a, b) => {
      const aVal = (a.attrs[rankKey] as number) ?? 0;
      const bVal = (b.attrs[rankKey] as number) ?? 0;
      return bVal - aVal;
    });
    const keepIds = new Set(nodes.slice(0, strategy.limit).map((n) => n.id));
    // Always keep start nodes
    for (const id of allStartIds) keepIds.add(id);
    nodes = nodes.filter((n) => keepIds.has(n.id));
    edges = edges.filter(
      (e) => keepIds.has(e.source) && keepIds.has(e.target),
    );
  }

  // 6. Build path descriptions
  const pathDescriptions = paths
    .filter((p) => p.length > 1)
    .slice(0, 50) // Cap paths for context window
    .map((nodeIds) => {
      const description = nodeIds
        .map((id, idx) => {
          if (!graph.hasNode(id)) return id;
          const attrs = graph.getNodeAttributes(id) as GraphNodeAttrs;
          if (idx < nodeIds.length - 1) {
            const nextId = nodeIds[idx + 1];
            // Find the edge between these two nodes
            let edgeLabel = "?";
            try {
              const connecting = graph.edges(id, nextId);
              if (connecting.length > 0) {
                const eAttrs = graph.getEdgeAttributes(
                  connecting[0],
                ) as GraphEdgeAttrs;
                edgeLabel = eAttrs.edgeType;
              }
            } catch {
              // If undirected or no edge, try reverse
              try {
                const connecting = graph.edges(nextId, id);
                if (connecting.length > 0) {
                  const eAttrs = graph.getEdgeAttributes(
                    connecting[0],
                  ) as GraphEdgeAttrs;
                  edgeLabel = eAttrs.edgeType;
                }
              } catch {
                // No edge found
              }
            }
            return `${attrs.label} -> (${edgeLabel})`;
          }
          return attrs.label;
        })
        .join(" -> ");

      return { description, nodeIds };
    });

  const firmCount = nodes.filter((n) => n.type === "firm").length;
  const lawyerCount = nodes.filter((n) => n.type === "lawyer").length;
  const engagementCount = nodes.filter((n) => n.type === "engagement").length;

  const summary = [
    `Subgraph for: ${strategy.intent}`,
    `${nodes.length} nodes, ${edges.length} edges`,
    firmCount > 0 ? `${firmCount} firms` : null,
    lawyerCount > 0 ? `${lawyerCount} lawyers` : null,
    engagementCount > 0 ? `${engagementCount} engagements` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    nodes,
    edges,
    paths: pathDescriptions,
    summary,
  };
}

// ─── Common Traversal Patterns ───────────────────────────────────────────────

export const COMMON_TRAVERSALS = {
  /**
   * Find firms that practice a given practice area in a given jurisdiction.
   * Start at the practice area node, traverse PRACTICES inbound to get firms,
   * then enrich with their rankings and lawyers.
   */
  firmsByPracticeAndJurisdiction(
    graph: Graph<GraphNodeAttrs, GraphEdgeAttrs>,
    practiceAreaName: string,
    jurisdictionName: string,
  ): SubgraphContext {
    const strategy: TraversalStrategy = {
      intent: `Firms practicing ${practiceAreaName} in ${jurisdictionName}`,
      startNodes: [
        {
          nodeType: "practiceArea",
          match: { label: practiceAreaName },
        },
      ],
      traversals: [
        // Step 1: PA <-- PRACTICES -- firms (inbound to PA from firms)
        {
          edgeTypes: ["PRACTICES"],
          direction: "inbound",
          targetNodeType: "firm",
          maxDepth: 1,
          edgeFilter: { jurisdictionName },
        },
        // Step 2: From firms, follow outbound to rankings and lawyers
        {
          edgeTypes: ["EMPLOYS", "FIRM_RANKED", "OPERATES_IN"],
          direction: "outbound",
          maxDepth: 1,
        },
      ],
      filters: {},
      rankBy: "compositeScore",
      limit: 20,
    };

    return extractSubgraph(graph, strategy);
  },

  /**
   * Start at a firm, follow EMPLOYS to lawyers, filter by those who
   * SPECIALIZES_IN a matching practice area.
   */
  lawyersAtFirmByPractice(
    graph: Graph<GraphNodeAttrs, GraphEdgeAttrs>,
    firmName: string,
    practiceAreaName: string,
  ): SubgraphContext {
    const strategy: TraversalStrategy = {
      intent: `Lawyers at ${firmName} specializing in ${practiceAreaName}`,
      startNodes: [
        {
          nodeType: "firm",
          match: { label: firmName },
        },
      ],
      traversals: [
        // Step 1: firm -> EMPLOYS -> lawyers
        {
          edgeTypes: ["EMPLOYS"],
          direction: "outbound",
          targetNodeType: "lawyer",
          maxDepth: 1,
        },
        // Step 2: lawyers -> SPECIALIZES_IN -> practice areas
        {
          edgeTypes: ["SPECIALIZES_IN"],
          direction: "outbound",
          targetNodeType: "practiceArea",
          maxDepth: 1,
        },
      ],
      filters: {},
    };

    const ctx = extractSubgraph(graph, strategy);

    // Post-filter: only keep lawyers who specialize in the target PA
    const paNodeIds = new Set(
      ctx.nodes
        .filter(
          (n) =>
            n.type === "practiceArea" &&
            n.label.toLowerCase().includes(practiceAreaName.toLowerCase()),
        )
        .map((n) => n.id),
    );

    const lawyerIdsWithPA = new Set(
      ctx.edges
        .filter((e) => e.type === "SPECIALIZES_IN" && paNodeIds.has(e.target))
        .map((e) => e.source),
    );

    // Keep: firm nodes, matching lawyers, and matching PA nodes
    const keepNodeIds = new Set<string>();
    for (const n of ctx.nodes) {
      if (n.type === "firm") keepNodeIds.add(n.id);
      if (n.type === "lawyer" && lawyerIdsWithPA.has(n.id))
        keepNodeIds.add(n.id);
      if (n.type === "practiceArea" && paNodeIds.has(n.id))
        keepNodeIds.add(n.id);
    }

    return {
      nodes: ctx.nodes.filter((n) => keepNodeIds.has(n.id)),
      edges: ctx.edges.filter(
        (e) => keepNodeIds.has(e.source) && keepNodeIds.has(e.target),
      ),
      paths: ctx.paths.filter((p) =>
        p.nodeIds.every((id) => keepNodeIds.has(id)),
      ),
      summary: `${lawyerIdsWithPA.size} lawyers at ${firmName} specializing in ${practiceAreaName}`,
    };
  },

  /**
   * Extract full subgraph for 2+ firms: their lawyers, rankings,
   * practice areas, and engagements side by side.
   */
  compareFirms(
    graph: Graph<GraphNodeAttrs, GraphEdgeAttrs>,
    firmNames: string[],
  ): SubgraphContext {
    const strategy: TraversalStrategy = {
      intent: `Compare firms: ${firmNames.join(" vs ")}`,
      startNodes: firmNames.map((name) => ({
        nodeType: "firm" as GraphNodeType,
        match: { label: name },
      })),
      traversals: [
        // Expand to lawyers, rankings, PAs, jurisdictions, engagements
        {
          edgeTypes: [
            "EMPLOYS",
            "FIRM_RANKED",
            "PRACTICES",
            "OPERATES_IN",
          ],
          direction: "outbound",
          maxDepth: 1,
        },
        // From engagements back to firms
        {
          edgeTypes: ["ENGAGED_FIRM"],
          direction: "inbound",
          targetNodeType: "engagement",
          maxDepth: 1,
        },
      ],
      filters: {},
    };

    return extractSubgraph(graph, strategy);
  },

  /**
   * Start at a firm, follow FORMERLY_EMPLOYED to find alumni lawyers,
   * then follow their current EMPLOYS edges to find where they went.
   */
  alumniNetwork(
    graph: Graph<GraphNodeAttrs, GraphEdgeAttrs>,
    firmName: string,
  ): SubgraphContext {
    const strategy: TraversalStrategy = {
      intent: `Alumni network of ${firmName}`,
      startNodes: [
        {
          nodeType: "firm",
          match: { label: firmName },
        },
      ],
      traversals: [
        // Step 1: firm -> FORMERLY_EMPLOYED -> lawyers (alumni)
        {
          edgeTypes: ["FORMERLY_EMPLOYED"],
          direction: "outbound",
          targetNodeType: "lawyer",
          maxDepth: 1,
        },
        // Step 2: alumni lawyers <- EMPLOYS <- current firms
        {
          edgeTypes: ["EMPLOYS"],
          direction: "inbound",
          targetNodeType: "firm",
          maxDepth: 1,
        },
      ],
      filters: {},
    };

    return extractSubgraph(graph, strategy);
  },

  /**
   * Find firms connected through shared lawyers (multi-hop traversal).
   * firm -> EMPLOYS/FORMERLY_EMPLOYED -> lawyer -> EMPLOYS/FORMERLY_EMPLOYED -> firm
   */
  firmConnectionNetwork(
    graph: Graph<GraphNodeAttrs, GraphEdgeAttrs>,
    firmName: string,
    maxHops: number = 2,
  ): SubgraphContext {
    // For connection networks, we alternate firm->lawyer->firm steps
    const traversals: TraversalStep[] = [];
    const hops = Math.min(maxHops, 4); // Cap at 4 to avoid explosion

    for (let i = 0; i < hops; i++) {
      if (i % 2 === 0) {
        // From firm(s), find lawyers
        traversals.push({
          edgeTypes: ["EMPLOYS", "FORMERLY_EMPLOYED"],
          direction: i === 0 ? "outbound" : "both",
          targetNodeType: "lawyer",
          maxDepth: 1,
        });
      } else {
        // From lawyers, find firms
        traversals.push({
          edgeTypes: ["EMPLOYS", "FORMERLY_EMPLOYED"],
          direction: "inbound",
          targetNodeType: "firm",
          maxDepth: 1,
        });
      }
    }

    const strategy: TraversalStrategy = {
      intent: `Connection network around ${firmName} (${maxHops} hops)`,
      startNodes: [
        {
          nodeType: "firm",
          match: { label: firmName },
        },
      ],
      traversals,
      filters: {},
    };

    return extractSubgraph(graph, strategy);
  },
};

// ─── Serialization ───────────────────────────────────────────────────────────

/**
 * Convert a SubgraphContext to compact plain-text for Claude's context window.
 * Groups by node type, shows edges inline, and appends key paths.
 */
/** Strip the type prefix from a graph node ID to get the raw database ID */
function rawId(graphNodeId: string): string {
  const colonIdx = graphNodeId.indexOf(":");
  return colonIdx >= 0 ? graphNodeId.slice(colonIdx + 1) : graphNodeId;
}

export function serializeContext(ctx: SubgraphContext): string {
  if (ctx.nodes.length === 0) {
    return `=== GRAPH CONTEXT (0 nodes, 0 edges) ===\n${ctx.summary}\n\nNo data found.`;
  }

  const lines: string[] = [];
  lines.push(
    `=== GRAPH CONTEXT (${ctx.nodes.length} nodes, ${ctx.edges.length} edges) ===`,
  );
  lines.push(ctx.summary);
  lines.push("");

  // Index edges by source and target for fast lookup
  const outEdges = new Map<string, SubgraphContext["edges"]>();
  const inEdges = new Map<string, SubgraphContext["edges"]>();
  for (const e of ctx.edges) {
    if (!outEdges.has(e.source)) outEdges.set(e.source, []);
    outEdges.get(e.source)!.push(e);
    if (!inEdges.has(e.target)) inEdges.set(e.target, []);
    inEdges.get(e.target)!.push(e);
  }

  // Index nodes by type
  const nodesByType = new Map<GraphNodeType, SubgraphContext["nodes"]>();
  for (const n of ctx.nodes) {
    if (!nodesByType.has(n.type)) nodesByType.set(n.type, []);
    nodesByType.get(n.type)!.push(n);
  }

  // Node lookup
  const nodeById = new Map<string, SubgraphContext["nodes"][0]>();
  for (const n of ctx.nodes) nodeById.set(n.id, n);

  // ── Firms ──
  const firms = nodesByType.get("firm") ?? [];
  if (firms.length > 0) {
    lines.push("## Firms");
    for (const firm of firms) {
      const a = firm.attrs as Record<string, unknown>;
      const tags: string[] = [];
      if (a.firmType) tags.push(a.firmType as string);
      if (a.city) tags.push(a.city as string);
      if (typeof a.npsScore === "number" && a.npsTotal && (a.npsTotal as number) > 0) {
        const sign = (a.npsScore as number) >= 0 ? "+" : "";
        tags.push(`NPS: ${sign}${a.npsScore}`);
      }
      // Best band / tier from rankings
      if (typeof a.bestBand === "number") tags.push(`Band ${a.bestBand}`);
      if (typeof a.bestTier === "number") tags.push(`Tier ${a.bestTier}`);

      lines.push(`- [${firm.label}] (id=${rawId(firm.id)}) (${tags.join(" | ")})`);

      // EMPLOYS edges
      const employs = (outEdges.get(firm.id) ?? []).filter(
        (e) => e.type === "EMPLOYS",
      );
      if (employs.length > 0) {
        const lawyerParts = employs
          .map((e) => {
            const target = nodeById.get(e.target);
            const role = (e.attrs as Record<string, unknown>).role;
            return target
              ? `${target.label}${role ? ` (${role})` : ""}`
              : null;
          })
          .filter(Boolean);
        if (lawyerParts.length > 0) {
          lines.push(`  -> EMPLOYS: ${lawyerParts.join(", ")}`);
        }
      }

      // PRACTICES edges
      const practices = (outEdges.get(firm.id) ?? []).filter(
        (e) => e.type === "PRACTICES",
      );
      if (practices.length > 0) {
        const paParts = practices
          .map((e) => {
            const target = nodeById.get(e.target);
            const jur = (e.attrs as Record<string, unknown>).jurisdictionName;
            return target
              ? `${target.label}${jur ? ` (${jur})` : ""}`
              : null;
          })
          .filter(Boolean);
        if (paParts.length > 0) {
          lines.push(`  -> PRACTICES: ${paParts.join(", ")}`);
        }
      }

      // FIRM_RANKED edges
      const ranked = (outEdges.get(firm.id) ?? []).filter(
        (e) => e.type === "FIRM_RANKED",
      );
      if (ranked.length > 0) {
        const rankParts = ranked
          .map((e) => {
            const target = nodeById.get(e.target);
            const ea = e.attrs as Record<string, unknown>;
            const parts: string[] = [];
            if (target) parts.push(target.label);
            if (typeof ea.band === "number") parts.push(`Band ${ea.band}`);
            if (typeof ea.tier === "number") parts.push(`Tier ${ea.tier}`);
            if (ea.practiceAreaName) parts.push(ea.practiceAreaName as string);
            if (ea.jurisdictionName) parts.push(ea.jurisdictionName as string);
            return parts.join(" ");
          })
          .filter((s) => s.length > 0);
        if (rankParts.length > 0) {
          lines.push(`  -> RANKED: ${rankParts.join("; ")}`);
        }
      }

      // Engagement + rating summary
      const engagementsIn = (inEdges.get(firm.id) ?? []).filter(
        (e) => e.type === "ENGAGED_FIRM",
      );
      const engCount = a.engagementCount ?? engagementsIn.length;
      const avgRat = a.avgRating;
      const engParts: string[] = [];
      if (engCount) engParts.push(`${engCount} engagements`);
      if (typeof avgRat === "number") engParts.push(`Avg rating: ${avgRat}/5`);
      if (engParts.length > 0) {
        lines.push(`  -> ${engParts.join(" | ")}`);
      }
    }
    lines.push("");
  }

  // ── Lawyers ──
  const lawyers = nodesByType.get("lawyer") ?? [];
  if (lawyers.length > 0) {
    lines.push("## Lawyers");
    for (const lawyer of lawyers) {
      const a = lawyer.attrs as Record<string, unknown>;
      const tags: string[] = [];
      if (a.currentFirmName) tags.push(`at ${a.currentFirmName}`);
      if (a.title) tags.push(a.title as string);
      if (typeof a.qualificationYear === "number") {
        const currentYear = new Date().getFullYear();
        const pqe = currentYear - (a.qualificationYear as number);
        if (pqe > 0) tags.push(`PQE: ${pqe} yrs`);
      }
      if (typeof a.npsScore === "number" && a.npsTotal && (a.npsTotal as number) > 0) {
        const sign = (a.npsScore as number) >= 0 ? "+" : "";
        tags.push(`NPS: ${sign}${a.npsScore}`);
      }

      const lawyerFirmRawId = a.currentFirmId ? rawId(String(a.currentFirmId)) : null;
      lines.push(`- [${lawyer.label}] (id=${rawId(lawyer.id)}${lawyerFirmRawId ? `, firmId=${lawyerFirmRawId}` : ""}) (${tags.join(" | ")})`);

      // SPECIALIZES_IN edges
      const specializes = (outEdges.get(lawyer.id) ?? []).filter(
        (e) => e.type === "SPECIALIZES_IN",
      );
      if (specializes.length > 0) {
        const spParts = specializes
          .map((e) => {
            const target = nodeById.get(e.target);
            const jur = (e.attrs as Record<string, unknown>).jurisdictionName;
            return target
              ? `${target.label}${jur ? ` (${jur})` : ""}`
              : null;
          })
          .filter(Boolean);
        if (spParts.length > 0) {
          lines.push(`  -> SPECIALIZES_IN: ${spParts.join(", ")}`);
        }
      }

      // FORMERLY_EMPLOYED (inbound from firms)
      const formerEdges = (inEdges.get(lawyer.id) ?? []).filter(
        (e) => e.type === "FORMERLY_EMPLOYED",
      );
      if (formerEdges.length > 0) {
        const formerParts = formerEdges
          .map((e) => {
            const source = nodeById.get(e.source);
            const ea = e.attrs as Record<string, unknown>;
            const dates: string[] = [];
            if (ea.startDate) dates.push(ea.startDate as string);
            if (ea.endDate) dates.push(ea.endDate as string);
            const dateStr = dates.length > 0 ? ` (${dates.join("-")})` : "";
            return source ? `${source.label}${dateStr}` : null;
          })
          .filter(Boolean);
        if (formerParts.length > 0) {
          lines.push(`  -> Previously: ${formerParts.join(", ")}`);
        }
      }
    }
    lines.push("");
  }

  // ── Engagements ──
  const engagements = nodesByType.get("engagement") ?? [];
  if (engagements.length > 0) {
    lines.push("## Engagements");
    for (const eng of engagements) {
      const a = eng.attrs as Record<string, unknown>;
      const parts: string[] = [a.matterName as string ?? eng.label];

      // Find the engaged firm
      const firmEdges = (outEdges.get(eng.id) ?? []).filter(
        (e) => e.type === "ENGAGED_FIRM",
      );
      if (firmEdges.length > 0) {
        const firm = nodeById.get(firmEdges[0].target);
        if (firm) parts.push(firm.label);
      }

      if (a.matterType) parts.push(a.matterType as string);
      if (a.outcome) parts.push(a.outcome as string);
      if (typeof a.totalFeesUsd === "number") {
        parts.push(formatCurrency(a.totalFeesUsd as number));
      }

      lines.push(`- ${parts.join(" -- ")}`);
    }
    lines.push("");
  }

  // ── Practice Areas (if any standalone) ──
  const practiceAreas = nodesByType.get("practiceArea") ?? [];
  if (practiceAreas.length > 0) {
    lines.push("## Practice Areas");
    for (const pa of practiceAreas) {
      lines.push(`- ${pa.label}`);
    }
    lines.push("");
  }

  // ── Jurisdictions (if any standalone) ──
  const jurisdictions = nodesByType.get("jurisdiction") ?? [];
  if (jurisdictions.length > 0) {
    lines.push("## Jurisdictions");
    for (const j of jurisdictions) {
      const a = j.attrs as Record<string, unknown>;
      const region = a.region ? ` (${a.region})` : "";
      lines.push(`- ${j.label}${region}`);
    }
    lines.push("");
  }

  // ── Paths ──
  if (ctx.paths.length > 0) {
    lines.push("## Paths");
    for (const p of ctx.paths.slice(0, 20)) {
      lines.push(`- ${p.description}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount.toFixed(0)}`;
}
