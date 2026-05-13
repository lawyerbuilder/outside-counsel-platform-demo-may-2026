import { describe, it, expect } from "vitest";
import { computeFirmCompositeScore } from "@/server/scoring";
import type { NpsAggregation } from "@/server/insights";
import type { UserWeights } from "@/server/preferences";

const defaultWeights: UserWeights = {
  weightResponsiveness: 1.0,
  weightQuality: 1.0,
  weightCommercialAwareness: 1.0,
  weightValue: 1.0,
  weightSubjectMatterExpertise: 1.0,
  weightNps: 1.0,
};

const emptyNps: NpsAggregation = {
  score: 0,
  promoters: 0,
  passives: 0,
  detractors: 0,
  total: 0,
};

describe("computeFirmCompositeScore", () => {
  it("returns 0 when no internal data and no rankings", () => {
    const score = computeFirmCompositeScore(defaultWeights, null, emptyNps, 0);
    expect(score).toBe(0);
  });

  it("returns small score from rankings alone when no internal data", () => {
    const score = computeFirmCompositeScore(defaultWeights, null, emptyNps, 80);
    // 80 * 0.2 = 16
    expect(score).toBe(16);
  });

  it("computes score with perfect ratings and NPS", () => {
    const ratings = {
      responsiveness: 5,
      quality: 5,
      commercialAwareness: 5,
      value: 5,
      subjectMatterExpertise: 5,
    };
    const nps: NpsAggregation = {
      score: 100,
      promoters: 10,
      passives: 0,
      detractors: 0,
      total: 10,
    };
    const score = computeFirmCompositeScore(defaultWeights, ratings, nps, 100);
    // All ratings at 100, NPS at 100 (normalized to 100), plus ranking bonus 20
    // base = 100, + 20 = 120, capped at 100
    expect(score).toBe(100);
  });

  it("computes score with mixed ratings", () => {
    const ratings = {
      responsiveness: 4,
      quality: 3,
      commercialAwareness: 3,
      value: 4,
      subjectMatterExpertise: 3,
    };
    const nps: NpsAggregation = {
      score: 25,
      promoters: 3,
      passives: 2,
      detractors: 1,
      total: 6,
    };
    const score = computeFirmCompositeScore(defaultWeights, ratings, nps, 50);
    // Ratings: [80, 60, 60, 80, 60] → avg = 68
    // NPS norm: (25 + 100) / 200 * 100 = 62.5
    // 6 components, all weight 1: (80+60+60+80+60+62.5)/6 = 67.08
    // plus ranking bonus: 50 * 0.2 = 10
    // total ≈ 77
    expect(score).toBeGreaterThan(70);
    expect(score).toBeLessThan(85);
  });

  it("respects user weights — higher NPS weight increases NPS influence", () => {
    const ratings = {
      responsiveness: 3,
      quality: 3,
      commercialAwareness: 3,
      value: 3,
      subjectMatterExpertise: 3,
    };
    const highNps: NpsAggregation = {
      score: 80,
      promoters: 9,
      passives: 1,
      detractors: 0,
      total: 10,
    };

    const equalScore = computeFirmCompositeScore(
      defaultWeights,
      ratings,
      highNps,
      0
    );

    const npsHeavyWeights: UserWeights = {
      ...defaultWeights,
      weightNps: 2.0,
      weightResponsiveness: 0.5,
      weightQuality: 0.5,
      weightCommercialAwareness: 0.5,
      weightValue: 0.5,
      weightSubjectMatterExpertise: 0.5,
    };

    const npsHeavyScore = computeFirmCompositeScore(
      npsHeavyWeights,
      ratings,
      highNps,
      0
    );

    // When NPS is high and NPS weight is heavy, score should be higher
    expect(npsHeavyScore).toBeGreaterThan(equalScore);
  });

  it("handles NPS-only data (no ratings)", () => {
    const nps: NpsAggregation = {
      score: 50,
      promoters: 6,
      passives: 2,
      detractors: 2,
      total: 10,
    };
    const score = computeFirmCompositeScore(defaultWeights, null, nps, 0);
    // NPS norm: (50 + 100) / 200 * 100 = 75
    expect(score).toBe(75);
  });

  it("handles ratings-only data (no NPS)", () => {
    const ratings = {
      responsiveness: 4,
      quality: 4,
      commercialAwareness: 4,
      value: 4,
      subjectMatterExpertise: 4,
    };
    const score = computeFirmCompositeScore(defaultWeights, ratings, emptyNps, 0);
    // All ratings at 80 → base = 80
    expect(score).toBe(80);
  });
});

describe("preference weight schema", () => {
  it("validates weight values within range", async () => {
    const { updatePreferenceSchema } = await import("@/lib/schemas");

    const valid = updatePreferenceSchema.safeParse({
      weightResponsiveness: 1.5,
      weightQuality: 0.5,
      weightCommercialAwareness: 1.0,
      weightValue: 2.0,
      weightSubjectMatterExpertise: 0,
      weightNps: 1.2,
    });
    expect(valid.success).toBe(true);

    const invalid = updatePreferenceSchema.safeParse({
      weightResponsiveness: 3.0, // > 2
      weightQuality: 1.0,
      weightCommercialAwareness: 1.0,
      weightValue: 1.0,
      weightSubjectMatterExpertise: 1.0,
      weightNps: 1.0,
    });
    expect(invalid.success).toBe(false);
  });
});
