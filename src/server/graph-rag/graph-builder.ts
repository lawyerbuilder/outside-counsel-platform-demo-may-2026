// ─── GraphRAG: Knowledge Graph Builder ──────────────────────────────────────
// Builds an in-memory knowledge graph from Prisma data using graphology.
// The graph is cached with a 5-minute TTL and can be invalidated on-demand.

import Graph from "graphology";
import { prisma } from "@/server/db";
import { computeNps } from "@/server/insights";
import type {
  GraphNodeType,
  GraphEdgeType,
  GraphNodeAttrs,
  GraphEdgeAttrs,
  FirmNodeAttrs,
  LawyerNodeAttrs,
  PracticeAreaNodeAttrs,
  JurisdictionNodeAttrs,
  EngagementNodeAttrs,
  RankingSourceNodeAttrs,
  EntityNodeAttrs,
} from "./types";

// ─── Public Type ────────────────────────────────────────────────────────────

export type LegalKnowledgeGraph = Graph<GraphNodeAttrs, GraphEdgeAttrs>;

// ─── Singleton Cache ────────────────────────────────────────────────────────

let _graph: LegalKnowledgeGraph | null = null;
let _lastBuiltAt: number = 0;
const GRAPH_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Returns the cached graph if still fresh, otherwise rebuilds it.
 */
export async function getGraph(): Promise<LegalKnowledgeGraph> {
  const now = Date.now();
  if (_graph && now - _lastBuiltAt < GRAPH_TTL_MS) {
    return _graph;
  }
  _graph = await buildGraph();
  _lastBuiltAt = Date.now();
  return _graph;
}

/**
 * Forces the next `getGraph()` call to rebuild from scratch.
 */
export async function invalidateGraph(): Promise<void> {
  _graph = null;
  _lastBuiltAt = 0;
}

// ─── Stats ──────────────────────────────────────────────────────────────────

export type GraphStats = {
  nodeCount: number;
  edgeCount: number;
  nodesByType: Record<GraphNodeType, number>;
  edgesByType: Record<GraphEdgeType, number>;
};

export function getGraphStats(graph: LegalKnowledgeGraph): GraphStats {
  const nodesByType: Record<string, number> = {};
  const edgesByType: Record<string, number> = {};

  graph.forEachNode((_nodeId, attrs) => {
    const t = attrs.nodeType;
    nodesByType[t] = (nodesByType[t] ?? 0) + 1;
  });

  graph.forEachEdge((_edgeId, attrs) => {
    const t = attrs.edgeType;
    edgesByType[t] = (edgesByType[t] ?? 0) + 1;
  });

  return {
    nodeCount: graph.order,
    edgeCount: graph.size,
    nodesByType: nodesByType as Record<GraphNodeType, number>,
    edgesByType: edgesByType as Record<GraphEdgeType, number>,
  };
}

// ─── Edge Weight Constants ──────────────────────────────────────────────────

