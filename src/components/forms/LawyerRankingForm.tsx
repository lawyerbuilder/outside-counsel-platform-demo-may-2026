"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { LAWYER_RANKING_CATEGORY_LABELS } from "@/lib/schemas";
import type { LawyerRankingCategoryEnum } from "@/lib/schemas";
import type { FormState } from "@/server/actions/ranking-actions";

interface LawyerRankingFormProps {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  lawyers: { id: string; name: string }[];
  practiceAreas: { id: string; name: string }[];
  jurisdictions: { id: string; name: string }[];
  sources: { id: string; name: string }[];
}

const categoryOptions = (
  Object.entries(LAWYER_RANKING_CATEGORY_LABELS) as [LawyerRankingCategoryEnum, string][]
).map(([value, label]) => ({ value, label }));

export function LawyerRankingForm({
  action,
  lawyers,
  practiceAreas,
  jurisdictions,
  sources,
}: LawyerRankingFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});

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
        name="lawyerId"
        label="Lawyer *"
        options={lawyers.map((l) => ({ value: l.id, label: l.name }))}
        placeholder="Select lawyer"
        error={state.errors?.lawyerId?.[0]}
      />

      <Select
        name="rankingSourceId"
        label="Ranking Source *"
        options={sources.map((s) => ({ value: s.id, label: s.name }))}
        placeholder="Select source"
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

      <Select
        name="category"
        label="Category *"
        options={categoryOptions}
        placeholder="Select category"
        error={state.errors?.category?.[0]}
      />

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
          {isPending ? "Adding..." : "Add Lawyer Ranking"}
        </button>
      </div>
    </form>
  );
}
