import { describe, it, expect } from "vitest";
import {
  createRankingSourceSchema,
  createFirmRankingSchema,
  createLawyerRankingSchema,
  rankingFilterSchema,
  RANKING_PUBLISHER_LABELS,
  LAWYER_RANKING_CATEGORY_LABELS,
  formatBand,
  formatTier,
  formatStars,
  rankingBadgeVariant,
} from "@/lib/schemas";

describe("createRankingSourceSchema", () => {
  it("validates a valid source", () => {
    const result = createRankingSourceSchema.safeParse({
      name: "Chambers Asia-Pacific 2025",
      publisher: "CHAMBERS",
      editionYear: 2025,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid publisher", () => {
    const result = createRankingSourceSchema.safeParse({
      name: "Test",
      publisher: "INVALID",
      editionYear: 2025,
    });
    expect(result.success).toBe(false);
  });

  it("rejects year before 2000", () => {
    const result = createRankingSourceSchema.safeParse({
      name: "Test",
      publisher: "CHAMBERS",
      editionYear: 1999,
    });
    expect(result.success).toBe(false);
  });
});

describe("createFirmRankingSchema", () => {
  it("validates with band", () => {
    const result = createFirmRankingSchema.safeParse({
      firmId: "abc123",
      rankingSourceId: "src123",
      practiceAreaId: "pa123",
      jurisdictionId: "jur123",
      band: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rejects band > 6", () => {
    const result = createFirmRankingSchema.safeParse({
      firmId: "abc123",
      rankingSourceId: "src123",
      practiceAreaId: "pa123",
      jurisdictionId: "jur123",
      band: 7,
    });
    expect(result.success).toBe(false);
  });

  it("accepts tier values 1-5", () => {
    const result = createFirmRankingSchema.safeParse({
      firmId: "abc123",
      rankingSourceId: "src123",
      practiceAreaId: "pa123",
      jurisdictionId: "jur123",
      tier: 3,
    });
    expect(result.success).toBe(true);
  });
});

describe("createLawyerRankingSchema", () => {
  it("validates a valid lawyer ranking", () => {
    const result = createLawyerRankingSchema.safeParse({
      lawyerId: "law123",
      rankingSourceId: "src123",
      practiceAreaId: "pa123",
      jurisdictionId: "jur123",
      category: "LEADING",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid category", () => {
    const result = createLawyerRankingSchema.safeParse({
      lawyerId: "law123",
      rankingSourceId: "src123",
      practiceAreaId: "pa123",
      jurisdictionId: "jur123",
      category: "BEST_EVER",
    });
    expect(result.success).toBe(false);
  });
});

describe("rankingFilterSchema", () => {
  it("accepts empty filters", () => {
    const result = rankingFilterSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("parses string editionYear", () => {
    const result = rankingFilterSchema.parse({ editionYear: "2025" });
    expect(result.editionYear).toBe(2025);
  });
});

describe("display labels", () => {
  it("has labels for all publishers", () => {
    expect(Object.keys(RANKING_PUBLISHER_LABELS)).toHaveLength(4);
    expect(RANKING_PUBLISHER_LABELS.CHAMBERS).toBe("Chambers");
    expect(RANKING_PUBLISHER_LABELS.LEGAL500).toBe("Legal 500");
  });

  it("has labels for all lawyer ranking categories", () => {
    expect(Object.keys(LAWYER_RANKING_CATEGORY_LABELS)).toHaveLength(5);
    expect(LAWYER_RANKING_CATEGORY_LABELS.STAR).toBe("Star");
    expect(LAWYER_RANKING_CATEGORY_LABELS.UP_AND_COMING).toBe("Up & Coming");
  });
});

describe("format helpers", () => {
  it("formatBand", () => {
    expect(formatBand(1)).toBe("Band 1");
    expect(formatBand(4)).toBe("Band 4");
  });

  it("formatTier", () => {
    expect(formatTier(1)).toBe("Tier 1");
    expect(formatTier(5)).toBe("Tier 5");
  });

  it("formatStars", () => {
    expect(formatStars(5)).toBe("★★★★★");
    expect(formatStars(3)).toBe("★★★☆☆");
    expect(formatStars(0)).toBe("☆☆☆☆☆");
  });

  it("rankingBadgeVariant for Chambers", () => {
    expect(rankingBadgeVariant("CHAMBERS", 1)).toBe("green");
    expect(rankingBadgeVariant("CHAMBERS", 2)).toBe("green");
    expect(rankingBadgeVariant("CHAMBERS", 3)).toBe("scg");
    expect(rankingBadgeVariant("CHAMBERS", 5)).toBe("gray");
  });

  it("rankingBadgeVariant for Legal500", () => {
    expect(rankingBadgeVariant("LEGAL500", 1)).toBe("green");
    expect(rankingBadgeVariant("LEGAL500", 3)).toBe("scg");
    expect(rankingBadgeVariant("LEGAL500", 5)).toBe("gray");
  });

  it("rankingBadgeVariant for star-based (Benchmark/AsiaLaw)", () => {
    expect(rankingBadgeVariant("BENCHMARK_LITIGATION", 5)).toBe("green");
    expect(rankingBadgeVariant("ASIALAW", 3)).toBe("scg");
    expect(rankingBadgeVariant("ASIALAW", 2)).toBe("gray");
  });
});
