import { prisma } from "./db";

export type ResearchUpdateItem = Awaited<ReturnType<typeof listResearchUpdates>>[number];

export async function listResearchUpdates(status?: string) {
  return prisma.researchUpdate.findMany({
    where: status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" | "APPLIED" } : undefined,
    include: {
      firm: { select: { id: true, name: true, shortName: true } },
      lawyer: { select: { id: true, name: true } },
      reviewedBy: { select: { name: true } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 100,
  });
}

export async function getResearchStats() {
  const [pending, approved, rejected, applied] = await Promise.all([
    prisma.researchUpdate.count({ where: { status: "PENDING" } }),
    prisma.researchUpdate.count({ where: { status: "APPROVED" } }),
    prisma.researchUpdate.count({ where: { status: "REJECTED" } }),
    prisma.researchUpdate.count({ where: { status: "APPLIED" } }),
  ]);
  return { pending, approved, rejected, applied, total: pending + approved + rejected + applied };
}
