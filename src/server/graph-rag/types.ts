// ─── GraphRAG Type Definitions ────────────────────────────────────────────────
// Knowledge graph schema for the Outside Counsel Platform.
// Nodes represent firms, lawyers, practice areas, jurisdictions, etc.
// Edges represent relationships (EMPLOYS, PRACTICES, RANKED, etc.)

export type GraphNodeType =
  | "firm"
  | "lawyer"
  | "practiceArea"
  | "jurisdiction"
  | "entity"
  | "rankingSource"
  | "engagement";

export type GraphEdgeType =
  | "EMPLOYS"          // firm → lawyer
  | "FORMERLY_EMPLOYED" // firm → lawyer (alumni)
  | "PRACTICES"        // firm → practiceArea (in jurisdiction)
  | "SPECIALIZES_IN"   // lawyer → practiceArea (in jurisdiction)
  | "OPERATES_IN"      // firm → jurisdiction
  | "FIRM_RANKED"      // firm → rankingSource
  | "LAWYER_RANKED"    // lawyer → rankingSource
  | "ENGAGED_FIRM"     // engagement → firm
  | "ENGAGED_LAWYER"   // engagement → lawyer
  | "ENGAGED_IN"       // engagement → jurisdiction
  | "SPIN_OFF_OF";     // firm → firm (child → parent)

// ─── Node Attribute Types ─────────────────────────────────────────────────────

export type BaseNodeAttrs = {
  nodeType: GraphNodeType;
  label: string;
};

export type FirmNodeAttrs = BaseNodeAttrs & {
  nodeType: "firm";
  shortName: string | null;
  country: string;
  city: string;
  firmType: string;
  panelStatus: string;
  headcount: number | null;
  foundedYear: number | null;
  parentFirmId: string | null;
  internalNotes: string | null;
  website: string | null;
  // Aggregated metrics
  npsScore: number;
  npsPromoters: number;
  npsDetractors: number;
  npsTotal: number;
  avgRating: number | null;
  ratingCount: number;
  engagementCount: number;
  rankingCount: number;
  compositeScore: number;
  bestBand: number | null;
  bestTier: number | null;
  // Denormalized for search
  practiceAreaNames: string[];
  jurisdictionNames: string[];
};

export type LawyerNodeAttrs = BaseNodeAttrs & {
  nodeType: "lawyer";
  title: string | null;
  qualificationYear: number | null;
  barAdmissions: string | null;
  bio: string | null;
  // Aggregated metrics
  npsScore: number;
  npsTotal: number;
  avgRating: number | null;
  engagementCount: number;
  rankingCount: number;
  compositeScore: number;
  bestCategory: string | null;
  // Denormalized
  practiceAreaNames: string[];
  currentFirmId: string | null;
  currentFirmName: string | null;
};

export type PracticeAreaNodeAttrs = BaseNodeAttrs & {
  nodeType: "practiceArea";
  slug: string;
};

export type JurisdictionNodeAttrs = BaseNodeAttrs & {
  nodeType: "jurisdiction";
  country: string;
  region: string;
};

export type EntityNodeAttrs = BaseNodeAttrs & {
  nodeType: "entity";
  shortName: string | null;
  country: string;
};

export type RankingSourceNodeAttrs = BaseNodeAttrs & {
  nodeType: "rankingSource";
  publisher: string;
  editionYear: number;
};

export type EngagementNodeAttrs = BaseNodeAttrs & {
  nodeType: "engagement";
  matterName: string;
  matterType: string;
  outcome: string | null;
  totalFeesUsd: number | null;
  entityName: string | null;
  startDate: string;
  endDate: string | null;
};

export type GraphNodeAttrs =
  | FirmNodeAttrs
  | LawyerNodeAttrs
  | PracticeAreaNodeAttrs
  | JurisdictionNodeAttrs
  | EntityNodeAttrs
  | RankingSourceNodeAttrs
  | EngagementNodeAttrs;

// ─── Edge Attribute Types ─────────────────────────────────────────────────────

export type GraphEdgeAttrs = {
  edgeType: GraphEdgeType;
  weight: number; // relevance weight for traversal scoring
  // Contextual attributes (varies by edge type)
  role?: string;
  isCurrent?: boolean;
  startDate?: string;
  endDate?: string;
  band?: number | null;
  tier?: number | null;
  starRating?: number | null;
  category?: string;
  jurisdictionId?: string;
  jurisdictionName?: string;
  practiceAreaId?: string;
  practiceAreaName?: string;
};

// ─── Traversal Types ──────────────────────────────────────────────────────────

export type TraversalStrategy = {
  intent: string;
  startNodes: StartNodeSpec[];
  traversals: TraversalStep[];
  filters: Record<string, unknown>;
  rankBy?: string;
  limit?: number;
};

export type StartNodeSpec = {
  nodeType: GraphNodeType;
  match: Record<string, string | number | boolean>;
};

export type TraversalStep = {
  edgeTypes: GraphEdgeType[];
  direction: "outbound" | "inbound" | "both";
  targetNodeType?: GraphNodeType;
  maxDepth?: number;
  edgeFilter?: Record<string, unknown>;
};

// ─── Query Result Types ───────────────────────────────────────────────────────

export type SubgraphContext = {
  nodes: Array<{
    id: string;
    type: GraphNodeType;
    label: string;
    attrs: Record<string, unknown>;
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: GraphEdgeType;
    attrs: Record<string, unknown>;
  }>;
  paths: Array<{ description: string; nodeIds: string[] }>;
  summary: string;
};

export type GraphQueryResult = {
  answer: string;
  strategy: TraversalStrategy | null;
  context: SubgraphContext;
  stats: {
    graphNodes: number;
    graphEdges: number;
    subgraphNodes: number;
    subgraphEdges: number;
    strategyTimeMs: number;
    traversalTimeMs: number;
    answerTimeMs: number;
    totalTimeMs: number;
    usedFastPath: boolean;
  };
};
