"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { FIRM_TYPE_LABELS } from "@/lib/schemas";
import type { FirmTypeEnum } from "@/lib/schemas";
import type { FormState } from "@/server/actions/firm-actions";

interface FirmFormProps {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  initialData?: {
    name?: string;
    shortName?: string | null;
    country?: string;
    city?: string;
    website?: string | null;
    firmType?: FirmTypeEnum;
    headcount?: number | null;
    foundedYear?: number | null;
    parentFirmId?: string | null;
    notes?: string | null;
  };
  firms?: { id: string; name: string; shortName: string | null }[];
  submitLabel: string;
}

const firmTypeOptions = (
  Object.entries(FIRM_TYPE_LABELS) as [FirmTypeEnum, string][]
).map(([value, label]) => ({ value, label }));

export function FirmForm({
  action,
  initialData,
  firms,
  submitLabel,
}: FirmFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="name"
          label="Firm Name *"
          defaultValue={initialData?.name}
          error={state.errors?.name?.[0]}
          required
        />
        <Input
          name="shortName"
          label="Short Name"
          defaultValue={initialData?.shortName ?? ""}
          error={state.errors?.shortName?.[0]}
          placeholder="e.g. Baker, A&O"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="country"
          label="Country *"
          defaultValue={initialData?.country}
          error={state.errors?.country?.[0]}
          required
        />
        <Input
          name="city"
          label="City *"
          defaultValue={initialData?.city}
          error={state.errors?.city?.[0]}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          name="firmType"
          label="Firm Type"
          options={firmTypeOptions}
          defaultValue={initialData?.firmType ?? "FULL_SERVICE"}
          error={state.errors?.firmType?.[0]}
        />
        <Input
          name="website"
          label="Website"
          type="url"
          defaultValue={initialData?.website ?? ""}
          error={state.errors?.website?.[0]}
          placeholder="https://..."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="headcount"
          label="Headcount (global)"
          type="number"
          defaultValue={initialData?.headcount ?? ""}
          error={state.errors?.headcount?.[0]}
        />
        <Input
          name="foundedYear"
          label="Founded Year"
          type="number"
          defaultValue={initialData?.foundedYear ?? ""}
          error={state.errors?.foundedYear?.[0]}
        />
      </div>

      {firms && firms.length > 0 && (
        <Select
          name="parentFirmId"
          label="Parent Firm (if spin-off)"
          options={firms.map((f) => ({
            value: f.id,
            label: f.shortName ?? f.name,
          }))}
          placeholder="None"
          defaultValue={initialData?.parentFirmId ?? ""}
          error={state.errors?.parentFirmId?.[0]}
        />
      )}

      <Textarea
        name="notes"
        label="Notes"
        defaultValue={initialData?.notes ?? ""}
        error={state.errors?.notes?.[0]}
        placeholder="Internal notes about this firm..."
      />

      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-teal-700 px-6 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {isPending ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
