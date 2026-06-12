import { prisma } from "./db";
import { computeNps, type NpsAggregation } from "./insights";

// ─── Types ──────────────────────────────────────────────────────────────────

export type NetworkFirmNode = {
  id: string;
  name: string;
  shortName: string | null;
  firmType: string;
  country: string;
  city: string;
  headcount: number | null;
  parentFirmId: string | null;
  nps: NpsAggregation;
  lawyerCount: number;
  rankingCount: number;
};

export type NetworkEdge = {
  id: string;
  lawyerId: string;
  lawyerName: string;
  fromFirmId: string;
  fromFirmName: string;
  toFirmId: string;
  toFirmName: string;
  role: string;
  startDate: Date | null;
  endDate: Date | null;
};

export type SpinOffComparison = {
  parent: NetworkFirmNode;
  spinOff: NetworkFirmNode;
  movedLawyers: {
    id: string;
    name: string;
    title: string | null;
    role: string;
  }[];
};

export type AlumniResult = {
  id: string;
  name: string;
  title: string | null;
  role: string;
  startDate: Date | null;
  endDate: Date | null;
  currentFirm: {
    id: string;
    name: string;
    shortName: string | null;
    firmType: string;
  } | null;
};

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Get all firms that are part of the spin-off network:
 * firms that are parents OR have a parentFirmId.
 */
export async function getNetworkData(): Promise<{
  nodes: NetworkFirmNode[];
  edges: NetworkEdge[];
}> {
  // Get all firms with spin-off relationships
  const firms = await prisma.firm.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      OR: [
        { spinOffs: { some: {} } },
        { parentFirmId: { not: null } },
      ],
    },
    include: {
      recommendations: {
        where: { targetType: "FIRM" },
        select: { npsScore: true },
      },
      firmLawyers: {
        where: { isCurrent: true },
        select: { id: true },
      },
      rankings: {
        select: { id: true },
      },
    },
  });

  // Also get firms connected to these via lawyer movements
  const firmIds = firms.map((f) => f.id);

  // Get lawyer movements between these firms
  const movements = await prisma.firmLawyer.findMany({
    where: {
      isCurrent: false,
      firm: {
        id: { in: firmIds },
      },
      lawyer: {
        firmLawyers: {
          some: {
            isCurrent: true,
            firmId: { in: firmIds },
          },
        },
      },
    },
    include: {
      lawyer: {
        include: {
          firmLawyers: {
            where: { isCurrent: true },
            include: {
              firm: { select: { id: true, name: true } },
            },
            take: 1,
          },
        },
      },
      firm: { select: { id: true, name: true } },
    },
  });

  const nodes: NetworkFirmNode[] = firms.map((f) => ({
    id: f.id,
    name: f.name,
    shortName: f.shortName,
    firmType: f.firmType,
    country: f.country,
    city: f.city,
    headcount: f.headcount,
    parentFirmId: f.parentFirmId,
    nps: computeNps(f.recommendations.map((r) => r.npsScore)),
    lawyerCount: f.firmLawyers.length,
    rankingCount: f.rankings.length,
  }));

  const edges: NetworkEdge[] = movements
    .filter((m) => m.lawyer.firmLawyers[0]?.firm)
    .map((m) => ({
      id: m.id,
      lawyerId: m.lawyerId,
      lawyerName: m.lawyer.name,
      fromFirmId: m.firmId,
      fromFirmName: m.firm.name,
      toFirmId: m.lawyer.firmLawyers[0].firm.id,
      toFirmName: m.lawyer.firmLawyers[0].firm.name,
      role: m.role,
      startDate: m.startDate,
      endDate: m.endDate,
    }));

  return { nodes, edges };
}

/**
 * Get spin-off comparisons: parent vs boutique performance.
 */
