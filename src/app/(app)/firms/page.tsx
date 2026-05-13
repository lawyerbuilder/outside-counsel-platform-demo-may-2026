import Link from "next/link";
import { Building2, Plus, MapPin, Users, Globe } from "lucide-react";
import { listFirms, getFirmCountries } from "@/server/firms";
import { listPracticeAreas } from "@/server/reference-data";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { FIRM_TYPE_LABELS } from "@/lib/schemas";
import type { FirmTypeEnum } from "@/lib/schemas";
import { FirmFilters } from "./FirmFilters";

const firmTypeBadgeVariant: Record<FirmTypeEnum, "teal" | "amber" | "blue" | "gray"> = {
  FULL_SERVICE: "teal",
  BOUTIQUE: "amber",
  MID_SIZE: "blue",
  REGIONAL: "gray",
};

interface FirmsPageProps {
  searchParams: Promise<{
    search?: string;
    country?: string;
    firmType?: string;
    practiceAreaId?: string;
    page?: string;
  }>;
}

export default async function FirmsPage({ searchParams }: FirmsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);
  const filters = {
    search: params.search,
    country: params.country,
    firmType: params.firmType as FirmTypeEnum | undefined,
    practiceAreaId: params.practiceAreaId,
    page,
    pageSize: 20,
  };

  const [{ firms, total, totalPages }, countries, practiceAreas] =
    await Promise.all([
      listFirms(filters),
      getFirmCountries(),
      listPracticeAreas(),
    ]);

  return (
    <div>
      <PageHeader
        title="Firms"
        description={`${total} law firm${total !== 1 ? "s" : ""} in the directory`}
        action={
          <Link
            href="/firms/new"
            className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            <Plus size={16} />
            Add Firm
          </Link>
        }
      />

      <FirmFilters
        countries={countries}
        practiceAreas={practiceAreas.map((p) => ({
          id: p.id,
          name: p.name,
        }))}
        currentFilters={params}
      />

      {firms.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No firms found"
          description="Try adjusting your filters or add a new firm to get started."
          action={
            <Link
              href="/firms/new"
              className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800"
            >
              <Plus size={16} />
              Add Firm
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {firms.map((firm) => (
              <Link
                key={firm.id}
                href={`/firms/${firm.id}`}
                className="group rounded-lg border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 group-hover:text-teal-700">
                        {firm.name}
                      </h3>
                      {firm.shortName && firm.shortName !== firm.name && (
                        <span className="text-xs text-gray-400">
                          {firm.shortName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap gap-1.5">
                  <Badge variant={firmTypeBadgeVariant[firm.firmType]}>
                    {FIRM_TYPE_LABELS[firm.firmType]}
                  </Badge>
                  {firm.practiceAreas.slice(0, 2).map((fpa) => (
                    <Badge key={fpa.id} variant="default">
                      {fpa.practiceArea.name}
                    </Badge>
                  ))}
                  {firm.practiceAreas.length > 2 && (
                    <Badge variant="gray">
                      +{firm.practiceAreas.length - 2}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />
                    {firm.city}, {firm.country}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {firm._count.firmLawyers} lawyer
                    {firm._count.firmLawyers !== 1 ? "s" : ""}
                  </span>
                  {firm.website && (
                    <Globe size={12} className="text-gray-400" />
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={{
                      pathname: "/firms",
                      query: { ...params, page: page - 1 },
                    }}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={{
                      pathname: "/firms",
                      query: { ...params, page: page + 1 },
                    }}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
