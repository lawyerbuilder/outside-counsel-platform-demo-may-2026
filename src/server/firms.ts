import { prisma } from "./db";
import type { CreateFirmInput, UpdateFirmInput, FirmFilterInput } from "@/lib/schemas";

export async function listFirms(filters: FirmFilterInput) {
  const { search, country, firmType, practiceAreaId, page, pageSize } = filters;

  const where: Record<string, unknown> = {
    deletedAt: null,
    isActive: true,
  };

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { shortName: { contains: search } },
      { city: { contains: search } },
    ];
  }

  if (country) {
    where.country = country;
  }

  if (firmType) {
    where.firmType = firmType;
  }

  if (practiceAreaId) {
    where.practiceAreas = {
      some: { practiceAreaId },
    };
  }

  const [firms, total] = await Promise.all([
    prisma.firm.findMany({
      where,
      include: {
        practiceAreas: {
          include: { practiceArea: true },
        },
        _count: {
          select: { firmLawyers: { where: { isCurrent: true } } },
        },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.firm.count({ where }),
  ]);

  return {
    firms,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getFirmById(id: string) {
  return prisma.firm.findUnique({
    where: { id },
    include: {
      practiceAreas: {
        include: {
          practiceArea: true,
          jurisdiction: true,
        },
      },
      firmLawyers: {
        include: {
          lawyer: true,
        },
        orderBy: [{ isCurrent: "desc" }, { role: "asc" }, { startDate: "desc" }],
      },
      parentFirm: true,
      spinOffs: {
        where: { deletedAt: null },
      },
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
    },
  });
}

export async function createFirm(data: CreateFirmInput) {
  return prisma.firm.create({
    data: {
      name: data.name,
      shortName: data.shortName || null,
      country: data.country,
      city: data.city,
      website: data.website || null,
      firmType: data.firmType,
      headcount: data.headcount ?? null,
      foundedYear: data.foundedYear ?? null,
      parentFirmId: data.parentFirmId || null,
      notes: data.notes || null,
      internalNotes: data.internalNotes || null,
    },
  });
}

export async function updateFirm(id: string, data: UpdateFirmInput) {
  return prisma.firm.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.shortName !== undefined && { shortName: data.shortName || null }),
      ...(data.country !== undefined && { country: data.country }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.website !== undefined && { website: data.website || null }),
      ...(data.firmType !== undefined && { firmType: data.firmType }),
      ...(data.headcount !== undefined && { headcount: data.headcount ?? null }),
      ...(data.foundedYear !== undefined && { foundedYear: data.foundedYear ?? null }),
      ...(data.parentFirmId !== undefined && {
        parentFirmId: data.parentFirmId || null,
      }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
      ...(data.internalNotes !== undefined && { internalNotes: data.internalNotes || null }),
    },
  });
}

export async function softDeleteFirm(id: string) {
  return prisma.firm.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
}

export async function getFirmCountries() {
  const firms = await prisma.firm.findMany({
    where: { deletedAt: null },
    select: { country: true },
    distinct: ["country"],
    orderBy: { country: "asc" },
  });
  return firms.map((f) => f.country);
}
