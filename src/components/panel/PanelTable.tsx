import Link from "next/link";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import type { PanelFirmRow, PanelAction, ScorecardTier } from "@/server/panel";

const actionConfig: Record<PanelAction, { label: string; variant: BadgeVariant }> = {
  RETAIN_PREFERRED: { label: "Retain (Preferred)", variant: "green" },
  RETAIN: { label: "Retain", variant: "scg" },
  WATCH: { label: "Watch", variant: "amber" },
  IMPROVEMENT_PLAN: { label: "Improvement Plan", variant: "amber" },
  EXIT_REVIEW: { label: "Exit Review", variant: "red" },
};

const tierConfig: Record<ScorecardTier, { label: string; variant: BadgeVariant }> = {
  TOP_PERFORMER: { label: "Top Performer", variant: "green" },
  MEETS_EXPECTATIONS: { label: "Meets Expectations", variant: "blue" },
  REQUIRES_IMPROVEMENT: { label: "Requires Improvement", variant: "amber" },
  EXIT_REVIEW: { label: "Exit Review", variant: "red" },
};

const statusVariant: Record<string, BadgeVariant> = {
  ACTIVE: "green",
  PROBATION: "amber",
  PROSPECTIVE: "blue",
  EXITED: "gray",
};

function fmtSpend(cents: number): string {
  if (cents === 0) return "—";
  const usd = cents / 100;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
  if (usd >= 1_000) return `$${Math.round(usd / 1_000)}K`;
  return `$${usd.toLocaleString()}`;
}

export function PanelTable({ rows }: { rows: PanelFirmRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
        <p className="text-sm text-gray-500">
          No firms with panel activity yet. Record engagements or scorecards to populate this view.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className="px-4 py-3 font-medium text-gray-500">Firm</th>
            <th className="px-4 py-3 font-medium text-gray-500">Status</th>
            <th className="px-4 py-3 font-medium text-gray-500">Scorecard Tier</th>
            <th className="px-4 py-3 font-medium text-gray-500">NPS</th>
            <th className="px-4 py-3 font-medium text-gray-500">Total Spend</th>
            <th className="px-4 py-3 font-medium text-gray-500">Last Engagement</th>
            <th className="px-4 py-3 font-medium text-gray-500">Recommended Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => {
            const action = actionConfig[row.recommendedAction];
            const tier = row.tier ? tierConfig[row.tier] : null;
            return (
              <tr key={row.firmId} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/firms/${row.firmId}`}
                    className="font-medium text-scg-700 hover:text-scg-800"
                  >
                    {row.firmName}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant[row.panelStatus] ?? "gray"} className="text-[10px]">
                    {row.panelStatus}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {tier ? (
                    <Badge variant={tier.variant} className="text-[10px]">
                      {tier.label}
                    </Badge>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {row.nps != null ? (
                    <span
                      className={`font-semibold ${
                        row.nps > 50
                          ? "text-green-700"
                          : row.nps >= 0
                            ? "text-amber-600"
                            : "text-red-600"
                      }`}
                      title={`${row.npsCount} response(s)`}
                    >
                      {row.nps > 0 ? "+" : ""}
                      {row.nps}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {fmtSpend(row.totalSpendCents)}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {row.lastEngagementDate
                    ? new Date(row.lastEngagementDate).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5" title={row.actionBasis ?? undefined}>
                    <Badge variant={action.variant} className="w-fit text-[10px]">
                      {action.label}
                      {row.isComputed ? " (suggested)" : ""}
                    </Badge>
                    {row.actionBasis && (
                      <span className="text-[10px] text-gray-400">{row.actionBasis}</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
