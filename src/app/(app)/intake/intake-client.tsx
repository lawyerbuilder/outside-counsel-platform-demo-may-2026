"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Loader2,
  Compass,
  AlertTriangle,
  Building2,
  ArrowRight,
  FileText,
} from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { AiGeneratedBadge } from "@/components/shared/AiGeneratedBadge";

type IntakeFirm = {
  firmId: string;
  firmName: string;
  firmType: string;
  panelStatus: string;
  overallScore: number | null;
  lastScorecardTier: string | null;
  notes: string | null;
  warnings: string[];
};

type IntakeResult = {
  assessment: {
    practiceArea: string;
    jurisdiction: string;
    complexityTier: string;
    urgency: string;
    riskLevel: string;
    budgetBandUsd: { low: number; high: number };
    summary: string;
    title: string;
  };
  recommendedPath: "DIRECT" | "RFP";
  reasoning: string;
  firms: IntakeFirm[];
  rfpPrefillUrl: string;
};

const EXAMPLES = [
  "We are acquiring a packaging plant in Vietnam, deal value around USD 40M, need M&A counsel, signing targeted in 8 weeks",
  "Supplier in Thailand is disputing a THB 50M contract termination and threatening arbitration",
  "Need to review and update employment contracts for our Singapore office, around 30 employees",
];

const levelVariant: Record<string, BadgeVariant> = {
  HIGH: "red",
  COMPLEX: "red",
  MEDIUM: "amber",
  STANDARD: "amber",
  LOW: "green",
  ROUTINE: "green",
};

function fmtBudget(low: number, high: number): string {
  const f = (n: number) => (n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`);
  return `${f(low)} – ${f(high)}`;
}

export function IntakeClient() {
  const [description, setDescription] = useState("");
  const [isAssessing, setIsAssessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IntakeResult | null>(null);

  async function handleAssess() {
    if (description.trim().length < 20) {
      setError("Please describe the matter in a bit more detail (a sentence or two).");
      return;
    }
    setIsAssessing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Assessment failed — please try again");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error — please try again");
    } finally {
      setIsAssessing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <label htmlFor="matter-description" className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Sparkles size={16} className="text-scg-600" />
          What do you need help with?
        </label>
        <textarea
          id="matter-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="e.g. We are acquiring a packaging plant in Vietnam, deal value USD 40M, need M&A counsel, signing in 8 weeks..."
          className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setDescription(ex)}
              className="rounded-full border border-gray-200 px-3 py-1 text-left text-xs text-gray-500 hover:border-scg-300 hover:text-scg-700"
            >
              {ex.slice(0, 60)}…
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleAssess}
            disabled={isAssessing}
            className="inline-flex items-center gap-2 rounded-md bg-scg-700 px-4 py-2 text-sm font-medium text-white hover:bg-scg-800 disabled:opacity-50"
          >
            {isAssessing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Assessing matter...
              </>
            ) : (
              <>
                <Compass size={16} />
                Assess and recommend
              </>
            )}
          </button>
        </div>
        {error && (
          <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Assessment cards */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">{result.assessment.title}</h2>
              <AiGeneratedBadge />
            </div>
            <p className="mt-1 text-sm text-gray-500">{result.assessment.summary}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Practice Area</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{result.assessment.practiceArea}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Jurisdiction</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{result.assessment.jurisdiction}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Complexity</p>
                <Badge variant={levelVariant[result.assessment.complexityTier] ?? "gray"} className="mt-1 text-[10px]">
                  {result.assessment.complexityTier}
                </Badge>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Risk</p>
                <Badge variant={levelVariant[result.assessment.riskLevel] ?? "gray"} className="mt-1 text-[10px]">
                  {result.assessment.riskLevel}
                </Badge>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Urgency</p>
                <Badge variant={levelVariant[result.assessment.urgency] ?? "gray"} className="mt-1 text-[10px]">
                  {result.assessment.urgency}
                </Badge>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Est. Budget</p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {fmtBudget(result.assessment.budgetBandUsd.low, result.assessment.budgetBandUsd.high)}
                </p>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div className="rounded-lg border-2 border-scg-200 bg-scg-50/50 p-5">
            <div className="flex items-center gap-2">
              <Compass size={18} className="text-scg-700" />
              <h2 className="text-sm font-semibold text-scg-800">
                Recommended path:{" "}
                {result.recommendedPath === "DIRECT"
                  ? "Instruct a panel firm directly"
                  : "Run a competitive RFP"}
              </h2>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{result.reasoning}</p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {result.recommendedPath === "RFP" ? (
                <>
                  <Link
                    href={result.rfpPrefillUrl}
                    className="inline-flex items-center gap-2 rounded-md bg-scg-700 px-4 py-2 text-sm font-medium text-white hover:bg-scg-800"
                  >
                    <FileText size={16} />
                    Continue to RFP wizard (pre-filled)
                    <ArrowRight size={14} />
                  </Link>
                  {result.firms.length > 0 && (
                    <span className="text-xs text-gray-500">
                      ...or instruct one of the panel firms below directly
                    </span>
                  )}
                </>
              ) : (
                <>
                  {result.firms[0] && (
                    <Link
                      href={`/firms/${result.firms[0].firmId}`}
                      className="inline-flex items-center gap-2 rounded-md bg-scg-700 px-4 py-2 text-sm font-medium text-white hover:bg-scg-800"
                    >
                      <Building2 size={16} />
                      Instruct {result.firms[0].firmName}
                      <ArrowRight size={14} />
                    </Link>
                  )}
                  <Link
                    href={result.rfpPrefillUrl}
                    className="text-xs font-medium text-scg-700 hover:text-scg-800"
                  >
                    ...or run an RFP anyway
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Firm suggestions */}
          {result.firms.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-700">
                Matching panel firms ({result.assessment.practiceArea} · {result.assessment.jurisdiction})
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {result.firms.map((firm, i) => (
                  <Link
                    key={firm.firmId}
                    href={`/firms/${firm.firmId}`}
                    className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-semibold text-gray-900">{firm.firmName}</span>
                      {firm.overallScore != null && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            firm.overallScore >= 80
                              ? "bg-green-50 text-green-700"
                              : firm.overallScore >= 60
                                ? "bg-amber-50 text-amber-700"
                                : "bg-red-50 text-red-700"
                          }`}
                        >
                          {Math.round(firm.overallScore)}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[10px]">{firm.firmType}</Badge>
                      {i === 0 && <Badge variant="scg" className="text-[10px]">Top match</Badge>}
                      {firm.lastScorecardTier && (
                        <Badge variant="gray" className="text-[10px]">
                          {firm.lastScorecardTier.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </div>
                    {firm.notes && (
                      <p className="mt-2 text-xs text-gray-500 line-clamp-2">{firm.notes}</p>
                    )}
                    {firm.warnings.length > 0 && (
                      <div className="mt-2 flex items-start gap-1 text-xs text-amber-600">
                        <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                        <span>{firm.warnings.join("; ")}</span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
