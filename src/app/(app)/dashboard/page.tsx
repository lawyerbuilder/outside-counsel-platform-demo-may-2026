import Link from "next/link";
import {
  Building2,
  Users,
  FileText,
  Briefcase,
  Clock,
  Bot,
  ArrowRight,
  Plus,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Send,
  Globe,
  Landmark,
} from "lucide-react";
import { getDashboardStats } from "@/server/dashboard";

export const dynamic = "force-dynamic";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  OPEN: "bg-blue-100 text-blue-700",
  EVALUATING: "bg-amber-100 text-amber-700",
  SHORTLISTED: "bg-purple-100 text-purple-700",
  CLOSED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const outputTypeLabels: Record<string, string> = {
  RFP_EVALUATION: "RFP Comparison",
  RFP_DRAFT: "RFP Draft",
  INVOICE_REVIEW: "Invoice Review",
  SCORECARD: "Scorecard",
  CHAT: "AI Chat",
};

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Outside Counsel Platform overview
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/rfp"
            className="inline-flex items-center gap-1.5 rounded-md bg-scg-600 px-3 py-2 text-xs font-medium text-white hover:bg-scg-700"
          >
            <Plus size={14} />
            New RFP
          </Link>
          <Link
            href="/directory"
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Users size={14} />
            Find Counsel
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Active Firms"
          value={stats.firmCount}
          icon={<Building2 size={20} />}
          href="/firms"
          detail={`${stats.panelMap["ACTIVE"] ?? 0} on panel`}
        />
        <StatCard
          label="Subsidiaries"
          value={stats.entityCount}
          icon={<Landmark size={20} />}
          href="/firms"
          detail="cost centers"
        />
        <StatCard
          label="Jurisdictions"
          value={stats.jurisdictionCount}
          icon={<Globe size={20} />}
          href="/rankings"
          detail="tracked"
        />
        <StatCard
          label="Lawyers"
          value={stats.lawyerCount}
          icon={<Users size={20} />}
          href="/lawyers"
          detail="in directory"
        />
        <StatCard
          label="Active RFPs"
          value={stats.activeRfps}
          icon={<FileText size={20} />}
          href="/rfp"
          detail={`${stats.totalRfps} total`}
          highlight={stats.activeRfps > 0}
        />
        <StatCard
          label="Engagements"
          value={stats.ongoingEngagements}
          icon={<Briefcase size={20} />}
          href="/engagements"
          detail={`${stats.totalEngagements} total`}
        />
      </div>

      {/* Two column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Active RFPs — takes 2 columns */}
        <div className="lg:col-span-2 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-900">
              RFP Pipeline
            </h2>
            <Link
              href="/rfp"
              className="text-xs text-scg-600 hover:text-scg-700"
            >
              View all <ArrowRight size={12} className="inline" />
            </Link>
          </div>

          {stats.recentRfps.length === 0 ? (
            <div className="p-8 text-center">
              <FileText size={24} className="mx-auto text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                No active RFPs. Create one to get started.
              </p>
              <Link
                href="/rfp"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-scg-600 hover:text-scg-700"
              >
                <Plus size={12} /> Create RFP
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {stats.recentRfps.map((rfp) => (
                <Link
                  key={rfp.id}
                  href={`/rfp/${rfp.id}`}
                  className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {rfp.title}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                      {rfp.practiceArea && (
                        <span>{rfp.practiceArea.name}</span>
                      )}
                      {rfp.jurisdiction && (
                        <>
                          <span className="text-gray-300">|</span>
                          <span>{rfp.jurisdiction.name}</span>
                        </>
                      )}
                      <span className="text-gray-300">|</span>
                      <span>{rfp._count.invitations} firms invited</span>
                    </div>
                  </div>
                  <div className="ml-4 flex items-center gap-3">
                    {rfp.deadline && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={12} />
                        {new Date(rfp.deadline).toLocaleDateString()}
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColors[rfp.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {rfp.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column — Quick stats & activity */}
        <div className="space-y-4">
          {/* Pending actions */}
          {stats.pendingResponses > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <Send size={16} className="mt-0.5 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {stats.pendingResponses} pending response{stats.pendingResponses !== 1 ? "s" : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-amber-700">
                    Firms invited but haven't submitted yet
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Panel health */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Panel Health
            </h3>
            <div className="space-y-2">
              <PanelBar
                label="Active"
                count={stats.panelMap["ACTIVE"] ?? 0}
                total={stats.firmCount}
                color="bg-green-500"
                icon={<CheckCircle2 size={14} className="text-green-600" />}
              />
              <PanelBar
                label="Prospective"
                count={stats.panelMap["PROSPECTIVE"] ?? 0}
                total={stats.firmCount}
                color="bg-blue-500"
                icon={<TrendingUp size={14} className="text-blue-600" />}
              />
              <PanelBar
                label="Probation"
                count={stats.panelMap["PROBATION"] ?? 0}
                total={stats.firmCount}
                color="bg-amber-500"
                icon={<AlertTriangle size={14} className="text-amber-600" />}
              />
            </div>
          </div>

          {/* Recent AI activity */}
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Recent AI Activity
              </h3>
            </div>
            {stats.recentAiOutputs.length === 0 ? (
              <p className="p-5 text-center text-xs text-gray-400">
                No AI activity yet
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {stats.recentAiOutputs.slice(0, 5).map((output) => (
                  <div
                    key={output.id}
                    className="flex items-center gap-3 px-5 py-2.5"
                  >
                    <Bot size={14} className="shrink-0 text-scg-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-gray-700">
                        {outputTypeLabels[output.outputType] ?? output.outputType}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {timeAgo(output.createdAt)}
                        {output.tokenCount
                          ? ` · ${(output.tokenCount / 1000).toFixed(1)}k tokens`
                          : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  href,
  detail,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  href: string;
  detail?: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-lg border p-4 transition-all hover:shadow-md ${
        highlight
          ? "border-scg-200 bg-scg-50/50"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`${highlight ? "text-scg-600" : "text-gray-400"} transition-colors group-hover:text-scg-600`}
        >
          {icon}
        </span>
        <ArrowRight
          size={14}
          className="text-gray-300 transition-colors group-hover:text-scg-500"
        />
      </div>
      <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
      {detail && (
        <p className="mt-0.5 text-[10px] text-gray-400">{detail}</p>
      )}
    </Link>
  );
}

function PanelBar({
  label,
  count,
  total,
  color,
  icon,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  icon: React.ReactNode;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div className="flex-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">{label}</span>
          <span className="font-medium text-gray-900">{count}</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full ${color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}
