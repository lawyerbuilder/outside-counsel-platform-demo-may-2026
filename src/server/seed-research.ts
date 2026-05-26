#!/usr/bin/env node
/**
 * Automated directory seed script.
 *
 * Uses Claude to research law firms and lawyers relevant to SCG,
 * then inserts them directly into the database.
 *
 * Run in phases:
 *   npx tsx src/server/seed-research.ts --phase firms
 *   npx tsx src/server/seed-research.ts --phase lawyers
 *   npx tsx src/server/seed-research.ts --phase rankings
 *   npx tsx src/server/seed-research.ts --phase costs
 *   npx tsx src/server/seed-research.ts --phase all
 *
 * Powered by Claude Max (claude CLI child process) — no API key needed.
 */

import { callClaude } from "./ai/anthropic";
import { prisma } from "./db";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function askClaude(prompt: string): Promise<string> {
  console.log("  Calling Claude...");
  const response = await callClaude({
    systemPrompt: "You are a legal market research assistant. Return ONLY valid JSON, no markdown fences, no commentary.",
    userMessage: prompt,
    maxTokens: 8192,
  });
  return response.content;
}

function parseJsonFromResponse(text: string): unknown {
  // Extract JSON from markdown code blocks or raw JSON
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
  return JSON.parse(jsonStr);
}

// ─── Phase 1: Seed Practice Areas & Jurisdictions ────────────────────────

async function seedReferenceData() {
  console.log("\n📚 Seeding reference data (practice areas & jurisdictions)...");

  const existingPAs = await prisma.practiceArea.count();
  if (existingPAs > 0) {
    console.log(`  Already have ${existingPAs} practice areas, skipping.`);
  } else {
    const practiceAreas = [
      { name: "Corporate & M&A", slug: "corporate-ma" },
      { name: "Banking & Finance", slug: "banking-finance" },
      { name: "Capital Markets", slug: "capital-markets" },
      { name: "Competition / Antitrust", slug: "competition-antitrust" },
      { name: "Dispute Resolution", slug: "dispute-resolution" },
      { name: "Intellectual Property", slug: "ip" },
      { name: "Employment & Labour", slug: "employment-labour" },
      { name: "Real Estate & Construction", slug: "real-estate-construction" },
      { name: "Energy & Infrastructure", slug: "energy-infrastructure" },
      { name: "Environment & Regulatory", slug: "environment-regulatory" },
      { name: "Tax", slug: "tax" },
      { name: "Technology & Data Privacy", slug: "tech-data-privacy" },
      { name: "Restructuring & Insolvency", slug: "restructuring-insolvency" },
      { name: "International Arbitration", slug: "international-arbitration" },
      { name: "Project Finance", slug: "project-finance" },
    ];
    for (const pa of practiceAreas) {
      await prisma.practiceArea.create({ data: pa });
    }
    console.log(`  Created ${practiceAreas.length} practice areas.`);
  }

  const existingJurs = await prisma.jurisdiction.count();
  if (existingJurs > 0) {
    console.log(`  Already have ${existingJurs} jurisdictions, skipping.`);
  } else {
    const jurisdictions = [
      // SEA (core markets)
      { name: "Thailand", country: "Thailand", region: "APAC" as const },
      { name: "Vietnam", country: "Vietnam", region: "APAC" as const },
      { name: "Indonesia", country: "Indonesia", region: "APAC" as const },
      { name: "Singapore", country: "Singapore", region: "APAC" as const },
      { name: "Malaysia", country: "Malaysia", region: "APAC" as const },
      { name: "Philippines", country: "Philippines", region: "APAC" as const },
      { name: "Myanmar", country: "Myanmar", region: "APAC" as const },
      { name: "Cambodia", country: "Cambodia", region: "APAC" as const },
      { name: "Laos", country: "Laos", region: "APAC" as const },
      // East Asia
      { name: "Japan", country: "Japan", region: "APAC" as const },
      { name: "China", country: "China", region: "APAC" as const },
      { name: "South Korea", country: "South Korea", region: "APAC" as const },
      { name: "Hong Kong", country: "Hong Kong", region: "APAC" as const },
      { name: "Taiwan", country: "Taiwan", region: "APAC" as const },
      // South Asia & Oceania
      { name: "India", country: "India", region: "APAC" as const },
      { name: "Australia", country: "Australia", region: "APAC" as const },
      // Europe
      { name: "England & Wales", country: "United Kingdom", region: "EMEA" as const },
      { name: "Germany", country: "Germany", region: "EMEA" as const },
      { name: "Netherlands", country: "Netherlands", region: "EMEA" as const },
      { name: "Switzerland", country: "Switzerland", region: "EMEA" as const },
      // Americas
      { name: "United States", country: "United States", region: "AMERICAS" as const },
    ];
    for (const j of jurisdictions) {
      await prisma.jurisdiction.create({ data: j });
    }
    console.log(`  Created ${jurisdictions.length} jurisdictions.`);
  }
}

