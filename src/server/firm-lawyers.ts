import { prisma } from "./db";
import type { CreateFirmLawyerInput } from "@/lib/schemas";

export async function addLawyerToFirm(data: CreateFirmLawyerInput) {
  return prisma.firmLawyer.create({
    data: {
      firmId: data.firmId,
      lawyerId: data.lawyerId,
      role: data.role,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      isCurrent: data.isCurrent,
      notes: data.notes || null,
    },
  });
}

export async function removeLawyerFromFirm(id: string) {
  return prisma.firmLawyer.update({
    where: { id },
    data: {
      isCurrent: false,
      endDate: new Date(),
    },
  });
}

export async function getLawyerCareerHistory(lawyerId: string) {
  return prisma.firmLawyer.findMany({
    where: { lawyerId },
    include: {
      firm: { select: { id: true, name: true, shortName: true, firmType: true } },
    },
    orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
  });
}
