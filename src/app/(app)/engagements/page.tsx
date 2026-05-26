import Link from "next/link";
import { Briefcase } from "lucide-react";
import { listEngagements } from "@/server/insights";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function EngagementsPage() {
  const engagements = await listEngagements();

  return (
    <div>
      <PageHeader
        title="Engagements"
        description={`${engagements.length} engagement${engagements.length !== 1 ? "s" : ""} tracked`}
      />

      {engagements.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No engagements yet"
          description="Engagements are logged from firm and lawyer detail pages."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Matter</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Firm</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Lead Lawyer</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Dates</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Outcome</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Fees (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {engagements.map((eng) => (
                <tr key={eng.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{eng.matterName}</p>
                    {eng.jurisdiction && (
                      <p className="text-xs text-gray-400">{eng.jurisdiction.name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/firms/${eng.firm.id}`} className="text-sm text-gray-700 hover:text-scg-700">
                      {eng.firm.shortName ?? eng.firm.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {eng.lawyer ? (
                      <Link href={`/lawyers/${eng.lawyer.id}`} className="text-sm text-gray-600 hover:text-scg-700">
                        {eng.lawyer.name}
                      </Link>
                    ) : <span className="text-sm text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="default">{eng.matterType}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(eng.startDate).toLocaleDateString()} -{" "}
                    {eng.endDate ? new Date(eng.endDate).toLocaleDateString() : "ongoing"}
                  </td>
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3 text-right text-sm text-gray-700">
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
    </div>
  );
}
