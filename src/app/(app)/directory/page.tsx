import Link from "next/link";
import { Sparkles, Building2, Users, Trophy, Star, Briefcase } from "lucide-react";
import { Suspense } from "react";
import { getCurrentUser } from "@/server/current-user";
import { getUserPreference, hasUserPreference } from "@/server/preferences";
import { scoreFirms, scoreLawyers } from "@/server/scoring";
import { listPracticeAreas, listJurisdictions } from "@/server/reference-data";
import { DirectoryFilters } from "@/components/directory/DirectoryFilters";
import { AiSearchChat } from "@/components/directory/AiSearchChat";
import { ScoreBadge } from "@/components/directory/ScoreBadge";
import { NpsBadge } from "@/components/ui/NpsBadge";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { FIRM_TYPE_LABELS, LAWYER_RANKING_CATEGORY_LABELS } from "@/lib/schemas";
import type { FirmTypeEnum, LawyerRankingCategoryEnum } from "@/lib/schemas";

export const revalidate = 60;

interface DirectoryPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DirectoryPage({ searchParams }: DirectoryPageProps) {
  const params = await searchParams;
  const type = (params.type as string) ?? "firms";
  const search = params.search as string | undefined;
  const practiceAreaId = params.practiceAreaId as string | undefined;
  const jurisdictionId = params.jurisdictionId as string | undefined;
  const firmType = params.firmType as string | undefined;
  const minNps = params.minNps ? Number(params.minNps) : undefined;

  const user = await getCurrentUser();
  const [weights, hasPrefs, practiceAreas, jurisdictions] = await Promise.all([
    getUserPreference(user.id),
    hasUserPreference(user.id),
    listPracticeAreas(),
    listJurisdictions(),
  ]);

  const filters = { search, practiceAreaId, jurisdictionId, firmType, minNps };

