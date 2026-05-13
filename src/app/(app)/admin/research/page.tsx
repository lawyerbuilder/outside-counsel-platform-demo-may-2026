import { Bot, CheckCircle, XCircle, Clock, Zap } from "lucide-react";
import { listResearchUpdates, getResearchStats, type ResearchUpdateItem } from "@/server/research";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ResearchReviewCard } from "@/components/admin/ResearchReviewCard";

export default async function ResearchPage() {
  const [updates, stats] = await Promise.all([
    listResearchUpdates("PENDING"),
    getResearchStats(),
  ]);

  return (
    <div>
      <PageHeader
        title="AI Research Queue"
        description="Review AI-discovered updates before they're applied to the directory"
      />

      {/* Stats bar */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
          <Clock size={18} className="mx-auto text-amber-500" />
          <p className="mt-1 text-2xl font-bold text-amber-700">
            {stats.pending}
          </p>
          <p className="text-xs text-amber-600">Pending Review</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
          <CheckCircle size={18} className="mx-auto text-green-500" />
          <p className="mt-1 text-2xl font-bold text-green-700">
            {stats.approved}
          </p>
          <p className="text-xs text-green-600">Approved</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
          <XCircle size={18} className="mx-auto text-gray-400" />
          <p className="mt-1 text-2xl font-bold text-gray-600">
            {stats.rejected}
          </p>
          <p className="text-xs text-gray-500">Dismissed</p>
        </div>
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-center">
          <Zap size={18} className="mx-auto text-teal-500" />
          <p className="mt-1 text-2xl font-bold text-teal-700">
            {stats.applied}
          </p>
          <p className="text-xs text-teal-600">Applied</p>
        </div>
      </div>

      {/* How it works */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Bot size={18} className="mt-0.5 text-blue-500" />
          <div>
            <h3 className="text-sm font-semibold text-blue-800">
              How AI Research Works
            </h3>
            <p className="mt-1 text-xs text-blue-700">
              Every Sunday at 6 AM, Claude researches the latest ranking
              updates, lawyer movements, and firm news for all firms and lawyers
              in your directory. Findings are queued here for your review —
              nothing is applied automatically. Approve findings to mark them for
              data entry, or dismiss false positives.
            </p>
            <p className="mt-2 text-xs text-blue-600">
              To run manually:{" "}
              <code className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[10px]">
                npx tsx src/server/research-cron.ts
              </code>
            </p>
          </div>
        </div>
      </div>

      {/* Pending updates */}
      {updates.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <CheckCircle size={32} className="mx-auto text-green-300" />
          <p className="mt-2 text-sm text-gray-500">
            No pending updates to review. The directory is up to date!
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Next research run: Sunday 6:00 AM
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-500">
            Pending Review ({updates.length})
          </h3>
          {updates.map((update: ResearchUpdateItem) => (
            <ResearchReviewCard
              key={update.id}
              update={{
                ...update,
                createdAt: update.createdAt,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
