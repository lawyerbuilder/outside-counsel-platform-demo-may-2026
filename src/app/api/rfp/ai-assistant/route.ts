import { z } from "zod";
import { callClaude } from "@/server/ai/anthropic";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }))
    .min(1, "No messages")
    .max(40),
  currentFields: z.record(z.string(), z.unknown()).default({}),
  firmIds: z.array(z.string()).max(100).default([]),
  firmNames: z.record(z.string(), z.string()).default({}),
  jurisdictions: z.array(z.object({ id: z.string(), name: z.string() })).max(100).default([]),
  practiceAreas: z.array(z.object({ id: z.string(), name: z.string() })).max(100).default([]),
});

const SYSTEM_PROMPT = `You are an AI assistant helping an in-house lawyer at SCG create a Request for Proposal (RFP) to instruct external counsel. Your job is to have a natural conversation that extracts the key information needed for the RFP.

CONVERSATION APPROACH:
- Be conversational and helpful, not interrogative
- Ask one or two questions at a time, not a long checklist
- If the user gives a broad description, extract what you can and ask follow-up questions for missing pieces
- Acknowledge what you've captured before asking for more

INFORMATION TO EXTRACT (gather naturally through conversation):
1. **Description** — What is the legal matter about? What does counsel need to do?
2. **Jurisdiction** — Which country/jurisdiction is this work in?
3. **Practice area** — What type of legal work? (M&A, Litigation, IP, etc.)
4. **Complexity** — ROUTINE, STANDARD, or COMPLEX
5. **Urgency** — How time-sensitive? (e.g., "urgent", "normal", "flexible")
6. **Fee structure** — How should firms price this? (fee cap, fixed fee, hourly with cap, etc.)
7. **Fee cap** — Maximum budget if applicable
8. **Cost center code** — The BU cost center for billing (if known)
9. **Evaluation criteria** — What matters most when selecting a firm? (price, expertise, speed, etc.)

AVAILABLE REFERENCE DATA:
Jurisdictions: {JURISDICTIONS}
Practice areas: {PRACTICE_AREAS}

RESPONSE FORMAT:
You MUST respond with valid JSON and nothing else. The JSON must have this structure:
{
  "message": "Your conversational response to the user",
  "fields": {
    // Only include fields you can confidently extract from the conversation so far.
    // Use the exact field names below. Omit fields you haven't determined yet.
    // "description": "string — the matter description",
    // "jurisdictionId": "string — the ID from the jurisdictions list",
    // "jurisdictionName": "string — the name from the jurisdictions list",
    // "practiceAreaId": "string — the ID from the practice areas list",
    // "practiceAreaName": "string — the name from the practice areas list",
    // "complexityTier": "ROUTINE | STANDARD | COMPLEX",
    // "urgency": "string",
    // "feeStructure": "string",
    // "feeCap": "string",
    // "costCenterCode": "string",
    // "evaluationCriteria": ["string", ...]
  }
}

RULES:
- Match jurisdiction and practice area to the closest item from the reference data lists.
- For jurisdiction, ALWAYS set both jurisdictionId and jurisdictionName together.
- For practice area, ALWAYS set both practiceAreaId and practiceAreaName together.
- Only set fields you're confident about. Don't guess.
- When enough information is gathered (at least description, jurisdiction, and practice area), let the user know they can click "Review & Send RFP" in the side panel, but offer to refine further.
- Always respond with pure JSON. No markdown code fences, no extra text.`;

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }
  const { messages, currentFields, jurisdictions, practiceAreas } = parsed.data;

  const systemPrompt = SYSTEM_PROMPT
    .replace("{JURISDICTIONS}", JSON.stringify(jurisdictions.map((j) => ({ id: j.id, name: j.name }))))
    .replace("{PRACTICE_AREAS}", JSON.stringify(practiceAreas.map((p) => ({ id: p.id, name: p.name }))));

  const conversationHistory = messages
    .map((m) => `${m.role === "user" ? "Human" : "Assistant"}: ${m.content}`)
    .join("\n\n");

  const userMessage = `Current extracted fields: ${JSON.stringify(currentFields)}\n\nConversation:\n${conversationHistory}\n\nRespond with JSON only.`;

  try {
    const response = await callClaude({
      systemPrompt,
      userMessage,
    });

    let parsed: { message: string; fields?: Record<string, unknown> };
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch?.[0] ?? response.content);
    } catch {
      parsed = { message: response.content, fields: {} };
    }

    return Response.json({
      message: parsed.message ?? response.content,
      fields: parsed.fields ?? {},
    });
  } catch (err) {
    console.error("AI RFP assistant error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    if (errorMessage.includes("API key")) {
      return Response.json({ error: errorMessage, needsApiKey: true }, { status: 401 });
    }
    return Response.json(
      { message: "I'm having trouble connecting. Please try again.", fields: {} },
      { status: 200 }
    );
  }
}
