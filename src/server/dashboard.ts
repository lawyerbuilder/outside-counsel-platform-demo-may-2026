import { unstable_cache } from "next/cache";
import { prisma } from "@/server/db";

/** Cached 60s: ten Turso queries per dashboard visit otherwise */
export const getDashboardStats = unstable_cache(
  getDashboardStatsImpl,
  ["dashboard-stats-v1"],
  { revalidate: 60 }
);

async function getDashboardStatsImpl() {
  const [
    firmCount,
    lawyerCount,
    rfpCounts,
    engagementCounts,
    recentRfps,
    pendingResponses,
    recentAiOutputs,
    panelHealth,
    jurisdictionCount,
    entityCount,
  ] = await Promise.all([
    // Total active firms
    prisma.firm.count({ where: { isActive: true } }),

    // Total active lawyers
    prisma.lawyer.count({ where: { isActive: true } }),

    // RFP counts by status
    prisma.rfp.groupBy({
      by: ["status"],
      where: { title: { not: "__ai_shortlist__" } },
      _count: { id: true },
    }),

    // Engagement counts by outcome
    prisma.engagement.groupBy({
      by: ["outcome"],
      _count: { id: true },
    }),

    // Recent/active RFPs (up to 5)
    prisma.rfp.findMany({
      where: {
        status: { in: ["OPEN", "EVALUATING", "SHORTLISTED", "DRAFT", "PENDING_APPROVAL"] },
        title: { not: "__ai_shortlist__" },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        practiceArea: { select: { name: true } },
        jurisdiction: { select: { name: true } },
        _count: { select: { invitations: true } },
      },
    }),

    // Pending invitation responses
    prisma.rfpInvitation.count({
      where: { status: "INVITED" },
    }),

    // Recent AI outputs (last 10)
    prisma.aiOutput.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        outputType: true,
        createdAt: true,
        model: true,
        tokenCount: true,
      },
    }),

    // Panel health: firm count by panelStatus
    prisma.firm.groupBy({
      by: ["panelStatus"],
      where: { isActive: true },
      _count: { id: true },
    }),

    // Total jurisdictions
    prisma.jurisdiction.count(),

    // Total entities (subsidiaries)
    prisma.entity.count({ where: { isActive: true } }),
  ]);

  // Parse RFP status counts into a map
  const rfpStatusMap: Record<string, number> = {};
  for (const r of rfpCounts) {
    rfpStatusMap[r.status] = r._count.id;
  }

  // Parse engagement outcome counts
  const engagementMap: Record<string, number> = {};
  for (const e of engagementCounts) {
    if (e.outcome) engagementMap[e.outcome] = e._count.id;
  }

  // Parse panel health
  const panelMap: Record<string, number> = {};
  for (const p of panelHealth) {
    if (p.panelStatus) panelMap[p.panelStatus] = p._count.id;
  }

  const totalRfps = Object.values(rfpStatusMap).reduce((a, b) => a + b, 0);
  const activeRfps = (rfpStatusMap["OPEN"] ?? 0) + (rfpStatusMap["EVALUATING"] ?? 0) + (rfpStatusMap["SHORTLISTED"] ?? 0);
  const ongoingEngagements = engagementMap["ONGOING"] ?? 0;
  const totalEngagements = Object.values(engagementMap).reduce((a, b) => a + b, 0);

  return {
    firmCount,
    lawyerCount,
    totalRfps,
    activeRfps,
    rfpStatusMap,
    ongoingEngagements,
    totalEngagements,
    engagementMap,
    pendingResponses,
    recentRfps,
    recentAiOutputs,
    panelMap,
    jurisdictionCount,
    entityCount,
  };
}
