import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { callClaude } from "@/server/ai/anthropic";
import { suggestFirmsForRfp, type EnrichedFirmSuggestion } from "@/server/rfp/firm-suggestions";
import { getCurrentUserId } from "../rfp/current-user";
import type { ComplexityTier } from "@/generated/prisma/client";

export const maxDuration = 60;

const firstTurnSchema = z.object({
  description: z.string().min(20, "Please describe the matter in a bit more detail").max(5000),
  matterNumber: z.string().max(50).optional(),
});

const followUpSchema = z.object({
  followUp: z.string().min(2).max(5000),
  context: z.object({
    description: z.string().max(5000),
    practiceAreaId: z.string(),
    jurisdictionId: z.string(),
    practiceArea: z.string().max(300),
    jurisdiction: z.string().max(300),
    complexityTier: z.enum(["COMPLEX", "STANDARD", "ROUTINE"]),
    urgency: z.string().max(300),
    title: z.string().max(300),
    matterNumber: z.string().max(50).optional(),
    budgetHighUsd: z.number().default(0),
    excludedFirmNames: z.array(z.string().max(200)).max(50).default([]),
    history: z
      .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) }))
      .max(12)
      .default([]),
  }),
});

type Classification = {
  practiceAreaId: string;
  jurisdictionId: string;
  complexityTier: "COMPLEX" | "STANDARD" | "ROUTINE";
  urgency: "HIGH" | "MEDIUM" | "LOW";
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  budgetBandUsd: { low: number; high: number } | null;
  missingFacts: string[];
  summary: string;
  title: string;
};

type IntakeFirm = {
  firmId: string | null;
  firmName: string;
  firmType: string | null;
  panelStatus: string | null;
  overallScore: number | null;
  lastScorecardTier: string | null;
  notes: string | null;
  warnings: string[];
  inDirectory: boolean;
};

/** Extract the first JSON value from model output that may be wrapped in prose */
function parseJsonLoose<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/[\[{][\s\S]*[\]}]/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error("Model did not return valid JSON");
  }
}

const isBlockingWarning = (w: string) =>
  w.includes("probation") || w.includes("Below-average") || w.includes("scorecard");

function decidePath(
  firms: EnrichedFirmSuggestion[],
  complexityTier: string,
  budgetHighUsd: number
): "DIRECT" | "RFP" {
  const cleanStrong = firms.filter(
    (f) => (f.overallScore ?? 0) >= 70 && !f.warnings.some(isBlockingWarning)
  );
  const highBudget = budgetHighUsd >= 150000;
  return cleanStrong.length >= 1 && complexityTier !== "COMPLEX" && !highBudget
    ? "DIRECT"
    : "RFP";
}

async function sourceFirms(
  jurisdictionId: string,
  practiceAreaId: string,
  complexityTier: ComplexityTier,
  excludedFirmNames: string[]
): Promise<EnrichedFirmSuggestion[]> {
  let firms: EnrichedFirmSuggestion[] = [];
  try {
    firms = await suggestFirmsForRfp(jurisdictionId, practiceAreaId, complexityTier);
  } catch {
    firms = [];
  }
  const excluded = excludedFirmNames.map((n) => n.toLowerCase().trim()).filter(Boolean);
  return firms.filter(
    (f) =>
      !excluded.some(
        (ex) =>
          f.firmName.toLowerCase().includes(ex) || ex.includes(f.firmName.toLowerCase())
      )
  );
}

function toIntakeFirm(f: EnrichedFirmSuggestion): IntakeFirm {
  return {
    firmId: f.firmId,
    firmName: f.firmName,
    firmType: f.firmType,
    panelStatus: f.panelStatus,
    overallScore: f.overallScore,
    lastScorecardTier: f.lastScorecardTier,
    notes: f.notes,
    warnings: f.warnings,
    inDirectory: true,
  };
}

function buildPrefillUrl(args: {
  jurisdictionId: string;
  practiceAreaId: string;
  complexityTier: string;
  urgency: string;
  description: string;
  title: string;
  matterNumber?: string;
  firmIds: string[];
}): string {
  const prefill = new URLSearchParams({
    step: "1",
    jurisdictionId: args.jurisdictionId,
    practiceAreaId: args.practiceAreaId,
    complexity: args.complexityTier,
    complexityTier: args.complexityTier,
    urgency: args.urgency,
    description: args.description,
    title: args.title,
    scopeDocument: args.description,
  });
  if (args.matterNumber) prefill.set("matterNumber", args.matterNumber);
  if (args.firmIds.length > 0) prefill.set("firmIds", args.firmIds.join(","));
  return `/rfp/new?${prefill.toString()}`;
}

