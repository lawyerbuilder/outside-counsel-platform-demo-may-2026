import { callClaude } from "@/server/ai/anthropic";
import { wrapUntrusted, sanitizeLabel, ANTI_INJECTION_RULE } from "@/server/ai/untrusted";
import { proposalExtractionSchema, type ProposalExtraction } from "@/lib/validation/rfp";

/**
 * Shared AI extraction of structured fee-proposal data from free-form text.
 *
 * Used by BOTH the public paste/upload endpoints and the internal upload
 * endpoint so the LLM prompt lives in exactly one place. The input text is
 * always treated as untrusted (it comes from an outside law firm) and is
 * fenced via wrapUntrusted before it reaches the model.
 */

export type ExtractProposalResult =
  | { ok: true; data: ProposalExtraction }
  | { ok: false; reason: "unparseable" | "unavailable" };

type RfpContext = {
  title: string;
  scopeDocument?: string | null;
  pricingRequirements?: string | null;
};

export async function extractProposalFromText(
  text: string,
  rfp: RfpContext
): Promise<ExtractProposalResult> {
  const systemPrompt = `You are a legal billing data extraction assistant. Extract structured fee proposal data from the text provided by an outside counsel law firm.

${ANTI_INJECTION_RULE}

Context about the RFP:
- Title: ${sanitizeLabel(rfp.title, 200)}
${rfp.scopeDocument ? `- Scope: ${sanitizeLabel(rfp.scopeDocument, 1000)}` : ""}
${rfp.pricingRequirements ? `- Pricing requirements: ${sanitizeLabel(rfp.pricingRequirements, 500)}` : ""}

Return ONLY valid JSON with this exact structure (omit fields you cannot confidently extract):
{
  "feeType": "CAPPED" | "FIXED" | "HOURLY" | "PHASED_FIXED" | "BLENDED" | "SUCCESS",
  "currencyCode": "THB" | "USD" | "SGD" | "EUR" | "GBP" | "JPY",
  "phases": [
    { "phase": "Phase name", "feeCents": 150000000 }
  ],
  "staffingPlan": "Extracted staffing details as a single text block",
  "narrative": "Extracted approach / methodology / experience as a single text block",
  "totalFeeCents": 300000000,
  "confidence": 0.85
}

Rules:
- feeCents and totalFeeCents are in cents (multiply monetary amounts by 100)
- If a currency symbol is mentioned (e.g. $, ฿, £), infer currencyCode
- If no currency is mentioned, default to THB
- If no fee type is clearly stated, default to CAPPED
- phases should capture distinct work phases mentioned with their fees
- If only a single total fee is mentioned, create one phase called "Total fee" with that amount
- confidence is your estimate of how accurately you extracted the data (0 to 1)
- Do NOT make up data. If a field cannot be extracted, omit it.
- Return ONLY the JSON object, no markdown fences, no explanation.`;

  let response;
  try {
    response = await callClaude({
      systemPrompt,
      userMessage: wrapUntrusted("firm proposal text to extract from", text, 15000),
    });
  } catch (err) {
    console.error("[extractProposalFromText] LLM error:", err);
    return { ok: false, reason: "unavailable" };
  }

  // Parse the AI response as JSON
  let extracted: Record<string, unknown>;
  try {
    const cleaned = response.content
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    extracted = JSON.parse(cleaned);
  } catch {
    return { ok: false, reason: "unparseable" };
  }

  // LLM output derived from untrusted proposal text is itself untrusted:
  // only return fields that match the extraction schema.
  const safe = proposalExtractionSchema.safeParse(extracted);
  if (!safe.success) {
    return { ok: false, reason: "unparseable" };
  }

  return { ok: true, data: safe.data };
}
