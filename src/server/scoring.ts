import { unstable_cache } from "next/cache";
import { prisma } from "./db";
import { computeNps, type NpsAggregation } from "./insights";
import type { UserWeights } from "./preferences";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ScoredFirm = {
  id: string;
  name: string;
  shortName: string | null;
  country: string;
  city: string;
  firmType: string;
  compositeScore: number;
  nps: NpsAggregation;
  avgRating: number | null;
  rankingCount: number;
  bestBand: number | null;
  bestTier: number | null;
  engagementCount: number;
  practiceAreas: string[];
};

export type ScoredLawyer = {
  id: string;
  name: string;
  title: string | null;
  currentFirm: { id: string; name: string; shortName: string | null } | null;
  compositeScore: number;
  nps: NpsAggregation;
  avgRating: number | null;
  rankingCount: number;
  bestCategory: string | null;
  engagementCount: number;
  practiceAreas: string[];
};

// ─── Scoring helpers ────────────────────────────────────────────────────────

/**
 * Normalize a value into 0–100 range.
 */
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

/**
 * External ranking score: lower band/tier = better, higher stars = better.
 * Normalize to 0–100 where 100 is the best possible ranking.
 */
function rankingScore(rankings: { band: number | null; tier: number | null; starRating: number | null }[]): number {
  if (rankings.length === 0) return 0;

  const scores = rankings.map((r) => {
    if (r.band != null) return normalize(7 - r.band, 1, 6) ; // Band 1 → 100, Band 6 → 0
    if (r.tier != null) return normalize(6 - r.tier, 1, 5);  // Tier 1 → 100, Tier 5 → 0
    if (r.starRating != null) return normalize(r.starRating, 1, 5); // Star 5 → 100
    return 0;
  });

  // Return the average of all ranking scores
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

const CATEGORY_SCORES: Record<string, number> = {
  STAR: 100,
  LEADING: 85,
  RECOMMENDED: 65,
  UP_AND_COMING: 50,
  RECOGNISED: 40,
};

function lawyerRankingScore(categories: string[]): number {
  if (categories.length === 0) return 0;
  const scores = categories.map((c) => CATEGORY_SCORES[c] ?? 30);
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * Compute the composite score for a firm, weighted by user preferences.
 *
 * Components (each normalized to 0–100):
 * 1. Internal rating dimensions (5 sub-scores) — weighted individually
 * 2. NPS score — normalized from [-100,+100] to [0,100]
 * 3. External ranking score (bonus, unweighted — adds up to 20 points)
 *
 * Final score = weighted average of (1) + (2), plus ranking bonus, capped at 100.
 */
export function computeFirmCompositeScore(
  weights: UserWeights,
  avgRatings: { responsiveness: number; quality: number; commercialAwareness: number; value: number; subjectMatterExpertise: number } | null,
  nps: NpsAggregation,
  extRankingScore: number
): number {
  // If no internal data at all, return a small score from rankings alone
  if (!avgRatings && nps.total === 0) {
    return Math.round(extRankingScore * 0.2);
  }

  const components: { value: number; weight: number }[] = [];

  if (avgRatings) {
    components.push(
      { value: (avgRatings.responsiveness / 5) * 100, weight: weights.weightResponsiveness },
      { value: (avgRatings.quality / 5) * 100, weight: weights.weightQuality },
      { value: (avgRatings.commercialAwareness / 5) * 100, weight: weights.weightCommercialAwareness },
      { value: (avgRatings.value / 5) * 100, weight: weights.weightValue },
      { value: (avgRatings.subjectMatterExpertise / 5) * 100, weight: weights.weightSubjectMatterExpertise },
    );
  }

  if (nps.total > 0) {
    // NPS range -100 to +100 → normalize to 0–100
    const npsNorm = normalize(nps.score, -100, 100);
    components.push({ value: npsNorm, weight: weights.weightNps });
  }

  if (components.length === 0) return 0;

  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  const weightedSum = components.reduce((sum, c) => sum + c.value * c.weight, 0);
  const baseScore = weightedSum / totalWeight;

  // Add ranking bonus (up to 20 points)
  const rankingBonus = extRankingScore * 0.2;

  return Math.round(Math.min(100, baseScore + rankingBonus));
}

// ─── Directory queries ──────────────────────────────────────────────────────

export type DirectoryFilters = {
  search?: string;
  practiceAreaId?: string;
  jurisdictionId?: string;
  firmType?: string;
  minNps?: number;
};

/**
 * Cached for 60s: directory navigation hits Turso (Tokyo) from the Vercel
 * lambda (US East), so uncached every visit pays cross-region latency for
 * each query. Args are part of the cache key.
 */
export const scoreFirms = unstable_cache(scoreFirmsImpl, ["score-firms-v1"], {
  revalidate: 60,
});

async function scoreFirmsImpl(
  weights: UserWeights,
  filters: DirectoryFilters
): Promise<ScoredFirm[]> {
  // Build where clause
  const where: Record<string, unknown> = {
    isActive: true,
    deletedAt: null,
  };

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { shortName: { contains: filters.search } },
    ];
  }
  if (filters.firmType) where.firmType = filters.firmType;
  if (filters.practiceAreaId) {
    where.practiceAreas = { some: { practiceAreaId: filters.practiceAreaId } };
  }
  if (filters.jurisdictionId) {
    where.practiceAreas = {
      ...((where.practiceAreas as object) ?? {}),
      some: {
        ...((where.practiceAreas as { some?: object })?.some ?? {}),
        jurisdictionId: filters.jurisdictionId,
      },
    };
  }

  const firms = await prisma.firm.findMany({
    where,
    include: {
      practiceAreas: {
        include: { practiceArea: { select: { name: true } } },
      },
      rankings: {
        select: { band: true, tier: true, starRating: true },
      },
      recommendations: {
        where: { targetType: "FIRM" },
        select: { npsScore: true },
      },
      internalRatings: {
        where: { targetType: "FIRM" },
        select: {
          responsiveness: true,
          quality: true,
          commercialAwareness: true,
          value: true,
          subjectMatterExpertise: true,
        },
      },
      engagements: {
        where: { deletedAt: null },
        select: { id: true },
      },
    },
  });

  const scored: ScoredFirm[] = firms.map((firm) => {
    const nps = computeNps(firm.recommendations.map((r) => r.npsScore));

    // Average internal ratings
    let avgRatings: { responsiveness: number; quality: number; commercialAwareness: number; value: number; subjectMatterExpertise: number } | null = null;
    if (firm.internalRatings.length > 0) {
      const avg = (key: keyof typeof firm.internalRatings[0]) =>
        firm.internalRatings.reduce((sum, r) => sum + (r[key] as number), 0) / firm.internalRatings.length;
      avgRatings = {
        responsiveness: avg("responsiveness"),
        quality: avg("quality"),
        commercialAwareness: avg("commercialAwareness"),
        value: avg("value"),
        subjectMatterExpertise: avg("subjectMatterExpertise"),
      };
    }

    const extScore = rankingScore(firm.rankings);
    const compositeScore = computeFirmCompositeScore(weights, avgRatings, nps, extScore);

    // Best band / tier for display
    const bands = firm.rankings.filter((r) => r.band != null).map((r) => r.band!);
    const tiers = firm.rankings.filter((r) => r.tier != null).map((r) => r.tier!);

    const avgOverall = avgRatings
      ? (avgRatings.responsiveness + avgRatings.quality + avgRatings.commercialAwareness + avgRatings.value + avgRatings.subjectMatterExpertise) / 5
      : null;

    const practiceAreas = [...new Set(firm.practiceAreas.map((p) => p.practiceArea.name))];

    return {
      id: firm.id,
      name: firm.name,
      shortName: firm.shortName,
      country: firm.country,
      city: firm.city,
      firmType: firm.firmType,
      compositeScore,
      nps,
      avgRating: avgOverall ? Math.round(avgOverall * 10) / 10 : null,
      rankingCount: firm.rankings.length,
      bestBand: bands.length > 0 ? Math.min(...bands) : null,
      bestTier: tiers.length > 0 ? Math.min(...tiers) : null,
      engagementCount: firm.engagements.length,
      practiceAreas,
    };
  });

  // Filter by NPS if requested
  const filtered = filters.minNps != null
    ? scored.filter((f) => f.nps.total > 0 && f.nps.score >= filters.minNps!)
    : scored;

  // Sort by composite score descending
  return filtered.sort((a, b) => b.compositeScore - a.compositeScore);
}

