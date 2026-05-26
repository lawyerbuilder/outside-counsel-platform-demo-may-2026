"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { FormState } from "@/server/actions/ranking-actions";
import type { RankingPublisherEnum } from "@/lib/schemas";

interface FirmRankingFormProps {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  firms: { id: string; name: string; shortName: string | null }[];
  practiceAreas: { id: string; name: string }[];
  jurisdictions: { id: string; name: string }[];
  sources: { id: string; name: string; publisher: RankingPublisherEnum }[];
}

export function FirmRankingForm({
  action,
  firms,
  practiceAreas,
  jurisdictions,
  sources,
}: FirmRankingFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [selectedSource, setSelectedSource] = useState("");

  const currentSource = sources.find((s) => s.id === selectedSource);
  const publisher = currentSource?.publisher;

  // Show band for Chambers, tier for Legal500, stars for Benchmark/AsiaLaw
  const showBand = publisher === "CHAMBERS";
  const showTier = publisher === "LEGAL500";
  const showStars = publisher === "BENCHMARK_LITIGATION" || publisher === "ASIALAW";

  return (
    <form action={formAction} className="space-y-4">
      {state.message && !state.success && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {state.message}
        </div>
      )}
      {state.success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          {state.message}
        </div>
      )}

      <Select
        name="firmId"
        label="Firm *"
        options={firms.map((f) => ({ value: f.id, label: f.shortName ?? f.name }))}
        placeholder="Select firm"
        error={state.errors?.firmId?.[0]}
      />

      <Select
        name="rankingSourceId"
        label="Ranking Source *"
        options={sources.map((s) => ({ value: s.id, label: s.name }))}
        placeholder="Select source"
        value={selectedSource}
        onChange={(e) => setSelectedSource(e.target.value)}
        error={state.errors?.rankingSourceId?.[0]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          name="practiceAreaId"
          label="Practice Area *"
          options={practiceAreas.map((p) => ({ value: p.id, label: p.name }))}
          placeholder="Select practice area"
          error={state.errors?.practiceAreaId?.[0]}
        />
        <Select
          name="jurisdictionId"
          label="Jurisdiction *"
          options={jurisdictions.map((j) => ({ value: j.id, label: j.name }))}
          placeholder="Select jurisdiction"
          error={state.errors?.jurisdictionId?.[0]}
        />
      </div>

      {showBand && (
        <Select
          name="band"
          label="Band (1 = highest)"
          options={[1, 2, 3, 4, 5, 6].map((n) => ({
            value: String(n),
            label: `Band ${n}`,
          }))}
          placeholder="Select band"
          error={state.errors?.band?.[0]}
        />
      )}

      {showTier && (
        <Select
          name="tier"
          label="Tier (1 = highest)"
          options={[1, 2, 3, 4, 5].map((n) => ({
            value: String(n),
            label: `Tier ${n}`,
          }))}
          placeholder="Select tier"
          error={state.errors?.tier?.[0]}
        />
      )}

      {showStars && (
        <Select
          name="starRating"
          label="Star Rating"
          options={[5, 4, 3, 2, 1].map((n) => ({
            value: String(n),
            label: "★".repeat(n) + "☆".repeat(5 - n),
          }))}
          placeholder="Select rating"
          error={state.errors?.starRating?.[0]}
        />
      )}

      <Textarea
        name="editorialExcerpt"
        label="Editorial Excerpt"
        placeholder="Key quote from the ranking editorial..."
        error={state.errors?.editorialExcerpt?.[0]}
      />

      <Input
        name="url"
        label="URL"
        type="url"
        placeholder="https://..."
        error={state.errors?.url?.[0]}
      />

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-scg-700 px-6 py-2 text-sm font-medium text-white hover:bg-scg-800 disabled:opacity-50"
        >
          {isPending ? "Adding..." : "Add Firm Ranking"}
        </button>
      </div>
    </form>
  );
}
