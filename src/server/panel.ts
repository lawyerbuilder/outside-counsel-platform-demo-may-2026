import { prisma } from "@/server/db";
import { computeNps } from "@/server/insights";

export type PanelAction =
  | "RETAIN_PREFERRED"
  | "RETAIN"
  | "WATCH"
  | "IMPROVEMENT_PLAN"
  | "EXIT_REVIEW";

export type ScorecardTier =
  | "TOP_PERFORMER"
  | "MEETS_EXPECTATIONS"
  | "REQUIRES_IMPROVEMENT"
  | "EXIT_REVIEW";

export type PanelFirmRow = {
  firmId: string;
  firmName: string;
  panelStatus: string;
  tier: ScorecardTier | null;
  nps: number | null;
  npsCount: number;
  totalSpendCents: number;
  lastEngagementDate: Date | null;
  recommendedAction: PanelAction;
  /** true when the action is a computed suggestion, not a persisted review decision */
  isComputed: boolean;
  actionBasis: string | null;
};

export async function getPanelComposition() {
  const groups = await prisma.firm.groupBy({
    by: ["panelStatus"],
    where: { deletedAt: null, isActive: true },
    _count: { id: true },
  });
  const counts: Record<string, number> = {};
  for (const g of groups) counts[g.panelStatus] = g._count.id;
  return counts;
}

function computeRecommendedAction(
  tier: ScorecardTier | null,
  nps: number | null,
  lastEngagementDate: Date | null
): { action: PanelAction; basis: string } {
  if (tier === "EXIT_REVIEW") {
    return { action: "EXIT_REVIEW", basis: "Latest scorecard tier is Exit Review" };
  }
  if (tier === "REQUIRES_IMPROVEMENT" || (nps != null && nps < 0)) {
    return {
      action: "IMPROVEMENT_PLAN",
      basis:
        tier === "REQUIRES_IMPROVEMENT"
          ? "Latest scorecard requires improvement"
          : "Negative internal NPS",
    };
  }
  const eighteenMonthsAgo = new Date();
  eighteenMonthsAgo.setMonth(eighteenMonthsAgo.getMonth() - 18);
  if (lastEngagementDate && lastEngagementDate < eighteenMonthsAgo) {
    return { action: "WATCH", basis: "No engagement in the last 18 months" };
  }
  if (tier === "TOP_PERFORMER" && nps != null && nps >= 50) {
    return { action: "RETAIN_PREFERRED", basis: "Top performer with strong internal NPS" };
  }
  return { action: "RETAIN", basis: "Performance within expectations" };
}

/**
 * Firms with any panel activity (engagement, scorecard, invoice, or review
 * assessment). Avoids listing the hundreds of bulk-imported directory firms
 * that have no relationship history.
 */