// ─── Phase 2: Research & Seed Firms ──────────────────────────────────────

async function seedFirms() {
  console.log("\n🏢 Researching law firms...");

  const existingCount = await prisma.firm.count();
  if (existingCount >= 20) {
    console.log(`  Already have ${existingCount} firms. Skipping to avoid duplicates.`);
    console.log("  To re-run, delete existing firms first.");
    return;
  }

  const prompt = `You are helping populate a legal directory for SCG (The Siam Cement Group), a large Thai conglomerate in petrochemicals, cement, packaging, and building materials.

List law firms that SCG's in-house legal team would realistically engage. Return a JSON array of firm objects.

Include these categories:
1. Major international firms with Bangkok offices (8-10 firms)
2. Top Thai full-service firms (8-10 firms)
3. Leading Thai boutique/specialist firms for M&A, competition, IP, employment, energy (5-8 firms)
4. Key Singapore and Hong Kong firms for cross-border work (4-6 firms)

For each firm, provide:
{
  "name": "Full legal name",
  "shortName": "Common abbreviation or null",
  "firmType": "FULL_SERVICE" | "BOUTIQUE" | "MID_SIZE" | "REGIONAL",
  "country": "Country of main office relevant to SCG",
  "city": "City",
  "website": "https://...",
  "headcount": estimated total lawyer headcount (number or null),
  "foundedYear": year (number or null)
}

Return ONLY a JSON array, no markdown, no commentary. Target 30-40 firms total.`;

  const response = await askClaude(prompt);
  const firms = parseJsonFromResponse(response) as Array<{
    name: string;
    shortName?: string | null;
    firmType: string;
    country: string;
    city: string;
    website?: string | null;
    headcount?: number | null;
    foundedYear?: number | null;
  }>;

  console.log(`  Claude returned ${firms.length} firms. Inserting...`);

  let created = 0;
  for (const f of firms) {
    // Check for duplicates by name
    const existing = await prisma.firm.findFirst({
      where: {
        OR: [
          { name: { contains: f.name } },
          ...(f.shortName ? [{ shortName: { contains: f.shortName } }] : []),
        ],
      },
    });

    if (existing) {
      console.log(`  ⏭ Skipped (exists): ${f.name}`);
      continue;
    }

    const validTypes = ["FULL_SERVICE", "BOUTIQUE", "MID_SIZE", "REGIONAL"];
    await prisma.firm.create({
      data: {
        name: f.name,
        shortName: f.shortName ?? null,
        firmType: validTypes.includes(f.firmType) ? f.firmType as "FULL_SERVICE" | "BOUTIQUE" | "MID_SIZE" | "REGIONAL" : "FULL_SERVICE",
        country: f.country,
        city: f.city,
        website: f.website ?? null,
        headcount: f.headcount ?? null,
        foundedYear: f.foundedYear ?? null,
        isActive: true,
      },
    });
    console.log(`  ✅ Created: ${f.name}`);
    created++;
  }

  console.log(`  Done. Created ${created} new firms.`);
}

// ─── Phase 3: Research & Seed Lawyers ────────────────────────────────────

