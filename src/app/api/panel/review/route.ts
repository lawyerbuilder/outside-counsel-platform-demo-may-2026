import { NextResponse } from "next/server";
import { startReviewCycle, getPanelFirmRows } from "@/server/panel";
import { getCurrentUserId } from "../../rfp/current-user";

export async function POST() {
  try {
    const userId = await getCurrentUserId();
    const review = await startReviewCycle(userId);
    const rows = await getPanelFirmRows();
    return NextResponse.json(
      { id: review.id, title: review.title, firmCount: rows.length },
      { status: 201 }
    );
  } catch (e) {
    console.error("Failed to start review cycle:", e);
    return NextResponse.json({ error: "Failed to start review cycle" }, { status: 500 });
  }
}
