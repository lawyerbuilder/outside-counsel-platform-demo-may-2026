import { prisma } from "@/server/db";

export type FeeBenchmark = {
  /** Median fixed fee for this practice area + jurisdiction (cents) */
  medianFixedFeeCents: number | null;
  /** Median partner hourly rate from benchmarks + approved rate cards (cents) */
  medianPartnerRateCents: number | null;
  /** Median total fees of past engagements in this jurisdiction (cents) */
  medianEngagementFeesCents: number | null;
  sampleSize: number;
};

export type FeeDelta = {
  deltaPercent: number;
  basis: "fixed-fee benchmarks" | "engagement history";
  sampleSize: number;
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Aggregate historical fee context for a practice area + jurisdiction from
 * CostBenchmark rows, approved RateCards, and past Engagement totals.
 * Note: Engagement has no practiceAreaId, so engagement history matches on
 * jurisdiction only.
 */
export async function getFeeBenchmark(
  practiceAreaId: string | null,
  jurisdictionId: string | null
): Promise<FeeBenchmark> {
  const empty: FeeBenchmark = {
    medianFixedFeeCents: null,
    medianPartnerRateCents: null,
    medianEngagementFeesCents: null,
    sampleSize: 0,
  };
  if (!practiceAreaId || !jurisdictionId) return empty;

  const [benchmarks, rateCards, engagements] = await Promise.all([
    prisma.costBenchmark.findMany({
      where: { practiceAreaId, jurisdictionId },
      select: { hourlyRateUsd: true, fixedFeeUsd: true, role: true },
    }),
    prisma.rateCard.findMany({
      where: { practiceAreaId, jurisdictionId, isApproved: true },
      select: { hourlyRateCents: true, timekeeperLevel: true },
    }),
    prisma.engagement.findMany({
      where: { jurisdictionId, totalFeesUsd: { not: null }, deletedAt: null },
      select: { totalFeesUsd: true },
    }),
  ]);

  const fixedFees = benchmarks
    .map((b) => b.fixedFeeUsd)
    .filter((v): v is number => v != null && v > 0);

  const partnerRates = [
    ...benchmarks.filter((b) => b.role === "PARTNER").map((b) => b.hourlyRateUsd),
    ...rateCards
      .filter((r) => r.timekeeperLevel?.toLowerCase().includes("partner"))
      .map((r) => r.hourlyRateCents),
  ].filter((v) => v > 0);

  // Engagement.totalFeesUsd is already stored in cents
  const engagementFees = engagements
    .map((e) => e.totalFeesUsd ?? 0)
    .filter((v) => v > 0);

  return {
    medianFixedFeeCents: median(fixedFees),
    medianPartnerRateCents: median(partnerRates),
    medianEngagementFeesCents: median(engagementFees),
    sampleSize: fixedFees.length + partnerRates.length + engagementFees.length,
  };
}

/**
 * Compare a proposed total fee against the benchmark. Prefers fixed-fee
 * benchmarks (same PA + jurisdiction); falls back to engagement history.
 */
export function computeFeeDelta(
  proposedCents: number | null,
  benchmark: FeeBenchmark
): FeeDelta | null {
  if (!proposedCents || proposedCents <= 0) return null;

  if (benchmark.medianFixedFeeCents) {
    return {
      deltaPercent: Math.round(
        ((proposedCents - benchmark.medianFixedFeeCents) / benchmark.medianFixedFeeCents) * 100
      ),
      basis: "fixed-fee benchmarks",
      sampleSize: benchmark.sampleSize,
    };
  }
  if (benchmark.medianEngagementFeesCents) {
    return {
      deltaPercent: Math.round(
        ((proposedCents - benchmark.medianEngagementFeesCents) /
          benchmark.medianEngagementFeesCents) *
          100
      ),
      basis: "engagement history",
      sampleSize: benchmark.sampleSize,
    };
  }
  return null;
}
