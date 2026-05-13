/**
 * Weekly AI Research Cron Job
 *
 * Runs every Sunday at 6 AM to research directory updates:
 * - Ranking changes (Chambers, Legal 500, Benchmark, AsiaLaw)
 * - Lawyer movements between firms
 * - New boutique firm spin-offs
 * - Significant firm news
 *
 * All findings are queued as ResearchUpdate records with PENDING status
 * for admin review — nothing is auto-applied.
 *
 * Usage:
 *   npx tsx src/server/research-cron.ts          # Run once manually
 *   Schedule via OS cron or cloud scheduler      # Weekly automation
 *
 * Requires: ANTHROPIC_API_KEY in .env
 */

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./db";

const RESEARCH_SYSTEM_PROMPT = `You are a legal market research analyst for SCG's in-house legal team in Thailand. Your job is to research updates about law firms and lawyers that SCG works with in the Asia-Pacific region.

You will be given a list of firms and lawyers currently in the directory. For each, research and report any recent developments:

1. **Ranking updates**: New Chambers, Legal 500, Benchmark Litigation, or AsiaLaw rankings. Report the publisher, year, practice area, and band/tier.
2. **Lawyer movements**: Partners or senior lawyers who have moved between firms, especially those joining or leaving boutique firms.
3. **New firms**: Boutique spin-offs or new firms established by lawyers from firms in our directory.
4. **Significant news**: Major deals, cases, or awards involving these firms/lawyers.

For each finding, provide:
- A concise title (under 100 chars)
- A description (2-3 sentences)
- The type: RANKING_UPDATE, LAWYER_MOVE, NEW_FIRM, NEW_LAWYER, COST_UPDATE, FIRM_NEWS, or GENERAL
- Which firm/lawyer it relates to (by name)
- Your confidence level (0.0 to 1.0) based on source reliability
- The source URL if available

IMPORTANT: Only report things you are confident about. Do not fabricate or speculate. If you're unsure, set confidence below 0.3. The legal team will review everything before it's applied.

Respond with a JSON array of findings. If there are no new developments, return an empty array [].`;

type ResearchFinding = {
  title: string;
  description: string;
  type: string;
  firmName?: string;
  lawyerName?: string;
  confidence: number;
  source?: string;
  rawData?: Record<string, unknown>;
};

async function runResearch(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not set. Skipping research run.");
    return;
  }

  console.log(`[${new Date().toISOString()}] Starting weekly research...`);

  // Get current directory state
  const firms = await prisma.firm.findMany({
    where: { isActive: true, deletedAt: null },
    select: {
      id: true,
      name: true,
      shortName: true,
      country: true,
      city: true,
      firmType: true,
    },
    orderBy: { name: "asc" },
  });

  const lawyers = await prisma.lawyer.findMany({
    where: { isActive: true, deletedAt: null },
    select: {
      id: true,
      name: true,
      title: true,
      firmLawyers: {
        where: { isCurrent: true },
        select: { firm: { select: { name: true } }, role: true },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  const directoryContext = `## Current Directory

### Firms (${firms.length})
${firms.map((f) => `- ${f.name} (${f.firmType}, ${f.city}, ${f.country})`).join("\n")}

### Lawyers (${lawyers.length})
${lawyers
  .map((l) => {
    const current = l.firmLawyers[0];
    return `- ${l.name}${l.title ? ` (${l.title})` : ""}${current ? ` at ${current.firm.name}` : ""}`;
  })
  .join("\n")}

Research any updates from the past week for these firms and lawyers. Focus on the Asia-Pacific legal market.`;

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: RESEARCH_SYSTEM_PROMPT,
      messages: [{ role: "user", content: directoryContext }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      console.log("No text response from AI. Skipping.");
      return;
    }

    // Parse findings
    let findings: ResearchFinding[] = [];
    try {
      // Extract JSON from response (might be wrapped in markdown code block)
      const text = textBlock.text;
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        findings = JSON.parse(jsonMatch[0]) as ResearchFinding[];
      }
    } catch (parseErr) {
      console.error("Failed to parse AI response:", parseErr);
      return;
    }

    if (findings.length === 0) {
      console.log("No new findings. Directory is up to date.");
      return;
    }

    // Generate batch ID for this run
    const batchId = `batch_${Date.now()}`;
    console.log(`Found ${findings.length} updates. Batch: ${batchId}`);

    // Match findings to firms/lawyers and create ResearchUpdate records
    for (const finding of findings) {
      let firmId: string | null = null;
      let lawyerId: string | null = null;
      let targetType: "FIRM" | "LAWYER" | null = null;

      if (finding.firmName) {
        const matchedFirm = firms.find(
          (f) =>
            f.name.toLowerCase().includes(finding.firmName!.toLowerCase()) ||
            (f.shortName &&
              f.shortName
                .toLowerCase()
                .includes(finding.firmName!.toLowerCase()))
        );
        if (matchedFirm) {
          firmId = matchedFirm.id;
          targetType = "FIRM";
        }
      }

      if (finding.lawyerName) {
        const matchedLawyer = lawyers.find((l) =>
          l.name.toLowerCase().includes(finding.lawyerName!.toLowerCase())
        );
        if (matchedLawyer) {
          lawyerId = matchedLawyer.id;
          targetType = "LAWYER";
        }
      }

      const validTypes = [
        "RANKING_UPDATE",
        "FIRM_NEWS",
        "LAWYER_MOVE",
        "NEW_FIRM",
        "NEW_LAWYER",
        "COST_UPDATE",
        "GENERAL",
      ];
      const updateType = validTypes.includes(finding.type)
        ? finding.type
        : "GENERAL";

      await prisma.researchUpdate.create({
        data: {
          type: updateType as Parameters<typeof prisma.researchUpdate.create>[0]["data"]["type"],
          title: finding.title.slice(0, 200),
          description: finding.description,
          rawData: finding.rawData ? JSON.stringify(finding.rawData) : null,
          targetType: targetType,
          firmId,
          lawyerId,
          source: finding.source || null,
          confidence: Math.max(0, Math.min(1, finding.confidence)),
          batchId,
        },
      });

      console.log(
        `  ✓ ${updateType}: ${finding.title} (confidence: ${finding.confidence})`
      );
    }

    console.log(
      `[${new Date().toISOString()}] Research complete. ${findings.length} updates queued for review.`
    );
  } catch (err) {
    console.error("Research cron failed:", err);
  }
}

// Run if called directly
runResearch()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
