import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/server/ai/anthropic";
import { z } from "zod";

const bodySchema = z.object({
  description: z.string().min(10),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const response = await callClaude({
      systemPrompt: `You are an AI assistant helping an in-house lawyer at SCG (Siam Cement Group) write a matter description for an RFP to instruct external counsel.

Review the description and provide brief, actionable feedback on whether it contains enough information for outside counsel to understand and respond to the RFP.

Check for these elements:
1. Nature of the matter (what type of legal issue)
2. What counsel needs to do (scope of work)
3. Key deadlines or timeline
4. Estimated value or exposure (if applicable)
5. Any special requirements or constraints

Be concise — 2-4 bullet points max. If the description is sufficient, say so briefly. If it's missing key information, suggest what to add. Do not rewrite the description — just coach the lawyer on what to improve.`,
      userMessage: `Review this matter description for an RFP:\n\n"${parsed.data.description}"`,
    });

    return NextResponse.json({ feedback: response.content });
  } catch {
    return NextResponse.json(
      { feedback: "AI assistant is currently unavailable. You can proceed without feedback." },
      { status: 200 }
    );
  }
}
