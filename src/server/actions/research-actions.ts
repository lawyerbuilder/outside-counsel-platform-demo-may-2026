"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/current-user";

export type ReviewActionState = {
  success: boolean;
  error?: string;
};

export async function reviewUpdateAction(
  _prev: ReviewActionState,
  formData: FormData
): Promise<ReviewActionState> {
  const updateId = formData.get("updateId") as string;
  const action = formData.get("action") as string;
  const reviewNote = formData.get("reviewNote") as string | null;

  if (!updateId || !["APPROVED", "REJECTED"].includes(action)) {
    return { success: false, error: "Invalid input" };
  }

  try {
    const user = await getCurrentUser();

    await prisma.researchUpdate.update({
      where: { id: updateId },
      data: {
        status: action as "APPROVED" | "REJECTED",
        reviewedById: user.id,
        reviewNote: reviewNote || null,
      },
    });

    revalidatePath("/admin/research");
    return { success: true };
  } catch (err) {
    console.error("Failed to review update:", err);
    return { success: false, error: "Failed to save review" };
  }
}
