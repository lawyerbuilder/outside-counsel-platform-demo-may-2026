"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { FeeBenchmarkBadge } from "@/components/rfp/FeeBenchmarkBadge";
import type { FeeDelta } from "@/server/rfp/benchmarking";

type Criterion = { name: string; weight: number };
type ExistingScore = { criterionName: string; score: number; comment: string | null };
type FeePhase = { phase: string; feeCents: number };
type Invitation = {
  id: string;
  firmName: string;
  firmType: string;
  proposedFeeCents: number | null;
  currencyCode: string | null;
  proposedFeeType: string | null;
  feeBreakdown: string | null;
  staffingPlan: string | null;
  responseDocument: string | null;
  benchmarkDelta: FeeDelta | null;
  existingScores: ExistingScore[];
};

type ScoreMap = Record<string, Record<string, { score: number; comment: string }>>;

export function EvaluationForm({
  rfpId,
  criteria,
  invitations,
}: {
  rfpId: string;
  criteria: Criterion[];
  invitations: Invitation[];
}) {
  const initialScores: ScoreMap = {};
  for (const inv of invitations) {
    initialScores[inv.id] = {};
    for (const c of criteria) {
      const existing = inv.existingScores.find((s) => s.criterionName === c.name);
      initialScores[inv.id][c.name] = {
        score: existing?.score ?? 0,
        comment: existing?.comment ?? "",
      };
    }
  }

  const [scores, setScores] = useState<ScoreMap>(initialScores);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  function updateScore(invId: string, criterion: string, value: number) {
    setScores((prev) => ({
      ...prev,
      [invId]: {
        ...prev[invId],
        [criterion]: { ...prev[invId][criterion], score: value },
      },
    }));
  }

  function updateComment(invId: string, criterion: string, comment: string) {
    setScores((prev) => ({
      ...prev,
      [invId]: {
        ...prev[invId],
        [criterion]: { ...prev[invId][criterion], comment },
      },
    }));
  }

  async function saveScores(invId: string) {
    setSaving(invId);
    const invScores = scores[invId];
    const body = criteria.map((c) => ({
      criterionName: c.name,
      criterionWeight: c.weight,
      score: invScores[c.name]?.score ?? 0,
      comment: invScores[c.name]?.comment ?? "",
    }));

    const res = await fetch(`/api/rfp/${rfpId}/invitations/${invId}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scores: body }),
    });

    setSaving(null);
    if (res.ok) {
      setSaved((prev) => new Set(prev).add(invId));
    }
  }

  if (invitations.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No submitted responses to evaluate yet.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {invitations.map((inv) => {
        const totalScore = criteria.reduce((sum, c) => {
          const s = scores[inv.id]?.[c.name]?.score ?? 0;
          return sum + s * (c.weight / 100);
        }, 0);

        return (
          <div key={inv.id} className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{inv.firmName}</span>
                <Badge variant="outline" className="text-[10px]">{inv.firmType}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500">
                  Weighted: {totalScore.toFixed(1)} / 5.0
                </span>
                <button
                  onClick={() => saveScores(inv.id)}
                  disabled={saving === inv.id}
                  className="rounded-md bg-scg-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-scg-800 disabled:bg-gray-200 disabled:text-gray-400"
                >
                  {saving === inv.id ? "Saving..." : saved.has(inv.id) ? "Saved" : "Save scores"}
                </button>
              </div>
            </div>

            {inv.proposedFeeCents && (
              <div className="mt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs text-gray-500">
                    Total fee: {inv.currencyCode ?? "USD"}{" "}
                    {(inv.proposedFeeCents / 100).toLocaleString()}{" "}
                    ({inv.proposedFeeType ?? "N/A"})
                  </p>
                  <FeeBenchmarkBadge delta={inv.benchmarkDelta} />
                </div>
                {(() => {
                  try {
                    const phases: FeePhase[] = inv.feeBreakdown ? JSON.parse(inv.feeBreakdown) : [];
                    if (phases.length > 0) {
                      return (
                        <div className="mt-1 flex flex-wrap gap-2">
                          {phases.map((p, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600"
                            >
                              <span className="font-medium">{p.phase}:</span>
                              <span>{inv.currencyCode ?? "USD"} {(p.feeCents / 100).toLocaleString()}</span>
                            </span>
                          ))}
                        </div>
                      );
                    }
                  } catch { /* ignore */ }
                  return null;
                })()}
              </div>
            )}

            {/* Response details */}
            {(inv.staffingPlan || inv.responseDocument) && (
              <div className="mt-3 space-y-2 rounded-md bg-gray-50 p-3">
                {inv.staffingPlan && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      Staffing Plan
                    </p>
                    <p className="mt-1 text-xs text-gray-600 whitespace-pre-wrap">
                      {inv.staffingPlan}
                    </p>
                  </div>
                )}
                {inv.responseDocument && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      Proposal Narrative
                    </p>
                    <p className="mt-1 text-xs text-gray-600 whitespace-pre-wrap line-clamp-6">
                      {inv.responseDocument}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 space-y-3">
              {criteria.map((c) => (
                <div key={c.name} className="flex items-start gap-4">
                  <div className="w-48 shrink-0">
                    <Label className="text-xs font-medium text-gray-700">
                      {c.name} ({c.weight}%)
                    </Label>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => updateScore(inv.id, c.name, n)}
                        className={`h-8 w-8 rounded-md text-xs font-medium transition-colors ${
                          (scores[inv.id]?.[c.name]?.score ?? 0) === n
                            ? "bg-scg-700 text-white"
                            : "border border-gray-200 text-gray-500 hover:border-scg-300"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <Input
                    value={scores[inv.id]?.[c.name]?.comment ?? ""}
                    onChange={(e) => updateComment(inv.id, c.name, e.target.value)}
                    placeholder="Comment (optional)"
                    className="flex-1 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
