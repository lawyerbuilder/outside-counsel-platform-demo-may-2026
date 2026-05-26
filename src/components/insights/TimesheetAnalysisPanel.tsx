"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Brain,
  Loader2,
  Building2,
  TrendingUp,
  AlertTriangle,
  Scale,
  Globe,
  Lightbulb,
  ExternalLink,
  ArrowUpRight,
} from "lucide-react";
import { useApiKey } from "@/components/ApiKeyProvider";
import type { TimesheetAnalysis } from "@/server/timesheet";

export function AnalyzeTrigger({
  uploadId,
  existingAnalysis,
}: {
  uploadId: string;
  existingAnalysis: TimesheetAnalysis | null;
}) {
  const [analysis, setAnalysis] = useState<TimesheetAnalysis | null>(
    existingAnalysis
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getHeaders, needsKey, showKeyPrompt } = useApiKey();

  const runAnalysis = useCallback(async () => {
    if (needsKey) {
      showKeyPrompt();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...getHeaders(),
      };

      const res = await fetch("/api/timesheet/analyze", {
        method: "POST",
        headers,
        body: JSON.stringify({ uploadId }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.needsApiKey) {
          setError("API key required. Please set your Anthropic API key in Settings.");
        } else if (data.error?.includes("credit balance")) {
          setError("Anthropic API credit balance is too low. Please add credits at console.anthropic.com.");
        } else {
          setError(data.error ?? "Analysis failed");
        }
        return;
      }

      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [uploadId, getHeaders, needsKey, showKeyPrompt]);

  if (analysis) {
    return <AnalysisDashboard analysis={analysis} onReanalyze={runAnalysis} loading={loading} />;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
      <Brain size={32} className="mx-auto mb-3 text-scg-600" />
      <h3 className="text-sm font-semibold text-gray-900">
        Ready to Extract Intelligence
      </h3>
      <p className="mt-1 text-xs text-gray-500">
        AI will analyze timesheet narratives to identify external counsel usage, practice area patterns, and outsourcing trends
      </p>
      <button
        onClick={runAnalysis}
        disabled={loading}
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-scg-700 px-4 py-2 text-sm font-medium text-white hover:bg-scg-800 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Analyzing…
          </>
        ) : (
          <>
            <Brain size={14} />
            Analyze Timesheet Data
          </>
        )}
      </button>
      {error && (
        <div className="mt-3 rounded-md bg-red-50 p-2 text-xs text-red-700">
          <AlertTriangle size={12} className="mr-1 inline" />
          {error}
        </div>
      )}
    </div>
  );
}