async function persistOutput(prompt: string, response: string, model: string, tokens: number, version: string) {
  try {
    const userId = await getCurrentUserId();
    await prisma.aiOutput.create({
      data: {
        outputType: "MATTER_ALLOCATION",
        userId,
        prompt,
        response,
        model,
        promptVersion: version,
        tokenCount: tokens,
      },
    });
  } catch {
    // persistence is best-effort
  }
}

// ─── First turn: classify + source + reason ──────────────────────────────────

async function handleFirstTurn(description: string, matterNumber?: string) {
  const [practiceAreas, jurisdictions] = await Promise.all([
    prisma.practiceArea.findMany({ select: { id: true, name: true } }),
    prisma.jurisdiction.findMany({ select: { id: true, name: true } }),
  ]);

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
{"practiceAreaId":"<id from list>","jurisdictionId":"<id from list>","complexityTier":"COMPLEX|STANDARD|ROUTINE","urgency":"HIGH|MEDIUM|LOW","riskLevel":"HIGH|MEDIUM|LOW","budgetBandUsd":{"low":<number>,"high":<number>} or null,"missingFacts":["<question>"],"summary":"<one sentence>","title":"<short matter title, max 8 words>"}

STRICT RULES:
- budgetBandUsd: whole USD for external legal fees. Set ONLY if the user explicitly states a budget, fee expectation, or fee cap. If they state only a deal value, that is NOT a legal budget: return null. Never invent a number.
- missingFacts: up to 3 short questions a legal ops team must answer before running an RFP that are NOT answered in the description (e.g. "What is your budget or fee cap for external counsel?", "What is the target deadline or signing date?", "Which SCG entity is the client?"). Empty array if the description covers them.
- summary must only restate facts from the description. Do not add facts.
- complexityTier, urgency, and riskLevel are your professional assessment and are allowed.
Pick the closest matching practice area and jurisdiction even if imperfect.`,
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

  const firms = await sourceFirms(
    jd.id,
    pa.id,
    classification.complexityTier as ComplexityTier,
    []
  );
  const recommendedPath = decidePath(
    firms,
    classification.complexityTier,
    classification.budgetBandUsd?.high ?? 0
  );

  const firmLines = firms
    .slice(0, 5)
    .map(
      (f) =>
        `- ${f.firmName} (score ${f.overallScore ?? "n/a"}, tier ${f.lastScorecardTier ?? "none"}${f.warnings.length ? `, warnings: ${f.warnings.join("; ")}` : ""})`
    )
    .join("\n");

  const budgetLine = classification.budgetBandUsd
    ? `Stated budget: USD ${classification.budgetBandUsd.low.toLocaleString()} to ${classification.budgetBandUsd.high.toLocaleString()}.`
    : "Budget: not stated by the user. Do not assume or invent one.";

  const missingFacts = (classification.missingFacts ?? []).slice(0, 3);

  const reasoningResponse = await callClaude({
    maxTokens: 350,
    systemPrompt:
      "You are an outside counsel sourcing advisor for an in-house legal team. Explain sourcing recommendations concisely and concretely. Plain prose, max 150 words. Do not use markdown headers. Do not use em dashes. Only use facts you were given; never invent budgets, deadlines, or deal terms.",
    userMessage: `Matter: ${classification.summary}
Practice area: ${pa.name}. Jurisdiction: ${jd.name}.
Complexity: ${classification.complexityTier}. Risk: ${classification.riskLevel}. Urgency: ${classification.urgency}.
${budgetLine}

Panel firms available:
${firmLines || "- None with matching capability"}

Our policy engine recommends: ${recommendedPath === "DIRECT" ? "instruct a panel firm directly" : "run a competitive RFP"}.

Explain why this path makes sense for this matter and what the team should watch for.${missingFacts.length > 0 ? ` End by asking the user to confirm: ${missingFacts.join(" ")}` : ""}`,
  });

  await persistOutput(
    description,
    JSON.stringify({ classification, recommendedPath, reasoning: reasoningResponse.content }),
    reasoningResponse.model,
    classifyResponse.inputTokens + classifyResponse.outputTokens + reasoningResponse.inputTokens + reasoningResponse.outputTokens,
    "intake-v2.0"
  );

  const topFirms = firms.slice(0, 3);

  return NextResponse.json({
    assessment: {
      practiceAreaId: pa.id,
      jurisdictionId: jd.id,
      practiceArea: pa.name,
      jurisdiction: jd.name,
      complexityTier: classification.complexityTier,
      urgency: classification.urgency,
      riskLevel: classification.riskLevel,
      budgetBandUsd: classification.budgetBandUsd ?? null,
      missingFacts,
      summary: classification.summary,
      title: classification.title,
    },
    recommendedPath,
    reasoning: reasoningResponse.content,
    firms: topFirms.map(toIntakeFirm),
    rfpPrefillUrl: buildPrefillUrl({
      jurisdictionId: jd.id,
      practiceAreaId: pa.id,
      complexityTier: classification.complexityTier,
      urgency: classification.urgency,
      description,
      title: classification.title,
      matterNumber,
      firmIds: topFirms.map((f) => f.firmId),
    }),
  });
}

// ─── Follow-up turns: exclude / suggest / research / question ────────────────

type Intent = {
  action: "exclude" | "add_firm" | "research_more" | "provide_facts" | "question";
  firmNames?: string[];
  budgetLowUsd?: number | null;
  budgetHighUsd?: number | null;
};

async function handleFollowUp(body: z.infer<typeof followUpSchema>) {
  const { followUp, context } = body;

  const currentFirms = await sourceFirms(
    context.jurisdictionId,
    context.practiceAreaId,
    context.complexityTier as ComplexityTier,
    context.excludedFirmNames
  );
  const currentNames = currentFirms.slice(0, 3).map((f) => f.firmName);

  const intentResponse = await callClaude({
    maxTokens: 200,
    temperature: 0.1,
    systemPrompt: `You route follow-up requests in an outside counsel sourcing conversation. Respond with ONLY a JSON object.

Currently suggested firms: ${currentNames.join(", ") || "none"}
Already excluded: ${context.excludedFirmNames.join(", ") || "none"}

JSON shape: {"action":"exclude"|"add_firm"|"research_more"|"provide_facts"|"question","firmNames":["..."],"budgetLowUsd":<number or null>,"budgetHighUsd":<number or null>}
- "exclude": user wants to remove, avoid, or has had a bad experience with one or more firms. firmNames = the firms to exclude (prefer exact names from the suggested list).
- "add_firm": user suggests or asks about a specific firm or lawyer they want considered. firmNames = the proposed name(s).
- "research_more": user wants more or different firm options beyond what is shown.
- "provide_facts": user is supplying matter facts such as a budget, fee cap, or deadline. If a budget or fee amount is stated, set budgetLowUsd and budgetHighUsd in whole USD (same value if a single number).
- "question": anything else (questions about the matter, the firms, the process).`,
    userMessage: followUp,
  });

  let intent: Intent;
  try {
    intent = parseJsonLoose<Intent>(intentResponse.content);
  } catch {
    intent = { action: "question" };
  }

  // ── EXCLUDE ──
  if (intent.action === "exclude" && intent.firmNames?.length) {
    const excludedFirmNames = [...new Set([...context.excludedFirmNames, ...intent.firmNames])];
    const firms = await sourceFirms(
      context.jurisdictionId,
      context.practiceAreaId,
      context.complexityTier as ComplexityTier,
      excludedFirmNames
    );
    const recommendedPath = decidePath(firms, context.complexityTier, context.budgetHighUsd);
    const topFirms = firms.slice(0, 3);

    const firmLines = topFirms
      .map((f) => `- ${f.firmName} (score ${f.overallScore ?? "n/a"})`)
      .join("\n");

    const msgResponse = await callClaude({
      maxTokens: 250,
      systemPrompt:
        "You are an outside counsel sourcing advisor. Confirm the exclusion and explain the updated recommendation in max 80 words. Plain prose. Do not use em dashes.",
      userMessage: `User excluded: ${intent.firmNames.join(", ")} from candidates for "${context.title}" (${context.practiceArea}, ${context.jurisdiction}).
Remaining panel candidates:
${firmLines || "- None remaining with rated capability"}
Updated path: ${recommendedPath === "DIRECT" ? "instruct directly" : "run an RFP"}.${firms.length === 0 ? " Note: no rated panel firms remain. Suggest the user ask to research more firms or suggest their own." : ""}`,
    });

    await persistOutput(followUp, msgResponse.content, msgResponse.model, msgResponse.inputTokens + msgResponse.outputTokens, "intake-followup-v1.0");

    return NextResponse.json({
      message: msgResponse.content,
      firms: topFirms.map(toIntakeFirm),
      recommendedPath,
      excludedFirmNames,
      rfpPrefillUrl: buildPrefillUrl({
        jurisdictionId: context.jurisdictionId,
        practiceAreaId: context.practiceAreaId,
        complexityTier: context.complexityTier,
        urgency: context.urgency,
        description: context.description,
        title: context.title,
        firmIds: topFirms.map((f) => f.firmId),
      }),
    });
  }

  // ── PROVIDE FACTS (budget etc.) ──
  if (intent.action === "provide_facts") {
    const high = intent.budgetHighUsd ?? intent.budgetLowUsd ?? null;
    const low = intent.budgetLowUsd ?? intent.budgetHighUsd ?? null;

    if (high != null && high > 0) {
      const firms = await sourceFirms(
        context.jurisdictionId,
        context.practiceAreaId,
        context.complexityTier as ComplexityTier,
        context.excludedFirmNames
      );
      const recommendedPath = decidePath(firms, context.complexityTier, high);
      const topFirms = firms.slice(0, 3);

      const pathText =
        recommendedPath === "DIRECT"
          ? `a budget at this level with rated panel firms available supports instructing directly`
          : `at this budget level a competitive RFP remains the recommended route`;

      return NextResponse.json({
        message: `Noted: budget of USD ${low?.toLocaleString()}${high !== low ? ` to ${high.toLocaleString()}` : ""} for external fees. Based on the panel options, ${pathText}. The assessment above has been updated.`,
        budgetBandUsd: { low: low ?? high, high },
        firms: topFirms.map(toIntakeFirm),
        recommendedPath,
        rfpPrefillUrl: buildPrefillUrl({
          jurisdictionId: context.jurisdictionId,
          practiceAreaId: context.practiceAreaId,
          complexityTier: context.complexityTier,
          urgency: context.urgency,
          description: context.description,
          title: context.title,
          matterNumber: context.matterNumber,
          firmIds: topFirms.map((f) => f.firmId),
        }),
      });
    }

    return NextResponse.json({
      message:
        "Thanks, noted. If you can share a budget or fee cap for external counsel, I can factor it into the sourcing recommendation. Other facts like deadlines and client entity go into the RFP itself.",
    });
  }

  // ── ADD FIRM ──
  if (intent.action === "add_firm" && intent.firmNames?.length) {
    const name = intent.firmNames[0];
    const dbFirm = await prisma.firm.findFirst({
      where: { name: { contains: name }, deletedAt: null },
      select: { id: true, name: true, firmType: true, panelStatus: true },
    });

    if (dbFirm) {
      const [capability, scorecard] = await Promise.all([
        prisma.firmCapability.findFirst({
          where: {
            firmId: dbFirm.id,
            practiceAreaId: context.practiceAreaId,
            jurisdictionId: context.jurisdictionId,
            isActive: true,
          },
          orderBy: { overallScore: "desc" },
        }),
        prisma.scorecard.findFirst({
          where: { firmId: dbFirm.id },
          orderBy: { periodEnd: "desc" },
          select: { tier: true },
        }),
      ]);

      const warnings: string[] = [];
      if (!capability) warnings.push(`No rated capability for ${context.practiceArea} in ${context.jurisdiction}`);
      if (dbFirm.panelStatus === "PROBATION") warnings.push("Firm is on probation");
      if (dbFirm.panelStatus === "PROSPECTIVE") warnings.push("Prospective firm, not yet on panel");

      const addedFirm: IntakeFirm = {
        firmId: dbFirm.id,
        firmName: dbFirm.name,
        firmType: dbFirm.firmType,
        panelStatus: dbFirm.panelStatus,
        overallScore: capability?.overallScore ?? null,
        lastScorecardTier: scorecard?.tier ?? null,
        notes: capability?.notes ?? null,
        warnings,
        inDirectory: true,
      };

      const message = capability
        ? `${dbFirm.name} is in the directory with a rated capability for ${context.practiceArea} in ${context.jurisdiction} (score ${Math.round(capability.overallScore ?? 0)}). Added to your candidates. You can include it when you run the RFP.`
        : `${dbFirm.name} is in the directory (panel status: ${dbFirm.panelStatus}), but has no rated capability for ${context.practiceArea} in ${context.jurisdiction} yet. You can still invite it to the RFP; consider asking for relevant deal references in the proposal.`;

      return NextResponse.json({ message, addedFirm });
    }

    // Not in directory: brief AI research with clear caveats
    const researchResponse = await callClaude({
      maxTokens: 250,
      systemPrompt:
        "You are a legal market researcher. Give a 2-3 sentence factual profile of the law firm or lawyer asked about, focused on the stated practice area and jurisdiction. If you are not confident the firm exists or do not know it, say so plainly. End with: this information is from AI knowledge and should be verified. Do not use em dashes.",
      userMessage: `Firm or lawyer: "${name}". Context: ${context.practiceArea} matter in ${context.jurisdiction}.`,
    });

    return NextResponse.json({
      message: `${researchResponse.content}\n\n${name} is not in your directory yet. You can add it under Firms, then invite it to the RFP.`,
      addedFirm: {
        firmId: null,
        firmName: name,
        firmType: null,
        panelStatus: null,
        overallScore: null,
        lastScorecardTier: null,
        notes: null,
        warnings: ["Not in directory, AI-researched only"],
        inDirectory: false,
      } satisfies IntakeFirm,
    });
  }

  // ── RESEARCH MORE ──
  if (intent.action === "research_more") {
    const knownNames = [...currentNames, ...context.excludedFirmNames];
    const researchResponse = await callClaude({
      maxTokens: 400,
      temperature: 0.4,
      systemPrompt: `You are a legal market researcher. Respond with ONLY a JSON array, no prose. Suggest up to 4 reputable law firms for the stated practice area and jurisdiction that are NOT in the exclusion list. Shape: [{"name":"<firm name>","note":"<max 15 words on why they fit>"}]. Only name real firms you are confident exist.`,
      userMessage: `Practice area: ${context.practiceArea}. Jurisdiction: ${context.jurisdiction}. Matter: ${context.title}.
Exclude: ${knownNames.join(", ") || "none"}`,
    });

    let suggestions: Array<{ name: string; note: string }> = [];
    try {
      suggestions = parseJsonLoose<Array<{ name: string; note: string }>>(researchResponse.content);
    } catch {
      suggestions = [];
    }

    // Cross-check each suggestion against the directory
    const researchFirms = await Promise.all(
      suggestions.slice(0, 4).map(async (s) => {
        const dbFirm = await prisma.firm.findFirst({
          where: { name: { contains: s.name.split(" ")[0] }, deletedAt: null },
          select: { id: true, name: true, panelStatus: true },
        });
        return {
          name: dbFirm?.name ?? s.name,
          note: s.note,
          inDirectory: !!dbFirm,
          firmId: dbFirm?.id ?? null,
          panelStatus: dbFirm?.panelStatus ?? null,
        };
      })
    );

    await persistOutput(followUp, JSON.stringify(researchFirms), researchResponse.model, researchResponse.inputTokens + researchResponse.outputTokens, "intake-research-v1.0");

    return NextResponse.json({
      message:
        researchFirms.length > 0
          ? `Here are additional firms worth considering for ${context.practiceArea} in ${context.jurisdiction}. Firms marked as AI-researched are not in your directory and should be verified before engaging.`
          : "I could not confidently identify additional firms for this market. Consider asking your network or checking Chambers and Legal 500 for this practice area.",
      researchFirms,
    });
  }

  // ── QUESTION (default) ──
  const historyText = context.history
    .slice(-6)
    .map((h) => `${h.role}: ${h.content.slice(0, 250)}`)
    .join("\n");

  const answerResponse = await callClaude({
    maxTokens: 350,
    systemPrompt:
      "You are an outside counsel sourcing advisor inside an intake tool. Answer the user's question concisely (max 120 words) using the matter context and firm list provided. If asked something requiring data you do not have, say what to check and where (Panel page, firm profiles, rankings). Do not use em dashes.",
    userMessage: `Matter: ${context.title} (${context.practiceArea}, ${context.jurisdiction}, ${context.complexityTier}).
Current candidates: ${currentNames.join(", ") || "none"}.
Excluded: ${context.excludedFirmNames.join(", ") || "none"}.
Recent conversation:
${historyText}

User question: ${followUp}`,
  });

  return NextResponse.json({ message: answerResponse.content });
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const followUpParse = followUpSchema.safeParse(json);
    if (followUpParse.success) {
      return await handleFollowUp(followUpParse.data);
    }

    const firstParse = firstTurnSchema.safeParse(json);
    if (firstParse.success) {
      return await handleFirstTurn(firstParse.data.description, firstParse.data.matterNumber);
    }

    const message =
      firstParse.error.issues[0]?.message ?? "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  } catch (e) {
    console.error("Intake request failed:", e);
    return NextResponse.json(
      { error: "Assessment failed. The AI provider may be busy. Please try again." },
      { status: 500 }
    );
  }
}
