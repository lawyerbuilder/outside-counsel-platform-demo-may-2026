"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Sparkles } from "lucide-react";

export function DescribeMatterStep({
  draftId,
  defaultValue,
}: {
  draftId?: string;
  defaultValue?: string;
}) {
  const router = useRouter();
  const [description, setDescription] = useState(defaultValue ?? "");
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  async function checkWithAi() {
    if (description.length < 10) return;
    setAiLoading(true);
    setAiFeedback(null);
    try {
      const res = await fetch("/api/rfp/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiFeedback(data.feedback);
      } else {
        setAiFeedback("Could not get AI feedback at this time. You can proceed without it.");
      }
    } catch {
      setAiFeedback("Could not get AI feedback at this time. You can proceed without it.");
    } finally {
      setAiLoading(false);
    }
  }

  const searchParams = useSearchParams();

  function handleNext() {
    if (description.length < 10) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", "6");
    if (draftId) params.set("draftId", draftId);
    params.set("description", description);
    router.push(`/rfp/new?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">Describe the matter</Label>
        <p className="mt-1 text-sm text-gray-500">
          Provide a brief description so we can match the right firms and instruct external counsel.
        </p>
      </div>
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Include: what happened, what you need counsel to do, key deadlines, estimated value, relevant jurisdictions, any special requirements."
        rows={6}
        className="resize-none"
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {description.length < 10
            ? `${10 - description.length} more characters needed`
            : `${description.length} characters`}
        </p>
        <button
          onClick={checkWithAi}
          disabled={description.length < 10 || aiLoading}
          className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
        >
          <Sparkles size={12} />
          {aiLoading ? "Checking..." : "Check with AI assistant"}
        </button>
      </div>

      {aiFeedback && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <Sparkles size={12} />
            AI coaching feedback
          </div>
          <p className="mt-1.5 text-sm text-amber-800 whitespace-pre-wrap">{aiFeedback}</p>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          onClick={handleNext}
          disabled={description.length < 10}
          className="rounded-md bg-scg-700 px-4 py-2 text-sm font-medium text-white hover:bg-scg-800 disabled:bg-gray-200 disabled:text-gray-400"
        >
          Next
        </button>
      </div>
    </div>
  );
}
