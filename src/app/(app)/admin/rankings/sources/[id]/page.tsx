import { notFound } from "next/navigation";
import Link from "next/link";
import { getRankingSourceById } from "@/server/rankings";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import {
  RANKING_PUBLISHER_LABELS,
  LAWYER_RANKING_CATEGORY_LABELS,
  formatBand,
  formatTier,
  formatStars,
} from "@/lib/schemas";

export const dynamic = "force-dynamic";

interface SourceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SourceDetailPage({ params }: SourceDetailPageProps) {
  const { id } = await params;
  const source = await getRankingSourceById(id);

  if (!source) {
    notFound();
  }

  return (
    <div>
      <PageHeader
        title={source.name}
        breadcrumbs={[
          { label: "Admin" },
          { label: "Rankings", href: "/admin/rankings" },
          { label: source.name },
        ]}
      />

      <div className="mb-4 flex items-center gap-3">
        <Badge variant="scg">
          {RANKING_PUBLISHER_LABELS[source.publisher]}
        </Badge>
        <span className="text-sm text-gray-500">
          Edition {source.editionYear}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Firm Rankings */}
        <div className="surface p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Firm Rankings ({source.firmRankings.length})
          </h3>
          {source.firmRankings.length === 0 ? (
            <p className="text-sm text-gray-400">No firm rankings yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {source.firmRankings.map((fr) => (
                <div key={fr.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link
                      href={`/firms/${fr.firm.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-scg-700"
                    >
                      {fr.firm.shortName ?? fr.firm.name}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {fr.practiceArea.name} - {fr.jurisdiction.name}
                    </p>
                  </div>
                  <div>
                    {fr.band != null && (
                      <Badge variant="scg">{formatBand(fr.band)}</Badge>
                    )}
                    {fr.tier != null && (
                      <Badge variant="blue">{formatTier(fr.tier)}</Badge>
                    )}
                    {fr.starRating != null && (
                      <span className="text-sm text-amber-500">
                        {formatStars(fr.starRating)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lawyer Rankings */}
        <div className="surface p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Lawyer Rankings ({source.lawyerRankings.length})
          </h3>
          {source.lawyerRankings.length === 0 ? (
            <p className="text-sm text-gray-400">No lawyer rankings yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {source.lawyerRankings.map((lr) => (
                <div key={lr.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link
                      href={`/lawyers/${lr.lawyer.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-scg-700"
                    >
                      {lr.lawyer.name}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {lr.practiceArea.name} - {lr.jurisdiction.name}
                    </p>
                  </div>
                  <Badge
                    variant={
                      lr.category === "STAR" || lr.category === "LEADING"
                        ? "green"
                        : lr.category === "UP_AND_COMING"
                        ? "amber"
                        : "default"
                    }
                  >
                    {LAWYER_RANKING_CATEGORY_LABELS[lr.category]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
