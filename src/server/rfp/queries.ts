import { prisma } from "@/server/db";
import type { RfpStatus } from "@/generated/prisma/client";

export async function listRfps(filters?: {
  status?: RfpStatus;
  createdById?: string;
}) {
  return prisma.rfp.findMany({
    where: {
      title: { not: "__ai_shortlist__" },
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.createdById ? { createdById: filters.createdById } : {}),
    },
    include: {
      practiceArea: { select: { name: true } },
      jurisdiction: { select: { name: true } },
      createdBy: { select: { name: true } },
      invitations: {
        select: { id: true, status: true, firm: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRfp(id: string) {
  return prisma.rfp.findUnique({
    where: { id },
    include: {
      practiceArea: { select: { name: true } },
      jurisdiction: { select: { name: true } },
      createdBy: { select: { name: true } },
      matter: { select: { id: true, name: true } },
    },
  });
}

export async function getRfpWithInvitations(id: string) {
  return prisma.rfp.findUnique({
    where: { id },
    include: {
      practiceArea: { select: { name: true } },
      jurisdiction: { select: { name: true } },
      createdBy: { select: { name: true } },
      invitations: {
        include: {
          firm: { select: { id: true, name: true, firmType: true, panelStatus: true } },
          evaluations: true,
        },
      },
    },
  });
}

export async function countRfpsByStatus() {
  const rfps = await prisma.rfp.groupBy({
    by: ["status"],
    where: { title: { not: "__ai_shortlist__" } },
    _count: { id: true },
  });
  return Object.fromEntries(
    rfps.map((r) => [r.status, r._count.id])
  ) as Partial<Record<RfpStatus, number>>;
}
