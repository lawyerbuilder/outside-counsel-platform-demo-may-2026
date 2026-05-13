import { prisma } from "./db";
import type {
  CreateLawyerInput,
  UpdateLawyerInput,
  LawyerFilterInput,
} from "@/lib/schemas";

export async function listLawyers(filters: LawyerFilterInput) {
  const { search, firmId, practiceAreaId, jurisdictionId, role, page, pageSize } =
    filters;

  const where: Record<string, unknown> = {
    deletedAt: null,
    isActive: true,
  };

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { title: { contains: search } },
    ];
  }

  if (firmId) {
    where.firmLawyers = {
      some: { firmId, isCurrent: true },
    };
  }

  if (role) {
    where.firmLawyers = {
      ...((where.firmLawyers as Record<string, unknown>) ?? {}),
      some: {
        ...(((where.firmLawyers as Record<string, unknown>)?.some as Record<string, unknown>) ?? {}),
        role,
        isCurrent: true,
      },
    };
  }

  if (practiceAreaId) {
    where.practiceAreas = {
      some: { practiceAreaId },
    };
  }

  if (jurisdictionId) {
    where.practiceAreas = {
      some: {
        ...(((where.practiceAreas as Record<string, unknown>)?.some as Record<string, unknown>) ?? {}),
        jurisdictionId,
      },
    };
  }

  const [lawyers, total] = await Promise.all([
    prisma.lawyer.findMany({
      where,
      include: {
        firmLawyers: {
          where: { isCurrent: true },
          include: { firm: { select: { id: true, name: true, shortName: true } } },
        },
        practiceAreas: {
          include: { practiceArea: true },
        },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.lawyer.count({ where }),
  ]);

  return {
    lawyers,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getLawyerById(id: string) {
  return prisma.lawyer.findUnique({
    where: { id },
    include: {
      firmLawyers: {
        include: {
          firm: true,
        },
        orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
      },
      practiceAreas: {
        include: {
          practiceArea: true,
          jurisdiction: true,
        },
      },
    },
  });
}

export async function createLawyer(data: CreateLawyerInput) {
  return prisma.lawyer.create({
    data: {
      name: data.name,
      email: data.email || null,
      title: data.title || null,
      qualificationYear: data.qualificationYear ?? null,
      barAdmissions: data.barAdmissions || null,
      bio: data.bio || null,
      linkedInUrl: data.linkedInUrl || null,
    },
  });
}

export async function updateLawyer(id: string, data: UpdateLawyerInput) {
  return prisma.lawyer.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.title !== undefined && { title: data.title || null }),
      ...(data.qualificationYear !== undefined && {
        qualificationYear: data.qualificationYear ?? null,
      }),
      ...(data.barAdmissions !== undefined && {
        barAdmissions: data.barAdmissions || null,
      }),
      ...(data.bio !== undefined && { bio: data.bio || null }),
      ...(data.linkedInUrl !== undefined && {
        linkedInUrl: data.linkedInUrl || null,
      }),
    },
  });
}

export async function softDeleteLawyer(id: string) {
  return prisma.lawyer.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
}
