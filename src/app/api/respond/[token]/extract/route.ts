import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { extractProposalFromText } from "@/server/rfp/extract-proposal";

/**
 * POST /api/respond/[token]/extract
 * Public — AI extraction of structured data from pasted proposal text.
 * No auth required (the token itself is the auth).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Per-token rate limit: this is an unauthenticated, paid AI endpoint.
  const rl = checkRateLimit(`extract:${token}`, { limit: 8, windowMs: 60 * 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many extraction attempts. Please wait, or fill in the form manually." },
      { status: 429 }
    );
  }

  // Validate the token exists and is still INVITED
  const invitation = await prisma.rfpInvitation.findUnique({
    where: { responseToken: token },
    include: {
      rfp: {
        select: {
          title: true,
          scopeDocument: true,
          pricingRequirements: true,
        },
      },
    },
  });

  if (!invitation) {
    return NextResponse.json(
      { error: "Invalid or expired link" },
      { status: 404 }
    );
  }

  if (invitation.status !== "INVITED") {
    return NextResponse.json(
      { error: "This invitation has already been responded to" },
      { status: 409 }
    );
  }

  const body = await req.json();
  const proposalText = body.proposalText;
  if (!proposalText || typeof proposalText !== "string" || proposalText.trim().length < 20) {
    return NextResponse.json(
      { error: "Please provide the full proposal text (at least 20 characters)" },
      { status: 400 }
    );
  }

  const result = await extractProposalFromText(proposalText, invitation.rfp);
  if (!result.ok) {
    if (result.reason === "unavailable") {
      return NextResponse.json(
        { error: "AI extraction is temporarily unavailable. Please fill in the form manually." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "AI could not parse the proposal. Try pasting a clearer text." },
      { status: 422 }
    );
  }

  return NextResponse.json(result.data);
}
