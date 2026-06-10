import { prisma } from "@/server/db";
import { callClaude } from "@/server/ai/anthropic";
import { getAiBriefing } from "@/server/platform-settings";

export async function shouldAutoGenerate(rfpId: string): Promise<boolean> {
  const invitations = await prisma.rfpInvitation.findMany({
    where: { rfpId },
    select: { status: true },
  });

  if (invitations.length === 0) return false;

  return invitations.every(
    (inv) => inv.status === "SUBMITTED" || inv.status === "DECLINED"
  );
}

export async function generateComparisonReport(
  rfpId: string,
  userId: string,
): Promise<string> {
  const rfp = await prisma.rfp.findUniqueOrThrow({
    where: { id: rfpId },
    include: {
      practiceArea: { select: { name: true } },
      jurisdiction: { select: { name: true } },
      invitations: {
        where: { status: "SUBMITTED" },
        include: {
          firm: { select: { name: true, firmType: true, internalNotes: true } },
          evaluations: true,
        },
      },
    },
  });

  let criteria: Array<{ name: string; weight: number }> = [];
  try {
    criteria = JSON.parse(rfp.evaluationCriteria ?? "[]");
  } catch {
    criteria = [];
  }

  const firmSummaries = rfp.invitations
    .map((inv, i) => {
      const feeDisplay = inv.proposedFeeCents
        ? `${inv.currencyCode ?? "USD"} ${(inv.proposedFeeCents / 100).toLocaleString()} (${inv.proposedFeeType ?? "N/A"})`
        : "Not provided";

      // Parse phase-level fee breakdown
      let phaseBreakdown = "";
      try {
        if (inv.feeBreakdown) {
          const phases = JSON.parse(inv.feeBreakdown) as Array<{ phase: string; feeCents: number }>;
          if (phases.length > 0) {
            phaseBreakdown = "\nFee breakdown by phase:\n" + phases
              .map((p) => `  - ${p.phase}: ${inv.currencyCode ?? "USD"} ${(p.feeCents / 100).toLocaleString()}`)
              .join("\n");
          }
        }
      } catch {
        // ignore parse errors
      }

      let staffing = "Not provided";
      try {
        if (inv.staffingPlan) {
          const plan = JSON.parse(inv.staffingPlan);
          staffing = typeof plan === "string" ? plan : JSON.stringify(plan);
        }
      } catch {
        staffing = inv.staffingPlan ?? "Not provided";
      }

      const notes = inv.firm.internalNotes ? `\nInternal notes (confidential — from SCG Legal Operations): ${inv.firm.internalNotes}` : "";
      return `## Firm ${i + 1}: ${inv.firm.name} (${inv.firm.firmType})
Total fee proposal: ${feeDisplay}${phaseBreakdown}
Staffing plan: ${staffing}
AI disclosure: ${inv.aiDisclosure ?? "None provided"}
Response document: ${inv.responseDocument ?? "Not provided"}${notes}`;
    })
    .join("\n\n");

  const criteriaList = criteria
    .map((c) => `- ${c.name} (weight: ${c.weight}%)`)
    .join("\n");

  const aiBriefing = await getAiBriefing();

  const prompt = `Compare the following law firm proposals for this RFP and produce a structured evaluation report.

RFP: ${rfp.title}
Practice area: ${rfp.practiceArea?.name ?? "Not specified"}
Jurisdiction: ${rfp.jurisdiction?.name ?? "Not specified"}
Scope: ${rfp.scopeDocument ?? "Not specified"}
Pricing requirements: ${rfp.pricingRequirements ?? "Standard"}

Evaluation criteria:
${criteriaList || "No formal criteria set — evaluate on value, capability, and pricing."}

${firmSummaries}
${aiBriefing ? `\nINTERNAL KNOWLEDGE BRIEFING (from SCG Legal Operations — factor this into your evaluation):\n${aiBriefing}\n` : ""}
Produce a report with these sections:
1. EXECUTIVE SUMMARY — 3-4 sentences on overall assessment
2. FIRM-BY-FIRM ANALYSIS — for each firm: strengths, weaknesses, risks
3. SCOPE COVERAGE ANALYSIS — This is critical. Parse the RFP scope document into discrete deliverables/work items (e.g. "tax computation", "employee transfer", "regulatory filings", "due diligence", etc.). Then for EACH firm, check their response document and staffing plan to determine whether each scope item is:
   - **Explicitly covered** — the firm specifically mentions this deliverable
   - **Implicitly bundled** — the firm uses broad language that probably includes it but doesn't name it (e.g. "full M&A advisory" without specifying tax computation)
   - **Not addressed** — no mention at all, unclear if included
   - **Explicitly excluded** — the firm states this is out of scope or priced separately
   Present this as a table: rows = scope items, columns = firms, cells = coverage status. Below the table, flag the highest-risk gaps — items that are important but only implicitly bundled or not addressed. Recommend specific clarification questions to ask each firm.
   If the RFP scope document is empty or too vague to parse, note this and recommend the client define scope items before evaluating.
4. PHASE-BY-PHASE FEE COMPARISON — if firms provided fee breakdowns by phase/scope, create a side-by-side comparison table showing each phase and what each firm charges. Highlight which firm is cheapest per phase. If a firm did NOT break down fees, note this. If no firm provided breakdowns, skip this section.
5. COMPARATIVE TABLE — score each firm 1-5 on each criterion with brief justification
6. RECOMMENDATION — rank order with rationale, name a top pick. If phase breakdowns exist, also recommend whether the client should consider splitting work across firms (e.g. engaging Firm A for Phase 1 and Firm B for Phase 2) and what the blended cost would be vs. a single-firm appointment.
7. RISK FLAGS — any concerns (conflicts, capacity, pricing anomalies, scope gaps)

Be specific and actionable. This report goes to the General Counsel.`;

  const response = await callClaude({
    systemPrompt:
      "You are an expert legal operations advisor evaluating outside counsel RFP responses for SCG (Siam Cement Group). Be analytical, fair, and specific. If internal notes are provided for any firm, factor them into your evaluation — they reflect the in-house team's institutional knowledge and prior experience with that firm. Produce a professional report suitable for GC review. No markdown headers larger than ##.",
    userMessage: prompt,
  });

  await prisma.aiOutput.create({
    data: {
      outputType: "RFP_EVALUATION",
      userId,
      prompt,
      response: response.content,
      model: response.model,
      promptVersion: "rfp-comparison-v1.0",
      tokenCount: response.inputTokens + response.outputTokens,
    },
  });

  await prisma.rfp.update({
    where: { id: rfpId },
    data: { status: "EVALUATING" },
  });

  return response.content;
}

