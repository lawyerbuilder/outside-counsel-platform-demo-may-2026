"use server";

import { redirect } from "next/navigation";
import { createLawyerSchema, updateLawyerSchema } from "@/lib/schemas";
import { createLawyer, updateLawyer, softDeleteLawyer } from "@/server/lawyers";

export type FormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};

export async function createLawyerAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = createLawyerSchema.safeParse({
    ...raw,
    email: raw.email || undefined,
    title: raw.title || undefined,
    qualificationYear: raw.qualificationYear || undefined,
    barAdmissions: raw.barAdmissions || undefined,
    bio: raw.bio || undefined,
    linkedInUrl: raw.linkedInUrl || undefined,
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      message: "Validation failed",
    };
  }

  const lawyer = await createLawyer(parsed.data);
  redirect(`/lawyers/${lawyer.id}`);
}

export async function updateLawyerAction(
  id: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = updateLawyerSchema.safeParse({
    ...raw,
    email: raw.email || undefined,
    title: raw.title || undefined,
    qualificationYear: raw.qualificationYear || undefined,
    barAdmissions: raw.barAdmissions || undefined,
    bio: raw.bio || undefined,
    linkedInUrl: raw.linkedInUrl || undefined,
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      message: "Validation failed",
    };
  }

  await updateLawyer(id, parsed.data);
  redirect(`/lawyers/${id}`);
}

export async function deleteLawyerAction(id: string): Promise<FormState> {
  await softDeleteLawyer(id);
  redirect("/lawyers");
}