const WEIGHT = {
  EMPLOYS: 4,
  FORMERLY_EMPLOYED: 2,
  PRACTICES: 3,
  SPECIALIZES_IN: 3,
  OPERATES_IN: 2,
  FIRM_RANKED: 2,
  LAWYER_RANKED: 2,
  ENGAGED_FIRM: 3,
  ENGAGED_LAWYER: 3,
  ENGAGED_IN: 2,
  SPIN_OFF_OF: 5,
} as const satisfies Record<GraphEdgeType, number>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function toISODate(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function nodeId(type: string, id: string): string {
  return `${type}:${id}`;
}

// ─── Builder ────────────────────────────────────────────────────────────────

async function buildGraph(): Promise<LegalKnowledgeGraph> {
  const t0 = performance.now();

  const graph = new Graph<GraphNodeAttrs, GraphEdgeAttrs>({
    multi: true,
    type: "directed",
  });

  // ── 1. Fetch all data in parallel ─────────────────────────────────────────

  const [
    firms,
    lawyers,
    practiceAreas,
    jurisdictions,
    entities,
    rankingSources,
    firmLawyers,
    firmPracticeAreas,
    lawyerPracticeAreas,
    firmRankings,
    lawyerRankings,
    engagements,
    firmRecommendations,
    lawyerRecommendations,
    firmRatings,
    lawyerRatings,
  ] = await Promise.all([
    prisma.firm.findMany({
      where: { isActive: true, deletedAt: null },
    }),
    prisma.lawyer.findMany({
      where: { isActive: true, deletedAt: null },
    }),
    prisma.practiceArea.findMany(),
    prisma.jurisdiction.findMany(),
    prisma.entity.findMany({ where: { isActive: true } }),
    prisma.rankingSource.findMany(),
    prisma.firmLawyer.findMany({
      include: {
        firm: { select: { id: true, name: true } },
        lawyer: { select: { id: true, name: true } },
      },
    }),
    prisma.firmPracticeArea.findMany({
      include: {
        practiceArea: { select: { id: true, name: true } },
        jurisdiction: { select: { id: true, name: true } },
      },
    }),
    prisma.lawyerPracticeArea.findMany({
      include: {
        practiceArea: { select: { id: true, name: true } },
        jurisdiction: { select: { id: true, name: true } },
      },
    }),
    prisma.firmRanking.findMany({
      include: {
        practiceArea: { select: { id: true, name: true } },
        jurisdiction: { select: { id: true, name: true } },
      },
    }),
    prisma.lawyerRanking.findMany({
      include: {
        practiceArea: { select: { id: true, name: true } },
        jurisdiction: { select: { id: true, name: true } },
      },
    }),
    prisma.engagement.findMany({
      where: { deletedAt: null },
    }),
    prisma.recommendation.findMany({
      where: { targetType: "FIRM" },
      select: { firmId: true, npsScore: true },
    }),
    prisma.recommendation.findMany({
      where: { targetType: "LAWYER" },
      select: { lawyerId: true, npsScore: true },
    }),
    prisma.internalRating.findMany({
      where: { targetType: "FIRM" },
      select: { firmId: true, overallScore: true },
    }),
    prisma.internalRating.findMany({
      where: { targetType: "LAWYER" },
      select: { lawyerId: true, overallScore: true },
    }),
  ]);

  // ── 2. Build lookup maps for aggregated metrics ───────────────────────────

  // --- Firm NPS ---
  const firmNpsMap = new Map<string, number[]>();
  for (const r of firmRecommendations) {
    if (!r.firmId) continue;
    const arr = firmNpsMap.get(r.firmId);
    if (arr) arr.push(r.npsScore);
    else firmNpsMap.set(r.firmId, [r.npsScore]);
  }

  // --- Lawyer NPS ---
  const lawyerNpsMap = new Map<string, number[]>();
  for (const r of lawyerRecommendations) {
    if (!r.lawyerId) continue;
    const arr = lawyerNpsMap.get(r.lawyerId);
    if (arr) arr.push(r.npsScore);
    else lawyerNpsMap.set(r.lawyerId, [r.npsScore]);
  }

  // --- Firm avg rating ---
  const firmRatingMap = new Map<string, number[]>();
  for (const r of firmRatings) {
    if (!r.firmId) continue;
    const arr = firmRatingMap.get(r.firmId);
    if (arr) arr.push(r.overallScore);
    else firmRatingMap.set(r.firmId, [r.overallScore]);
  }

  // --- Lawyer avg rating ---
  const lawyerRatingMap = new Map<string, number[]>();
  for (const r of lawyerRatings) {
    if (!r.lawyerId) continue;
    const arr = lawyerRatingMap.get(r.lawyerId);
    if (arr) arr.push(r.overallScore);
    else lawyerRatingMap.set(r.lawyerId, [r.overallScore]);
  }

  // --- Firm engagement counts ---
  const firmEngagementCount = new Map<string, number>();
  const lawyerEngagementCount = new Map<string, number>();
  for (const e of engagements) {
    firmEngagementCount.set(e.firmId, (firmEngagementCount.get(e.firmId) ?? 0) + 1);
    if (e.lawyerId) {
      lawyerEngagementCount.set(e.lawyerId, (lawyerEngagementCount.get(e.lawyerId) ?? 0) + 1);
    }
  }

  // --- Firm ranking counts & best band/tier ---
  const firmRankingCount = new Map<string, number>();
  const firmBestBand = new Map<string, number>();
  const firmBestTier = new Map<string, number>();
  for (const fr of firmRankings) {
    firmRankingCount.set(fr.firmId, (firmRankingCount.get(fr.firmId) ?? 0) + 1);
    if (fr.band != null) {
      const cur = firmBestBand.get(fr.firmId);
      if (cur == null || fr.band < cur) firmBestBand.set(fr.firmId, fr.band);
    }
    if (fr.tier != null) {
      const cur = firmBestTier.get(fr.firmId);
      if (cur == null || fr.tier < cur) firmBestTier.set(fr.firmId, fr.tier);
    }
  }

  // --- Lawyer ranking counts & best category ---
  const lawyerRankingCount = new Map<string, number>();
  const lawyerBestCategory = new Map<string, string>();
  const categoryRank: Record<string, number> = {
    STAR: 0,
    LEADING: 1,
    RECOMMENDED: 2,
    UP_AND_COMING: 3,
    RECOGNISED: 4,
  };
  for (const lr of lawyerRankings) {
    lawyerRankingCount.set(lr.lawyerId, (lawyerRankingCount.get(lr.lawyerId) ?? 0) + 1);
    const existing = lawyerBestCategory.get(lr.lawyerId);
    if (!existing || (categoryRank[lr.category] ?? 99) < (categoryRank[existing] ?? 99)) {
      lawyerBestCategory.set(lr.lawyerId, lr.category);
    }
  }

  // --- Firm practice area names & jurisdiction names ---
  const firmPracticeAreaNames = new Map<string, Set<string>>();
  const firmJurisdictionNames = new Map<string, Set<string>>();
  for (const fpa of firmPracticeAreas) {
    // Practice area names
    let paSet = firmPracticeAreaNames.get(fpa.firmId);
    if (!paSet) {
      paSet = new Set();
      firmPracticeAreaNames.set(fpa.firmId, paSet);
    }
    paSet.add(fpa.practiceArea.name);

    // Jurisdiction names
    if (fpa.jurisdiction) {
      let jurSet = firmJurisdictionNames.get(fpa.firmId);
      if (!jurSet) {
        jurSet = new Set();
        firmJurisdictionNames.set(fpa.firmId, jurSet);
      }
      jurSet.add(fpa.jurisdiction.name);
    }
  }

  // --- Lawyer practice area names ---
  const lawyerPracticeAreaNames = new Map<string, Set<string>>();
  for (const lpa of lawyerPracticeAreas) {
    let paSet = lawyerPracticeAreaNames.get(lpa.lawyerId);
    if (!paSet) {
      paSet = new Set();
      lawyerPracticeAreaNames.set(lpa.lawyerId, paSet);
    }
    paSet.add(lpa.practiceArea.name);
  }

  // --- Lawyer current firm (from FirmLawyer where isCurrent) ---
  const lawyerCurrentFirm = new Map<string, { firmId: string; firmName: string }>();
  for (const fl of firmLawyers) {
    if (fl.isCurrent) {
      lawyerCurrentFirm.set(fl.lawyerId, {
        firmId: fl.firmId,
        firmName: fl.firm.name,
      });
    }
  }

  // ── 3. Add nodes ──────────────────────────────────────────────────────────

  // --- Firm nodes ---
  for (const firm of firms) {
    const npsScores = firmNpsMap.get(firm.id) ?? [];
    const nps = computeNps(npsScores);
    const ratings = firmRatingMap.get(firm.id) ?? [];
    const avgRating =
      ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100
        : null;
    const engCount = firmEngagementCount.get(firm.id) ?? 0;
    const rkCount = firmRankingCount.get(firm.id) ?? 0;
    const bestBand = firmBestBand.get(firm.id) ?? null;
    const bestTier = firmBestTier.get(firm.id) ?? null;
    const paNames = Array.from(firmPracticeAreaNames.get(firm.id) ?? []);
    const jurNames = Array.from(firmJurisdictionNames.get(firm.id) ?? []);

    // Composite score: simple weighted blend (NPS 30%, rating 30%, rankings 20%, engagements 20%)
    const normalizedNps = (nps.score + 100) / 200; // 0..1
    const normalizedRating = avgRating != null ? avgRating / 5 : 0;
    const normalizedRanking = bestBand != null ? Math.max(0, 1 - (bestBand - 1) / 5) : 0;
    const normalizedEngagement = Math.min(engCount / 20, 1); // cap at 20
    const compositeScore =
      Math.round(
        (normalizedNps * 0.3 +
          normalizedRating * 0.3 +
          normalizedRanking * 0.2 +
          normalizedEngagement * 0.2) *
          10000
      ) / 100; // 0..100

    const attrs: FirmNodeAttrs = {
      nodeType: "firm",
      label: firm.name,
      shortName: firm.shortName,
      country: firm.country,
      city: firm.city,
      firmType: firm.firmType,
      panelStatus: firm.panelStatus,
      headcount: firm.headcount,
      foundedYear: firm.foundedYear,
      parentFirmId: firm.parentFirmId,
      internalNotes: firm.internalNotes ?? null,
      website: firm.website,
      npsScore: nps.score,
      npsPromoters: nps.promoters,
      npsDetractors: nps.detractors,
      npsTotal: nps.total,
      avgRating,
      ratingCount: ratings.length,
      engagementCount: engCount,
      rankingCount: rkCount,
      compositeScore,
      bestBand,
      bestTier,
      practiceAreaNames: paNames,
      jurisdictionNames: jurNames,
    };

    graph.addNode(nodeId("firm", firm.id), attrs);
  }

  // --- Lawyer nodes ---
  for (const lawyer of lawyers) {
    const npsScores = lawyerNpsMap.get(lawyer.id) ?? [];
    const nps = computeNps(npsScores);
    const ratings = lawyerRatingMap.get(lawyer.id) ?? [];
    const avgRating =
      ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100
        : null;
    const engCount = lawyerEngagementCount.get(lawyer.id) ?? 0;
    const rkCount = lawyerRankingCount.get(lawyer.id) ?? 0;
    const bestCat = lawyerBestCategory.get(lawyer.id) ?? null;
    const paNames = Array.from(lawyerPracticeAreaNames.get(lawyer.id) ?? []);
    const currentFirm = lawyerCurrentFirm.get(lawyer.id);

    // Composite score: NPS 30%, rating 30%, rankings 20%, engagements 20%
    const normalizedNps = (nps.score + 100) / 200;
    const normalizedRating = avgRating != null ? avgRating / 5 : 0;
    const normalizedRanking = rkCount > 0 ? Math.min(rkCount / 5, 1) : 0;
    const normalizedEngagement = Math.min(engCount / 10, 1);
    const compositeScore =
      Math.round(
        (normalizedNps * 0.3 +
          normalizedRating * 0.3 +
          normalizedRanking * 0.2 +
          normalizedEngagement * 0.2) *
          10000
      ) / 100;

    const attrs: LawyerNodeAttrs = {
      nodeType: "lawyer",
      label: lawyer.name,
      title: lawyer.title,
      qualificationYear: lawyer.qualificationYear,
      barAdmissions: lawyer.barAdmissions,
      bio: lawyer.bio,
      npsScore: nps.score,
      npsTotal: nps.total,
      avgRating,
      engagementCount: engCount,
      rankingCount: rkCount,
      compositeScore,
      bestCategory: bestCat,
      practiceAreaNames: paNames,
      currentFirmId: currentFirm?.firmId ?? null,
      currentFirmName: currentFirm?.firmName ?? null,
    };

    graph.addNode(nodeId("lawyer", lawyer.id), attrs);
  }

  // --- Practice area nodes ---
  for (const pa of practiceAreas) {
    const attrs: PracticeAreaNodeAttrs = {
      nodeType: "practiceArea",
      label: pa.name,
      slug: pa.slug,
    };
    graph.addNode(nodeId("pa", pa.id), attrs);
  }

  // --- Jurisdiction nodes ---
  for (const jur of jurisdictions) {
    const attrs: JurisdictionNodeAttrs = {
      nodeType: "jurisdiction",
      label: jur.name,
      country: jur.country,
      region: jur.region,
    };
    graph.addNode(nodeId("jur", jur.id), attrs);
  }

  // --- Entity nodes ---
  for (const entity of entities) {
    const attrs: EntityNodeAttrs = {
      nodeType: "entity",
      label: entity.name,
      shortName: entity.shortName,
      country: entity.country,
    };
    graph.addNode(nodeId("entity", entity.id), attrs);
  }

  // --- Ranking source nodes ---
  for (const rs of rankingSources) {
    const attrs: RankingSourceNodeAttrs = {
      nodeType: "rankingSource",
      label: rs.name,
      publisher: rs.publisher,
      editionYear: rs.editionYear,
    };
    graph.addNode(nodeId("rs", rs.id), attrs);
  }

  // --- Engagement nodes ---
  for (const eng of engagements) {
    const attrs: EngagementNodeAttrs = {
      nodeType: "engagement",
      label: eng.matterName,
      matterName: eng.matterName,
      matterType: eng.matterType,
      outcome: eng.outcome,
      totalFeesUsd: eng.totalFeesUsd,
      entityName: eng.entityName,
      startDate: eng.startDate.toISOString(),
      endDate: toISODate(eng.endDate),
    };
    graph.addNode(nodeId("eng", eng.id), attrs);
  }

  // ── 4. Add edges ──────────────────────────────────────────────────────────

  // --- EMPLOYS / FORMERLY_EMPLOYED: firm → lawyer ---
  for (const fl of firmLawyers) {
    const source = nodeId("firm", fl.firmId);
    const target = nodeId("lawyer", fl.lawyerId);
    if (!graph.hasNode(source) || !graph.hasNode(target)) continue;

    if (fl.isCurrent) {
      graph.addEdge(source, target, {
        edgeType: "EMPLOYS",
        weight: WEIGHT.EMPLOYS,
        role: fl.role,
        isCurrent: true,
        startDate: toISODate(fl.startDate) ?? undefined,
      });
    } else {
      graph.addEdge(source, target, {
        edgeType: "FORMERLY_EMPLOYED",
        weight: WEIGHT.FORMERLY_EMPLOYED,
        role: fl.role,
        isCurrent: false,
        startDate: toISODate(fl.startDate) ?? undefined,
        endDate: toISODate(fl.endDate) ?? undefined,
      });
    }
  }

  // --- PRACTICES: firm → practiceArea (with optional jurisdiction context) ---
  for (const fpa of firmPracticeAreas) {
    const source = nodeId("firm", fpa.firmId);
    const target = nodeId("pa", fpa.practiceAreaId);
    if (!graph.hasNode(source) || !graph.hasNode(target)) continue;

    graph.addEdge(source, target, {
      edgeType: "PRACTICES",
      weight: WEIGHT.PRACTICES,
      jurisdictionId: fpa.jurisdictionId ?? undefined,
      jurisdictionName: fpa.jurisdiction?.name ?? undefined,
    });
  }

  // --- SPECIALIZES_IN: lawyer → practiceArea ---
  for (const lpa of lawyerPracticeAreas) {
    const source = nodeId("lawyer", lpa.lawyerId);
    const target = nodeId("pa", lpa.practiceAreaId);
    if (!graph.hasNode(source) || !graph.hasNode(target)) continue;

    graph.addEdge(source, target, {
      edgeType: "SPECIALIZES_IN",
      weight: WEIGHT.SPECIALIZES_IN,
      jurisdictionId: lpa.jurisdictionId ?? undefined,
      jurisdictionName: lpa.jurisdiction?.name ?? undefined,
    });
  }

  // --- OPERATES_IN: firm → jurisdiction (derived from distinct jurisdictions in FirmPracticeArea) ---
  const firmJurisdictionPairs = new Set<string>();
  for (const fpa of firmPracticeAreas) {
    if (!fpa.jurisdictionId) continue;
    const pairKey = `${fpa.firmId}|${fpa.jurisdictionId}`;
    if (firmJurisdictionPairs.has(pairKey)) continue;
    firmJurisdictionPairs.add(pairKey);

    const source = nodeId("firm", fpa.firmId);
    const target = nodeId("jur", fpa.jurisdictionId);
    if (!graph.hasNode(source) || !graph.hasNode(target)) continue;

    graph.addEdge(source, target, {
      edgeType: "OPERATES_IN",
      weight: WEIGHT.OPERATES_IN,
    });
  }

  // --- FIRM_RANKED: firm → rankingSource ---
  for (const fr of firmRankings) {
    const source = nodeId("firm", fr.firmId);
    const target = nodeId("rs", fr.rankingSourceId);
    if (!graph.hasNode(source) || !graph.hasNode(target)) continue;

    graph.addEdge(source, target, {
      edgeType: "FIRM_RANKED",
      weight: WEIGHT.FIRM_RANKED,
      band: fr.band,
      tier: fr.tier,
      starRating: fr.starRating,
      practiceAreaId: fr.practiceAreaId,
      practiceAreaName: fr.practiceArea.name,
      jurisdictionId: fr.jurisdictionId,
      jurisdictionName: fr.jurisdiction.name,
    });
  }

  // --- LAWYER_RANKED: lawyer → rankingSource ---
  for (const lr of lawyerRankings) {
    const source = nodeId("lawyer", lr.lawyerId);
    const target = nodeId("rs", lr.rankingSourceId);
    if (!graph.hasNode(source) || !graph.hasNode(target)) continue;

    graph.addEdge(source, target, {
      edgeType: "LAWYER_RANKED",
      weight: WEIGHT.LAWYER_RANKED,
      category: lr.category,
      practiceAreaId: lr.practiceAreaId,
      practiceAreaName: lr.practiceArea.name,
      jurisdictionId: lr.jurisdictionId,
      jurisdictionName: lr.jurisdiction.name,
    });
  }

  // --- ENGAGED_FIRM: engagement → firm ---
  for (const eng of engagements) {
    const source = nodeId("eng", eng.id);
    const target = nodeId("firm", eng.firmId);
    if (!graph.hasNode(source) || !graph.hasNode(target)) continue;

    graph.addEdge(source, target, {
      edgeType: "ENGAGED_FIRM",
      weight: WEIGHT.ENGAGED_FIRM,
    });
  }

  // --- ENGAGED_LAWYER: engagement → lawyer ---
  for (const eng of engagements) {
    if (!eng.lawyerId) continue;
    const source = nodeId("eng", eng.id);
    const target = nodeId("lawyer", eng.lawyerId);
    if (!graph.hasNode(source) || !graph.hasNode(target)) continue;

    graph.addEdge(source, target, {
      edgeType: "ENGAGED_LAWYER",
      weight: WEIGHT.ENGAGED_LAWYER,
    });
  }

  // --- ENGAGED_IN: engagement → jurisdiction ---
  for (const eng of engagements) {
    if (!eng.jurisdictionId) continue;
    const source = nodeId("eng", eng.id);
    const target = nodeId("jur", eng.jurisdictionId);
    if (!graph.hasNode(source) || !graph.hasNode(target)) continue;

    graph.addEdge(source, target, {
      edgeType: "ENGAGED_IN",
      weight: WEIGHT.ENGAGED_IN,
    });
  }

  // --- SPIN_OFF_OF: child firm → parent firm ---
  for (const firm of firms) {
    if (!firm.parentFirmId) continue;
    const source = nodeId("firm", firm.id);
    const target = nodeId("firm", firm.parentFirmId);
    if (!graph.hasNode(source) || !graph.hasNode(target)) continue;

    graph.addEdge(source, target, {
      edgeType: "SPIN_OFF_OF",
      weight: WEIGHT.SPIN_OFF_OF,
    });
  }

  // ── 5. Log timing ─────────────────────────────────────────────────────────

  const elapsed = Math.round(performance.now() - t0);
  console.log(
    `[GraphRAG] Graph built: ${graph.order} nodes, ${graph.size} edges in ${elapsed}ms`
  );

  return graph;
}