export async function getLatestComparison(rfpId: string) {
  const rfp = await prisma.rfp.findUnique({
    where: { id: rfpId },
    select: { title: true },
  });

  if (!rfp) return null;

  return prisma.aiOutput.findFirst({
    where: {
      outputType: "RFP_EVALUATION",
      prompt: { contains: rfp.title },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Compact "key differences" summary for the side-by-side compare view.
 * Deliberately small prompt (~900 input tokens) so it fits the Groq free
 * tier; the full structured report is generateComparisonReport above.
 */
export async function generateKeyDifferences(
  rfpId: string,
  userId: string,
  benchmarkMedianCents?: number | null,
): Promise<string> {
  const rfp = await prisma.rfp.findUniqueOrThrow({
    where: { id: rfpId },
    include: {
      practiceArea: { select: { name: true } },
      jurisdiction: { select: { name: true } },
      invitations: {
        where: { status: { in: ["SUBMITTED", "SCORED", "SHORTLISTED", "SELECTED"] } },
        include: { firm: { select: { name: true } } },
      },
    },
  });

  const firmLines = rfp.invitations.map((inv) => {
    const fee = inv.proposedFeeCents
      ? `${inv.currencyCode ?? "USD"} ${(inv.proposedFeeCents / 100).toLocaleString()} (${inv.proposedFeeType ?? "?"})`
      : "no fee given";
    let staffing = "";
    try {
      const plan = inv.staffingPlan ? JSON.parse(inv.staffingPlan) : null;
      staffing = plan
        ? typeof plan === "string"
          ? plan
          : [plan.partner, plan.associates].filter(Boolean).join("; ")
        : "";
    } catch {
      staffing = inv.staffingPlan ?? "";
    }
    const doc = (inv.responseDocument ?? "").slice(0, 300);
    return `- ${inv.firm.name}: ${fee}. Staffing: ${staffing || "n/a"}. Approach: ${doc}`;
  });

  const benchmarkLine = benchmarkMedianCents
    ? `Historical median fee for comparable matters: USD ${(benchmarkMedianCents / 100).toLocaleString()}.`
    : "";

  const prompt = `RFP: ${rfp.title} (${rfp.practiceArea?.name ?? "?"}, ${rfp.jurisdiction?.name ?? "?"})
${benchmarkLine}

Proposals:
${firmLines.join("\n")}

In max 200 words, give:
1. Three bullet points on the KEY DIFFERENCES between these proposals
2. One line each: "Best on cost:", "Best on experience:", "Best on approach:" naming a firm with a 5-10 word reason`;

  const response = await callClaude({
    systemPrompt:
      "You are a legal operations analyst summarizing law firm RFP proposals for quick decision-making. Be concise and specific. Use the firm names given.",
    userMessage: prompt,
    maxTokens: 400,
  });

  await prisma.aiOutput.create({
    data: {
      outputType: "FIRM_COMPARISON",
      userId,
      prompt,
      response: response.content,
      model: response.model,
      promptVersion: "rfp-key-diff-v1.0",
      tokenCount: response.inputTokens + response.outputTokens,
    },
  });

  return response.content;
}

export async function getLatestKeyDifferences(rfpId: string) {
  const rfp = await prisma.rfp.findUnique({
    where: { id: rfpId },
    select: { title: true },
  });

  if (!rfp) return null;

  return prisma.aiOutput.findFirst({
    where: {
      outputType: "FIRM_COMPARISON",
      prompt: { contains: rfp.title },
    },
    orderBy: { createdAt: "desc" },
  });
}
