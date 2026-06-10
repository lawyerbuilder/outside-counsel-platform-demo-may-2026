import { unstable_cache } from "next/cache";
import { prisma } from "./db";

// Reference data changes rarely but is fetched on almost every page.
// Caching it removes 2+ Turso roundtrips per navigation.

export const listPracticeAreas = unstable_cache(
  async () =>
    prisma.practiceArea.findMany({
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
    }),
  ["practice-areas-v1"],
  { revalidate: 300 }
);

export const listJurisdictions = unstable_cache(
  async () =>
    prisma.jurisdiction.findMany({
      orderBy: [{ region: "asc" }, { name: "asc" }],
    }),
  ["jurisdictions-v1"],
  { revalidate: 300 }
);

export const listFirmsForSelect = unstable_cache(
  async () =>
    prisma.firm.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, shortName: true },
      orderBy: { name: "asc" },
    }),
  ["firms-for-select-v1"],
  { revalidate: 60 }
);

export const listLawyersForSelect = unstable_cache(
  async () =>
    prisma.lawyer.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ["lawyers-for-select-v1"],
  { revalidate: 60 }
);
