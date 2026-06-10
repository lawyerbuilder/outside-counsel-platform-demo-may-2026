import { NextRequest, NextResponse } from "next/server";
import { generateKeyDifferences, getLatestKeyDifferences } from "@/server/rfp/comparison";
import { getFeeBenchmark } from "@/server/rfp/benchmarking";
import { prisma } from "@/server/db";
import { getCurrentUserId } from "../../current-user";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const summary = await getLatestKeyDifferences(id);
  if (!summary) {
    return NextResponse.json({ error: "No key differences summary found" }, { status: 404 });
  }
  return NextResponse.json(summary);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  const rfp = await prisma.rfp.findUnique({
    where: { id },
    select: { practiceAreaId: true, jurisdictionId: true },
  });
  if (!rfp) {
    return NextResponse.json({ error: "RFP not found" }, { status: 404 });
  }

  const benchmark = await getFeeBenchmark(rfp.practiceAreaId, rfp.jurisdictionId);
  const content = await generateKeyDifferences(
    id,
    userId,
    benchmark.medianFixedFeeCents ?? benchmark.medianEngagementFeesCents
  );
  return NextResponse.json({ content }, { status: 201 });
}
