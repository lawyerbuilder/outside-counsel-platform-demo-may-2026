import { prisma } from "@/server/db";
import { computeNps } from "@/server/insights";
import { getCurrentUser } from "@/server/current-user";
import { callClaude } from "@/server/ai/anthropic";

const INSTRUCTIONS = `You are the AI assistant for SCG's Outside Counsel Directory — an internal tool used by the in-house legal team to find and evaluate law firms and individual lawyers.

Your role:
- Help users find the right firm or lawyer for their legal needs
- Interpret natural language queries and search the directory data provided below
- Present results clearly with key metrics (NPS, rankings, practice areas)
- If the user describes an engagement type (e.g. "cross-border M&A in Thailand"), find firms/lawyers with matching practice areas and jurisdictions
- Proactively suggest related searches or deeper profiles when useful
- Be concise but informative — this is for busy lawyers
- Guide the user through a shortlisting workflow: recommend → shortlist → approve → RFP

CRITICAL FORMATTING RULES:
- NEVER show raw database IDs to the user. They are ugly and meaningless.
- Instead, create clickable markdown links: use [Lawyer Name](/lawyers/ID) or [Firm Name](/firms/ID) so the user can click to view the full profile.
- Always show contact info when available (email, LinkedIn URL).
- Show the firm's website when available.

When presenting search results, format them as a clear ranked list with:
1. **Name** as a clickable link to their profile page
2. Current firm (for lawyers), also linked
3. Contact info (email, LinkedIn) if available
4. NPS score
5. Key practice areas and notable rankings
6. Firm website (for firm results)

Always use the directory data provided to answer questions. Never make up information.

## ACTION BUTTONS

You can include interactive action buttons in your responses. These render as clickable buttons in the UI. Use this exact syntax, each on its own line:

{{add_shortlist:FIRM_ID:Firm Display Name}}  — adds a firm to the user's shortlist
{{view_shortlist}}  — shows the current shortlist
{{approve_shortlist}}  — approves the shortlist and proceeds to RFP
{{rfp_wizard}}  — navigates to the step-by-step RFP wizard
{{rfp_ai}}  — navigates to the AI-assisted RFP creator

WHEN TO USE ACTION BUTTONS:
- After recommending specific firms, include an {{add_shortlist:ID:Name}} button for EACH recommended firm so the user can easily shortlist them.
- When the user seems satisfied with their selection or says something like "that's good" or "I'm done", suggest approving the shortlist with {{approve_shortlist}}.
- When the user approves the shortlist, offer BOTH RFP options:
  {{rfp_wizard}}
  {{rfp_ai}}
- You can include {{view_shortlist}} if the user asks what's in their shortlist.

IMPORTANT: Always include the EXACT firm ID from the directory data in the add_shortlist action. The ID is in the JSON data — look it up.`;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export const dynamic = "force-dynamic";

