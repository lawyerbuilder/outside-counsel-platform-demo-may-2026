"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { FormState } from "@/server/actions/lawyer-actions";

interface LawyerFormProps {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  initialData?: {
    name?: string;
    email?: string | null;
    title?: string | null;
    qualificationYear?: number | null;
    barAdmissions?: string | null;
    bio?: string | null;
    linkedInUrl?: string | null;
  };
  submitLabel: string;
}

export function LawyerForm({
  action,
  initialData,
  submitLabel,
}: LawyerFormProps) {
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
          label="Full Name *"
          defaultValue={initialData?.name}
          error={state.errors?.name?.[0]}
          required
        />
        <Input
          name="title"
          label="Title"
          defaultValue={initialData?.title ?? ""}
          error={state.errors?.title?.[0]}
          placeholder="e.g. Managing Partner, Senior Associate"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="email"
          label="Email"
          type="email"
          defaultValue={initialData?.email ?? ""}
          error={state.errors?.email?.[0]}
        />
        <Input
          name="linkedInUrl"
          label="LinkedIn URL"
          type="url"
          defaultValue={initialData?.linkedInUrl ?? ""}
          error={state.errors?.linkedInUrl?.[0]}
          placeholder="https://linkedin.com/in/..."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="qualificationYear"
          label="Year of Qualification"
          type="number"
          defaultValue={initialData?.qualificationYear ?? ""}
          error={state.errors?.qualificationYear?.[0]}
        />
        <Input
          name="barAdmissions"
          label="Bar Admissions"
          defaultValue={initialData?.barAdmissions ?? ""}
          error={state.errors?.barAdmissions?.[0]}
          placeholder="e.g. Thai Bar, New York Bar"
        />
      </div>

      <Textarea
        name="bio"
        label="Biography"
        defaultValue={initialData?.bio ?? ""}
        error={state.errors?.bio?.[0]}
        placeholder="Professional background and expertise..."
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
