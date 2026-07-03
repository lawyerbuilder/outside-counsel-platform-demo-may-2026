import { z } from "zod";
import { callClaude } from "@/server/ai/anthropic";
import {
  getTimesheetEntries,
  getOcpCrossReference,
  updateUploadStatus,
} from "@/server/timesheet";
import { prisma } from "@/server/db";
import { ANTI_INJECTION_RULE } from "@/server/ai/untrusted";
import type { TimesheetAnalysis } from "@/server/timesheet";

export const dynamic = "force-dynamic";

const ANALYSIS_PROMPT = `You are a legal operations analyst for SCG (The Siam Cement Group), a large Thai conglomerate. You are analyzing timesheet narratives from the in-house legal team to extract intelligence about their use of external counsel and work patterns.

Your task: Analyze the timesheet data below and produce a structured JSON response with the following sections:

1. **firmMentions** — External entities mentioned in the narratives. For each:
   - "name": Full entity name (best guess)
   - "shortName": Short name as it appears in the data
   - "mentionCount": How many times it appears
   - "matters": Array of matter names where mentioned
   - "activityTypes": Activity codes where mentioned (e.g. "C02: Third-party communication")
   - "matchedFirmId": null (will be filled by the system)
   - "matchedFirmName": null (will be filled by the system)
   - "entityType": "LAW_FIRM" | "CONSULTING" | "VENDOR" | "OTHER"

2. **matterClassifications** — For each distinct matter:
   - "matterNo": Matter number
   - "name": Clean matter name (extract English description, remove bracketed codes)
   - "practiceArea": Best-guess practice area (M&A, Corporate, Litigation, IP, Employment, Tax, Regulatory, Data Privacy, Technology, General Advisory)
   - "jurisdiction": Country/jurisdiction if identifiable
   - "usesExternalCounsel": true/false based on whether external firms appear in this matter's narratives
   - "externalFirms": Array of short firm names used
   - "complexity": "COMPLEX" | "STANDARD" | "ROUTINE"
   - "totalBillingUnits": Sum of billing units for this matter
   - "dateRange": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }

3. **outsourcePatterns** — High-level patterns about what gets outsourced:
   - "practiceArea": The practice area
   - "outsourceRate": Estimated percentage of work sent to external counsel (0-100)
   - "typicalFirms": Firms typically used
   - "observation": One-sentence insight

4. **keyInsights** — Array of 5-8 bullet-point insights for the legal operations team. Examples:
   - "SyCip and Picazo are the primary external firms for Philippine M&A work"
   - "Technology/AI research matters are handled entirely in-house"
   - "External counsel coordination (C02 activity) accounts for X% of time on matters involving outside firms"

Return ONLY valid JSON, no markdown fences, no explanation.`;