async function seedLawyers() {
  console.log("\n👤 Researching lawyers...");

  const firms = await prisma.firm.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, name: true, shortName: true },
    orderBy: { name: "asc" },
  });

  if (firms.length === 0) {
    console.log("  No firms found. Run --phase firms first.");
    return;
  }

  // Process in batches of 5 firms
  const batchSize = 5;
  for (let i = 0; i < firms.length; i += batchSize) {
    const batch = firms.slice(i, i + batchSize);
    const batchNames = batch.map((f) => f.shortName ?? f.name);
    console.log(`\n  Batch ${Math.floor(i / batchSize) + 1}: ${batchNames.join(", ")}`);

    // Check if any lawyers already exist for these firms
    const existingLawyerCount = await prisma.firmLawyer.count({
      where: { firmId: { in: batch.map((f) => f.id) } },
    });
    if (existingLawyerCount > 0) {
      console.log(`  ⏭ Skipped batch (${existingLawyerCount} lawyers already exist for these firms)`);
      continue;
    }

    const firmList = batch.map((f) => `- ${f.name}`).join("\n");

    const prompt = `List key partners and senior lawyers at these firms who handle work relevant to a large Thai industrial conglomerate (petrochemicals, cement, building materials, packaging).

Firms:
${firmList}

For each lawyer provide:
{
  "firmName": "exact firm name from above",
  "name": "Full name",
  "title": "Partner" or "Senior Associate" etc,
  "role": "PARTNER" | "OF_COUNSEL" | "ASSOCIATE" | "COUNSEL",
  "practiceAreas": ["Corporate & M&A", "Banking & Finance"],
  "qualificationYear": year (number or null),
  "email": "publicly listed email or null",
  "linkedInUrl": "LinkedIn URL or null"
}

Rules:
- 3-6 lawyers per firm
- Only use publicly available info from firm websites and LinkedIn
- Focus on lawyers based in Bangkok, Singapore, or Hong Kong offices
- Practice areas must be from: Corporate & M&A, Banking & Finance, Capital Markets, Competition / Antitrust, Dispute Resolution, Intellectual Property, Employment & Labour, Real Estate & Construction, Energy & Infrastructure, Environment & Regulatory, Tax, Technology & Data Privacy, Restructuring & Insolvency, International Arbitration, Project Finance

Return ONLY a JSON array, no markdown, no commentary.`;

    const response = await askClaude(prompt);
    let lawyers: Array<{
      firmName: string;
      name: string;
      title?: string | null;
      role: string;
      practiceAreas?: string[];
      qualificationYear?: number | null;
      email?: string | null;
      linkedInUrl?: string | null;
    }>;

    try {
      lawyers = parseJsonFromResponse(response) as typeof lawyers;
    } catch (err) {
      console.log(`  ⚠ Failed to parse response for batch, skipping.`);
      continue;
    }

    console.log(`  Claude returned ${lawyers.length} lawyers. Inserting...`);

    for (const l of lawyers) {
      // Match firm
      const firm = batch.find(
        (f) =>
          f.name.toLowerCase().includes(l.firmName.toLowerCase()) ||
          l.firmName.toLowerCase().includes(f.name.toLowerCase()) ||
          (f.shortName && l.firmName.toLowerCase().includes(f.shortName.toLowerCase()))
      );

      if (!firm) {
        console.log(`  ⚠ Could not match firm "${l.firmName}", skipping ${l.name}`);
        continue;
      }

      // Check for duplicate lawyer
      const existing = await prisma.lawyer.findFirst({
        where: { name: { contains: l.name } },
      });
      if (existing) {
        console.log(`  ⏭ Skipped (exists): ${l.name}`);
        continue;
      }

      const validRoles = ["PARTNER", "OF_COUNSEL", "ASSOCIATE", "COUNSEL", "OTHER"];
      const role = validRoles.includes(l.role) ? l.role : "PARTNER";

      // Create lawyer
      const lawyer = await prisma.lawyer.create({
        data: {
          name: l.name,
          title: l.title ?? null,
          email: l.email ?? null,
          linkedInUrl: l.linkedInUrl ?? null,
          qualificationYear: l.qualificationYear ?? null,
          isActive: true,
        },
      });

      // Link to firm
      await prisma.firmLawyer.create({
        data: {
          firmId: firm.id,
          lawyerId: lawyer.id,
          role: role as "PARTNER" | "OF_COUNSEL" | "ASSOCIATE" | "COUNSEL" | "OTHER",
          isCurrent: true,
        },
      });

      // Link practice areas
      if (l.practiceAreas) {
        for (const paName of l.practiceAreas) {
          const pa = await prisma.practiceArea.findFirst({
            where: { name: { contains: paName } },
          });
          if (pa) {
            const thailand = await prisma.jurisdiction.findFirst({
              where: { name: "Thailand" },
            });
            await prisma.lawyerPracticeArea.create({
              data: {
                lawyerId: lawyer.id,
                practiceAreaId: pa.id,
                jurisdictionId: thailand?.id,
              },
            }).catch(() => { /* ignore duplicate */ });
          }
        }
      }

      console.log(`  ✅ ${l.name} → ${firm.shortName ?? firm.name} (${role})`);
    }

    // Small delay between batches to avoid rate limits
    if (i + batchSize < firms.length) {
      console.log("  Waiting 2s before next batch...");
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  const totalLawyers = await prisma.lawyer.count();
  console.log(`\n  Done. Total lawyers in directory: ${totalLawyers}`);
}

// ─── Phase 4: Research Rankings ──────────────────────────────────────────

async function seedRankings() {
  console.log("\n🏆 Researching rankings...");

  const firms = await prisma.firm.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, name: true, shortName: true },
  });

  const existingRankings = await prisma.firmRanking.count();
  if (existingRankings > 10) {
    console.log(`  Already have ${existingRankings} rankings. Skipping.`);
    return;
  }

  // Process in batches
  const batchSize = 8;
  for (let i = 0; i < firms.length; i += batchSize) {
    const batch = firms.slice(i, i + batchSize);
    console.log(`\n  Batch ${Math.floor(i / batchSize) + 1}: ${batch.map((f) => f.shortName ?? f.name).join(", ")}`);

    const firmList = batch.map((f) => `- ${f.name}`).join("\n");

    const prompt = `Based on publicly available information (firm press releases, legal media), provide rankings data for these firms from Chambers Asia-Pacific, Legal 500 Asia Pacific, and AsiaLaw Profiles.

Firms:
${firmList}

Return a JSON array where each entry is:
{
  "firmName": "firm name",
  "publisher": "CHAMBERS" | "LEGAL500" | "ASIALAW",
  "editionYear": 2025,
  "practiceArea": "e.g. Corporate & M&A",
  "jurisdiction": "Thailand",
  "band": 1-6 (Chambers only, null otherwise),
  "tier": 1-5 (Legal 500 only, null otherwise)
}

Only include rankings you have reasonable confidence about.
Practice areas must match: Corporate & M&A, Banking & Finance, Capital Markets, Competition / Antitrust, Dispute Resolution, Intellectual Property, Employment & Labour, Real Estate & Construction, Energy & Infrastructure, Tax, Restructuring & Insolvency.

Return ONLY a JSON array.`;

    const response = await askClaude(prompt);
    let rankings: Array<{
      firmName: string;
      publisher: string;
      editionYear: number;
      practiceArea: string;
      jurisdiction: string;
      band?: number | null;
      tier?: number | null;
    }>;

    try {
      rankings = parseJsonFromResponse(response) as typeof rankings;
    } catch {
      console.log(`  ⚠ Failed to parse rankings batch, skipping.`);
      continue;
    }

    console.log(`  Claude returned ${rankings.length} rankings. Inserting...`);

    for (const r of rankings) {
      const firm = batch.find(
        (f) =>
          f.name.toLowerCase().includes(r.firmName.toLowerCase()) ||
          r.firmName.toLowerCase().includes(f.name.toLowerCase()) ||
          (f.shortName && r.firmName.toLowerCase().includes(f.shortName.toLowerCase()))
      );
      if (!firm) continue;

      const pa = await prisma.practiceArea.findFirst({
        where: { name: { contains: r.practiceArea } },
      });
      if (!pa) continue;

      const jur = await prisma.jurisdiction.findFirst({
        where: { name: { contains: r.jurisdiction } },
      });
      if (!jur) continue;

      // Find or create ranking source
      const validPublishers = ["CHAMBERS", "LEGAL500", "BENCHMARK_LITIGATION", "ASIALAW"];
      if (!validPublishers.includes(r.publisher)) continue;

      let source = await prisma.rankingSource.findFirst({
        where: {
          publisher: r.publisher as "CHAMBERS" | "LEGAL500" | "BENCHMARK_LITIGATION" | "ASIALAW",
          editionYear: r.editionYear,
        },
      });
      if (!source) {
        source = await prisma.rankingSource.create({
          data: {
            name: `${r.publisher} ${r.editionYear}`,
            slug: `${r.publisher.toLowerCase()}-${r.editionYear}`,
            publisher: r.publisher as "CHAMBERS" | "LEGAL500" | "BENCHMARK_LITIGATION" | "ASIALAW",
            editionYear: r.editionYear,
          },
        });
      }

      try {
        await prisma.firmRanking.create({
          data: {
            firmId: firm.id,
            rankingSourceId: source.id,
            practiceAreaId: pa.id,
            jurisdictionId: jur.id,
            band: r.band ?? null,
            tier: r.tier ?? null,
          },
        });
        console.log(`  ✅ ${firm.shortName ?? firm.name}: ${r.publisher} ${r.practiceArea} Band ${r.band ?? ""}Tier ${r.tier ?? ""}`);
      } catch {
        // Duplicate, skip
      }
    }

    if (i + batchSize < firms.length) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

// ─── Phase 5: Cost Benchmarks ────────────────────────────────────────────

async function seedCosts() {
  console.log("\n💰 Researching cost benchmarks...");

  const existingCosts = await prisma.costBenchmark.count();
  if (existingCosts > 10) {
    console.log(`  Already have ${existingCosts} benchmarks. Skipping.`);
    return;
  }

  const firms = await prisma.firm.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, name: true, shortName: true, firmType: true },
  });

  const prompt = `Estimate typical hourly rates (in USD) for law firms in the Thailand legal market, broken down by firm tier and lawyer role.

Provide market-level estimates for a large corporate client. Return a JSON array:

{
  "firmType": "FULL_SERVICE" | "BOUTIQUE" | "MID_SIZE",
  "category": "International" | "Top Thai" | "Mid Thai" | "Boutique",
  "role": "PARTNER" | "OF_COUNSEL" | "ASSOCIATE" | "PARALEGAL",
  "hourlyRateUsd": number (in whole dollars, e.g. 450),
  "practiceArea": "Corporate & M&A" (or "General" for non-specific),
  "jurisdiction": "Thailand"
}

Include rates for:
1. International firms Bangkok offices (Baker McKenzie, Linklaters, etc.) — partners typically $500-900
2. Top Thai firms (Tilleke & Gibbins, Weerawong, etc.) — partners typically $300-550
3. Mid-size Thai firms — partners typically $200-350
4. Boutique specialists — partners typically $250-500

For each tier, include PARTNER, ASSOCIATE, and PARALEGAL rates.
Return ONLY a JSON array.`;

  const response = await askClaude(prompt);
  let benchmarks: Array<{
    firmType: string;
    category: string;
    role: string;
    hourlyRateUsd: number;
    practiceArea: string;
    jurisdiction: string;
  }>;

  try {
    benchmarks = parseJsonFromResponse(response) as typeof benchmarks;
  } catch {
    console.log("  ⚠ Failed to parse cost data.");
    return;
  }

  console.log(`  Claude returned ${benchmarks.length} benchmarks. Distributing across firms...`);

  // Get the default user for createdById
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("  ⚠ No users found. Create a user first.");
    return;
  }

  const thailand = await prisma.jurisdiction.findFirst({ where: { name: "Thailand" } });
  const generalPa = await prisma.practiceArea.findFirst({ where: { slug: "corporate-ma" } });

  if (!thailand || !generalPa) {
    console.log("  ⚠ Missing reference data. Run --phase firms first.");
    return;
  }

  const validRoles = ["PARTNER", "OF_COUNSEL", "ASSOCIATE", "PARALEGAL"];

  for (const b of benchmarks) {
    if (!validRoles.includes(b.role)) continue;

    // Match to actual firms by type
    const matchingFirms = firms.filter((f) => {
      if (b.category === "International") return f.firmType === "FULL_SERVICE" && f.name.match(/Baker|Allen|Linklaters|Clifford|Freshfields|White|Herbert|Latham|Norton/i);
      if (b.category === "Top Thai") return f.firmType === "FULL_SERVICE" && !f.name.match(/Baker|Allen|Linklaters|Clifford|Freshfields|White|Herbert|Latham|Norton/i);
      if (b.category === "Boutique") return f.firmType === "BOUTIQUE";
      if (b.category === "Mid Thai") return f.firmType === "MID_SIZE" || f.firmType === "REGIONAL";
      return false;
    });

    const pa = await prisma.practiceArea.findFirst({
      where: { name: { contains: b.practiceArea === "General" ? "Corporate" : b.practiceArea } },
    });

    for (const firm of matchingFirms.slice(0, 3)) {
      try {
        await prisma.costBenchmark.create({
          data: {
            firmId: firm.id,
            role: b.role as "PARTNER" | "OF_COUNSEL" | "ASSOCIATE" | "PARALEGAL",
            practiceAreaId: pa?.id ?? generalPa.id,
            jurisdictionId: thailand.id,
            hourlyRateUsd: b.hourlyRateUsd * 100, // Convert to cents
            year: 2025,
            source: "MARKET",
            createdById: user.id,
          },
        });
      } catch {
        // Skip duplicates
      }
    }
  }

  const totalCosts = await prisma.costBenchmark.count();
  console.log(`  Done. Total cost benchmarks: ${totalCosts}`);
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  const phase = process.argv.find((a) => a.startsWith("--phase"))
    ? process.argv[process.argv.indexOf("--phase") + 1]
    : "all";

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   Outside Counsel Directory — Seed Research      ║");
  console.log(`║   Phase: ${phase.padEnd(40)}║`);
  console.log("╚══════════════════════════════════════════════════╝");

  try {
    // Always ensure reference data exists
    await seedReferenceData();

    if (phase === "firms" || phase === "all") {
      await seedFirms();
    }
    if (phase === "lawyers" || phase === "all") {
      await seedLawyers();
    }
    if (phase === "rankings" || phase === "all") {
      await seedRankings();
    }
    if (phase === "costs" || phase === "all") {
      await seedCosts();
    }

    // Print summary
    console.log("\n═══════════════════════════════════════════════════");
    console.log("  DIRECTORY SUMMARY");
    console.log("═══════════════════════════════════════════════════");
    const counts = await Promise.all([
      prisma.firm.count({ where: { isActive: true } }),
      prisma.lawyer.count({ where: { isActive: true } }),
      prisma.firmRanking.count(),
      prisma.costBenchmark.count(),
      prisma.practiceArea.count(),
      prisma.jurisdiction.count(),
    ]);
    console.log(`  Firms:           ${counts[0]}`);
    console.log(`  Lawyers:         ${counts[1]}`);
    console.log(`  Rankings:        ${counts[2]}`);
    console.log(`  Cost Benchmarks: ${counts[3]}`);
    console.log(`  Practice Areas:  ${counts[4]}`);
    console.log(`  Jurisdictions:   ${counts[5]}`);
    console.log("═══════════════════════════════════════════════════\n");
  } catch (err) {
    console.error("\n❌ Error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
