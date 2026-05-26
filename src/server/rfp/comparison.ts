import { prisma } from "@/server/db";
import { callClaude } from "@/server/ai/anthropic";

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
          firm: { select: { name: true, firmType: true } },
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

      let staffing = "Not provided";
      try {
        if (inv.staffingPlan) {
          const plan = JSON.parse(inv.staffingPlan);
          staffing = typeof plan === "string" ? plan : JSON.stringify(plan);
        }
      } catch {
        staffing = inv.staffingPlan ?? "Not provided";
      }

      return `## Firm ${i + 1}: ${inv.firm.name} (${inv.firm.firmType})
Fee proposal: ${feeDisplay}
Staffing plan: ${staffing}
AI disclosure: ${inv.aiDisclosure ?? "None provided"}
Response document: ${inv.responseDocument ? "Provided" : "Not provided"}`;
    })
    .join("\n\n");

  const criteriaList = criteria
    .map((c) => `- ${c.name} (weight: ${c.weight}%)`)
    .join("\n");

  const prompt = `Compare the following law firm proposals for this RFP and produce a structured evaluation report.

RFP: ${rfp.title}
Practice area: ${rfp.practiceArea?.name ?? "Not specified"}
Jurisdiction: ${rfp.jurisdiction?.name ?? "Not specified"}
Scope: ${rfp.scopeDocument ?? "Not specified"}
Pricing requirements: ${rfp.pricingRequirements ?? "Standard"}

Evaluation criteria:
${criteriaList || "No formal criteria set — evaluate on value, capability, and pricing."}

${firmSummaries}

Produce a report with these sections:
1. EXECUTIVE SUMMARY — 3-4 sentences on overall assessment
2. FIRM-BY-FIRM ANALYSIS — for each firm: strengths, weaknesses, risks
3. COMPARATIVE TABLE — score each firm 1-5 on each criterion with brief justification
4. RECOMMENDATION — rank order with rationale, name a top pick
5. RISK FLAGS — any concerns (conflicts, capacity, pricing anomalies)

Be specific and actionable. This report goes to the General Counsel.`;

  const response = await callClaude({
    systemPrompt:
      "You are an expert legal operations advisor evaluating outside counsel RFP responses for SCG (Siam Cement Group). Be analytical, fair, and specific. Produce a professional report suitable for GC review. No markdown headers larger than ##.",
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
