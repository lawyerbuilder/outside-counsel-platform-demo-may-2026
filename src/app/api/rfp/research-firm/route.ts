import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/server/ai/anthropic";
import { prisma } from "@/server/db";
import { z } from "zod";

const bodySchema = z.object({
  firmName: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { firmName } = parsed.data;

  // Try exact match first, then fuzzy (contains) match
  let existing = await prisma.firm.findFirst({
    where: { name: { equals: firmName } },
    select: { id: true, name: true },
  });

  if (!existing) {
    // Fuzzy match: firm name contains the search term or vice versa
    existing = await prisma.firm.findFirst({
      where: {
        OR: [
          { name: { contains: firmName } },
          // Also check if the input is a longer form of a DB name
          ...(firmName.length >= 4
            ? [{ name: { contains: firmName.split(/[&,]| and /i)[0].trim() } }]
            : []),
        ],
      },
      select: { id: true, name: true },
    });
  }

  if (existing) {
    return NextResponse.json({
      firmId: existing.id,
      summary: `${existing.name} is already in the panel database.`,
    });
  }

  let summary = `${firmName} — added as unranked firm.`;
  try {
    const response = await callClaude({
      systemPrompt: `You are a legal industry research assistant. Given a law firm or lawyer name, provide a brief 1-2 sentence summary of who they are, their key practice areas, and their jurisdiction. If you don't recognise the name, say so honestly. Do not fabricate information. Keep the response under 100 words.`,
      userMessage: `Research this law firm or lawyer: "${firmName}"`,
      maxTokens: 200,
    });
    summary = response.content;
  } catch {
    summary = `${firmName} — added as unranked. AI research unavailable.`;
  }

  const firm = await prisma.firm.create({
    data: {
      name: firmName,
      firmType: "FULL_SERVICE",
      city: "Unknown",
      panelStatus: "PROSPECTIVE",
      country: "Unknown",
      notes: summary,
    },
  });

  return NextResponse.json({ firmId: firm.id, summary });
}
