"use server";

import { revalidatePath } from "next/cache";
import { updatePreferenceSchema } from "@/lib/schemas";
import { upsertUserPreference } from "@/server/preferences";

// For now we use a hardcoded user ID (Sarah) until auth is wired up
const CURRENT_USER_ID = "placeholder"; // Will be resolved at call time

export type PreferenceActionState = {
  success: boolean;
  error?: string;
};

export async function updatePreferencesAction(
  _prev: PreferenceActionState,
  formData: FormData
): Promise<PreferenceActionState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = updatePreferenceSchema.safeParse(raw);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Get the user ID from the form (hidden field)
  const userId = formData.get("userId") as string;
  if (!userId) {
    return { success: false, error: "User ID is required" };
  }

  try {
    await upsertUserPreference(userId, parsed.data);
    revalidatePath("/directory");
    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    console.error("Failed to update preferences:", err);
    return { success: false, error: "Failed to save preferences" };
  }
}
