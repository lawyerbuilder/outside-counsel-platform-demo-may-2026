import Link from "next/link";
import { Trophy, Plus, Building2, Users, Download } from "lucide-react";
import { listRankingSources } from "@/server/rankings";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { CsvImportForm } from "@/components/admin/CsvImportForm";
import { RANKING_PUBLISHER_LABELS } from "@/lib/schemas";
import type { RankingPublisherEnum } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const publisherBadge: Record<RankingPublisherEnum, "scg" | "blue" | "amber" | "green"> = {
  CHAMBERS: "scg",
  LEGAL500: "blue",
  BENCHMARK_LITIGATION: "amber",
  ASIALAW: "green",
};

export default async function AdminRankingsPage() {
  const sources = await listRankingSources();

  return (
    <div>
      <PageHeader
        title="Manage Rankings"
        description="Add and manage external ranking data from Chambers, Legal 500, Benchmark Litigation, and AsiaLaw"
        breadcrumbs={[
          { label: "Admin" },
          { label: "Rankings" },
        ]}
        action={
          <div className="flex gap-2">
            <Link
              href="/admin/rankings/sources/new"
              className="inline-flex items-center gap-2 rounded-md bg-scg-700 px-4 py-2 text-sm font-medium text-white hover:bg-scg-800"
            >
              <Plus size={16} />
              Add Source
            </Link>
            <Link
              href="/admin/rankings/firms/new"
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Building2 size={16} />
              Rank Firm
            </Link>
            <Link
              href="/admin/rankings/lawyers/new"
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Users size={16} />
              Rank Lawyer
            </Link>
          </div>
        }
      />

      {/* CSV Import/Export */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <CsvImportForm />
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">
            Export Data
          </h3>
          <p className="mb-4 text-xs text-gray-500">
            Download CSVs of all firms or lawyers with rankings, NPS, ratings,
            and engagement data.
          </p>
          <div className="flex gap-2">
            <a
              href="/api/export/firms"
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download size={14} />
              Firms CSV
            </a>
            <a
              href="/api/export/lawyers"
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download size={14} />
              Lawyers CSV
            </a>
          </div>
        </div>
      </div>

      {sources.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <Trophy className="mb-4 h-10 w-10 text-gray-400" />
          <h3 className="mb-1 text-sm font-semibold text-gray-900">
            No ranking sources yet
          </h3>
          <p className="mb-4 text-sm text-gray-500">
            Start by adding a ranking source (e.g. Chambers Asia-Pacific 2025)
          </p>
          <Link
            href="/admin/rankings/sources/new"
            className="inline-flex items-center gap-2 rounded-md bg-scg-700 px-3 py-2 text-sm font-medium text-white hover:bg-scg-800"
          >
            <Plus size={16} />
            Add Source
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Publisher
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Year
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Firm Rankings
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Lawyer Rankings
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sources.map((source) => (
                <tr key={source.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/rankings/sources/${source.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-scg-700"
                    >
                      {source.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={publisherBadge[source.publisher]}>
                      {RANKING_PUBLISHER_LABELS[source.publisher]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {source.editionYear}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">
                    {source._count.firmRankings}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">
                    {source._count.lawyerRankings}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/rankings/sources/${source.id}`}
                      className="text-sm text-scg-700 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
