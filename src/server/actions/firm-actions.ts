"use server";

import { redirect } from "next/navigation";
import { createFirmSchema, updateFirmSchema } from "@/lib/schemas";
import { createFirm, updateFirm, softDeleteFirm } from "@/server/firms";

export type FormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};

export async function createFirmAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = createFirmSchema.safeParse({
    ...raw,
    website: raw.website || undefined,
    shortName: raw.shortName || undefined,
    headcount: raw.headcount || undefined,
    foundedYear: raw.foundedYear || undefined,
    parentFirmId: raw.parentFirmId || undefined,
    notes: raw.notes || undefined,
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      message: "Validation failed",
    };
  }

  const firm = await createFirm(parsed.data);
  redirect(`/firms/${firm.id}`);
}

export async function updateFirmAction(
  id: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = updateFirmSchema.safeParse({
    ...raw,
    website: raw.website || undefined,
    shortName: raw.shortName || undefined,
    headcount: raw.headcount || undefined,
    foundedYear: raw.foundedYear || undefined,
    parentFirmId: raw.parentFirmId || undefined,
    notes: raw.notes || undefined,
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      message: "Validation failed",
    };
  }

  await updateFirm(id, parsed.data);
  redirect(`/firms/${id}`);
}

export async function deleteFirmAction(id: string): Promise<FormState> {
  await softDeleteFirm(id);
  redirect("/firms");
}
