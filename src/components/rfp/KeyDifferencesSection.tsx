"use client";

import { useState } from "react";
import { Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { AiGeneratedBadge } from "@/components/shared/AiGeneratedBadge";
import { MarkdownReport } from "@/components/shared/MarkdownReport";

interface KeyDifferencesSectionProps {
  rfpId: string;
  initialSummary: string | null;
  generatedAt: string | null;
}

export function KeyDifferencesSection({
  rfpId,
  initialSummary,
  generatedAt,
}: KeyDifferencesSectionProps) {
  const [summary, setSummary] = useState(initialSummary);
  const [date, setDate] = useState(generatedAt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/rfp/${rfpId}/key-differences`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to generate summary");
        return;
      }
      const data = await res.json();
      setSummary(data.content);
      setDate(new Date().toISOString());
    } catch {
      setError("Network error — please try again");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-scg-600" />
          <h2 className="text-sm font-semibold text-gray-700">Key Differences</h2>
          {summary && <AiGeneratedBadge />}
        </div>
        <div className="flex items-center gap-2">
          {date && (
            <span className="text-xs text-gray-400">
              {new Date(date).toLocaleDateString()}
            </span>
          )}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 rounded-md bg-scg-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-scg-700 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw size={12} />
                {summary ? "Regenerate" : "Surface key differences"}
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {summary ? (
        <div className="mt-4">
          <MarkdownReport content={summary} />
        </div>
      ) : (
        !isGenerating && (
          <p className="mt-4 text-sm text-gray-400">
            Generate an AI summary of how these proposals differ on cost, experience, and approach.
          </p>
        )
      )}
    </div>
  );
}