  return (
    <div>
      <PageHeader
        title="Directory"
        description="Smart search across firms and lawyers, ranked by your personalized fit score"
        action={
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Sparkles size={14} className="text-amber-500" />
            Adjust Weights
          </Link>
        }
      />

      {!hasPrefs && (
        <div className="mb-6 rounded-lg border border-scg-200 bg-scg-50 p-4">
          <div className="flex items-start gap-3">
            <Sparkles size={20} className="mt-0.5 text-scg-600" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-scg-800">
                Welcome! Tell us what matters most to you
              </h3>
              <p className="mt-1 text-xs text-scg-700">
                The directory ranks firms and lawyers using a personalized fit
                score. Set your weights to prioritize what you value most —
                responsiveness, quality, cost efficiency, expertise, or peer
                sentiment.
              </p>
              <Link
                href="/settings"
                className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-scg-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-scg-700"
              >
                <Sparkles size={14} />
                Set Your Preferences
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <AiSearchChat />
      </div>

      <div className="mb-6">
        <Suspense fallback={null}>
          <DirectoryFilters
            practiceAreas={practiceAreas.map((pa) => ({
              value: pa.id,
              label: pa.name,
            }))}
            jurisdictions={jurisdictions.map((j) => ({
              value: j.id,
              label: j.name,
            }))}
          />
        </Suspense>
      </div>

      {type === "firms" ? (
        <FirmResults weights={weights} filters={filters} />
      ) : (
        <LawyerResults weights={weights} filters={filters} />
      )}
    </div>
  );
}

async function FirmResults({
  weights,
  filters,
}: {
  weights: Awaited<ReturnType<typeof getUserPreference>>;
  filters: Parameters<typeof scoreFirms>[1];
}) {
  const firms = await scoreFirms(weights, filters);

  if (firms.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <Building2 size={32} className="mx-auto text-gray-300" />
        <p className="mt-2 text-sm text-gray-500">No firms match your criteria.</p>
      </div>
    );
  }

  // Top 3 as "Recommended for you"
  const recommended = firms.slice(0, 3);
  const rest = firms.slice(3);

  return (
    <div className="space-y-6">
      {/* Recommended section */}
      {recommended.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-600">
            <Sparkles size={14} />
            Recommended for You
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            {recommended.map((firm, idx) => (
              <FirmCard key={firm.id} firm={firm} rank={idx + 1} featured />
            ))}
          </div>
        </div>
      )}

      {/* All results */}
      {rest.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-500">
            All Results ({firms.length})
          </h3>
          <div className="space-y-3">
            {rest.map((firm, idx) => (
              <FirmCard key={firm.id} firm={firm} rank={idx + 4} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FirmCard({
  firm,
  rank,
  featured = false,
}: {
  firm: Awaited<ReturnType<typeof scoreFirms>>[0];
  rank: number;
  featured?: boolean;
}) {
  return (
    <Link
      href={`/firms/${firm.id}`}
      className={`block rounded-lg border bg-white p-4 transition-shadow hover:shadow-md ${
        featured ? "border-amber-200 ring-1 ring-amber-100" : "border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-400">#{rank}</span>
            <h4 className="truncate text-sm font-semibold text-gray-900">
              {firm.shortName ?? firm.name}
            </h4>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            {firm.city}, {firm.country}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant={firm.firmType === "BOUTIQUE" ? "amber" : "default"}>
              {FIRM_TYPE_LABELS[firm.firmType as FirmTypeEnum]}
            </Badge>
            {firm.bestBand != null && (
              <Badge variant="scg">Band {firm.bestBand}</Badge>
            )}
            {firm.bestTier != null && (
              <Badge variant="blue">Tier {firm.bestTier}</Badge>
            )}
          </div>
        </div>
        <ScoreBadge score={firm.compositeScore} />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
        <NpsBadge nps={firm.nps} size="sm" />
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {firm.avgRating != null && (
            <span className="flex items-center gap-1">
              <Star size={12} className="text-amber-400" />
              {firm.avgRating}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Trophy size={12} />
            {firm.rankingCount}
          </span>
          <span className="flex items-center gap-1">
            <Briefcase size={12} />
            {firm.engagementCount}
          </span>
        </div>
      </div>

      {firm.practiceAreas.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {firm.practiceAreas.slice(0, 3).map((pa) => (
            <span
              key={pa}
              className="rounded bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-500"
            >
              {pa}
            </span>
          ))}
          {firm.practiceAreas.length > 3 && (
            <span className="text-[10px] text-gray-400">
              +{firm.practiceAreas.length - 3} more
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

async function LawyerResults({
  weights,
  filters,
}: {
  weights: Awaited<ReturnType<typeof getUserPreference>>;
  filters: Parameters<typeof scoreLawyers>[1];
}) {
  const lawyers = await scoreLawyers(weights, filters);

  if (lawyers.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <Users size={32} className="mx-auto text-gray-300" />
        <p className="mt-2 text-sm text-gray-500">No lawyers match your criteria.</p>
      </div>
    );
  }

  const recommended = lawyers.slice(0, 3);
  const rest = lawyers.slice(3);

  return (
    <div className="space-y-6">
      {recommended.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-600">
            <Sparkles size={14} />
            Recommended for You
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            {recommended.map((lawyer, idx) => (
              <LawyerCard key={lawyer.id} lawyer={lawyer} rank={idx + 1} featured />
            ))}
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-500">
            All Results ({lawyers.length})
          </h3>
          <div className="space-y-3">
            {rest.map((lawyer, idx) => (
              <LawyerCard key={lawyer.id} lawyer={lawyer} rank={idx + 4} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LawyerCard({
  lawyer,
  rank,
  featured = false,
}: {
  lawyer: Awaited<ReturnType<typeof scoreLawyers>>[0];
  rank: number;
  featured?: boolean;
}) {
  return (
    <Link
      href={`/lawyers/${lawyer.id}`}
      className={`block rounded-lg border bg-white p-4 transition-shadow hover:shadow-md ${
        featured ? "border-amber-200 ring-1 ring-amber-100" : "border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-400">#{rank}</span>
            <h4 className="truncate text-sm font-semibold text-gray-900">
              {lawyer.name}
            </h4>
          </div>
          {lawyer.title && (
            <p className="mt-0.5 text-xs text-gray-500">{lawyer.title}</p>
          )}
          {lawyer.currentFirm && (
            <p className="text-xs text-scg-600">
              {lawyer.currentFirm.shortName ?? lawyer.currentFirm.name}
            </p>
          )}
          {lawyer.bestCategory && (
            <div className="mt-2">
              <Badge variant="green">
                {LAWYER_RANKING_CATEGORY_LABELS[lawyer.bestCategory as LawyerRankingCategoryEnum]}
              </Badge>
            </div>
          )}
        </div>
        <ScoreBadge score={lawyer.compositeScore} />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
        <NpsBadge nps={lawyer.nps} size="sm" />
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {lawyer.avgRating != null && (
            <span className="flex items-center gap-1">
              <Star size={12} className="text-amber-400" />
              {lawyer.avgRating}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Trophy size={12} />
            {lawyer.rankingCount}
          </span>
          <span className="flex items-center gap-1">
            <Briefcase size={12} />
            {lawyer.engagementCount}
          </span>
        </div>
      </div>

      {lawyer.practiceAreas.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {lawyer.practiceAreas.slice(0, 3).map((pa) => (
            <span
              key={pa}
              className="rounded bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-500"
            >
              {pa}
            </span>
          ))}
          {lawyer.practiceAreas.length > 3 && (
            <span className="text-[10px] text-gray-400">
              +{lawyer.practiceAreas.length - 3} more
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