const bodySchema = z.object({ uploadId: z.string().min(1, "uploadId required") });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }
  const { uploadId } = parsed.data;

  try {
    // Mark as processing
    await updateUploadStatus(uploadId, "PROCESSING");

    // Load entries
    const entries = await getTimesheetEntries(uploadId);
    if (entries.length === 0) {
      await updateUploadStatus(uploadId, "FAILED", {
        errorMessage: "No entries found to analyze",
      });
      return Response.json({ error: "No entries to analyze" }, { status: 400 });
    }

    // Load OCP data for cross-referencing
    const ocpData = await getOcpCrossReference();

    // Build the analysis payload — group by matter for more efficient analysis
    const matterGroups = new Map<
      string,
      {
        matterNo: string;
        matterShortName: string;
        entries: Array<{
          activity: string;
          description: string;
          billingUnits: number;
          billingAmount: number;
          dateWorked: string;
          lawyerInitials: string;
        }>;
      }
    >();

    for (const entry of entries) {
      const key = entry.matterNo ?? "UNKNOWN";
      if (!matterGroups.has(key)) {
        matterGroups.set(key, {
          matterNo: key,
          matterShortName: entry.matterShortName ?? "",
          entries: [],
        });
      }
      matterGroups.get(key)!.entries.push({
        activity: entry.activity ?? "",
        description: entry.activityDescription ?? "",
        billingUnits: entry.billingUnits ?? 0,
        billingAmount: entry.billingAmount ?? 0,
        dateWorked: entry.dateWorked?.toISOString().split("T")[0] ?? "",
        lawyerInitials: entry.lawyerInitials ?? "",
      });
    }

    const dataPayload = JSON.stringify(
      {
        totalEntries: entries.length,
        matters: Array.from(matterGroups.values()),
      },
      null,
      0
    );

    // Provide OCP context for cross-referencing
    const ocpContext = `
KNOWN FIRMS IN OCP DATABASE (try to match mentioned firms to these):
${ocpData.firms.map((f) => `- ${f.name} (${f.shortName ?? "—"}, ${f.country}) [ID: ${f.id}]`).join("\n")}

KNOWN PRACTICE AREAS IN OCP:
${ocpData.practiceAreas.map((pa) => `- ${pa.name}`).join("\n")}
`;

    const response = await callClaude({
      systemPrompt: `${ANALYSIS_PROMPT}

${ANTI_INJECTION_RULE}`,
      userMessage: `${ocpContext}\n\n=== TIMESHEET DATA ===\n${dataPayload}`,
      maxTokens: 8192,
      temperature: 0.2,
    });

    // Parse the AI response as JSON
    let analysis: TimesheetAnalysis;
    try {
      // Strip any markdown fences if present
      let jsonStr = response.content.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      const parsed = JSON.parse(jsonStr);

      // Build summary from our data
      const allDates = entries
        .filter((e) => e.dateWorked)
        .map((e) => e.dateWorked!.getTime());
      const totalBillingUnits = entries.reduce(
        (sum, e) => sum + (e.billingUnits ?? 0),
        0
      );
      const totalBillingAmount = entries.reduce(
        (sum, e) => sum + (e.billingAmount ?? 0),
        0
      );
      const lawyers = new Set(entries.map((e) => e.lawyerInitials).filter(Boolean));

      analysis = {
        summary: {
          totalEntries: entries.length,
          totalMatters: matterGroups.size,
          dateRange: {
            from: allDates.length > 0
              ? new Date(Math.min(...allDates)).toISOString().split("T")[0]
              : "",
            to: allDates.length > 0
              ? new Date(Math.max(...allDates)).toISOString().split("T")[0]
              : "",
          },
          totalBillingUnits,
          totalBillingAmount,
          currencyCode: "THB",
          lawyerCount: lawyers.size,
        },
        firmMentions: parsed.firmMentions ?? [],
        matterClassifications: parsed.matterClassifications ?? [],
        outsourcePatterns: parsed.outsourcePatterns ?? [],
        keyInsights: parsed.keyInsights ?? [],
      };

      // Cross-reference firm mentions with OCP firms
      for (const mention of analysis.firmMentions) {
        const matchedFirm = ocpData.firms.find(
          (f) =>
            f.name.toLowerCase().includes(mention.shortName.toLowerCase()) ||
            (f.shortName &&
              f.shortName.toLowerCase().includes(mention.shortName.toLowerCase())) ||
            mention.name.toLowerCase().includes(f.name.toLowerCase()) ||
            mention.name.toLowerCase().includes((f.shortName ?? "").toLowerCase())
        );
        if (matchedFirm) {
          mention.matchedFirmId = matchedFirm.id;
          mention.matchedFirmName = matchedFirm.name;
        }
      }
    } catch {
      await updateUploadStatus(uploadId, "FAILED", {
        errorMessage: "Failed to parse AI analysis response",
      });
      return Response.json(
        { error: "AI response was not valid JSON", raw: response.content.slice(0, 500) },
        { status: 500 }
      );
    }

    // Save analysis
    await updateUploadStatus(uploadId, "ANALYZED", {
      analysisJson: JSON.stringify(analysis),
      processedRows: entries.length,
    });

    return Response.json({
      success: true,
      analysis,
      tokens: {
        input: response.inputTokens,
        output: response.outputTokens,
      },
    });
  } catch (err) {
    console.error("Timesheet analysis error:", err);
    await updateUploadStatus(uploadId, "FAILED", {
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    if (errorMessage.includes("API key")) {
      return Response.json({ error: errorMessage, needsApiKey: true }, { status: 401 });
    }
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
