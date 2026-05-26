"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Label } from "@/components/ui/Label";

const tiers = [
  {
    value: "COMPLEX",
    label: "Complex",
    description:
      "Cross-border, high value, novel legal issues, significant regulatory exposure, board-level visibility",
  },
  {
    value: "STANDARD",
    label: "Standard",
    description:
      "Single jurisdiction, moderate value, established legal principles, some negotiation required",
  },
  {
    value: "ROUTINE",
    label: "Routine",
    description:
      "Template-based, low value, high volume, minimal negotiation, well-settled law, government registration",
  },
];

export function AssessComplexityStep({
  draftId,
  defaultValue,
}: {
  draftId?: string;
  defaultValue?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(defaultValue ?? "");

  const searchParams = useSearchParams();

  function handleNext() {
    if (!selected) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", "5");
    params.set("complexityTier", selected);
    if (draftId) params.set("draftId", draftId);
    router.push(`/rfp/new?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">How complex is this matter?</Label>
        <p className="mt-1 text-sm text-gray-500">
          Complexity determines which tier of firms are recommended.
        </p>
      </div>
      <div className="grid gap-3">
        {tiers.map((tier) => (
          <button
            key={tier.value}
            onClick={() => setSelected(tier.value)}
            className={`rounded-md border p-4 text-left transition-colors ${
              selected === tier.value
                ? "border-scg-500 bg-scg-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <span className="text-sm font-medium text-gray-900">{tier.label}</span>
            <p className="mt-1 text-xs text-gray-500">{tier.description}</p>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400">
        Tip: If the matter involves multiple jurisdictions or regulatory bodies, it is likely Complex.
      </p>
      <div className="flex justify-end pt-2">
        <button
          onClick={handleNext}
          disabled={!selected}
          className="rounded-md bg-scg-700 px-4 py-2 text-sm font-medium text-white hover:bg-scg-800 disabled:bg-gray-200 disabled:text-gray-400"
        >
          Next
        </button>
      </div>
    </div>
  );
}
