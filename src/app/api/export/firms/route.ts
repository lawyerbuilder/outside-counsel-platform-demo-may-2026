import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { computeNps } from "@/server/insights";
import { serializeCsv } from "@/lib/csv";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // Rate limit: 10 exports per minute per IP
  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  const rl = checkRateLimit(`export:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }
  const firms = await prisma.firm.findMany({
    where: { isActive: true, deletedAt: null },
    include: {
      rankings: {
        include: {
          rankingSource: true,
          practiceArea: true,
          jurisdiction: true,
        },
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
        select: { totalFeesUsd: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const headers = [
    "Firm Name",
    "Short Name",
    "Type",
    "Country",
    "City",
    "Headcount",
    "NPS Score",
    "NPS Responses",
    "Avg Responsiveness",
    "Avg Quality",
    "Avg Commercial Awareness",
    "Avg Value",
    "Avg Subject Expertise",
    "Ranking Count",
    "Best Band",
    "Best Tier",
    "Engagement Count",
    "Total Fees (USD)",
  ];

  const rows = firms.map((firm) => {
    const nps = computeNps(firm.recommendations.map((r) => r.npsScore));

    const avgRating = (key: "responsiveness" | "quality" | "commercialAwareness" | "value" | "subjectMatterExpertise") =>
      firm.internalRatings.length > 0
        ? (firm.internalRatings.reduce((sum, r) => sum + r[key], 0) / firm.internalRatings.length).toFixed(1)
        : "";

    const bands = firm.rankings.filter((r) => r.band != null).map((r) => r.band!);
    const tiers = firm.rankings.filter((r) => r.tier != null).map((r) => r.tier!);
    const totalFees = firm.engagements.reduce((sum, e) => sum + (e.totalFeesUsd ?? 0), 0);

    return [
      firm.name,
      firm.shortName ?? "",
      firm.firmType,
      firm.country,
      firm.city,
      firm.headcount?.toString() ?? "",
      nps.total > 0 ? nps.score.toString() : "",
      nps.total.toString(),
      avgRating("responsiveness"),
      avgRating("quality"),
      avgRating("commercialAwareness"),
      avgRating("value"),
      avgRating("subjectMatterExpertise"),
      firm.rankings.length.toString(),
      bands.length > 0 ? Math.min(...bands).toString() : "",
      tiers.length > 0 ? Math.min(...tiers).toString() : "",
      firm.engagements.length.toString(),
      totalFees > 0 ? (totalFees / 100).toFixed(2) : "",
    ];
  });

  const csv = serializeCsv(headers, rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="firms-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
