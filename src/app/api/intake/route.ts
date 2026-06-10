import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { callClaude } from "@/server/ai/anthropic";
import { suggestFirmsForRfp } from "@/server/rfp/firm-suggestions";
import { getCurrentUserId } from "../rfp/current-user";
import type { ComplexityTier } from "@/generated/prisma/client";

export const maxDuration = 60;

const bodySchema = z.object({
  description: z.string().min(20, "Please describe the matter in a bit more detail"),
});

type Classification = {
  practiceAreaId: string;
  jurisdictionId: string;
  complexityTier: "COMPLEX" | "STANDARD" | "ROUTINE";
  urgency: "HIGH" | "MEDIUM" | "LOW";
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  budgetBandUsd: { low: number; high: number };
  summary: string;
  title: string;
};

/** Extract the first JSON object from model output that may be wrapped in prose */
function parseJsonLoose<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error("Model did not return valid JSON");
  }
}

export async function POST(req: NextRequest) {
  let description: string;
  try {
    const body = bodySchema.parse(await req.json());
    description = body.description;
  } catch (e) {
    const message = e instanceof z.ZodError ? e.issues[0]?.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const [practiceAreas, jurisdictions] = await Promise.all([
      prisma.practiceArea.findMany({ select: { id: true, name: true } }),
      prisma.jurisdiction.findMany({ select: { id: true, name: true } }),
    ]);

    // ── Stage 1: classify (fast model, compact prompt) ─────────────────────
    const paList = practiceAreas.map((p) => `${p.name}|${p.id}`).join("\n");
    const jdList = jurisdictions.map((j) => `${j.name}|${j.id}`).join("\n");

    // Default model (70B on Groq): the 8B fast model misclassifies practice areas
    const classifyResponse = await callClaude({
      maxTokens: 400,
      temperature: 0.1,
      systemPrompt: `You classify legal matter descriptions for an in-house legal team. Respond with ONLY a JSON object, no prose.

Practice areas (name|id):
${paList}

Jurisdictions (name|id):
${jdList}

JSON shape:
{"practiceAreaId":"<id from list>","jurisdictionId":"<id from list>","complexityTier":"COMPLEX|STANDARD|ROUTINE","urgency":"HIGH|MEDIUM|LOW","riskLevel":"HIGH|MEDIUM|LOW","budgetBandUsd":{"low":<number>,"high":<number>},"summary":"<one sentence>","title":"<short matter title, max 8 words>"}

budgetBandUsd is your estimate of total external legal fees in whole USD. Pick the closest matching practice area and jurisdiction even if imperfect.`,
      userMessage: description,
    });

    const classification = parseJsonLoose<Classification>(classifyResponse.content);

    const pa = practiceAreas.find((p) => p.id === classification.practiceAreaId);
    const jd = jurisdictions.find((j) => j.id === classification.jurisdictionId);
    if (!pa || !jd) {
      return NextResponse.json(
        { error: "Could not map the matter to a known practice area and jurisdiction. Try adding more detail." },
        { status: 422 }
      );
    }

    // ── Stage 2: sourcing decision computed in code ────────────────────────
    let firms: Awaited<ReturnType<typeof suggestFirmsForRfp>> = [];
    try {
      firms = await suggestFirmsForRfp(
        jd.id,
        pa.id,
        classification.complexityTier as ComplexityTier
      );
    } catch {
      firms = [];
    }

    const topFirm = firms[0];
    // Pending RFP invitations and "not yet reviewed" don't block direct
    // instruction; probation, low scores, and scorecard problems do.
    const isBlockingWarning = (w: string) =>
      w.includes("probation") || w.includes("Below-average") || w.includes("scorecard");
    const cleanStrongFirms = firms.filter(
      (f) => (f.overallScore ?? 0) >= 70 && !f.warnings.some(isBlockingWarning)
    );
    const highBudget = classification.budgetBandUsd.high >= 150000;

    let recommendedPath: "DIRECT" | "RFP";
    if (
      cleanStrongFirms.length >= 1 &&
      classification.complexityTier !== "COMPLEX" &&
      !highBudget
    ) {
      recommendedPath = "DIRECT";
    } else {
      recommendedPath = "RFP";
    }

    // ── Stage 3: reasoning (default model, small prompt) ───────────────────
    const firmLines = firms
      .slice(0, 5)
      .map(
        (f) =>
          `- ${f.firmName} (score ${f.overallScore ?? "n/a"}, tier ${f.lastScorecardTier ?? "none"}${f.warnings.length ? `, warnings: ${f.warnings.join("; ")}` : ""})`
      )
      .join("\n");

    const reasoningResponse = await callClaude({
      maxTokens: 350,
      systemPrompt:
        "You are an outside counsel sourcing advisor for an in-house legal team. Explain sourcing recommendations concisely and concretely. Plain prose, max 150 words. Do not use markdown headers.",
      userMessage: `Matter: ${classification.summary}
Practice area: ${pa.name}. Jurisdiction: ${jd.name}.
Complexity: ${classification.complexityTier}. Risk: ${classification.riskLevel}. Urgency: ${classification.urgency}.
Estimated budget: USD ${classification.budgetBandUsd.low.toLocaleString()} to ${classification.budgetBandUsd.high.toLocaleString()}.

Panel firms available:
${firmLines || "- None with matching capability"}

Our policy engine recommends: ${recommendedPath === "DIRECT" ? "instruct a panel firm directly" : "run a competitive RFP"}.

Explain why this path makes sense for this matter and what the team should watch for.`,
    });

    // ── Persist + respond ──────────────────────────────────────────────────
    const userId = await getCurrentUserId();
    await prisma.aiOutput.create({
      data: {
        outputType: "MATTER_ALLOCATION",
        userId,
        prompt: description,
        response: JSON.stringify({ classification, recommendedPath, reasoning: reasoningResponse.content }),
        model: reasoningResponse.model,
        promptVersion: "intake-v1.0",
        tokenCount:
          classifyResponse.inputTokens +
          classifyResponse.outputTokens +
          reasoningResponse.inputTokens +
          reasoningResponse.outputTokens,
      },
    });

    const prefill = new URLSearchParams({
      step: "1",
      jurisdictionId: jd.id,
      practiceAreaId: pa.id,
      complexity: classification.complexityTier,
      complexityTier: classification.complexityTier,
      urgency: classification.urgency,
      description,
      title: classification.title,
      scopeDocument: description,
    });

    return NextResponse.json({
      assessment: {
        practiceArea: pa.name,
        jurisdiction: jd.name,
        complexityTier: classification.complexityTier,
        urgency: classification.urgency,
        riskLevel: classification.riskLevel,
        budgetBandUsd: classification.budgetBandUsd,
        summary: classification.summary,
        title: classification.title,
      },
      recommendedPath,
      reasoning: reasoningResponse.content,
      firms: firms.slice(0, 3).map((f) => ({
        firmId: f.firmId,
        firmName: f.firmName,
        firmType: f.firmType,
        panelStatus: f.panelStatus,
        overallScore: f.overallScore,
        lastScorecardTier: f.lastScorecardTier,
        notes: f.notes,
        warnings: f.warnings,
      })),
      topFirmId: topFirm?.firmId ?? null,
      rfpPrefillUrl: `/rfp/new?${prefill.toString()}`,
    });
  } catch (e) {
    console.error("Intake assessment failed:", e);
    return NextResponse.json(
      { error: "Assessment failed. The AI provider may be busy — please try again." },
      { status: 500 }
    );
  }
}
