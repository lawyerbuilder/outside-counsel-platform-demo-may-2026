import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { approveAndSend } from "@/server/rfp/mutations";
import { getDemoRole } from "@/server/demo-role";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const role = await getDemoRole();
  if (role === "LAWYER") {
    return NextResponse.json(
      { error: "Only a manager can approve and send an RFP" },
      { status: 403 }
    );
  }

  const rfp = await prisma.rfp.findUnique({ where: { id }, select: { status: true } });
  if (!rfp) {
    return NextResponse.json({ error: "RFP not found" }, { status: 404 });
  }
  if (rfp.status !== "PENDING_APPROVAL") {
    return NextResponse.json(
      { error: `RFP is ${rfp.status}, not pending approval` },
      { status: 409 }
    );
  }

  await approveAndSend(id);
  return NextResponse.json({ ok: true });
}