export const scoreLawyers = unstable_cache(scoreLawyersImpl, ["score-lawyers-v1"], {
  revalidate: 60,
});

async function scoreLawyersImpl(
  weights: UserWeights,
  filters: DirectoryFilters
): Promise<ScoredLawyer[]> {
  const where: Record<string, unknown> = {
    isActive: true,
    deletedAt: null,
  };

  if (filters.search) {
    where.name = { contains: filters.search };
  }
  if (filters.practiceAreaId) {
    where.practiceAreas = { some: { practiceAreaId: filters.practiceAreaId } };
  }
  if (filters.jurisdictionId) {
    where.practiceAreas = {
      ...((where.practiceAreas as object) ?? {}),
      some: {
        ...((where.practiceAreas as { some?: object })?.some ?? {}),
        jurisdictionId: filters.jurisdictionId,
      },
    };
  }

  const lawyers = await prisma.lawyer.findMany({
    where,
    include: {
      firmLawyers: {
        where: { isCurrent: true },
        include: { firm: { select: { id: true, name: true, shortName: true } } },
        take: 1,
      },
      practiceAreas: {
        include: { practiceArea: { select: { name: true } } },
      },
      rankings: {
        select: { category: true },
      },
      recommendations: {
        where: { targetType: "LAWYER" },
        select: { npsScore: true },
      },
      internalRatings: {
        where: { targetType: "LAWYER" },
        select: {
          responsiveness: true,
          quality: true,
          commercialAwareness: true,
          value: true,
          subjectMatterExpertise: true,
        },
      },
      engagements: {
        where: { deletedAt: null },
        select: { id: true },
      },
    },
  });

  const scored: ScoredLawyer[] = lawyers.map((lawyer) => {
    const nps = computeNps(lawyer.recommendations.map((r) => r.npsScore));

    let avgRatings: { responsiveness: number; quality: number; commercialAwareness: number; value: number; subjectMatterExpertise: number } | null = null;
    if (lawyer.internalRatings.length > 0) {
      const avg = (key: keyof typeof lawyer.internalRatings[0]) =>
        lawyer.internalRatings.reduce((sum, r) => sum + (r[key] as number), 0) / lawyer.internalRatings.length;
      avgRatings = {
        responsiveness: avg("responsiveness"),
        quality: avg("quality"),
        commercialAwareness: avg("commercialAwareness"),
        value: avg("value"),
        subjectMatterExpertise: avg("subjectMatterExpertise"),
      };
    }

    const categories = lawyer.rankings.map((r) => r.category);
    const extScore = lawyerRankingScore(categories);
    const compositeScore = computeFirmCompositeScore(weights, avgRatings, nps, extScore);

    const avgOverall = avgRatings
      ? (avgRatings.responsiveness + avgRatings.quality + avgRatings.commercialAwareness + avgRatings.value + avgRatings.subjectMatterExpertise) / 5
      : null;

    const currentFirm = lawyer.firmLawyers[0]?.firm ?? null;

    // Best category
    const bestCat = categories.length > 0
      ? categories.sort((a, b) => (CATEGORY_SCORES[b] ?? 0) - (CATEGORY_SCORES[a] ?? 0))[0]
      : null;

    const practiceAreas = [...new Set(lawyer.practiceAreas.map((p) => p.practiceArea.name))];

    return {
      id: lawyer.id,
      name: lawyer.name,
      title: lawyer.title,
      currentFirm,
      compositeScore,
      nps,
      avgRating: avgOverall ? Math.round(avgOverall * 10) / 10 : null,
      rankingCount: categories.length,
      bestCategory: bestCat,
      engagementCount: lawyer.engagements.length,
      practiceAreas,
    };
  });

  const filtered = filters.minNps != null
    ? scored.filter((l) => l.nps.total > 0 && l.nps.score >= filters.minNps!)
    : scored;

  return filtered.sort((a, b) => b.compositeScore - a.compositeScore);
}
