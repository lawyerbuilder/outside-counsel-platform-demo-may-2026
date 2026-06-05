import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Globe,
  Calendar,
  Users,
  Pencil,
  ExternalLink,
  GitBranch,
  Briefcase,
} from "lucide-react";
import { Trophy, MessageSquare, Pin, DollarSign, Brain, FileText } from "lucide-react";
import { getFirmById } from "@/server/firms";
import { getFirmRankings } from "@/server/rankings";
import {
  getFirmNps,
  getFirmInternalRatings,
  getFirmEngagements,
  getFirmNotes,
  getFirmCostBenchmarks,
} from "@/server/insights";
import { getFirmTimesheetMentions } from "@/server/timesheet";
import { listPracticeAreas, listJurisdictions } from "@/server/reference-data";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { NpsBadge, NpsBreakdown } from "@/components/ui/NpsBadge";
import { RatingAverages } from "@/components/ui/StarRating";
import { NpsForm } from "@/components/insights/NpsForm";
import { RatingForm } from "@/components/insights/RatingForm";
import { NoteForm } from "@/components/insights/NoteForm";
import { EngagementForm } from "@/components/insights/EngagementForm";
import { CostBenchmarkForm } from "@/components/insights/CostBenchmarkForm";
import {
  FIRM_TYPE_LABELS,
  LAWYER_ROLE_LABELS,
  RANKING_PUBLISHER_LABELS,
  BENCHMARK_ROLE_LABELS,
  BENCHMARK_SOURCE_LABELS,
  formatBand,
  formatTier,
  formatStars,
} from "@/lib/schemas";
import type { FirmTypeEnum, RankingPublisherEnum, BenchmarkRoleEnum, BenchmarkSourceEnum } from "@/lib/schemas";

export const revalidate = 60;

const firmTypeBadgeVariant: Record<FirmTypeEnum, "scg" | "amber" | "blue" | "gray"> = {
  FULL_SERVICE: "scg",
  BOUTIQUE: "amber",
  MID_SIZE: "blue",
  REGIONAL: "gray",
  ALSP: "blue",
};

interface FirmDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function FirmDetailPage({ params }: FirmDetailPageProps) {
  const { id } = await params;
  const [firm, rankings, nps, internalRatings, engagements, notes, costBenchmarks, timesheetMentions, allPracticeAreas, allJurisdictions] =
    await Promise.all([
      getFirmById(id),
      getFirmRankings(id),
      getFirmNps(id),
      getFirmInternalRatings(id),
      getFirmEngagements(id),
      getFirmNotes(id),
      getFirmCostBenchmarks(id),
      getFirmTimesheetMentions(id),
      listPracticeAreas(),
      listJurisdictions(),
    ]);

  if (!firm || firm.deletedAt) {
    notFound();
  }

  const currentLawyers = firm.firmLawyers.filter((fl) => fl.isCurrent);
  const formerLawyers = firm.firmLawyers.filter((fl) => !fl.isCurrent);
  const practiceAreas = firm.practiceAreas;

  return (
    <div>
      <PageHeader
        title={firm.name}
        breadcrumbs={[
          { label: "Firms", href: "/firms" },
          { label: firm.shortName ?? firm.name },
        ]}
        action={
          <Link
            href={`/firms/${firm.id}/edit`}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Pencil size={14} />
            Edit
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Overview Card */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Overview
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <Badge variant={firmTypeBadgeVariant[firm.firmType]}>
                  {FIRM_TYPE_LABELS[firm.firmType]}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin size={16} className="text-gray-400" />
                {firm.city}, {firm.country}
              </div>
              {firm.foundedYear && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar size={16} className="text-gray-400" />
                  Founded {firm.foundedYear}
                </div>
              )}
              {firm.headcount && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users size={16} className="text-gray-400" />
                  {firm.headcount.toLocaleString()} people (global)
                </div>
              )}
              {firm.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe size={16} className="text-gray-400" />
                  <a
                    href={firm.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-scg-700 hover:underline"
                  >
                    Website
                    <ExternalLink size={12} className="ml-1 inline" />
                  </a>
                </div>
              )}
            </div>

