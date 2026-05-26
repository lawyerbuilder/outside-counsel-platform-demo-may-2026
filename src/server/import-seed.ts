#!/usr/bin/env node
/**
 * Import seed data from JSON files into the database.
 *
 * Usage:
 *   1. Paste Claude's output into data/seed-firms.json, data/seed-lawyers.json, etc.
 *   2. Run: npx tsx src/server/import-seed.ts
 *
 * This does NOT require an API key — you research using claude.ai (Max),
 * save the JSON output to files, then this script imports it.
 */

import { prisma } from "./db";
import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data");

function loadJson<T>(filename: string): T | null {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`  ⏭ ${filename} not found, skipping.`);
    return null;
  }
  const text = fs.readFileSync(filePath, "utf-8");
  // Handle markdown code blocks in case user pasted raw Claude output
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
  return JSON.parse(jsonStr) as T;
}

// ─── Reference Data ─────────────────────────────────────────────────────

async function seedReferenceData() {
  console.log("\n📚 Reference data...");

  const existingPAs = await prisma.practiceArea.count();
  if (existingPAs > 0) {
    console.log(`  Already have ${existingPAs} practice areas.`);
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
    console.log(`  ✅ Created ${practiceAreas.length} practice areas.`);
  }

  const existingJurs = await prisma.jurisdiction.count();
  if (existingJurs > 0) {
    console.log(`  Already have ${existingJurs} jurisdictions.`);
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
    console.log(`  ✅ Created ${jurisdictions.length} jurisdictions.`);
  }
}

// ─── Import Firms ───────────────────────────────────────────────────────

async function importFirms() {
  console.log("\n🏢 Importing firms...");

  type FirmData = {
    name: string;
    shortName?: string | null;
    firmType: string;
    country: string;
    city: string;
    website?: string | null;
    headcount?: number | null;
    foundedYear?: number | null;
  };

  const firms = loadJson<FirmData[]>("seed-firms.json");
  if (!firms) return;

  let created = 0;
  let skipped = 0;

  for (const f of firms) {
    const existing = await prisma.firm.findFirst({
      where: {
        OR: [
          { name: f.name },
          ...(f.shortName ? [{ shortName: f.shortName }] : []),
        ],
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const validTypes = ["FULL_SERVICE", "BOUTIQUE", "MID_SIZE", "REGIONAL"];
    await prisma.firm.create({
      data: {
        name: f.name,
        shortName: f.shortName ?? null,
        firmType: validTypes.includes(f.firmType)
          ? (f.firmType as "FULL_SERVICE" | "BOUTIQUE" | "MID_SIZE" | "REGIONAL")
          : "FULL_SERVICE",
        country: f.country,
        city: f.city,
        website: f.website ?? null,
        headcount: f.headcount ?? null,
        foundedYear: f.foundedYear ?? null,
        isActive: true,
      },
    });
    created++;
  }

  console.log(`  ✅ Created ${created}, skipped ${skipped} duplicates.`);
}

// ─── Import Lawyers ─────────────────────────────────────────────────────

async function importLawyers() {
  console.log("\n👤 Importing lawyers...");

  type LawyerData = {
    firmName: string;
    name: string;
    title?: string | null;
    role: string;
    practiceAreas?: string[];
    qualificationYear?: number | null;
    email?: string | null;
    linkedInUrl?: string | null;
  };

  const lawyers = loadJson<LawyerData[]>("seed-lawyers.json");
  if (!lawyers) return;

  let created = 0;
  let skipped = 0;
  let firmNotFound = 0;

  for (const l of lawyers) {
    // Match firm
    const firm = await prisma.firm.findFirst({
      where: {
        OR: [
          { name: { contains: l.firmName } },
          { shortName: { contains: l.firmName } },
        ],
        deletedAt: null,
      },
    });

    if (!firm) {
      console.log(`  ⚠ Firm not found: "${l.firmName}" (lawyer: ${l.name})`);
      firmNotFound++;
      continue;
    }

    // Check duplicate
    const existing = await prisma.lawyer.findFirst({
      where: { name: l.name },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const validRoles = ["PARTNER", "OF_COUNSEL", "ASSOCIATE", "COUNSEL", "OTHER"];
    const role = validRoles.includes(l.role) ? l.role : "PARTNER";

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
      const thailand = await prisma.jurisdiction.findFirst({
        where: { name: "Thailand" },
      });
      for (const paName of l.practiceAreas) {
        const pa = await prisma.practiceArea.findFirst({
          where: { name: { contains: paName.split("/")[0].trim() } },
        });
        if (pa) {
          await prisma.lawyerPracticeArea.create({
            data: {
              lawyerId: lawyer.id,
              practiceAreaId: pa.id,
              jurisdictionId: thailand?.id,
            },
          }).catch(() => {});
        }
      }
    }

    created++;
  }

  console.log(`  ✅ Created ${created}, skipped ${skipped} duplicates, ${firmNotFound} firm mismatches.`);
}

// ─── Import Rankings ────────────────────────────────────────────────────

async function importRankings() {
  console.log("\n🏆 Importing rankings...");

  type RankingData = {
    firmName: string;
    publisher: string;
    editionYear: number;
    practiceArea: string;
    jurisdiction: string;
    band?: number | null;
    tier?: number | null;
  };

  const rankings = loadJson<RankingData[]>("seed-rankings.json");
  if (!rankings) return;

  let created = 0;
  let skipped = 0;

  for (const r of rankings) {
    const firm = await prisma.firm.findFirst({
      where: {
        OR: [
          { name: { contains: r.firmName } },
          { shortName: { contains: r.firmName } },
        ],
      },
    });
    if (!firm) continue;

    const pa = await prisma.practiceArea.findFirst({
      where: { name: { contains: r.practiceArea.split("/")[0].trim() } },
    });
    if (!pa) continue;

    const jur = await prisma.jurisdiction.findFirst({
      where: { name: { contains: r.jurisdiction } },
    });
    if (!jur) continue;

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
      created++;
    } catch {
      skipped++;
    }
  }

  console.log(`  ✅ Created ${created}, skipped ${skipped} duplicates.`);
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   Import Seed Data from JSON Files              ║");
  console.log("║   Place files in: data/                         ║");
  console.log("╚══════════════════════════════════════════════════╝");

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`\n  Created data/ directory.`);
  }

  try {
    await seedReferenceData();
    await importFirms();
    await importLawyers();
    await importRankings();

    // Summary
    console.log("\n═══════════════════════════════════════════════════");
    console.log("  DIRECTORY SUMMARY");
    console.log("═══════════════════════════════════════════════════");
    const [firms, lawyers, rankings, pas, jurs] = await Promise.all([
      prisma.firm.count({ where: { isActive: true } }),
      prisma.lawyer.count({ where: { isActive: true } }),
      prisma.firmRanking.count(),
      prisma.practiceArea.count(),
      prisma.jurisdiction.count(),
    ]);
    console.log(`  Firms:          ${firms}`);
    console.log(`  Lawyers:        ${lawyers}`);
    console.log(`  Rankings:       ${rankings}`);
    console.log(`  Practice Areas: ${pas}`);
    console.log(`  Jurisdictions:  ${jurs}`);
    console.log("═══════════════════════════════════════════════════\n");
  } catch (err) {
    console.error("\n❌ Error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