export async function getPanelFirmRows(): Promise<PanelFirmRow[]> {
  const [engagements, scorecards, invoices, reviewFirms, recommendations] =
    await Promise.all([
      prisma.engagement.findMany({
        where: { deletedAt: null },
        select: { firmId: true, totalFeesUsd: true, startDate: true, endDate: true },
      }),
      prisma.scorecard.findMany({
        orderBy: { periodEnd: "desc" },
        select: { firmId: true, tier: true, periodEnd: true },
      }),
      prisma.invoice.findMany({
        select: { firmId: true, approvedCents: true, submittedCents: true },
      }),
      prisma.panelReviewFirm.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          firmId: true,
          recommendedAction: true,
          actionBasis: true,
          createdAt: true,
        },
      }),
      prisma.recommendation.findMany({
        where: { targetType: "FIRM", firmId: { not: null } },
        select: { firmId: true, npsScore: true },
      }),
    ]);

  const firmIds = new Set<string>();
  for (const e of engagements) firmIds.add(e.firmId);
  for (const s of scorecards) firmIds.add(s.firmId);
  for (const i of invoices) firmIds.add(i.firmId);
  for (const r of reviewFirms) firmIds.add(r.firmId);

  if (firmIds.size === 0) return [];

  const firms = await prisma.firm.findMany({
    where: { id: { in: [...firmIds] }, deletedAt: null },
    select: { id: true, name: true, panelStatus: true },
  });

  // Aggregations keyed by firm
  const spendByFirm = new Map<string, number>();
  const lastEngByFirm = new Map<string, Date>();
  for (const e of engagements) {
    // totalFeesUsd is already in cents
    spendByFirm.set(e.firmId, (spendByFirm.get(e.firmId) ?? 0) + (e.totalFeesUsd ?? 0));
    const d = e.endDate ?? e.startDate;
    if (d && (!lastEngByFirm.has(e.firmId) || d > lastEngByFirm.get(e.firmId)!)) {
      lastEngByFirm.set(e.firmId, d);
    }
  }
  for (const i of invoices) {
    spendByFirm.set(
      i.firmId,
      (spendByFirm.get(i.firmId) ?? 0) + (i.approvedCents ?? i.submittedCents ?? 0)
    );
  }

  // Latest scorecard tier per firm (list is sorted desc by periodEnd)
  const tierByFirm = new Map<string, ScorecardTier | null>();
  for (const s of scorecards) {
    if (!tierByFirm.has(s.firmId)) tierByFirm.set(s.firmId, s.tier as ScorecardTier | null);
  }

  // Latest persisted review action per firm (sorted desc by createdAt)
  const reviewByFirm = new Map<string, { action: PanelAction; basis: string | null }>();
  for (const r of reviewFirms) {
    if (!reviewByFirm.has(r.firmId)) {
      reviewByFirm.set(r.firmId, {
        action: r.recommendedAction as PanelAction,
        basis: r.actionBasis,
      });
    }
  }

  const npsScoresByFirm = new Map<string, number[]>();
  for (const r of recommendations) {
    if (!r.firmId) continue;
    const list = npsScoresByFirm.get(r.firmId) ?? [];
    list.push(r.npsScore);
    npsScoresByFirm.set(r.firmId, list);
  }

  const rows: PanelFirmRow[] = firms.map((firm) => {
    const tier = tierByFirm.get(firm.id) ?? null;
    const npsScores = npsScoresByFirm.get(firm.id) ?? [];
    const npsAgg = computeNps(npsScores);
    const nps = npsScores.length > 0 ? npsAgg.score : null;
    const lastEngagementDate = lastEngByFirm.get(firm.id) ?? null;
    const persisted = reviewByFirm.get(firm.id);
    const computed = computeRecommendedAction(tier, nps, lastEngagementDate);

    return {
      firmId: firm.id,
      firmName: firm.name,
      panelStatus: firm.panelStatus,
      tier,
      nps,
      npsCount: npsScores.length,
      totalSpendCents: spendByFirm.get(firm.id) ?? 0,
      lastEngagementDate,
      recommendedAction: persisted?.action ?? computed.action,
      isComputed: !persisted,
      actionBasis: persisted?.basis ?? computed.basis,
    };
  });

  // Highest spend first
  return rows.sort((a, b) => b.totalSpendCents - a.totalSpendCents);
}

/**
 * Snapshot the current computed panel state into a PanelReview with
 * per-firm assessments. Demo-credible review cycle in one click.
 */
export async function startReviewCycle(userId: string) {
  const rows = await getPanelFirmRows();
  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setFullYear(periodStart.getFullYear() - 1);

  const title = `Panel Review — ${now.toLocaleString("en-US", { month: "long", year: "numeric" })}`;

  const review = await prisma.panelReview.create({
    data: {
      title,
      periodStart,
      periodEnd: now,
      conductedById: userId,
      summary: `Review cycle started covering ${rows.length} firms with panel activity. Assessments snapshot current scorecard tiers, NPS, and engagement recency.`,
    },
  });

  for (const row of rows) {
    await prisma.panelReviewFirm.create({
      data: {
        panelReviewId: review.id,
        firmId: row.firmId,
        scorecardTier: row.tier,
        recommendedAction: row.recommendedAction,
        actionBasis: row.actionBasis,
        improvementPlanRequired: row.recommendedAction === "IMPROVEMENT_PLAN",
      },
    });
  }

  return review;
}
