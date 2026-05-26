"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { RANKING_PUBLISHER_LABELS } from "@/lib/schemas";
import type { RankingPublisherEnum } from "@/lib/schemas";
import type { FormState } from "@/server/actions/ranking-actions";

interface RankingSourceFormProps {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
}

const publisherOptions = (
  Object.entries(RANKING_PUBLISHER_LABELS) as [RankingPublisherEnum, string][]
).map(([value, label]) => ({ value, label }));

export function RankingSourceForm({ action }: RankingSourceFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.message && !state.success && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      <Input
        name="name"
        label="Source Name *"
        placeholder="e.g. Chambers Asia-Pacific 2025"
        error={state.errors?.name?.[0]}
        required
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          name="publisher"
          label="Publisher *"
          options={publisherOptions}
          error={state.errors?.publisher?.[0]}
        />
        <Input
          name="editionYear"
          label="Edition Year *"
          type="number"
          defaultValue={new Date().getFullYear()}
          error={state.errors?.editionYear?.[0]}
          required
        />
      </div>

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
          {isPending ? "Creating..." : "Create Source"}
        </button>
      </div>
    </form>
  );
}
