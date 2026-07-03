import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { extractTextFromFile, UnsupportedFileError } from "@/server/extract-file";
import { extractProposalFromText } from "@/server/rfp/extract-proposal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * POST /api/respond/[token]/extract-file
 * Public — a firm uploads its own proposal as a PDF or Word (.docx) file.
 * We extract the text server-side and run the SAME AI extraction as /extract.
 * No auth beyond the token itself.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Same per-token budget as the paste endpoint (shared key on purpose).
  const rl = checkRateLimit(`extract:${token}`, { limit: 8, windowMs: 60 * 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many extraction attempts. Please wait, or fill in the form manually." },
      { status: 429 }
    );
  }

  const invitation = await prisma.rfpInvitation.findUnique({
    where: { responseToken: token },
    include: {
      rfp: {
        select: { title: true, scopeDocument: true, pricingRequirements: true },
      },
    },
  });

  if (!invitation) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
  }
  if (invitation.status !== "INVITED") {
    return NextResponse.json(
      { error: "This invitation has already been responded to" },
      { status: 409 }
    );
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

  // Server-side size cap (never trust the client accept= attribute).
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
    console.error("[extract-file] parse error:", err);
    return NextResponse.json(
      { error: "Could not read that file. Please try a different file or paste the text." },
      { status: 422 }
    );
  }

  if (text.trim().length < 20) {
    return NextResponse.json(
      { error: "We could not find readable text in that file. It may be scanned or image-only. Please paste the text." },
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
