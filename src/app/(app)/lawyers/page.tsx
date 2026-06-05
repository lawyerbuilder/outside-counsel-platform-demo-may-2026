import Link from "next/link";
import { Users, Plus, Building2 } from "lucide-react";
import { listLawyers } from "@/server/lawyers";
import { listFirmsForSelect, listPracticeAreas, listJurisdictions } from "@/server/reference-data";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LAWYER_ROLE_LABELS } from "@/lib/schemas";
import type { LawyerRoleEnum } from "@/lib/schemas";
import { LawyerFilters } from "./LawyerFilters";

export const revalidate = 60;

interface LawyersPageProps {
  searchParams: Promise<{
    search?: string;
    firmId?: string;
    practiceAreaId?: string;
    jurisdictionId?: string;
    role?: string;
    page?: string;
  }>;
}

export default async function LawyersPage({ searchParams }: LawyersPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);

  const filters = {
    search: params.search,
    firmId: params.firmId,
    practiceAreaId: params.practiceAreaId,
    jurisdictionId: params.jurisdictionId,
    role: params.role as LawyerRoleEnum | undefined,
    page,
    pageSize: 20,
  };

  const [{ lawyers, total, totalPages }, firms, practiceAreas, jurisdictions] =
    await Promise.all([
      listLawyers(filters),
      listFirmsForSelect(),
      listPracticeAreas(),
      listJurisdictions(),
    ]);

  return (
    <div>
      <PageHeader
        title="Lawyers"
        description={`${total} lawyer${total !== 1 ? "s" : ""} in the directory`}
        action={
          <Link
            href="/lawyers/new"
            className="inline-flex items-center gap-2 rounded-md bg-scg-700 px-4 py-2 text-sm font-medium text-white hover:bg-scg-800"
          >
            <Plus size={16} />
            Add Lawyer
          </Link>
        }
      />

      <LawyerFilters
        firms={firms}
        practiceAreas={practiceAreas.map((p) => ({ id: p.id, name: p.name }))}
        jurisdictions={jurisdictions.map((j) => ({ id: j.id, name: j.name }))}
        currentFilters={params}
      />

      {lawyers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No lawyers found"
          description="Try adjusting your filters or add a new lawyer to get started."
          action={
            <Link
              href="/lawyers/new"
              className="inline-flex items-center gap-2 rounded-md bg-scg-700 px-3 py-2 text-sm font-medium text-white hover:bg-scg-800"
            >
              <Plus size={16} />
              Add Lawyer
            </Link>
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Firm
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Practice Areas
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Qualified
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lawyers.map((lawyer) => {
                  const currentFirm = lawyer.firmLawyers[0];
                  return (
                    <tr key={lawyer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/lawyers/${lawyer.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-scg-700"
                        >
                          {lawyer.name}
                        </Link>
                        {lawyer.title && (
                          <p className="text-xs text-gray-500">
                            {lawyer.title}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {currentFirm ? (
                          <Link
                            href={`/firms/${currentFirm.firm.id}`}
                            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-scg-700"
                          >
                            <Building2 size={12} />
                            {currentFirm.firm.shortName ?? currentFirm.firm.name}
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {currentFirm ? (
                          <Badge variant="default">
                            {LAWYER_ROLE_LABELS[currentFirm.role]}
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {lawyer.practiceAreas.slice(0, 2).map((lpa) => (
                            <Badge key={lpa.id} variant="default">
                              {lpa.practiceArea.name}
                            </Badge>
                          ))}
                          {lawyer.practiceAreas.length > 2 && (
                            <Badge variant="gray">
                              +{lawyer.practiceAreas.length - 2}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {lawyer.qualificationYear ?? "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={{
                      pathname: "/lawyers",
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
                      pathname: "/lawyers",
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
