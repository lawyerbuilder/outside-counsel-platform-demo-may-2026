import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getDemoRole } from "@/server/demo-role";
import { extractTextFromFile, UnsupportedFileError } from "@/server/extract-file";
import { extractProposalFromText } from "@/server/rfp/extract-proposal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * POST /api/rfp/[id]/respond/[invId]/extract-file
 * Internal — a manager/admin uploads the PDF/Word proposal a firm emailed to
 * the team, on the firm's behalf. Same extraction path as the public route,
 * but role-gated (MANAGER or ADMIN) and keyed by invitation id, not a token.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; invId: string }> }
) {
  const role = await getDemoRole();
  if (role !== "MANAGER" && role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only managers or admins can upload a proposal on a firm's behalf." },
      { status: 403 }
    );
  }

  const { id: rfpId, invId } = await params;

  const rl = checkRateLimit(`extract-file:${invId}`, { limit: 20, windowMs: 60 * 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many extraction attempts. Please wait, or fill in the form manually." },
      { status: 429 }
    );
  }

  const invitation = await prisma.rfpInvitation.findUnique({
    where: { id: invId },
    include: {
      rfp: {
        select: { title: true, scopeDocument: true, pricingRequirements: true },
      },
    },
  });

  if (!invitation || invitation.rfpId !== rfpId) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected a file upload" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "File is too large. Please upload a file up to 8 MB." },
      { status: 413 }
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "The file is empty." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let text: string;
  try {
    text = await extractTextFromFile(buffer, file.type, file.name);
  } catch (err) {
    if (err instanceof UnsupportedFileError) {
      return NextResponse.json({ error: err.message }, { status: 415 });
    }
    console.error("[extract-file:internal] parse error:", err);
    return NextResponse.json(
      { error: "Could not read that file. Please try a different file or paste the text." },
      { status: 422 }
    );
  }

  if (text.trim().length < 20) {
    return NextResponse.json(
      { error: "We could not find readable text in that file. It may be scanned or image-only." },
      { status: 422 }
    );
  }

  const result = await extractProposalFromText(text, invitation.rfp);
  if (!result.ok) {
    if (result.reason === "unavailable") {
      return NextResponse.json(
        { error: "AI extraction is temporarily unavailable. Please fill in the form manually." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "AI could not parse the proposal. Try a clearer file or paste the text." },
      { status: 422 }
    );
  }

  return NextResponse.json(result.data);
}
