import { prisma } from "./db";
import { computeNps } from "./insights";
import { getUserPreference } from "./preferences";
import { getCurrentUser } from "./current-user";
import { scoreFirms, scoreLawyers } from "./scoring";
import type { ScoredFirm, ScoredLawyer } from "./scoring";

// ─── Tool definitions for Claude ────────────────────────────────────────────

export const DIRECTORY_TOOLS = [
  {
    name: "search_firms" as const,
    description:
      "Search for law firms in the directory. Returns firms ranked by composite fit score (combining internal ratings, NPS sentiment, and external rankings). Use this when the user asks about firms, law firms, or needs a firm recommendation.",
    input_schema: {
      type: "object" as const,
      properties: {
        search: {
          type: "string",
          description: "Free-text search by firm name",
        },
        practiceArea: {
          type: "string",
          description:
            "Practice area to filter by (e.g. 'M&A', 'Litigation', 'Banking & Finance', 'Competition', 'IP', 'Real Estate', 'Employment', 'Restructuring')",
        },
        jurisdiction: {
          type: "string",
          description:
            "Jurisdiction to filter by (e.g. 'Thailand', 'Singapore', 'Hong Kong', 'England & Wales')",
        },
        firmType: {
          type: "string",
          enum: ["FULL_SERVICE", "BOUTIQUE", "MID_SIZE", "REGIONAL"],
          description: "Filter by firm type",
        },
        minNps: {
          type: "number",
          description:
            "Minimum NPS score (-100 to 100). Use positive values (e.g. 50) to find well-regarded firms.",
        },
      },
      required: [],
    },
  },
  {
    name: "search_lawyers" as const,
    description:
      "Search for individual lawyers in the directory. Returns lawyers ranked by composite fit score. Use this when the user asks about specific lawyers, needs a lawyer recommendation, or wants to find specialists.",
    input_schema: {
      type: "object" as const,
      properties: {
        search: {
          type: "string",
          description: "Free-text search by lawyer name",
        },
        practiceArea: {
          type: "string",
          description: "Practice area to filter by",
        },
        jurisdiction: {
          type: "string",
          description: "Jurisdiction to filter by",
        },
      },
      required: [],
    },
  },
  {
    name: "get_firm_profile" as const,
    description:
      "Get detailed profile of a specific firm including rankings, NPS, ratings, recent engagements, cost benchmarks, and lawyers. Use when the user asks for details about a specific firm.",
    input_schema: {
      type: "object" as const,
      properties: {
        firmId: {
          type: "string",
          description: "The firm ID to look up",
        },
      },
      required: ["firmId"],
    },
  },
  {
    name: "get_lawyer_profile" as const,
    description:
      "Get detailed profile of a specific lawyer including career history, rankings, NPS, ratings, and engagements. Use when the user asks for details about a specific lawyer.",
    input_schema: {
      type: "object" as const,
      properties: {
        lawyerId: {
          type: "string",
          description: "The lawyer ID to look up",
        },
      },
      required: ["lawyerId"],
    },
  },
];

// ─── Tool execution ─────────────────────────────────────────────────────────

async function resolvePracticeAreaId(name: string): Promise<string | undefined> {
  if (!name) return undefined;
  const pa = await prisma.practiceArea.findFirst({
    where: { name: { contains: name } },
    select: { id: true },
  });
  return pa?.id;
}

async function resolveJurisdictionId(name: string): Promise<string | undefined> {
  if (!name) return undefined;
  const j = await prisma.jurisdiction.findFirst({
    where: { name: { contains: name } },
    select: { id: true },
  });
  return j?.id;
}

export async function executeSearchFirms(
  args: Record<string, unknown>
): Promise<{ firms: (ScoredFirm & { website: string | null; headcount: number | null })[] }> {
  const user = await getCurrentUser();
  const weights = await getUserPreference(user.id);

  const practiceAreaId = args.practiceArea
    ? await resolvePracticeAreaId(args.practiceArea as string)
    : undefined;
  const jurisdictionId = args.jurisdiction
    ? await resolveJurisdictionId(args.jurisdiction as string)
    : undefined;

  const firms = await scoreFirms(weights, {
    search: args.search as string | undefined,
    practiceAreaId,
    jurisdictionId,
    firmType: args.firmType as string | undefined,
    minNps: args.minNps as number | undefined,
  });

  // Enrich top 10 with contact details (one batched query, not 10)
  const top = firms.slice(0, 10);
  const details = await prisma.firm.findMany({
    where: { id: { in: top.map((f) => f.id) } },
    select: { id: true, website: true, headcount: true },
  });
  const byId = new Map(details.map((d) => [d.id, d]));
  const enriched = top.map((f) => ({
    ...f,
    website: byId.get(f.id)?.website ?? null,
    headcount: byId.get(f.id)?.headcount ?? null,
  }));

  return { firms: enriched };
}

export async function executeSearchLawyers(
  args: Record<string, unknown>
): Promise<{ lawyers: (ScoredLawyer & { email: string | null; linkedInUrl: string | null; firmWebsite: string | null })[] }> {
  const user = await getCurrentUser();
  const weights = await getUserPreference(user.id);

  const practiceAreaId = args.practiceArea
    ? await resolvePracticeAreaId(args.practiceArea as string)
    : undefined;
  const jurisdictionId = args.jurisdiction
    ? await resolveJurisdictionId(args.jurisdiction as string)
    : undefined;

  const lawyers = await scoreLawyers(weights, {
    search: args.search as string | undefined,
    practiceAreaId,
    jurisdictionId,
  });

  // Enrich top 10 with contact details (one batched query, not 10)
  const top = lawyers.slice(0, 10);
  const details = await prisma.lawyer.findMany({
    where: { id: { in: top.map((l) => l.id) } },
    select: {
      id: true,
      email: true,
      linkedInUrl: true,
      firmLawyers: {
        where: { isCurrent: true },
        include: { firm: { select: { website: true } } },
        take: 1,
      },
    },
  });
  const byId = new Map(details.map((d) => [d.id, d]));
  const enriched = top.map((l) => {
    const d = byId.get(l.id);
    return {
      ...l,
      email: d?.email ?? null,
      linkedInUrl: d?.linkedInUrl ?? null,
      firmWebsite: d?.firmLawyers[0]?.firm?.website ?? null,
    };
  });

  return { lawyers: enriched };
}

