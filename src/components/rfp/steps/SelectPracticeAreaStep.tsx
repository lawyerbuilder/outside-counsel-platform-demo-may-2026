"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";

type PracticeArea = { id: string; name: string };

const OTHER_ID = "__other__";

export function SelectPracticeAreaStep({
  practiceAreas,
  draftId,
  defaultValue,
}: {
  practiceAreas: PracticeArea[];
  draftId?: string;
  defaultValue?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(defaultValue ?? "");
  const [otherText, setOtherText] = useState("");

  const isValid = selected === OTHER_ID ? otherText.trim().length > 0 : selected.length > 0;

  const searchParams = useSearchParams();

  function handleNext() {
    if (!isValid) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", "4");
    if (draftId) params.set("draftId", draftId);
    if (selected === OTHER_ID) {
      params.set("practiceAreaId", OTHER_ID);
      params.set("practiceAreaOther", otherText.trim());
      params.set("practiceAreaName", otherText.trim());
    } else {
      params.set("practiceAreaId", selected);
      const pa = practiceAreas.find((p) => p.id === selected);
      if (pa) params.set("practiceAreaName", pa.name);
      params.delete("practiceAreaOther");
    }
    router.push(`/rfp/new?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">What type of legal work?</Label>
        <p className="mt-1 text-sm text-gray-500">
          Select the practice area that best describes this matter.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {practiceAreas.map((pa) => (
          <button
            key={pa.id}
            onClick={() => setSelected(pa.id)}
            className={`rounded-md border p-3 text-left text-sm transition-colors ${
              selected === pa.id
                ? "border-scg-500 bg-scg-50 font-medium"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            {pa.name}
          </button>
        ))}
        <button
          onClick={() => setSelected(OTHER_ID)}
          className={`rounded-md border p-3 text-left text-sm transition-colors ${
            selected === OTHER_ID
              ? "border-scg-500 bg-scg-50 font-medium"
              : "border-dashed border-gray-300 text-gray-500 hover:border-gray-400"
          }`}
        >
          Other
        </button>
      </div>
      {selected === OTHER_ID && (
        <Input
          value={otherText}
          onChange={(e) => setOtherText(e.target.value)}
          placeholder="Describe the practice area"
          autoFocus
        />
      )}
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
