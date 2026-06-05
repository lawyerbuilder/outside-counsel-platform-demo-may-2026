import Link from "next/link";
import { Trophy, Building2, User } from "lucide-react";
import { getRankedFirms, getRankedLawyers, getAvailableEditionYears } from "@/server/rankings";
import { listPracticeAreas, listJurisdictions } from "@/server/reference-data";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import {
  RANKING_PUBLISHER_LABELS,
  LAWYER_RANKING_CATEGORY_LABELS,
  formatBand,
  formatTier,
  formatStars,
} from "@/lib/schemas";
import type { RankingPublisherEnum, LawyerRankingCategoryEnum } from "@/lib/schemas";
import { RankingFilters } from "./RankingFilters";

export const revalidate = 60;

const publisherBadge: Record<RankingPublisherEnum, "scg" | "blue" | "amber" | "green"> = {
  CHAMBERS: "scg",
  LEGAL500: "blue",
  BENCHMARK_LITIGATION: "amber",
  ASIALAW: "green",
};

const categoryBadge: Record<LawyerRankingCategoryEnum, "green" | "scg" | "amber" | "default" | "blue"> = {
  STAR: "green",
  LEADING: "green",
  RECOMMENDED: "scg",
  UP_AND_COMING: "amber",
  RECOGNISED: "default",
};

interface RankingsPageProps {
  searchParams: Promise<{
    publisher?: string;
    practiceAreaId?: string;
    jurisdictionId?: string;
    editionYear?: string;
    tab?: string;
  }>;
}

export default async function RankingsPage({ searchParams }: RankingsPageProps) {
  const params = await searchParams;
  const tab = params.tab ?? "firms";

  const filters = {
    publisher: params.publisher as RankingPublisherEnum | undefined,
    practiceAreaId: params.practiceAreaId,
    jurisdictionId: params.jurisdictionId,
    editionYear: params.editionYear ? parseInt(params.editionYear, 10) : undefined,
  };

  const [firmRankings, lawyerRankings, practiceAreas, jurisdictions, editionYears] =
    await Promise.all([
      tab === "firms" ? getRankedFirms(filters) : Promise.resolve([]),
      tab === "lawyers" ? getRankedLawyers(filters) : Promise.resolve([]),
      listPracticeAreas(),
      listJurisdictions(),
      getAvailableEditionYears(),
    ]);

  return (
    <div>
      <PageHeader
        title="Rankings"
        description="External rankings from Chambers, Legal 500, Benchmark Litigation, and AsiaLaw"
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-gray-200 bg-gray-100 p-1 w-fit">
        <Link
          href={{ pathname: "/rankings", query: { ...params, tab: "firms" } }}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "firms"
              ? "bg-white text-scg-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Building2 size={14} />
          Firms
        </Link>
        <Link
          href={{ pathname: "/rankings", query: { ...params, tab: "lawyers" } }}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "lawyers"
              ? "bg-white text-scg-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <User size={14} />
          Lawyers
        </Link>
      </div>

      <RankingFilters
        practiceAreas={practiceAreas.map((p) => ({ id: p.id, name: p.name }))}
        jurisdictions={jurisdictions.map((j) => ({ id: j.id, name: j.name }))}
        editionYears={editionYears}
        currentFilters={params}
      />

      {tab === "firms" && (
        <>
          {firmRankings.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
              <Trophy className="mb-4 h-10 w-10 text-gray-400" />
              <p className="text-sm text-gray-500">No firm rankings match your filters.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Firm</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Practice Area</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Jurisdiction</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Ranking</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {firmRankings.map((fr) => (
                    <tr key={fr.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/firms/${fr.firm.id}`} className="text-sm font-medium text-gray-900 hover:text-scg-700">
                          {fr.firm.shortName ?? fr.firm.name}
                        </Link>
                        <p className="text-xs text-gray-400">{fr.firm.city}, {fr.firm.country}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{fr.practiceArea.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{fr.jurisdiction.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant={publisherBadge[fr.rankingSource.publisher]}>
                          {RANKING_PUBLISHER_LABELS[fr.rankingSource.publisher]} {fr.rankingSource.editionYear}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {fr.band != null && <Badge variant={fr.band <= 2 ? "green" : fr.band <= 4 ? "scg" : "gray"}>{formatBand(fr.band)}</Badge>}
                        {fr.tier != null && <Badge variant={fr.tier <= 2 ? "green" : fr.tier <= 3 ? "scg" : "gray"}>{formatTier(fr.tier)}</Badge>}
                        {fr.starRating != null && <span className="text-sm text-amber-500">{formatStars(fr.starRating)}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "lawyers" && (
        <>
          {lawyerRankings.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
              <Trophy className="mb-4 h-10 w-10 text-gray-400" />
              <p className="text-sm text-gray-500">No lawyer rankings match your filters.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Lawyer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Firm</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Practice Area</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lawyerRankings.map((lr) => {
                    const currentFirm = lr.lawyer.firmLawyers[0];
                    return (
                      <tr key={lr.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link href={`/lawyers/${lr.lawyer.id}`} className="text-sm font-medium text-gray-900 hover:text-scg-700">
                            {lr.lawyer.name}
                          </Link>
                          {lr.lawyer.title && <p className="text-xs text-gray-400">{lr.lawyer.title}</p>}
                        </td>
                        <td className="px-4 py-3">
                          {currentFirm ? (
                            <Link href={`/firms/${currentFirm.firm.id}`} className="text-sm text-gray-600 hover:text-scg-700">
                              {currentFirm.firm.shortName ?? currentFirm.firm.name}
                            </Link>
                          ) : <span className="text-sm text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{lr.practiceArea.name}</td>
                        <td className="px-4 py-3">
                          <Badge variant={publisherBadge[lr.rankingSource.publisher]}>
                            {RANKING_PUBLISHER_LABELS[lr.rankingSource.publisher]} {lr.rankingSource.editionYear}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={categoryBadge[lr.category]}>
                            {LAWYER_RANKING_CATEGORY_LABELS[lr.category]}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