export async function executeGetFirmProfile(
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const firmId = args.firmId as string;
  const firm = await prisma.firm.findUnique({
    where: { id: firmId },
    include: {
      firmLawyers: {
        where: { isCurrent: true },
        include: { lawyer: { select: { id: true, name: true, title: true } } },
      },
      practiceAreas: {
        include: { practiceArea: true, jurisdiction: true },
      },
      rankings: {
        include: { rankingSource: true, practiceArea: true },
        orderBy: { rankingSource: { editionYear: "desc" } },
      },
      recommendations: { where: { targetType: "FIRM" }, select: { npsScore: true } },
      internalRatings: { where: { targetType: "FIRM" } },
      engagements: {
        where: { deletedAt: null },
        orderBy: { startDate: "desc" },
        take: 5,
        include: { lawyer: { select: { name: true } } },
      },
      costBenchmarks: {
        orderBy: { year: "desc" },
        take: 10,
        include: { practiceArea: true, jurisdiction: true },
      },
    },
  });

  if (!firm) return { error: "Firm not found" };

  const nps = computeNps(firm.recommendations.map((r) => r.npsScore));

  return {
    id: firm.id,
    name: firm.name,
    shortName: firm.shortName,
    country: firm.country,
    city: firm.city,
    firmType: firm.firmType,
    headcount: firm.headcount,
    foundedYear: firm.foundedYear,
    website: firm.website,
    nps,
    currentLawyers: firm.firmLawyers.map((fl) => ({
      id: fl.lawyer.id,
      name: fl.lawyer.name,
      title: fl.lawyer.title,
      role: fl.role,
    })),
    practiceAreas: firm.practiceAreas.map((pa) => ({
      area: pa.practiceArea.name,
      jurisdiction: pa.jurisdiction?.name,
    })),
    rankings: firm.rankings.map((r) => ({
      publisher: r.rankingSource.publisher,
      year: r.rankingSource.editionYear,
      practiceArea: r.practiceArea.name,
      band: r.band,
      tier: r.tier,
      starRating: r.starRating,
    })),
    recentEngagements: firm.engagements.map((e) => ({
      matter: e.matterName,
      type: e.matterType,
      outcome: e.outcome,
      lawyer: e.lawyer?.name,
      startDate: e.startDate,
    })),
    costBenchmarks: firm.costBenchmarks.map((cb) => ({
      role: cb.role,
      hourlyRateUsd: cb.hourlyRateUsd,
      practiceArea: cb.practiceArea.name,
      year: cb.year,
      source: cb.source,
    })),
  };
}

export async function executeGetLawyerProfile(
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const lawyerId = args.lawyerId as string;
  const lawyer = await prisma.lawyer.findUnique({
    where: { id: lawyerId },
    include: {
      firmLawyers: {
        include: { firm: { select: { id: true, name: true, shortName: true } } },
        orderBy: { startDate: "desc" },
      },
      practiceAreas: {
        include: { practiceArea: true, jurisdiction: true },
      },
      rankings: {
        include: { rankingSource: true, practiceArea: true },
      },
      recommendations: { where: { targetType: "LAWYER" }, select: { npsScore: true } },
      internalRatings: { where: { targetType: "LAWYER" } },
      engagements: {
        where: { deletedAt: null },
        orderBy: { startDate: "desc" },
        take: 5,
        include: { firm: { select: { name: true } } },
      },
    },
  });

  if (!lawyer) return { error: "Lawyer not found" };

  const nps = computeNps(lawyer.recommendations.map((r) => r.npsScore));

  return {
    id: lawyer.id,
    name: lawyer.name,
    title: lawyer.title,
    email: lawyer.email,
    qualificationYear: lawyer.qualificationYear,
    barAdmissions: lawyer.barAdmissions,
    bio: lawyer.bio,
    nps,
    careerHistory: lawyer.firmLawyers.map((fl) => ({
      firmId: fl.firm.id,
      firmName: fl.firm.name,
      role: fl.role,
      isCurrent: fl.isCurrent,
      startDate: fl.startDate,
      endDate: fl.endDate,
    })),
    practiceAreas: lawyer.practiceAreas.map((pa) => ({
      area: pa.practiceArea.name,
      jurisdiction: pa.jurisdiction?.name,
    })),
    rankings: lawyer.rankings.map((r) => ({
      publisher: r.rankingSource.publisher,
      year: r.rankingSource.editionYear,
      practiceArea: r.practiceArea.name,
      category: r.category,
    })),
    recentEngagements: lawyer.engagements.map((e) => ({
      matter: e.matterName,
      type: e.matterType,
      outcome: e.outcome,
      firm: e.firm.name,
      startDate: e.startDate,
    })),
  };
}

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case "search_firms":
      return JSON.stringify(await executeSearchFirms(args));
    case "search_lawyers":
      return JSON.stringify(await executeSearchLawyers(args));
    case "get_firm_profile":
      return JSON.stringify(await executeGetFirmProfile(args));
    case "get_lawyer_profile":
      return JSON.stringify(await executeGetLawyerProfile(args));
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}