function AnalysisDashboard({
  analysis,
  onReanalyze,
  loading,
}: {
  analysis: TimesheetAnalysis;
  onReanalyze: () => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard
          label="Timesheet Entries"
          value={analysis.summary.totalEntries.toLocaleString()}
        />
        <SummaryCard
          label="Distinct Matters"
          value={analysis.summary.totalMatters.toString()}
        />
        <SummaryCard
          label="External Firms Found"
          value={analysis.firmMentions.filter((f) => f.entityType === "LAW_FIRM").length.toString()}
        />
        <SummaryCard
          label="Date Range"
          value={`${formatDate(analysis.summary.dateRange.from)} – ${formatDate(analysis.summary.dateRange.to)}`}
          small
        />
      </div>

      {/* Key Insights */}
      {analysis.keyInsights.length > 0 && (
        <section className="rounded-lg border border-scg-200 bg-scg-50/50 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-scg-800">
            <Lightbulb size={14} />
            Key Insights
          </h3>
          <ul className="space-y-2">
            {analysis.keyInsights.map((insight, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-scg-900"
              >
                <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-scg-500" />
                {insight}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* External Firm Mentions */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
          <Building2 size={14} />
          External Firm Mentions
        </h3>
        <div className="space-y-3">
          {analysis.firmMentions
            .filter((f) => f.entityType === "LAW_FIRM" || f.entityType === "CONSULTING")
            .sort((a, b) => b.mentionCount - a.mentionCount)
            .map((firm) => (
              <div
                key={firm.shortName}
                className="flex items-start justify-between rounded-md border border-gray-100 p-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {firm.name}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        firm.entityType === "LAW_FIRM"
                          ? "bg-scg-100 text-scg-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {firm.entityType === "LAW_FIRM" ? "Law Firm" : "Consulting"}
                    </span>
                    {firm.matchedFirmId && (
                      <Link
                        href={`/firms/${firm.matchedFirmId}`}
                        className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 hover:bg-green-200"
                      >
                        Matched in OCP
                        <ExternalLink size={8} />
                      </Link>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {firm.matters.slice(0, 3).map((m) => (
                      <span
                        key={m}
                        className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600"
                      >
                        {m}
                      </span>
                    ))}
                    {firm.matters.length > 3 && (
                      <span className="text-[10px] text-gray-400">
                        +{firm.matters.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <span className="text-lg font-bold text-gray-900">
                    {firm.mentionCount}
                  </span>
                  <p className="text-[10px] text-gray-400">mentions</p>
                </div>
              </div>
            ))}
          {analysis.firmMentions.filter(
            (f) => f.entityType !== "LAW_FIRM" && f.entityType !== "CONSULTING"
          ).length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
                Other vendors mentioned (
                {analysis.firmMentions.filter(
                  (f) => f.entityType !== "LAW_FIRM" && f.entityType !== "CONSULTING"
                ).length}
                )
              </summary>
              <div className="mt-2 space-y-2">
                {analysis.firmMentions
                  .filter(
                    (f) =>
                      f.entityType !== "LAW_FIRM" &&
                      f.entityType !== "CONSULTING"
                  )
                  .map((firm) => (
                    <div
                      key={firm.shortName}
                      className="flex items-center justify-between rounded border border-gray-50 px-3 py-2 text-sm"
                    >
                      <span className="text-gray-600">{firm.name}</span>
                      <span className="text-xs text-gray-400">
                        {firm.mentionCount} mention
                        {firm.mentionCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  ))}
              </div>
            </details>
          )}
        </div>
      </section>

      {/* Outsource Patterns */}
      {analysis.outsourcePatterns.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
            <TrendingUp size={14} />
            Outsource vs. In-House Patterns
          </h3>
          <div className="space-y-3">
            {analysis.outsourcePatterns.map((pattern) => (
              <div key={pattern.practiceArea} className="rounded-md border border-gray-100 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale size={14} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">
                      {pattern.practiceArea}
                    </span>
                  </div>
                  <OutsourceBar rate={pattern.outsourceRate} />
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  {pattern.observation}
                </p>
                {pattern.typicalFirms.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {pattern.typicalFirms.map((f) => (
                      <span
                        key={f}
                        className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Matter Classifications */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
          <Globe size={14} />
          Matter Classification ({analysis.matterClassifications.length})
        </h3>
        <div className="divide-y divide-gray-100">
          {analysis.matterClassifications.map((matter) => (
            <div key={matter.matterNo} className="flex items-center justify-between py-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {matter.name}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                    {matter.matterNo}
                  </span>
                  <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                    {matter.practiceArea}
                  </span>
                  {matter.jurisdiction && (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">
                      {matter.jurisdiction}
                    </span>
                  )}
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      matter.complexity === "COMPLEX"
                        ? "bg-red-50 text-red-700"
                        : matter.complexity === "STANDARD"
                        ? "bg-yellow-50 text-yellow-700"
                        : "bg-green-50 text-green-700"
                    }`}
                  >
                    {matter.complexity}
                  </span>
                </div>
              </div>
              <div className="ml-4 flex items-center gap-3">
                {matter.usesExternalCounsel ? (
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs text-scg-700">
                      <ArrowUpRight size={10} />
                      External
                    </div>
                    <p className="text-[10px] text-gray-400">
                      {matter.externalFirms.join(", ")}
                    </p>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">In-house</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Re-analyze button */}
      <div className="text-center">
        <button
          onClick={onReanalyze}
          disabled={loading}
          className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-scg-700 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Brain size={12} />
          )}
          Re-analyze with latest AI model
        </button>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  small,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <p
        className={`mt-1 font-bold text-gray-900 ${
          small ? "text-sm" : "text-xl"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function OutsourceBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-scg-500 transition-all"
          style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-600">{rate}%</span>
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
