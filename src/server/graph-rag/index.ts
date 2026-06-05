// ─── GraphRAG Barrel Export ───────────────────────────────────────────────────
// Public API for the graph-based retrieval-augmented generation system.

export { getGraph, invalidateGraph, getGraphStats } from "./graph-builder";
export { queryGraph, streamGraphQuery } from "./graph-query";
export {
  extractSubgraph,
  COMMON_TRAVERSALS,
  serializeContext,
} from "./graph-context";
export type { LegalKnowledgeGraph } from "./graph-builder";
export type {
  GraphNodeType,
  GraphEdgeType,
  GraphNodeAttrs,
  GraphEdgeAttrs,
  TraversalStrategy,
  StartNodeSpec,
  TraversalStep,
  SubgraphContext,
  GraphQueryResult,
  FirmNodeAttrs,
  LawyerNodeAttrs,
  PracticeAreaNodeAttrs,
  JurisdictionNodeAttrs,
  EntityNodeAttrs,
  RankingSourceNodeAttrs,
  EngagementNodeAttrs,
} from "./types";
