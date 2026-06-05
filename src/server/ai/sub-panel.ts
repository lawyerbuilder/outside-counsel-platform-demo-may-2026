import { prisma } from "@/server/db";
import type { ComplexityTier } from "@/generated/prisma/client";

export type SubPanelQuery = {
  jurisdictionId: string;
  practiceAreaId: string;
  complexityTier?: ComplexityTier;
  limit?: number;
};

export type SubPanelFirm = {
  firmId: string;
  firmName: string;
  firmType: string;
  panelStatus: string;
  complexityTier: ComplexityTier;
  overallScore: number | null;
  performanceScore: number | null;
  rateScore: number | null;
  rankingScore: number | null;
  manualPriority: number;
  notes: string | null;
  lastReviewedAt: Date | null;
};

export type SubPanelResult = {
  firms: SubPanelFirm[];
  jurisdiction: string;
  practiceArea: string;
  complexityTier: ComplexityTier | "ALL";
  isCoverageGap: boolean;
};

export async function querySubPanel(
  query: SubPanelQuery
): Promise<SubPanelResult> {
  const [jurisdiction, practiceArea] = await Promise.all([
    prisma.jurisdiction.findUnique({
      where: { id: query.jurisdictionId },
      select: { name: true },
    }),
    prisma.practiceArea.findUnique({
      where: { id: query.practiceAreaId },
      select: { name: true },
    }),
  ]);

  if (!jurisdiction || !practiceArea) {
    throw new Error("Invalid jurisdiction or practice area");
  }

  const capabilities = await prisma.firmCapability.findMany({
    where: {
      jurisdictionId: query.jurisdictionId,
      practiceAreaId: query.practiceAreaId,
      isActive: true,
      ...(query.complexityTier ? { complexityTier: query.complexityTier } : {}),
      firm: { panelStatus: { in: ["ACTIVE", "PROBATION"] } },
    },
    include: {
      firm: {
        select: { id: true, name: true, firmType: true, panelStatus: true },
      },
    },
    orderBy: [
      { manualPriority: "desc" },
      { overallScore: "desc" },
    ],
    take: query.limit ?? 10,
  });

  let firms: SubPanelFirm[] = capabilities.map((c) => ({
    firmId: c.firm.id,
    firmName: c.firm.name,
    firmType: c.firm.firmType,
    panelStatus: c.firm.panelStatus,
    complexityTier: c.complexityTier,
    overallScore: c.overallScore,
    performanceScore: c.performanceScore,
    rateScore: c.rateScore,
    rankingScore: c.rankingScore,
    manualPriority: c.manualPriority,
    notes: c.notes,
    lastReviewedAt: c.lastReviewedAt,
  }));

  // ── Fallback: if FirmCapability table is empty for this combo,
  // ── look in FirmPracticeArea instead (covers firms without capability records)
  if (firms.length === 0) {
    const practiceAreaFirms = await prisma.firmPracticeArea.findMany({
      where: {
        practiceAreaId: query.practiceAreaId,
        jurisdictionId: query.jurisdictionId,
        firm: {
          isActive: true,
          deletedAt: null,
          panelStatus: { in: ["ACTIVE", "PROBATION", "PROSPECTIVE"] },
        },
      },
      include: {
        firm: {
          select: { id: true, name: true, firmType: true, panelStatus: true },
        },
      },
      take: query.limit ?? 20,
    });

    // Deduplicate by firm ID (a firm might have multiple FirmPracticeArea entries)
    const seen = new Set<string>();
    firms = practiceAreaFirms
      .filter((fpa) => {
        if (seen.has(fpa.firm.id)) return false;
        seen.add(fpa.firm.id);
        return true;
      })
      .map((fpa) => ({
        firmId: fpa.firm.id,
        firmName: fpa.firm.name,
        firmType: fpa.firm.firmType,
        panelStatus: fpa.firm.panelStatus,
        complexityTier: query.complexityTier ?? ("STANDARD" as ComplexityTier),
        overallScore: null,
        performanceScore: null,
        rateScore: null,
        rankingScore: null,
        manualPriority: 0,
        notes: null,
        lastReviewedAt: null,
      }));
  }

  return {
    firms,
    jurisdiction: jurisdiction.name,
    practiceArea: practiceArea.name,
    complexityTier: query.complexityTier ?? "ALL",
    isCoverageGap: firms.length === 0,
  };
}

export async function findCoverageGaps(
  entityId?: string
): Promise<
  Array<{
    jurisdiction: string;
    jurisdictionId: string;
    practiceArea: string;
    practiceAreaId: string;
    complexityTier: ComplexityTier;
  }>
> {
  const jurisdictions = await prisma.jurisdiction.findMany({
    select: { id: true, name: true },
  });
  const practiceAreas = await prisma.practiceArea.findMany({
    select: { id: true, name: true },
  });

  const tiers: ComplexityTier[] = ["COMPLEX", "STANDARD", "ROUTINE"];
  const gaps: Array<{
    jurisdiction: string;
    jurisdictionId: string;
    practiceArea: string;
    practiceAreaId: string;
    complexityTier: ComplexityTier;
  }> = [];

  const existingCaps = await prisma.firmCapability.findMany({
    where: { isActive: true },
    select: {
      jurisdictionId: true,
      practiceAreaId: true,
      complexityTier: true,
    },
    distinct: ["jurisdictionId", "practiceAreaId", "complexityTier"],
  });

  const coveredSet = new Set(
    existingCaps.map(
      (c) => `${c.jurisdictionId}|${c.practiceAreaId}|${c.complexityTier}`
    )
  );

  for (const j of jurisdictions) {
    for (const pa of practiceAreas) {
      for (const tier of tiers) {
        const key = `${j.id}|${pa.id}|${tier}`;
        if (!coveredSet.has(key)) {
          gaps.push({
            jurisdiction: j.name,
            jurisdictionId: j.id,
            practiceArea: pa.name,
            practiceAreaId: pa.id,
            complexityTier: tier,
          });
        }
      }
    }
  }

  return gaps;
}
