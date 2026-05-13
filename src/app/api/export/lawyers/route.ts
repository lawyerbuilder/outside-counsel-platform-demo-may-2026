import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { computeNps } from "@/server/insights";
import { serializeCsv } from "@/lib/csv";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  const rl = checkRateLimit(`export-lawyers:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  const lawyers = await prisma.lawyer.findMany({
    where: { isActive: true, deletedAt: null },
    include: {
      firmLawyers: {
        where: { isCurrent: true },
        include: { firm: { select: { name: true, shortName: true } } },
        take: 1,
      },
      rankings: {
        include: {
          rankingSource: true,
          practiceArea: true,
        },
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
    },
    orderBy: { name: "asc" },
  });

  const headers = [
    "Lawyer Name",
    "Title",
    "Current Firm",
    "Role",
    "Qualification Year",
    "NPS Score",
    "NPS Responses",
    "Avg Responsiveness",
    "Avg Quality",
    "Avg Commercial Awareness",
    "Avg Value",
    "Avg Subject Expertise",
    "Ranking Count",
    "Best Category",
  ];

  const rows = lawyers.map((lawyer) => {
    const nps = computeNps(lawyer.recommendations.map((r) => r.npsScore));

    const avgRating = (key: "responsiveness" | "quality" | "commercialAwareness" | "value" | "subjectMatterExpertise") =>
      lawyer.internalRatings.length > 0
        ? (lawyer.internalRatings.reduce((sum, r) => sum + r[key], 0) / lawyer.internalRatings.length).toFixed(1)
        : "";

    const currentFirmLawyer = lawyer.firmLawyers[0];
    const categories = lawyer.rankings.map((r) => r.category as string);
    const categoryOrder = ["STAR", "LEADING", "RECOMMENDED", "UP_AND_COMING", "RECOGNISED"];
    const bestCategory = categoryOrder.find((c) => categories.includes(c)) ?? "";

    return [
      lawyer.name,
      lawyer.title ?? "",
      currentFirmLawyer?.firm?.shortName ?? currentFirmLawyer?.firm?.name ?? "",
      currentFirmLawyer?.role ?? "",
      lawyer.qualificationYear?.toString() ?? "",
      nps.total > 0 ? nps.score.toString() : "",
      nps.total.toString(),
      avgRating("responsiveness"),
      avgRating("quality"),
      avgRating("commercialAwareness"),
      avgRating("value"),
      avgRating("subjectMatterExpertise"),
      lawyer.rankings.length.toString(),
      bestCategory,
    ];
  });

  const csv = serializeCsv(headers, rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lawyers-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
