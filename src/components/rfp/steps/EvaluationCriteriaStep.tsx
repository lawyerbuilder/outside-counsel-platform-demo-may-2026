"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Switch } from "@/components/ui/Switch";
import { Plus, Trash2 } from "lucide-react";
import type { EvaluationCriterion } from "@/lib/validation/rfp";

const DEFAULT_CRITERIA: EvaluationCriterion[] = [
  { name: "Relevant experience", weight: 25 },
  { name: "Team quality & staffing", weight: 20 },
  { name: "Fee competitiveness", weight: 25 },
  { name: "Proposed approach", weight: 20 },
  { name: "Firm reputation & rankings", weight: 10 },
];

export function EvaluationCriteriaStep({
  draftId,
  defaults,
}: {
  draftId?: string;
  defaults?: {
    criteria?: EvaluationCriterion[];
    requestFeeCap?: boolean;
    requestSuggestedBudget?: boolean;
    additionalRequirements?: string;
    deadline?: string;
  };
}) {
  const router = useRouter();
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>(
    defaults?.criteria ?? DEFAULT_CRITERIA
  );
  const [requestFeeCap, setRequestFeeCap] = useState(defaults?.requestFeeCap ?? true);
  const [requestSuggestedBudget, setRequestSuggestedBudget] = useState(
    defaults?.requestSuggestedBudget ?? true
  );
  const [additionalRequirements, setAdditionalRequirements] = useState(
    defaults?.additionalRequirements ?? ""
  );
  const [deadline, setDeadline] = useState(defaults?.deadline ?? "");

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  const isValid = criteria.length > 0 && Math.abs(totalWeight - 100) < 0.01 && deadline;

  function updateCriterion(index: number, field: keyof EvaluationCriterion, value: string | number) {
    setCriteria((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  }

  function addCriterion() {
    setCriteria((prev) => [...prev, { name: "", weight: 0 }]);
  }

  function removeCriterion(index: number) {
    setCriteria((prev) => prev.filter((_, i) => i !== index));
  }

  const searchParams = useSearchParams();

  function handleNext() {
    if (!isValid) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", "9");
    if (draftId) params.set("draftId", draftId);
    params.set("evaluationCriteria", JSON.stringify(criteria));
    params.set("requestFeeCap", String(requestFeeCap));
    params.set("requestSuggestedBudget", String(requestSuggestedBudget));
    if (additionalRequirements) params.set("additionalRequirements", additionalRequirements);
    if (deadline) params.set("deadline", deadline);
    router.push(`/rfp/new?${params.toString()}`);
  }

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-base font-medium">Evaluation Criteria</Label>
        <p className="mt-1 text-sm text-gray-500">
          Define how you will evaluate firm proposals. Weights must total 100%.
        </p>
      </div>

      <div className="space-y-2">
        {criteria.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={c.name}
              onChange={(e) => updateCriterion(i, "name", e.target.value)}
              placeholder="Criterion name"
              className="flex-1"
            />
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={c.weight}
                onChange={(e) => updateCriterion(i, "weight", Number(e.target.value))}
                className="w-20 text-center"
                min={0}
                max={100}
              />
              <span className="text-sm text-gray-400">%</span>
            </div>
            <button
              onClick={() => removeCriterion(i)}
              className="rounded p-1 text-gray-400 hover:text-red-500"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button
          onClick={addCriterion}
          className="flex items-center gap-1 text-sm text-scg-700 hover:text-scg-800"
        >
          <Plus size={14} /> Add criterion
        </button>
        <p
          className={`text-xs font-medium ${
            Math.abs(totalWeight - 100) < 0.01 ? "text-scg-600" : "text-red-500"
          }`}
        >
          Total: {totalWeight}%{" "}
          {Math.abs(totalWeight - 100) >= 0.01 && "(must be 100%)"}
        </p>
      </div>

      <div className="space-y-3 border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Request fee cap from firms</Label>
            <p className="text-xs text-gray-400">
              Firms must propose a fee cap as part of their bid
            </p>
          </div>
          <Switch checked={requestFeeCap} onCheckedChange={setRequestFeeCap} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Request suggested budget</Label>
            <p className="text-xs text-gray-400">
              Ask firms to propose their own budget estimate for the work
            </p>
          </div>
          <Switch checked={requestSuggestedBudget} onCheckedChange={setRequestSuggestedBudget} />
        </div>
      </div>

      <div className="space-y-1 border-t border-gray-100 pt-4">
        <Label htmlFor="additionalRequirements">Additional requirements or conditions</Label>
        <Textarea
          id="additionalRequirements"
          value={additionalRequirements}
          onChange={(e) => setAdditionalRequirements(e.target.value)}
          placeholder="Any special conditions, conflict checks, insurance requirements, reporting obligations, etc."
          rows={3}
          className="resize-none"
        />
      </div>

      <div className="space-y-1 border-t border-gray-100 pt-4">
        <Label htmlFor="deadline">Response deadline *</Label>
        <Input
          id="deadline"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleNext}
          disabled={!isValid}
          className="rounded-md bg-scg-700 px-4 py-2 text-sm font-medium text-white hover:bg-scg-800 disabled:bg-gray-200 disabled:text-gray-400"
        >
          Next
        </button>
      </div>
    </div>
  );
}
