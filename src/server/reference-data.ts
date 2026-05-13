import { prisma } from "./db";

export async function listPracticeAreas() {
  return prisma.practiceArea.findMany({
    orderBy: { name: "asc" },
    include: {
      parent: true,
      _count: {
        select: {
          firmPracticeAreas: true,
          lawyerPracticeAreas: true,
        },
      },
    },
  });
}

export async function listJurisdictions() {
  return prisma.jurisdiction.findMany({
    orderBy: [{ region: "asc" }, { name: "asc" }],
  });
}

export async function listFirmsForSelect() {
  return prisma.firm.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, name: true, shortName: true },
    orderBy: { name: "asc" },
  });
}

export async function listLawyersForSelect() {
  return prisma.lawyer.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
