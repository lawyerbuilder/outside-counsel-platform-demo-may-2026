"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Label } from "@/components/ui/Label";

type Entity = { id: string; name: string; shortName: string | null; country: string };

export function SelectEntityStep({
  entities,
  draftId,
  defaultValue,
}: {
  entities: Entity[];
  draftId?: string;
  defaultValue?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(defaultValue ?? "");

  function handleNext() {
    if (!selected) return;
    const params = new URLSearchParams({ step: "2", entityId: selected });
    if (draftId) params.set("draftId", draftId);
    router.push(`/rfp/new?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">Which SCG entity is this for?</Label>
        <p className="mt-1 text-sm text-gray-500">
          Select the legal entity that will engage outside counsel.
        </p>
      </div>
      <div className="grid gap-2">
        {entities.map((entity) => (
          <button
            key={entity.id}
            onClick={() => setSelected(entity.id)}
            className={`flex items-center justify-between rounded-md border p-3 text-left transition-colors ${
              selected === entity.id
                ? "border-scg-500 bg-scg-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div>
              <span className="text-sm font-medium text-gray-900">
                {entity.shortName ?? entity.name}
              </span>
              <span className="ml-2 text-sm text-gray-500">{entity.country}</span>
            </div>
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