export async function getSpinOffComparisons(): Promise<SpinOffComparison[]> {
  const spinOffs = await prisma.firm.findMany({
    where: {
      parentFirmId: { not: null },
      isActive: true,
      deletedAt: null,
    },
    include: {
      parentFirm: {
        include: {
          recommendations: {
            where: { targetType: "FIRM" },
            select: { npsScore: true },
          },
          firmLawyers: {
            where: { isCurrent: true },
            select: { id: true },
          },
          rankings: { select: { id: true } },
        },
      },
      recommendations: {
        where: { targetType: "FIRM" },
        select: { npsScore: true },
      },
      firmLawyers: {
        where: { isCurrent: true },
        select: { id: true },
      },
      rankings: { select: { id: true } },
    },
  });

  // Batch the "moved lawyers" lookup into ONE query instead of one per spin-off.
  // Fetch all current lawyers at any spin-off plus their prior (non-current)
  // firm ids, then pair each to its own spin-off's parent in memory.
  const parentBySpinOff = new Map(
    spinOffs.filter((s) => s.parentFirmId).map((s) => [s.id, s.parentFirmId as string])
  );
  const currentAtSpinOffs = await prisma.firmLawyer.findMany({
    where: { firmId: { in: [...parentBySpinOff.keys()] }, isCurrent: true },
    include: {
      lawyer: {
        select: {
          id: true,
          name: true,
          title: true,
          firmLawyers: { where: { isCurrent: false }, select: { firmId: true } },
        },
      },
    },
  });

  const movedBySpinOff = new Map<string, typeof currentAtSpinOffs>();
  for (const fl of currentAtSpinOffs) {
    const parentId = parentBySpinOff.get(fl.firmId);
    if (!parentId) continue;
    if (!fl.lawyer.firmLawyers.some((h) => h.firmId === parentId)) continue;
    const list = movedBySpinOff.get(fl.firmId) ?? [];
    list.push(fl);
    movedBySpinOff.set(fl.firmId, list);
  }

  const comparisons: SpinOffComparison[] = [];

  for (const spinOff of spinOffs) {
    if (!spinOff.parentFirm) continue;

    const movedLawyers = movedBySpinOff.get(spinOff.id) ?? [];
    const parent = spinOff.parentFirm;

    comparisons.push({
      parent: {
        id: parent.id,
        name: parent.name,
        shortName: parent.shortName,
        firmType: parent.firmType,
        country: parent.country,
        city: parent.city,
        headcount: parent.headcount,
        parentFirmId: null,
        nps: computeNps(parent.recommendations.map((r) => r.npsScore)),
        lawyerCount: parent.firmLawyers.length,
        rankingCount: parent.rankings.length,
      },
      spinOff: {
        id: spinOff.id,
        name: spinOff.name,
        shortName: spinOff.shortName,
        firmType: spinOff.firmType,
        country: spinOff.country,
        city: spinOff.city,
        headcount: spinOff.headcount,
        parentFirmId: spinOff.parentFirmId,
        nps: computeNps(spinOff.recommendations.map((r) => r.npsScore)),
        lawyerCount: spinOff.firmLawyers.length,
        rankingCount: spinOff.rankings.length,
      },
      movedLawyers: movedLawyers.map((ml) => ({
        id: ml.lawyer.id,
        name: ml.lawyer.name,
        title: ml.lawyer.title,
        role: ml.role,
      })),
    });
  }

  return comparisons;
}

/**
 * Get alumni from a specific firm — "who left [firm] and where did they go?"
 */
export async function getAlumni(firmId: string): Promise<AlumniResult[]> {
  const pastLawyers = await prisma.firmLawyer.findMany({
    where: {
      firmId,
      isCurrent: false,
    },
    include: {
      lawyer: {
        include: {
          firmLawyers: {
            where: { isCurrent: true },
            include: {
              firm: {
                select: { id: true, name: true, shortName: true, firmType: true },
              },
            },
            take: 1,
          },
        },
      },
    },
    orderBy: { endDate: "desc" },
  });

  return pastLawyers.map((fl) => ({
    id: fl.lawyer.id,
    name: fl.lawyer.name,
    title: fl.lawyer.title,
    role: fl.role,
    startDate: fl.startDate,
    endDate: fl.endDate,
    currentFirm: fl.lawyer.firmLawyers[0]?.firm ?? null,
  }));
}

/**
 * Get firms that have alumni data (for the alumni search dropdown).
 */
export async function getFirmsWithAlumni() {
  const firms = await prisma.firm.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      firmLawyers: {
        some: { isCurrent: false },
      },
    },
    select: { id: true, name: true, shortName: true },
    orderBy: { name: "asc" },
  });
  return firms;
}