            {firm.notes && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-sm text-gray-600">{firm.notes}</p>
              </div>
            )}

            {firm.internalNotes && (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-700">
                  AI Knowledge Notes
                </p>
                <p className="text-sm text-amber-800">{firm.internalNotes}</p>
              </div>
            )}
          </div>

          {/* Lawyers */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                <Users size={14} className="mr-2 inline" />
                Current Lawyers ({currentLawyers.length})
              </h3>
            </div>
            {currentLawyers.length === 0 ? (
              <p className="text-sm text-gray-400">No lawyers on record.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {currentLawyers.map((fl) => (
                  <Link
                    key={fl.id}
                    href={`/lawyers/${fl.lawyer.id}`}
                    className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {fl.lawyer.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {fl.lawyer.title}
                      </p>
                    </div>
                    <Badge variant="default">
                      {LAWYER_ROLE_LABELS[fl.role]}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}

            {formerLawyers.length > 0 && (
              <div className="mt-6 border-t border-gray-100 pt-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Former ({formerLawyers.length})
                </h4>
                <div className="divide-y divide-gray-50">
                  {formerLawyers.map((fl) => (
                    <Link
                      key={fl.id}
                      href={`/lawyers/${fl.lawyer.id}`}
                      className="flex items-center justify-between py-2 hover:bg-gray-50 -mx-2 px-2 rounded"
                    >
                      <div>
                        <p className="text-sm text-gray-600">
                          {fl.lawyer.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {fl.startDate &&
                            new Date(fl.startDate).getFullYear()}
                          {" - "}
                          {fl.endDate
                            ? new Date(fl.endDate).getFullYear()
                            : "present"}
                        </p>
                      </div>
                      <Badge variant="gray">
                        {LAWYER_ROLE_LABELS[fl.role]}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Practice Areas */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              <Briefcase size={14} className="mr-2 inline" />
              Practice Areas
            </h3>
            {practiceAreas.length === 0 ? (
              <p className="text-sm text-gray-400">None recorded.</p>
            ) : (
              <div className="space-y-2">
                {practiceAreas.map((fpa) => (
                  <div key={fpa.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">
                      {fpa.practiceArea.name}
                    </span>
                    {fpa.jurisdiction && (
                      <Badge variant="gray">{fpa.jurisdiction.name}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Spin-off Lineage */}
          {(firm.parentFirm || firm.spinOffs.length > 0) && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
                <GitBranch size={14} className="mr-2 inline" />
                Firm Lineage
              </h3>
              {firm.parentFirm && (
                <div className="mb-3">
                  <p className="text-xs text-gray-400 mb-1">Spin-off from</p>
                  <Link
                    href={`/firms/${firm.parentFirm.id}`}
                    className="text-sm font-medium text-scg-700 hover:underline"
                  >
                    {firm.parentFirm.name}
                  </Link>
                </div>
              )}
              {firm.spinOffs.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Spin-offs</p>
                  <div className="space-y-1">
                    {firm.spinOffs.map((so) => (
                      <Link
                        key={so.id}
                        href={`/firms/${so.id}`}
                        className="block text-sm text-scg-700 hover:underline"
                      >
                        {so.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rankings */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              <Trophy size={14} className="mr-2 inline" />
              Rankings ({rankings.length})
            </h3>
            {rankings.length === 0 ? (
              <p className="text-sm text-gray-400">No rankings recorded.</p>
            ) : (
              <div className="space-y-3">
                {rankings.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-md border border-gray-100 p-2.5"
                  >
                    <div>
                      <Badge
                        variant={
                          r.rankingSource.publisher === "CHAMBERS"
                            ? "scg"
                            : r.rankingSource.publisher === "LEGAL500"
                            ? "blue"
                            : r.rankingSource.publisher === "BENCHMARK_LITIGATION"
                            ? "amber"
                            : "green"
                        }
                      >
                        {RANKING_PUBLISHER_LABELS[r.rankingSource.publisher as RankingPublisherEnum]}{" "}
                        {r.rankingSource.editionYear}
                      </Badge>
                      <p className="mt-1 text-xs text-gray-500">
                        {r.practiceArea.name}
                      </p>
                    </div>
                    <div className="text-right">
                      {r.band != null && (
                        <span className="text-sm font-medium text-scg-700">
                          {formatBand(r.band)}
                        </span>
                      )}
                      {r.tier != null && (
                        <span className="text-sm font-medium text-blue-700">
                          {formatTier(r.tier)}
                        </span>
                      )}
                      {r.starRating != null && (
                        <span className="text-sm text-amber-500">
                          {formatStars(r.starRating)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timesheet Intelligence */}
          {timesheetMentions.length > 0 && (
            <div className="rounded-lg border border-scg-200 bg-scg-50/30 p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-scg-700">
                <Brain size={14} className="mr-2 inline" />
                Timesheet Intelligence
              </h3>
              <div className="space-y-3">
                {timesheetMentions.map((tm) => (
                  <div
                    key={`${tm.uploadId}-${tm.mention.shortName}`}
                    className="rounded-md border border-scg-100 bg-white p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-scg-800">
                        {tm.mention.mentionCount}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        mentions
                      </span>
                    </div>
                    <div className="mt-2 space-y-1">
                      {tm.mention.matters.map((m) => (
                        <div
                          key={m}
                          className="flex items-start gap-1.5 text-xs text-gray-700"
                        >
                          <Briefcase size={10} className="mt-0.5 flex-shrink-0 text-gray-400" />
                          {m}
                        </div>
                      ))}
                    </div>
                    {tm.mention.activityTypes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tm.mention.activityTypes.map((at) => (
                          <span
                            key={at}
                            className="rounded bg-scg-100/60 px-1.5 py-0.5 text-[10px] text-scg-700"
                          >
                            {at}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400">
                      <FileText size={8} />
                      <Link
                        href={`/insights`}
                        className="hover:text-scg-600 hover:underline"
                      >
                        {tm.uploadFileName}
                      </Link>
                      <span>&middot;</span>
                      <span>
                        {new Date(tm.analyzedAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/insights"
                className="mt-3 flex items-center gap-1 text-xs text-scg-700 hover:underline"
              >
                <Brain size={10} />
                View full analysis
              </Link>
            </div>
          )}

          {/* NPS & Internal Ratings */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Internal Sentiment
            </h3>
            <div className="mb-4">
              <NpsBadge nps={nps} size="lg" />
            </div>
            <NpsBreakdown nps={nps} />
            {internalRatings.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="mb-2 text-xs font-medium text-gray-500">
                  Avg. Ratings ({internalRatings.length} review{internalRatings.length !== 1 ? "s" : ""})
                </p>
                <RatingAverages ratings={internalRatings} />
              </div>
            )}

            <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
              <NpsForm
                targetType="FIRM"
                targetId={id}
                practiceAreas={allPracticeAreas.map((pa) => ({ id: pa.id, name: pa.name }))}
              />
              <RatingForm targetType="FIRM" targetId={id} />
            </div>
          </div>

          {/* Relationship Notes */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              <MessageSquare size={14} className="mr-2 inline" />
              Notes ({notes.length})
            </h3>
            {notes.length > 0 && (
              <div className="space-y-3 mb-4">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className={`rounded-md border p-3 text-sm ${
                      note.isPinned
                        ? "border-amber-200 bg-amber-50/50"
                        : "border-gray-100"
                    }`}
                  >
                    {note.isPinned && (
                      <Pin size={10} className="mb-1 inline text-amber-500" />
                    )}
                    <p className="text-gray-700">{note.content}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {note.author.name} &middot;{" "}
                      {new Date(note.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <NoteForm targetType="FIRM" targetId={id} />
          </div>
        </div>
      </div>

      {/* Engagements section — full width below */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
          <DollarSign size={14} className="mr-2 inline" />
          Engagements ({engagements.length})
        </h3>
        {engagements.length > 0 && (
          <div className="mb-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Matter</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Lead Lawyer</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Dates</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Outcome</th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Fees (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {engagements.map((eng) => (
                  <tr key={eng.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm font-medium text-gray-900">
                      {eng.matterName}
                      {eng.entityName && (
                        <p className="text-xs text-gray-400">{eng.entityName}</p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="default">{eng.matterType}</Badge>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">
                      {eng.lawyer ? (
                        <Link href={`/lawyers/${eng.lawyer.id}`} className="hover:text-scg-700">
                          {eng.lawyer.name}
                        </Link>
                      ) : "-"}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {new Date(eng.startDate).toLocaleDateString()} -{" "}
                      {eng.endDate ? new Date(eng.endDate).toLocaleDateString() : "ongoing"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={
                          eng.outcome === "WON" ? "green" :
                          eng.outcome === "ONGOING" ? "blue" :
                          eng.outcome === "COMPLETED" ? "scg" :
                          eng.outcome === "SETTLED" ? "amber" :
                          eng.outcome === "LOST" ? "red" : "gray"
                        }
                      >
                        {eng.outcome}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right text-sm text-gray-700">
                      {eng.totalFeesUsd != null
                        ? `$${(eng.totalFeesUsd / 100).toLocaleString()}`
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex gap-3">
          <div className="flex-1">
            <EngagementForm
              firmId={id}
              lawyers={currentLawyers.map((fl) => ({ id: fl.lawyer.id, name: fl.lawyer.name }))}
              jurisdictions={allJurisdictions.map((j) => ({ id: j.id, name: j.name }))}
            />
          </div>
          <div className="flex-1">
            <CostBenchmarkForm
              firmId={id}
              practiceAreas={allPracticeAreas.map((pa) => ({ id: pa.id, name: pa.name }))}
              jurisdictions={allJurisdictions.map((j) => ({ id: j.id, name: j.name }))}
            />
          </div>
        </div>
      </div>

      {/* Cost Benchmarks — full width */}
      {costBenchmarks.length > 0 && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
            <DollarSign size={14} className="mr-2 inline" />
            Cost Benchmarks ({costBenchmarks.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Practice Area</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Jurisdiction</th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Hourly</th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Blended</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Source</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Year</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {costBenchmarks.map((cb) => (
                  <tr key={cb.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {BENCHMARK_ROLE_LABELS[cb.role as BenchmarkRoleEnum]}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">
                      {cb.practiceArea.name}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">
                      {cb.jurisdiction.name}
                    </td>
                    <td className="px-3 py-2 text-right text-sm text-gray-900">
                      ${(cb.hourlyRateUsd / 100).toLocaleString()}/hr
                    </td>
                    <td className="px-3 py-2 text-right text-sm text-gray-600">
                      {cb.blendedRateUsd != null
                        ? `$${(cb.blendedRateUsd / 100).toLocaleString()}/hr`
                        : "-"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={cb.source === "ACTUAL" ? "green" : cb.source === "PROPOSED" ? "amber" : "blue"}>
                        {BENCHMARK_SOURCE_LABELS[cb.source as BenchmarkSourceEnum]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500">
                      {cb.year}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
