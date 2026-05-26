"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Label } from "@/components/ui/Label";

const urgencyOptions = [
  { value: "ROUTINE", label: "Routine", description: "Standard timeline — 2+ weeks to instruct" },
  { value: "URGENT", label: "Urgent", description: "Needs attention within days — check firm capacity" },
  { value: "CRITICAL", label: "Critical", description: "Immediate — litigation deadline, regulatory response, crisis" },
];

export function SetUrgencyStep({
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
    params.set("step", "7");
    params.set("urgency", selected);
    if (draftId) params.set("draftId", draftId);
    router.push(`/rfp/new?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">How urgent is this?</Label>
        <p className="mt-1 text-sm text-gray-500">
          Urgency affects firm availability filtering and instruction timeline.
        </p>
      </div>
      <div className="grid gap-3">
        {urgencyOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSelected(opt.value)}
            className={`rounded-md border p-4 text-left transition-colors ${
              selected === opt.value
                ? "border-scg-500 bg-scg-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <span className="text-sm font-medium text-gray-900">{opt.label}</span>
            <p className="mt-1 text-xs text-gray-500">{opt.description}</p>
          </button>
        ))}
      </div>
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
