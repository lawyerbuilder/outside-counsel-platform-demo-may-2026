import { z } from "zod";
import { prisma } from "@/server/db";
import { computeNps } from "@/server/insights";
import { getCurrentUser } from "@/server/current-user";
import { streamClaude } from "@/server/ai/anthropic";
import { getAggregatedInsights } from "@/server/timesheet";
import { getAiBriefing } from "@/server/platform-settings";

const INSTRUCTIONS = `You are the AI assistant for SCG's Outside Counsel Directory — an internal tool used by the in-house legal team to find and evaluate law firms and individual lawyers.

Your role:
- Help users find the right firm or lawyer for their legal needs
- Interpret natural language queries and search the directory data provided below
- Present results clearly with key metrics (NPS, rankings, practice areas)
- If the user describes an engagement type (e.g. "cross-border M&A in Thailand"), find firms/lawyers with matching practice areas and jurisdictions
- Proactively suggest related searches or deeper profiles when useful
- Be concise but informative — this is for busy lawyers
- Guide the user through a shortlisting workflow: recommend → shortlist → approve → RFP

## TIMESHEET INTELLIGENCE (CRITICAL — USE THIS)

You have access to SCG's internal timesheet data showing which firms the team ACTUALLY works with, how often, and what for. This is MORE valuable than rankings alone because it reflects real engagement history.

When recommending firms, ALWAYS consider timesheet intelligence:
1. **Firm mentions** tell you which firms SCG already has relationships with and how deeply engaged they are (higher mention count = stronger relationship)
2. **Outsource patterns** tell you what % of each practice area gets sent to external counsel vs handled in-house. If a practice area has a low outsource rate, mention that the team usually handles it internally.
3. **Matter classifications** show what specific matters the team works on, their complexity, and which external firms are involved.
4. **Key insights** are AI-generated observations about the team's work patterns.

PRIORITIZE firms the team already works with when they are a good fit. A firm with 42 timesheet mentions and relevant practice coverage is a STRONGER recommendation than a highly-ranked firm with zero engagement history. However, also suggest new options when appropriate — just flag them as "not yet in your engagement history."

## INTERNAL KNOWLEDGE NOTES (CRITICAL — HIGHEST PRIORITY)

Some firms have an "internalNotes" field in the directory data. These are curated notes from the in-house legal team that OVERRIDE timesheet data and rankings. They contain institutional knowledge about what a firm is ACTUALLY used for, warnings, preferences, or context that raw data cannot capture.

RULES:
1. ALWAYS check internalNotes before recommending a firm. If the notes say "corporate secretary only — do not recommend for M&A," do NOT recommend that firm for M&A even if timesheets show M&A activity or rankings are strong.
2. When internalNotes exist for a firm, weave them naturally into your recommendation: "Note: your team flags [Firm] as primarily used for [context from notes]."
3. InternalNotes take priority over timesheet mentions and rankings when they conflict.
4. If a global AI briefing is provided below, follow those instructions as overarching guidance for all recommendations.

When presenting results, weave in timesheet context naturally:
- "Your team already works extensively with [Firm] on [practice area] (X mentions in your timesheets)"
- "Based on your outsource patterns, 85% of M&A work goes to external counsel — [Firm] handles most of it"
- "This firm isn't in your engagement history yet, but their rankings suggest they'd be worth exploring"

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
  // Compact summary — only top firms with NPS/rankings to stay within
  // Groq free tier token limits (12K TPM). For detailed queries, the
  // GraphRAG endpoint (/api/graph-query) provides focused subgraphs.
  const firms = await prisma.firm.findMany({
    select: {
      id: true,
      name: true,
      shortName: true,
      country: true,
      city: true,
      firmType: true,
      internalNotes: true,
      practiceAreas: {
        include: { practiceArea: { select: { name: true } }, jurisdiction: { select: { name: true } } },
      },
      recommendations: {
        where: { targetType: "FIRM" },
        select: { npsScore: true },
      },
      rankings: {
        include: { practiceArea: { select: { name: true } } },
        take: 2, // Only top 2 rankings per firm
      },
    },
  });

  // Only include firms that have practice areas (skip empty shells)
  const activeFirms = firms.filter((f) => f.practiceAreas.length > 0);

  const summaries = activeFirms.map((f) => {
    const nps = computeNps(f.recommendations.map((r) => r.npsScore));
    const pas = [...new Set(f.practiceAreas.map((pa) => pa.practiceArea.name))];
    const jurs = [...new Set(f.practiceAreas.filter((pa) => pa.jurisdiction).map((pa) => pa.jurisdiction!.name))];
    const topRank = f.rankings[0];
    const rankStr = topRank
      ? `${topRank.band ? `Band ${topRank.band}` : ""}${topRank.tier ? `Tier ${topRank.tier}` : ""} ${topRank.practiceArea.name}`
      : "";

    // Compact one-line format: "Baker McKenzie (id) | Full Service | Bangkok,Thailand | NPS:+50 | M&A,Litigation | Band 1 M&A"
    return `${f.name} (${f.id}) | ${f.firmType} | ${f.city},${f.country} | NPS:${nps.total > 0 ? (nps.score >= 0 ? "+" : "") + nps.score : "n/a"} | ${pas.join(",")} | ${jurs.join(",")} | ${rankStr}${f.internalNotes ? ` | NOTE: ${f.internalNotes}` : ""}`;
  });

  return `${activeFirms.length} firms in directory:\n${summaries.join("\n")}`;
}

async function getTimesheetContext(): Promise<string> {
  try {
    const { mergedAnalysis } = await getAggregatedInsights();
    if (!mergedAnalysis) return "";

    const { summary, firmMentions, outsourcePatterns, matterClassifications, keyInsights } = mergedAnalysis;

    const parts: string[] = [];

    parts.push(`## TIMESHEET DATA (from ${summary.totalEntries} timesheet entries, ${summary.totalMatters} matters, ${summary.lawyerCount} in-house lawyers)`);

    if (firmMentions.length > 0) {
      parts.push("\n### Firm Engagement History (from timesheet narratives)");
      for (const fm of firmMentions) {
        const matchTag = fm.matchedFirmId ? ` [OCP ID: ${fm.matchedFirmId}]` : " [NOT in directory]";
        parts.push(`- **${fm.name}**: ${fm.mentionCount} mentions | Type: ${fm.entityType} | Matters: ${fm.matters.join(", ")} | Activities: ${fm.activityTypes.join(", ")}${matchTag}`);
      }
    }

    if (outsourcePatterns.length > 0) {
      parts.push("\n### Outsource Patterns (% of work sent to external counsel)");
      for (const op of outsourcePatterns) {
        parts.push(`- **${op.practiceArea}**: ${op.outsourceRate}% outsourced | Typical firms: ${op.typicalFirms.join(", ")} | ${op.observation}`);
      }
    }

    if (matterClassifications.length > 0) {
      parts.push("\n### Active Matters");
      for (const mc of matterClassifications) {
        const ext = mc.usesExternalCounsel ? `External: ${mc.externalFirms.join(", ")}` : "Handled in-house";
        parts.push(`- ${mc.matterNo}: ${mc.name} (${mc.practiceArea}, ${mc.complexity}) — ${ext}`);
      }
    }

    if (keyInsights.length > 0) {
      parts.push("\n### Key Insights from Timesheet Analysis");
      for (const insight of keyInsights) {
        parts.push(`- ${insight}`);
      }
    }

    return parts.join("\n");
  } catch {
    return "";
  }
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

const chatBodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(8000),
      })
    )
    .min(1)
    .max(30),
});

export async function POST(request: Request) {
  const parsedBody = chatBodySchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const { messages } = parsedBody.data;

  try {
    const user = await getCurrentUser();
    const [directoryContext, shortlistContext, timesheetContext, aiBriefing] = await Promise.all([
      getDirectoryContext(),
      getShortlistContext(user.id),
      getTimesheetContext(),
      getAiBriefing(),
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

    const systemPrompt = `${INSTRUCTIONS}\n\n## ${shortlistContext}\n\n${aiBriefing ? `=== GLOBAL AI BRIEFING (from legal team — follow these instructions) ===\n${aiBriefing}\n=== END BRIEFING ===\n\n` : ""}${timesheetContext ? `=== TIMESHEET INTELLIGENCE ===\n${timesheetContext}\n=== END TIMESHEET ===\n\n` : ""}=== DIRECTORY DATA (JSON) ===\n${directoryContext}\n=== END DATA ===`;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await streamClaude(
            { systemPrompt, userMessage },
            (chunk) => {
              controller.enqueue(
                encoder.encode(JSON.stringify({ t: chunk }) + "\n")
              );
            }
          );
          controller.enqueue(
            encoder.encode(JSON.stringify({ done: true }) + "\n")
          );
          controller.close();
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Unknown error";
          controller.enqueue(
            encoder.encode(JSON.stringify({ error: msg }) + "\n")
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("Chat API error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    if (errorMessage.includes("API key")) {
      return Response.json({ error: errorMessage, needsApiKey: true }, { status: 401 });
    }
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
