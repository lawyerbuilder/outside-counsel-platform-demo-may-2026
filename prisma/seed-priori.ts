/**
 * Seed data for Priori-inspired features:
 *  - FirmCapability rows (sub-panel scoring for guided intake)
 *  - CostBenchmark + RateCard rows (rate benchmarking)
 *  - Demo RFP in EVALUATING with 3 submitted proposals (comparison view)
 *  - Scorecards spread across tiers + one historical PanelReview (panel dashboard)
 *
 * Idempotent: safe to run repeatedly. Run with:
 *   npm run db:seed-priori
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const adapter = new PrismaLibSql({ url, ...(authToken ? { authToken } : {}) });
const prisma = new PrismaClient({ adapter });

async function firmByName(name: string) {
  const firm = await prisma.firm.findFirst({ where: { name: { contains: name } } });
  if (!firm) throw new Error(`Firm not found: ${name}`);
  return firm;
}

async function main() {
  console.log("Seeding Priori demo data...");

  const sarah = await prisma.user.findFirstOrThrow({ where: { email: "sarah.scales@example.com" } });

  // Demo role users: lawyer (Sarah, exists), manager, admin (exists)
  await prisma.user.upsert({
    where: { email: "manager@example.com" },
    update: { role: "MANAGER" },
    create: { email: "manager@example.com", name: "Pranee Charoensuk", role: "MANAGER" },
  });
  console.log("  Manager user ensured");

  const pas = Object.fromEntries(
    (await prisma.practiceArea.findMany()).map((p) => [p.slug, p])
  );
  const jds = Object.fromEntries(
    (await prisma.jurisdiction.findMany()).map((j) => [j.name, j])
  );

  const baker = await firmByName("Baker McKenzie");
  const ao = await firmByName("Allen & Overy");
  const linklaters = await firmByName("Linklaters");
  const tilleke = await firmByName("Tilleke & Gibbins");
  const weerawong = await firmByName("Weerawong");
  const rajah = await firmByName("Rajah & Tann");
  const kudun = await firmByName("Kudun");

  // ─── 1. FirmCapability ──────────────────────────────────────────────────
  type CapSeed = {
    firmId: string; jd: string; pa: string;
    tier: "COMPLEX" | "STANDARD" | "ROUTINE";
    overall: number; performance: number; rate: number; ranking: number;
    priority?: number; notes?: string;
  };
  const caps: CapSeed[] = [
    { firmId: baker.id, jd: "Thailand", pa: "corporate-ma", tier: "COMPLEX", overall: 88, performance: 90, rate: 62, ranking: 95, priority: 1, notes: "Lead M&A counsel for complex cross-border deals" },
    { firmId: baker.id, jd: "Thailand", pa: "corporate-ma", tier: "STANDARD", overall: 82, performance: 88, rate: 58, ranking: 95 },
    { firmId: weerawong.id, jd: "Thailand", pa: "corporate-ma", tier: "COMPLEX", overall: 85, performance: 87, rate: 78, ranking: 88, notes: "Strong local M&A bench, better rates than internationals" },
    { firmId: weerawong.id, jd: "Thailand", pa: "corporate-ma", tier: "STANDARD", overall: 86, performance: 87, rate: 84, ranking: 88, priority: 1 },
    { firmId: kudun.id, jd: "Thailand", pa: "corporate-ma", tier: "STANDARD", overall: 79, performance: 80, rate: 88, ranking: 70, notes: "Excellent value for mid-market deals" },
    { firmId: kudun.id, jd: "Thailand", pa: "corporate-ma", tier: "ROUTINE", overall: 84, performance: 82, rate: 92, ranking: 70, priority: 1 },
    { firmId: tilleke.id, jd: "Thailand", pa: "dispute-resolution", tier: "COMPLEX", overall: 83, performance: 85, rate: 75, ranking: 86, priority: 1, notes: "Go-to for Thai litigation and arbitration" },
    { firmId: tilleke.id, jd: "Thailand", pa: "dispute-resolution", tier: "STANDARD", overall: 84, performance: 85, rate: 80, ranking: 86 },
    { firmId: tilleke.id, jd: "Thailand", pa: "intellectual-property", tier: "STANDARD", overall: 87, performance: 88, rate: 82, ranking: 90, priority: 1 },
    { firmId: rajah.id, jd: "Singapore", pa: "dispute-resolution", tier: "COMPLEX", overall: 86, performance: 86, rate: 76, ranking: 92, priority: 1, notes: "SIAC arbitration specialists" },
    { firmId: rajah.id, jd: "Singapore", pa: "corporate-ma", tier: "STANDARD", overall: 81, performance: 82, rate: 74, ranking: 85 },
    { firmId: ao.id, jd: "Singapore", pa: "banking-finance", tier: "COMPLEX", overall: 89, performance: 88, rate: 55, ranking: 97, priority: 1, notes: "Premier banking practice, premium rates" },
    { firmId: ao.id, jd: "Singapore", pa: "corporate-ma", tier: "COMPLEX", overall: 84, performance: 84, rate: 52, ranking: 95 },
    { firmId: linklaters.id, jd: "Singapore", pa: "energy-natural-resources", tier: "COMPLEX", overall: 85, performance: 84, rate: 54, ranking: 94, priority: 1, notes: "Strong energy and projects practice" },
    { firmId: baker.id, jd: "Vietnam", pa: "corporate-ma", tier: "COMPLEX", overall: 81, performance: 82, rate: 64, ranking: 90, priority: 1, notes: "Largest international presence in Vietnam" },
    { firmId: baker.id, jd: "Vietnam", pa: "corporate-ma", tier: "STANDARD", overall: 78, performance: 80, rate: 62, ranking: 90 },
  ];
  // Regional coverage: firm resolved by name at seed time so the list stays
  // readable. Scores express a defensible spread per market.
  type NamedCapSeed = Omit<CapSeed, "firmId"> & { firmName: string };
  const regionalCaps: NamedCapSeed[] = [
    // Indonesia
    { firmName: "Hadiputranto", jd: "Indonesia", pa: "corporate-ma", tier: "COMPLEX", overall: 84, performance: 85, rate: 68, ranking: 92, priority: 1, notes: "Baker McKenzie member firm; deepest Indonesian M&A bench" },
    { firmName: "Hadiputranto", jd: "Indonesia", pa: "corporate-ma", tier: "STANDARD", overall: 82, performance: 84, rate: 66, ranking: 92 },
    { firmName: "Assegaf Hamzah", jd: "Indonesia", pa: "corporate-ma", tier: "COMPLEX", overall: 81, performance: 82, rate: 76, ranking: 86, notes: "Rajah & Tann member firm; strong on OJK and BKPM matters" },
    { firmName: "Assegaf Hamzah", jd: "Indonesia", pa: "corporate-ma", tier: "STANDARD", overall: 82, performance: 82, rate: 80, ranking: 86, priority: 1 },
    { firmName: "Ali Budiardjo", jd: "Indonesia", pa: "corporate-ma", tier: "STANDARD", overall: 76, performance: 77, rate: 82, ranking: 74, notes: "ABNR: established independent, good value" },
    { firmName: "Ali Budiardjo", jd: "Indonesia", pa: "corporate-ma", tier: "ROUTINE", overall: 79, performance: 77, rate: 88, ranking: 74, priority: 1 },
    { firmName: "Hiswara Bunjamin", jd: "Indonesia", pa: "corporate-ma", tier: "STANDARD", overall: 74, performance: 75, rate: 72, ranking: 78, notes: "Herbert Smith Freehills association" },
    { firmName: "Hadiputranto", jd: "Indonesia", pa: "banking-finance", tier: "COMPLEX", overall: 83, performance: 84, rate: 66, ranking: 90, priority: 1 },
    { firmName: "Assegaf Hamzah", jd: "Indonesia", pa: "banking-finance", tier: "STANDARD", overall: 80, performance: 80, rate: 78, ranking: 84 },
    { firmName: "Lubis Ganie", jd: "Indonesia", pa: "dispute-resolution", tier: "COMPLEX", overall: 77, performance: 79, rate: 80, ranking: 76, priority: 1, notes: "Leading Indonesian disputes practice" },
    { firmName: "Makarim", jd: "Indonesia", pa: "energy-natural-resources", tier: "STANDARD", overall: 76, performance: 77, rate: 79, ranking: 75, priority: 1 },
    // Malaysia
    { firmName: "Skrine", jd: "Malaysia", pa: "corporate-ma", tier: "COMPLEX", overall: 83, performance: 84, rate: 78, ranking: 88, priority: 1, notes: "Top-tier Malaysian full service" },
    { firmName: "Skrine", jd: "Malaysia", pa: "corporate-ma", tier: "STANDARD", overall: 84, performance: 84, rate: 82, ranking: 88 },
    { firmName: "Shearn Delamore", jd: "Malaysia", pa: "corporate-ma", tier: "STANDARD", overall: 81, performance: 82, rate: 80, ranking: 85, priority: 1 },
    { firmName: "Shearn Delamore", jd: "Malaysia", pa: "dispute-resolution", tier: "COMPLEX", overall: 80, performance: 82, rate: 78, ranking: 84, priority: 1 },
    { firmName: "Skrine", jd: "Malaysia", pa: "energy-natural-resources", tier: "STANDARD", overall: 78, performance: 79, rate: 80, ranking: 78 },
    // Philippines
    { firmName: "SyCip", jd: "Philippines", pa: "corporate-ma", tier: "COMPLEX", overall: 86, performance: 87, rate: 76, ranking: 94, priority: 1, notes: "Premier Philippine firm" },
    { firmName: "SyCip", jd: "Philippines", pa: "corporate-ma", tier: "STANDARD", overall: 85, performance: 86, rate: 78, ranking: 94 },
    { firmName: "Quisumbing", jd: "Philippines", pa: "corporate-ma", tier: "STANDARD", overall: 79, performance: 80, rate: 74, ranking: 84, notes: "Baker McKenzie member firm" },
    { firmName: "SyCip", jd: "Philippines", pa: "energy-natural-resources", tier: "COMPLEX", overall: 81, performance: 82, rate: 74, ranking: 88, priority: 1 },
    { firmName: "Romulo Mabanta", jd: "Philippines", pa: "dispute-resolution", tier: "STANDARD", overall: 76, performance: 78, rate: 80, ranking: 76, priority: 1 },
    // Japan
    { firmName: "Nagashima", jd: "Japan", pa: "corporate-ma", tier: "COMPLEX", overall: 87, performance: 88, rate: 62, ranking: 95, priority: 1, notes: "Big Four; cross-border M&A strength" },
    { firmName: "Mori Hamada", jd: "Japan", pa: "corporate-ma", tier: "COMPLEX", overall: 86, performance: 87, rate: 63, ranking: 94 },
    { firmName: "Anderson Mori", jd: "Japan", pa: "corporate-ma", tier: "STANDARD", overall: 82, performance: 83, rate: 68, ranking: 90, priority: 1 },
    { firmName: "Mori Hamada", jd: "Japan", pa: "dispute-resolution", tier: "COMPLEX", overall: 83, performance: 85, rate: 64, ranking: 90, priority: 1 },
    // China
    { firmName: "King & Wood", jd: "China", pa: "corporate-ma", tier: "COMPLEX", overall: 85, performance: 85, rate: 72, ranking: 93, priority: 1, notes: "KWM: leading PRC firm" },
    { firmName: "Han Kun", jd: "China", pa: "corporate-ma", tier: "STANDARD", overall: 82, performance: 83, rate: 76, ranking: 88, priority: 1 },
    { firmName: "Zhong Lun", jd: "China", pa: "corporate-ma", tier: "STANDARD", overall: 80, performance: 81, rate: 78, ranking: 85 },
    { firmName: "Zhong Lun", jd: "China", pa: "banking-finance", tier: "STANDARD", overall: 79, performance: 80, rate: 78, ranking: 83, priority: 1 },
    // South Korea
    { firmName: "Kim & Chang", jd: "South Korea", pa: "corporate-ma", tier: "COMPLEX", overall: 88, performance: 89, rate: 60, ranking: 97, priority: 1, notes: "Dominant Korean firm" },
    { firmName: "Lee & Ko", jd: "South Korea", pa: "corporate-ma", tier: "STANDARD", overall: 83, performance: 84, rate: 72, ranking: 90, priority: 1 },
    { firmName: "Bae, Kim & Lee", jd: "South Korea", pa: "corporate-ma", tier: "STANDARD", overall: 81, performance: 82, rate: 74, ranking: 88 },
    { firmName: "Kim & Chang", jd: "South Korea", pa: "dispute-resolution", tier: "COMPLEX", overall: 86, performance: 87, rate: 60, ranking: 95, priority: 1 },
    // Vietnam (locals alongside Baker McKenzie)
    { firmName: "Vietnam International Law Firm", jd: "Vietnam", pa: "corporate-ma", tier: "STANDARD", overall: 78, performance: 79, rate: 84, ranking: 76, priority: 1, notes: "VILAF: leading Vietnamese independent" },
    { firmName: "Russin", jd: "Vietnam", pa: "corporate-ma", tier: "ROUTINE", overall: 74, performance: 73, rate: 86, ranking: 68 },
    { firmName: "Vietnam International Law Firm", jd: "Vietnam", pa: "banking-finance", tier: "STANDARD", overall: 77, performance: 78, rate: 84, ranking: 74, priority: 1 },
    { firmName: "LNT & Partners", jd: "Vietnam", pa: "dispute-resolution", tier: "STANDARD", overall: 73, performance: 75, rate: 82, ranking: 68, priority: 1 },
    // Singapore (extend beyond R&T and A&O)
    { firmName: "Allen & Gledhill", jd: "Singapore", pa: "corporate-ma", tier: "COMPLEX", overall: 88, performance: 88, rate: 70, ranking: 96, priority: 1, notes: "Top Singapore firm" },
    { firmName: "WongPartnership", jd: "Singapore", pa: "corporate-ma", tier: "COMPLEX", overall: 86, performance: 86, rate: 72, ranking: 94 },
    { firmName: "WongPartnership", jd: "Singapore", pa: "corporate-ma", tier: "STANDARD", overall: 85, performance: 85, rate: 76, ranking: 94, priority: 1 },
    { firmName: "Allen & Gledhill", jd: "Singapore", pa: "banking-finance", tier: "COMPLEX", overall: 87, performance: 87, rate: 72, ranking: 95 },
    { firmName: "Drew & Napier", jd: "Singapore", pa: "dispute-resolution", tier: "COMPLEX", overall: 84, performance: 85, rate: 74, ranking: 92 },
  ];

  // Resolve regional firm names once, skipping any not in this database
  const nameCache = new Map<string, string | null>();
  async function firmIdByName(name: string): Promise<string | null> {
    if (!nameCache.has(name)) {
      const firm = await prisma.firm.findFirst({ where: { name: { contains: name }, deletedAt: null } });
      nameCache.set(name, firm?.id ?? null);
      if (!firm) console.warn(`  (skip: firm not found: ${name})`);
    }
    return nameCache.get(name) ?? null;
  }

  const resolvedRegional: CapSeed[] = [];
  for (const rc of regionalCaps) {
    const firmId = await firmIdByName(rc.firmName);
    if (firmId) resolvedRegional.push({ ...rc, firmId });
  }

  let capCount = 0;
  for (const c of [...caps, ...resolvedRegional]) {
    const jd = jds[c.jd];
    const pa = pas[c.pa];
    if (!jd || !pa) continue;
    await prisma.firmCapability.upsert({
      where: {
        firmId_jurisdictionId_practiceAreaId_complexityTier: {
          firmId: c.firmId, jurisdictionId: jd.id, practiceAreaId: pa.id, complexityTier: c.tier,
        },
      },
      update: { overallScore: c.overall, performanceScore: c.performance, rateScore: c.rate, rankingScore: c.ranking },
      create: {
        firmId: c.firmId, jurisdictionId: jd.id, practiceAreaId: pa.id, complexityTier: c.tier,
        overallScore: c.overall, performanceScore: c.performance, rateScore: c.rate, rankingScore: c.ranking,
        manualPriority: c.priority ?? 0, notes: c.notes, isActive: true,
        lastReviewedAt: new Date("2026-03-15"),
      },
    });
    capCount++;
  }
  console.log(`  FirmCapability: ${capCount}`);

  // ─── 2. CostBenchmark ───────────────────────────────────────────────────
  type BenchSeed = {
    firmId: string; role: "PARTNER" | "ASSOCIATE"; pa: string; jd: string;
    hourly: number; fixed?: number; year: number; source: "ACTUAL" | "MARKET";
  };
  const benches: BenchSeed[] = [
    // Thailand M&A: actuals from past matters
    { firmId: baker.id, role: "PARTNER", pa: "corporate-ma", jd: "Thailand", hourly: 75000, fixed: 18500000, year: 2024, source: "ACTUAL" },
    { firmId: baker.id, role: "ASSOCIATE", pa: "corporate-ma", jd: "Thailand", hourly: 38000, year: 2024, source: "ACTUAL" },
    { firmId: weerawong.id, role: "PARTNER", pa: "corporate-ma", jd: "Thailand", hourly: 55000, fixed: 14000000, year: 2024, source: "ACTUAL" },
    { firmId: weerawong.id, role: "ASSOCIATE", pa: "corporate-ma", jd: "Thailand", hourly: 26000, year: 2024, source: "ACTUAL" },
    { firmId: kudun.id, role: "PARTNER", pa: "corporate-ma", jd: "Thailand", hourly: 45000, fixed: 11000000, year: 2025, source: "ACTUAL" },
    { firmId: kudun.id, role: "ASSOCIATE", pa: "corporate-ma", jd: "Thailand", hourly: 22000, year: 2025, source: "ACTUAL" },
    { firmId: baker.id, role: "PARTNER", pa: "corporate-ma", jd: "Thailand", hourly: 78000, year: 2025, source: "MARKET" },
    { firmId: weerawong.id, role: "PARTNER", pa: "corporate-ma", jd: "Thailand", hourly: 58000, year: 2025, source: "MARKET" },
    // Thailand disputes
    { firmId: tilleke.id, role: "PARTNER", pa: "dispute-resolution", jd: "Thailand", hourly: 52000, fixed: 9500000, year: 2024, source: "ACTUAL" },
    { firmId: tilleke.id, role: "ASSOCIATE", pa: "dispute-resolution", jd: "Thailand", hourly: 24000, year: 2024, source: "ACTUAL" },
    // Singapore
    { firmId: rajah.id, role: "PARTNER", pa: "dispute-resolution", jd: "Singapore", hourly: 95000, fixed: 28000000, year: 2024, source: "ACTUAL" },
    { firmId: rajah.id, role: "ASSOCIATE", pa: "dispute-resolution", jd: "Singapore", hourly: 48000, year: 2024, source: "ACTUAL" },
    { firmId: ao.id, role: "PARTNER", pa: "banking-finance", jd: "Singapore", hourly: 135000, year: 2024, source: "ACTUAL" },
    { firmId: ao.id, role: "ASSOCIATE", pa: "banking-finance", jd: "Singapore", hourly: 68000, year: 2024, source: "ACTUAL" },
    { firmId: linklaters.id, role: "PARTNER", pa: "energy-natural-resources", jd: "Singapore", hourly: 128000, fixed: 42000000, year: 2025, source: "ACTUAL" },
    // Vietnam M&A: this is what the demo RFP benchmarks against
    { firmId: baker.id, role: "PARTNER", pa: "corporate-ma", jd: "Vietnam", hourly: 68000, fixed: 17500000, year: 2024, source: "ACTUAL" },
    { firmId: baker.id, role: "ASSOCIATE", pa: "corporate-ma", jd: "Vietnam", hourly: 32000, year: 2024, source: "ACTUAL" },
    { firmId: rajah.id, role: "PARTNER", pa: "corporate-ma", jd: "Vietnam", hourly: 60000, fixed: 15500000, year: 2025, source: "ACTUAL" },
    { firmId: baker.id, role: "PARTNER", pa: "corporate-ma", jd: "Vietnam", hourly: 70000, fixed: 18000000, year: 2025, source: "MARKET" },
    { firmId: rajah.id, role: "PARTNER", pa: "corporate-ma", jd: "Vietnam", hourly: 62000, fixed: 16000000, year: 2025, source: "MARKET" },
  ];
  // Regional benchmarks (firm by name) so fee badges work across markets
  type NamedBenchSeed = Omit<BenchSeed, "firmId"> & { firmName: string };
  const regionalBenches: NamedBenchSeed[] = [
    { firmName: "Hadiputranto", role: "PARTNER", pa: "corporate-ma", jd: "Indonesia", hourly: 58000, fixed: 16000000, year: 2024, source: "ACTUAL" },
    { firmName: "Assegaf Hamzah", role: "PARTNER", pa: "corporate-ma", jd: "Indonesia", hourly: 52000, fixed: 14500000, year: 2025, source: "ACTUAL" },
    { firmName: "Ali Budiardjo", role: "PARTNER", pa: "corporate-ma", jd: "Indonesia", hourly: 45000, fixed: 12000000, year: 2025, source: "MARKET" },
    { firmName: "Skrine", role: "PARTNER", pa: "corporate-ma", jd: "Malaysia", hourly: 48000, fixed: 12500000, year: 2024, source: "ACTUAL" },
    { firmName: "Shearn Delamore", role: "PARTNER", pa: "corporate-ma", jd: "Malaysia", hourly: 46000, fixed: 11500000, year: 2025, source: "MARKET" },
    { firmName: "SyCip", role: "PARTNER", pa: "corporate-ma", jd: "Philippines", hourly: 42000, fixed: 11000000, year: 2024, source: "ACTUAL" },
    { firmName: "Quisumbing", role: "PARTNER", pa: "corporate-ma", jd: "Philippines", hourly: 40000, fixed: 10000000, year: 2025, source: "MARKET" },
    { firmName: "Nagashima", role: "PARTNER", pa: "corporate-ma", jd: "Japan", hourly: 110000, fixed: 32000000, year: 2024, source: "ACTUAL" },
    { firmName: "Mori Hamada", role: "PARTNER", pa: "corporate-ma", jd: "Japan", hourly: 105000, fixed: 30000000, year: 2025, source: "MARKET" },
    { firmName: "King & Wood", role: "PARTNER", pa: "corporate-ma", jd: "China", hourly: 85000, fixed: 24000000, year: 2024, source: "ACTUAL" },
    { firmName: "Han Kun", role: "PARTNER", pa: "corporate-ma", jd: "China", hourly: 78000, fixed: 21000000, year: 2025, source: "MARKET" },
    { firmName: "Kim & Chang", role: "PARTNER", pa: "corporate-ma", jd: "South Korea", hourly: 98000, fixed: 28000000, year: 2024, source: "ACTUAL" },
    { firmName: "Lee & Ko", role: "PARTNER", pa: "corporate-ma", jd: "South Korea", hourly: 82000, fixed: 23000000, year: 2025, source: "MARKET" },
    { firmName: "Allen & Gledhill", role: "PARTNER", pa: "corporate-ma", jd: "Singapore", hourly: 105000, fixed: 30000000, year: 2024, source: "ACTUAL" },
    { firmName: "WongPartnership", role: "PARTNER", pa: "corporate-ma", jd: "Singapore", hourly: 100000, fixed: 28500000, year: 2025, source: "MARKET" },
  ];
  for (const rb of regionalBenches) {
    const firmId = await firmIdByName(rb.firmName);
    if (firmId) benches.push({ ...rb, firmId });
  }

  let benchCount = 0;
  for (const b of benches) {
    const jd = jds[b.jd];
    const pa = pas[b.pa];
    if (!jd || !pa) continue;
    const existing = await prisma.costBenchmark.findFirst({
      where: { firmId: b.firmId, role: b.role, practiceAreaId: pa.id, jurisdictionId: jd.id, year: b.year, source: b.source },
    });
    if (!existing) {
      await prisma.costBenchmark.create({
        data: {
          firmId: b.firmId, role: b.role, practiceAreaId: pa.id, jurisdictionId: jd.id,
          hourlyRateUsd: b.hourly, fixedFeeUsd: b.fixed, year: b.year, source: b.source,
          createdById: sarah.id,
        },
      });
      benchCount++;
    }
  }
  console.log(`  CostBenchmark: ${benchCount} new`);

  // ─── 3. RateCard ────────────────────────────────────────────────────────
  type RateSeed = { firmId: string; level: string; pa: string; jd: string; cents: number };
  const rates: RateSeed[] = [
    { firmId: baker.id, level: "Partner", pa: "corporate-ma", jd: "Thailand", cents: 76000 },
    { firmId: baker.id, level: "Senior Associate", pa: "corporate-ma", jd: "Thailand", cents: 45000 },
    { firmId: baker.id, level: "Associate", pa: "corporate-ma", jd: "Thailand", cents: 36000 },
    { firmId: weerawong.id, level: "Partner", pa: "corporate-ma", jd: "Thailand", cents: 56000 },
    { firmId: weerawong.id, level: "Associate", pa: "corporate-ma", jd: "Thailand", cents: 25000 },
    { firmId: kudun.id, level: "Partner", pa: "corporate-ma", jd: "Thailand", cents: 46000 },
    { firmId: kudun.id, level: "Associate", pa: "corporate-ma", jd: "Thailand", cents: 21000 },
    { firmId: tilleke.id, level: "Partner", pa: "dispute-resolution", jd: "Thailand", cents: 53000 },
    { firmId: rajah.id, level: "Partner", pa: "dispute-resolution", jd: "Singapore", cents: 96000 },
    { firmId: ao.id, level: "Partner", pa: "banking-finance", jd: "Singapore", cents: 138000 },
    { firmId: baker.id, level: "Partner", pa: "corporate-ma", jd: "Vietnam", cents: 69000 },
    { firmId: rajah.id, level: "Partner", pa: "corporate-ma", jd: "Vietnam", cents: 61000 },
  ];
  let rateCount = 0;
  for (const r of rates) {
    const jd = jds[r.jd];
    const pa = pas[r.pa];
    if (!jd || !pa) continue;
    const existing = await prisma.rateCard.findFirst({
      where: { firmId: r.firmId, timekeeperLevel: r.level, practiceAreaId: pa.id, jurisdictionId: jd.id },
    });
    if (!existing) {
      await prisma.rateCard.create({
        data: {
          firmId: r.firmId, timekeeperLevel: r.level, practiceAreaId: pa.id, jurisdictionId: jd.id,
          currencyCode: "USD", hourlyRateCents: r.cents,
          effectiveFrom: new Date("2025-01-01"), isApproved: true, approvedAt: new Date("2024-12-15"),
        },
      });
      rateCount++;
    }
  }
  console.log(`  RateCard: ${rateCount} new`);

  // ─── 4. Demo RFP with 3 submitted proposals ─────────────────────────────
  const rfpTitle = "Vietnam Plant Acquisition — Legal Advisory";
  let rfp = await prisma.rfp.findFirst({ where: { title: rfpTitle } });
  if (!rfp) {
    rfp = await prisma.rfp.create({
      data: {
        title: rfpTitle,
        status: "EVALUATING",
        practiceAreaId: pas["corporate-ma"].id,
        jurisdictionId: jds["Vietnam"].id,
        scopeDocument:
          "Acquisition of a packaging plant in Binh Duong Province, Vietnam (deal value ~USD 40M). Scope: legal due diligence on target company, share purchase agreement drafting and negotiation, merger filing assessment, land use rights transfer, employee transfer obligations under Vietnamese labour law, tax structuring review, regulatory approvals (investment registration certificate amendment), and closing support.",
        pricingRequirements:
          "Fee cap required. Phased fixed fees preferred (DD / SPA / regulatory / closing). State assumptions and exclusions explicitly.",
        evaluationCriteria: JSON.stringify([
          { name: "Relevant deal experience", weight: 30 },
          { name: "Fee competitiveness", weight: 30 },
          { name: "Team quality and partner attention", weight: 25 },
          { name: "Responsiveness and project management", weight: 15 },
        ]),
        matterNumber: "MS-2026-0412",
        deadline: new Date("2026-06-30"),
        createdById: sarah.id,
      },
    });
    console.log("  Demo RFP created");
  } else {
    console.log("  Demo RFP already exists");
  }

  const proposals = [
    {
      firmId: baker.id,
      feeCents: 22000000, // $220K
      feeType: "CAPPED" as const,
      staffing: JSON.stringify({
        partner: "1 lead M&A partner (HCMC) + 1 tax partner",
        associates: "2 senior associates, 1 associate",
        note: "Dedicated deal team, partner-led negotiation sessions",
      }),
      breakdown: JSON.stringify([
        { phase: "Due diligence", feeCents: 7500000 },
        { phase: "SPA drafting & negotiation", feeCents: 8000000 },
        { phase: "Regulatory & merger filing", feeCents: 4000000 },
        { phase: "Closing", feeCents: 2500000 },
      ]),
      doc: "Full-service M&A offering led by our Ho Chi Minh City office with support from Bangkok tax. We have closed 14 manufacturing acquisitions in Vietnam in the last 5 years including 3 in Binh Duong Province. Fee capped at USD 220,000 excluding disbursements and VAT. Assumes data room of fewer than 2,000 documents; tax structuring memo included. Land use rights transfer handled by our licensed Vietnamese practice. Exclusions: antitrust filings outside Vietnam, environmental permits.",
      ai: "We use AI-assisted document review for due diligence (Relativity + proprietary tools). All output reviewed by qualified lawyers.",
    },
    {
      firmId: rajah.id,
      feeCents: 18000000, // $180K
      feeType: "PHASED_FIXED" as const,
      staffing: JSON.stringify({
        partner: "1 corporate partner (Singapore) + Vietnam alliance firm partner",
        associates: "2 associates in HCMC via Rajah & Tann LCT Lawyers",
        note: "Integrated ASEAN network, single engagement letter",
      }),
      breakdown: JSON.stringify([
        { phase: "Due diligence", feeCents: 6000000 },
        { phase: "SPA drafting & negotiation", feeCents: 7000000 },
        { phase: "Regulatory & merger filing", feeCents: 3200000 },
        { phase: "Closing", feeCents: 1800000 },
      ]),
      doc: "Proposal via Rajah & Tann LCT Lawyers, our fully integrated Vietnam member firm. Phased fixed fees totalling USD 180,000. Each phase invoiced on completion. Includes economic concentration (merger filing) assessment under the 2018 Competition Law. Employee transfer advice included for up to 500 employees. Assumes seller provides organized data room. Exclusions: tax structuring (can be added for USD 15,000), litigation searches beyond standard scope.",
      ai: "Limited AI use: machine translation for Vietnamese documents with lawyer verification. No generative AI on client confidential data.",
    },
    {
      firmId: kudun.id,
      feeCents: 14500000, // $145K
      feeType: "FIXED" as const,
      staffing: JSON.stringify({
        partner: "1 partner (Bangkok) supervising local Vietnamese counsel",
        associates: "1 senior associate + Vietnamese co-counsel team",
        note: "Co-counsel model with established HCMC firm",
      }),
      breakdown: JSON.stringify([
        { phase: "Due diligence", feeCents: 5000000 },
        { phase: "SPA drafting & negotiation", feeCents: 6000000 },
        { phase: "Regulatory & merger filing", feeCents: 2200000 },
        { phase: "Closing", feeCents: 1300000 },
      ]),
      doc: "Single fixed fee of USD 145,000 covering all phases, working with our established Vietnamese co-counsel (fees included). Strong value proposition for mid-market transactions. Partner supervision from Bangkok with weekly status calls. Assumes standard share acquisition without restructuring; land use rights diligence by co-counsel. Exclusions: tax structuring memo, post-closing integration, work permit applications.",
      ai: "No AI tools used on this engagement.",
    },
  ];

  let propCount = 0;
  for (const p of proposals) {
    await prisma.rfpInvitation.upsert({
      where: { rfpId_firmId: { rfpId: rfp.id, firmId: p.firmId } },
      update: {
        status: "SUBMITTED",
        proposedFeeCents: p.feeCents,
        proposedFeeType: p.feeType,
        staffingPlan: p.staffing,
        feeBreakdown: p.breakdown,
        responseDocument: p.doc,
        aiDisclosure: p.ai,
      },
      create: {
        rfpId: rfp.id,
        firmId: p.firmId,
        status: "SUBMITTED",
        invitedAt: new Date("2026-05-10"),
        respondedAt: new Date("2026-05-28"),
        proposedFeeCents: p.feeCents,
        proposedFeeType: p.feeType,
        currencyCode: "USD",
        staffingPlan: p.staffing,
        feeBreakdown: p.breakdown,
        responseDocument: p.doc,
        aiDisclosure: p.ai,
        responseToken: crypto.randomUUID(),
      },
    });
    propCount++;
  }
  console.log(`  RFP invitations: ${propCount}`);

  // ─── 5. Scorecards (latest per panel firm, spread across tiers) ─────────
  const scorecardSeeds: Array<{ firmId: string; tier: "TOP_PERFORMER" | "MEETS_EXPECTATIONS" | "REQUIRES_IMPROVEMENT" | "EXIT_REVIEW"; composite: number; notes: string }> = [
    { firmId: baker.id, tier: "TOP_PERFORMER", composite: 88, notes: "Consistently strong across M&A mandates; premium rates justified by outcomes" },
    { firmId: weerawong.id, tier: "TOP_PERFORMER", composite: 86, notes: "Excellent local insight, strong value" },
    { firmId: tilleke.id, tier: "MEETS_EXPECTATIONS", composite: 76, notes: "Reliable disputes work; some delays on IP filings in Q1" },
    { firmId: rajah.id, tier: "MEETS_EXPECTATIONS", composite: 78, notes: "Good regional coverage; staffing turnover on one matter" },
    { firmId: ao.id, tier: "MEETS_EXPECTATIONS", composite: 74, notes: "High quality but consistent budget overruns on banking matters" },
    { firmId: linklaters.id, tier: "REQUIRES_IMPROVEMENT", composite: 64, notes: "Two missed deadlines on energy project; improvement discussion held March 2026" },
    { firmId: kudun.id, tier: "TOP_PERFORMER", composite: 84, notes: "Outstanding value; scope discipline excellent" },
  ];
  let scCount = 0;
  for (const s of scorecardSeeds) {
    const existing = await prisma.scorecard.findFirst({
      where: { firmId: s.firmId, periodEnd: new Date("2026-03-31") },
    });
    if (!existing) {
      await prisma.scorecard.create({
        data: {
          firmId: s.firmId,
          periodStart: new Date("2025-10-01"),
          periodEnd: new Date("2026-03-31"),
          compositeScore: s.composite,
          quantitativeScore: s.composite - 3,
          qualitativeScore: s.composite + 3,
          tier: s.tier,
          createdById: sarah.id,
          notes: s.notes,
        },
      });
      scCount++;
    }
  }
  console.log(`  Scorecards: ${scCount} new`);

  // ─── 6. Historical PanelReview ──────────────────────────────────────────
  const reviewTitle = "H2 2025 Panel Review";
  let review = await prisma.panelReview.findFirst({ where: { title: reviewTitle } });
  if (!review) {
    review = await prisma.panelReview.create({
      data: {
        title: reviewTitle,
        periodStart: new Date("2025-07-01"),
        periodEnd: new Date("2025-12-31"),
        conductedById: sarah.id,
        summary:
          "Semi-annual panel review covering 7 core firms. Overall panel health good. Linklaters placed on improvement plan following missed deadlines. Kudun & Partners promoted to preferred for mid-market Thai M&A.",
      },
    });
    const assessments: Array<{ firmId: string; tier: "TOP_PERFORMER" | "MEETS_EXPECTATIONS" | "REQUIRES_IMPROVEMENT" | "EXIT_REVIEW"; action: "RETAIN_PREFERRED" | "RETAIN" | "WATCH" | "IMPROVEMENT_PLAN" | "EXIT_REVIEW"; basis: string; compliance: number }> = [
      { firmId: baker.id, tier: "TOP_PERFORMER", action: "RETAIN_PREFERRED", basis: "Top quartile outcomes on complex M&A; preferred for cross-border deals above USD 25M", compliance: 0.96 },
      { firmId: weerawong.id, tier: "TOP_PERFORMER", action: "RETAIN_PREFERRED", basis: "Best-in-class Thai corporate work; high NPS from business units", compliance: 0.98 },
      { firmId: kudun.id, tier: "TOP_PERFORMER", action: "RETAIN_PREFERRED", basis: "Promoted: outstanding value on mid-market deals, zero billing disputes", compliance: 1.0 },
      { firmId: tilleke.id, tier: "MEETS_EXPECTATIONS", action: "RETAIN", basis: "Solid disputes performance; monitor IP filing turnaround", compliance: 0.91 },
      { firmId: rajah.id, tier: "MEETS_EXPECTATIONS", action: "RETAIN", basis: "Good ASEAN coverage; raise staffing continuity at next QBR", compliance: 0.93 },
      { firmId: ao.id, tier: "MEETS_EXPECTATIONS", action: "WATCH", basis: "Quality high but 3 of 4 banking matters exceeded budget by more than 15%", compliance: 0.82 },
      { firmId: linklaters.id, tier: "REQUIRES_IMPROVEMENT", action: "IMPROVEMENT_PLAN", basis: "Two missed regulatory deadlines on energy project; improvement plan agreed, review June 2026", compliance: 0.78 },
    ];
    for (const a of assessments) {
      await prisma.panelReviewFirm.upsert({
        where: { panelReviewId_firmId: { panelReviewId: review.id, firmId: a.firmId } },
        update: {},
        create: {
          panelReviewId: review.id,
          firmId: a.firmId,
          scorecardTier: a.tier,
          recommendedAction: a.action,
          actionBasis: a.basis,
          billingComplianceRate: a.compliance,
          improvementPlanRequired: a.action === "IMPROVEMENT_PLAN",
          improvementDeadline: a.action === "IMPROVEMENT_PLAN" ? new Date("2026-06-30") : null,
        },
      });
    }
    console.log(`  PanelReview + ${assessments.length} firm assessments`);
  } else {
    console.log("  PanelReview already exists");
  }

  console.log("Priori demo data seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
