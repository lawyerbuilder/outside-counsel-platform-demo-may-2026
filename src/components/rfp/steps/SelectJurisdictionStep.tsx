"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";

type Jurisdiction = { id: string; name: string; region: string };

const OTHER_ID = "__other__";

export function SelectJurisdictionStep({
  jurisdictions,
  draftId,
  defaultValue,
}: {
  jurisdictions: Jurisdiction[];
  draftId?: string;
  defaultValue?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(defaultValue ?? "");
  const [otherText, setOtherText] = useState("");

  const grouped = jurisdictions.reduce<Record<string, Jurisdiction[]>>((acc, j) => {
    (acc[j.region] ??= []).push(j);
    return acc;
  }, {});

  const isValid = selected === OTHER_ID ? otherText.trim().length > 0 : selected.length > 0;

  const searchParams = useSearchParams();

  function handleNext() {
    if (!isValid) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", "3");
    if (draftId) params.set("draftId", draftId);
    if (selected === OTHER_ID) {
      params.set("jurisdictionId", OTHER_ID);
      params.set("jurisdictionOther", otherText.trim());
      params.set("jurisdictionName", otherText.trim());
    } else {
      params.set("jurisdictionId", selected);
      const j = jurisdictions.find((j) => j.id === selected);
      if (j) params.set("jurisdictionName", j.name);
      params.delete("jurisdictionOther");
    }
    router.push(`/rfp/new?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">Which jurisdiction?</Label>
        <p className="mt-1 text-sm text-gray-500">
          Where does this matter arise or where do you need counsel?
        </p>
      </div>
      {Object.entries(grouped).map(([region, items]) => (
        <div key={region}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            {region}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {items.map((j) => (
              <button
                key={j.id}
                onClick={() => setSelected(j.id)}
                className={`rounded-md border p-2 text-left text-sm transition-colors ${
                  selected === j.id
                    ? "border-scg-500 bg-scg-50 font-medium"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {j.name}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Other
        </p>
        <button
          onClick={() => setSelected(OTHER_ID)}
          className={`w-full rounded-md border p-2 text-left text-sm transition-colors ${
            selected === OTHER_ID
              ? "border-scg-500 bg-scg-50 font-medium"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          Other jurisdiction
        </button>
        {selected === OTHER_ID && (
          <Input
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            placeholder="Enter jurisdiction name"
            className="mt-2"
            autoFocus
          />
        )}
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