async function getDirectoryContext(): Promise<string> {
  const [firms, lawyers] = await Promise.all([
    prisma.firm.findMany({
      select: {
        id: true,
        name: true,
        shortName: true,
        country: true,
        city: true,
        firmType: true,
        headcount: true,
        website: true,
        practiceAreas: {
          include: { practiceArea: true, jurisdiction: true },
        },
        rankings: {
          include: { rankingSource: true, practiceArea: true },
        },
        recommendations: {
          where: { targetType: "FIRM" },
          select: { npsScore: true },
        },
      },
    }),
    prisma.lawyer.findMany({
      select: {
        id: true,
        name: true,
        title: true,
        email: true,
        linkedInUrl: true,
        firmLawyers: {
          where: { isCurrent: true },
          include: { firm: { select: { id: true, name: true } } },
          take: 1,
        },
        practiceAreas: { include: { practiceArea: true } },
        rankings: {
          include: { rankingSource: true, practiceArea: true },
        },
        recommendations: {
          where: { targetType: "LAWYER" },
          select: { npsScore: true },
        },
      },
    }),
  ]);

  const firmSummaries = firms.map((f) => ({
    id: f.id,
    name: f.name,
    shortName: f.shortName,
    country: f.country,
    city: f.city,
    type: f.firmType,
    headcount: f.headcount,
    website: f.website,
    nps: computeNps(f.recommendations.map((r) => r.npsScore)).score,
    practiceAreas: [
      ...new Set(f.practiceAreas.map((pa) => pa.practiceArea.name)),
    ],
    jurisdictions: [
      ...new Set(
        f.practiceAreas
          .filter((pa) => pa.jurisdiction)
          .map((pa) => pa.jurisdiction!.name)
      ),
    ],
    rankings: f.rankings.map(
      (r) =>
        `${r.rankingSource.publisher} ${r.rankingSource.editionYear}: ${r.practiceArea.name}${r.band ? ` Band ${r.band}` : ""}${r.tier ? ` Tier ${r.tier}` : ""}`
    ),
  }));

  const lawyerSummaries = lawyers.map((l) => ({
    id: l.id,
    name: l.name,
    title: l.title,
    email: l.email,
    linkedIn: l.linkedInUrl,
    firm: l.firmLawyers[0]?.firm
      ? { id: l.firmLawyers[0].firm.id, name: l.firmLawyers[0].firm.name }
      : null,
    practiceAreas: [
      ...new Set(l.practiceAreas.map((pa) => pa.practiceArea.name)),
    ],
    nps: computeNps(l.recommendations.map((r) => r.npsScore)).score,
    rankings: l.rankings.map(
      (r) =>
        `${r.rankingSource.publisher} ${r.rankingSource.editionYear}: ${r.practiceArea.name}${r.category ? ` (${r.category})` : ""}`
    ),
  }));

  return JSON.stringify({ firms: firmSummaries, lawyers: lawyerSummaries });
}

async function getShortlistContext(userId: string): Promise<string> {
  const rfp = await prisma.rfp.findFirst({
    where: { title: "__ai_shortlist__", status: "DRAFT", createdById: userId },
    include: {
      invitations: {
        include: {
          firm: { select: { id: true, name: true, shortName: true } },
        },
      },
    },
  });

  if (!rfp || rfp.invitations.length === 0) {
    return "Current shortlist: EMPTY (no firms selected yet)";
  }

  const names = rfp.invitations
    .map((i) => i.firm.shortName || i.firm.name)
    .join(", ");
  return `Current shortlist (${rfp.invitations.length} firms): ${names}`;
}

export async function POST(request: Request) {
  const { messages } = (await request.json()) as { messages: ChatMessage[] };

  if (!messages || messages.length === 0) {
    return Response.json({ error: "No messages provided" }, { status: 400 });
  }

  try {
    const user = await getCurrentUser();
    const [directoryContext, shortlistContext] = await Promise.all([
      getDirectoryContext(),
      getShortlistContext(user.id),
    ]);

    const conversationHistory = messages
      .slice(0, -1)
      .map(
        (m) => `${m.role === "user" ? "Human" : "Assistant"}: ${m.content}`
      )
      .join("\n\n");
    const latestMessage = messages[messages.length - 1].content;

    let userMessage = "";
    if (conversationHistory) {
      userMessage += `Previous conversation:\n${conversationHistory}\n\n`;
    }
    userMessage += `Human: ${latestMessage}\n\nRespond helpfully using the directory data above. Include action buttons where appropriate. Do not use any tools — all data you need is already provided.`;

    const systemPrompt = `${INSTRUCTIONS}\n\n## ${shortlistContext}\n\n=== DIRECTORY DATA (JSON) ===\n${directoryContext}\n=== END DATA ===`;

    const response = await callClaude({
      systemPrompt,
      userMessage,
    });

    return Response.json({ message: response.content });
  } catch (err) {
    console.error("Chat API error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    if (errorMessage.includes("API key")) {
      return Response.json({ error: errorMessage, needsApiKey: true }, { status: 401 });
    }
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
