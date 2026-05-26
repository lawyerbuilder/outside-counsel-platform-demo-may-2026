/**
 * Seeds a realistic analysis JSON into the timesheet upload.
 * Run: npx tsx prisma/seed-analysis.ts
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

const analysis = {
  summary: {
    totalEntries: 444,
    totalMatters: 18,
    dateRange: { from: "2020-06-01", to: "2026-05-05" },
    totalBillingUnits: 4280,
    totalBillingAmount: 4708000,
    currencyCode: "THB",
    lawyerCount: 1, // Single initials [RL]ATS in export
  },
  firmMentions: [
    {
      name: "SyCip Salazar Hernandez & Gatmaitan",
      shortName: "SyCip",
      mentionCount: 42,
      matters: [
        "Corporate restructuring and M&A in Philippines",
        "SEC compliance clearance",
      ],
      activityTypes: [
        "C02: Consult/Communicate with Third-Party",
        "A01: Client Communication",
      ],
      matchedFirmId: null,
      matchedFirmName: null,
      entityType: "LAW_FIRM" as const,
    },
    {
      name: "Picazo Buyco Tan Fider & Santos",
      shortName: "Picazo",
      mentionCount: 28,
      matters: [
        "Corporate restructuring and M&A in Philippines",
        "Capital stock GIS discrepancy",
      ],
      activityTypes: ["C02: Consult/Communicate with Third-Party"],
      matchedFirmId: null,
      matchedFirmName: null,
      entityType: "LAW_FIRM" as const,
    },
    {
      name: "PricewaterhouseCoopers",
      shortName: "PwC",
      mentionCount: 35,
      matters: [
        "Corporate restructuring and M&A in Philippines",
        "Financial statements audit",
        "IRL compliance",
      ],
      activityTypes: [
        "C02: Consult/Communicate with Third-Party",
        "A01: Client Communication",
      ],
      matchedFirmId: null,
      matchedFirmName: null,
      entityType: "CONSULTING" as const,
    },
    {
      name: "KPMG",
      shortName: "KPMG",
      mentionCount: 12,
      matters: [
        "Corporate restructuring and M&A in Philippines",
        "LFAR hold harmless letter",
      ],
      activityTypes: ["C02: Consult/Communicate with Third-Party"],
      matchedFirmId: null,
      matchedFirmName: null,
      entityType: "CONSULTING" as const,
    },
    {
      name: "LOD Law",
      shortName: "LOD",
      mentionCount: 5,
      matters: ["Legal operations consulting"],
      activityTypes: ["C02: Consult/Communicate with Third-Party"],
      matchedFirmId: null,
      matchedFirmName: null,
      entityType: "LAW_FIRM" as const,
    },
    {
      name: "Thomson Reuters",
      shortName: "Thomson Reuters",
      mentionCount: 8,
      matters: ["MatterSphere implementation", "Legal tech evaluation"],
      activityTypes: ["C02: Consult/Communicate with Third-Party"],
      matchedFirmId: null,
      matchedFirmName: null,
      entityType: "VENDOR" as const,
    },
    {
      name: "ContractPod AI",
      shortName: "ContractPod",
      mentionCount: 4,
      matters: ["CLM platform evaluation"],
      activityTypes: ["C02: Consult/Communicate with Third-Party"],
      matchedFirmId: null,
      matchedFirmName: null,
      entityType: "VENDOR" as const,
    },
    {
      name: "Mosmar",
      shortName: "Mosmar",
      mentionCount: 3,
      matters: ["Legal tech vendor evaluation"],
      activityTypes: ["C02: Consult/Communicate with Third-Party"],
      matchedFirmId: null,
      matchedFirmName: null,
      entityType: "VENDOR" as const,
    },
    {
      name: "IT One",
      shortName: "IT One",
      mentionCount: 6,
      matters: ["MatterSphere setup", "System integration"],
      activityTypes: ["C02: Consult/Communicate with Third-Party"],
      matchedFirmId: null,
      matchedFirmName: null,
      entityType: "VENDOR" as const,
    },
  ],
  matterClassifications: [
    {
      matterNo: "15412_2025",
      name: "Corporate restructuring and M&A in Philippines",
      practiceArea: "M&A / Corporate",
      jurisdiction: "Philippines",
      usesExternalCounsel: true,
      externalFirms: ["SyCip", "Picazo", "PwC", "KPMG"],
      complexity: "COMPLEX" as const,
      totalBillingUnits: 1850,
      dateRange: { from: "2025-01-15", to: "2026-05-05" },
    },
    {
      matterNo: "15413_2025",
      name: "Study corporate governance structure for ASEAN subsidiaries",
      practiceArea: "Corporate Governance",
      jurisdiction: "ASEAN",
      usesExternalCounsel: false,
      externalFirms: [],
      complexity: "STANDARD" as const,
      totalBillingUnits: 320,
      dateRange: { from: "2025-03-01", to: "2026-02-28" },
    },
    {
      matterNo: "13580_2023",
      name: "MatterSphere implementation and legal ops transformation",
      practiceArea: "Technology",
      jurisdiction: null,
      usesExternalCounsel: false,
      externalFirms: [],
      complexity: "COMPLEX" as const,
      totalBillingUnits: 680,
      dateRange: { from: "2023-01-10", to: "2025-12-31" },
    },
    {
      matterNo: "14200_2024",
      name: "AI/ML legal research and prompt engineering workshops",
      practiceArea: "Technology",
      jurisdiction: null,
      usesExternalCounsel: false,
      externalFirms: [],
      complexity: "STANDARD" as const,
      totalBillingUnits: 450,
      dateRange: { from: "2024-03-01", to: "2026-04-30" },
    },
    {
      matterNo: "12150_2022",
      name: "NDA and confidentiality agreement templates",
      practiceArea: "General Advisory",
      jurisdiction: "Thailand",
      usesExternalCounsel: false,
      externalFirms: [],
      complexity: "ROUTINE" as const,
      totalBillingUnits: 120,
      dateRange: { from: "2022-06-01", to: "2023-03-15" },
    },
    {
      matterNo: "11800_2021",
      name: "Data privacy compliance (PDPA implementation)",
      practiceArea: "Data Privacy",
      jurisdiction: "Thailand",
      usesExternalCounsel: false,
      externalFirms: [],
      complexity: "STANDARD" as const,
      totalBillingUnits: 280,
      dateRange: { from: "2021-09-01", to: "2022-06-01" },
    },
    {
      matterNo: "14500_2024",
      name: "CLM platform evaluation and vendor selection",
      practiceArea: "Technology",
      jurisdiction: null,
      usesExternalCounsel: false,
      externalFirms: [],
      complexity: "STANDARD" as const,
      totalBillingUnits: 180,
      dateRange: { from: "2024-06-01", to: "2025-02-28" },
    },
    {
      matterNo: "10500_2020",
      name: "Outside counsel management framework design",
      practiceArea: "General Advisory",
      jurisdiction: "Thailand",
      usesExternalCounsel: false,
      externalFirms: [],
      complexity: "STANDARD" as const,
      totalBillingUnits: 400,
      dateRange: { from: "2020-06-01", to: "2021-12-31" },
    },
  ],
  outsourcePatterns: [
    {
      practiceArea: "M&A / Corporate",
      outsourceRate: 85,
      typicalFirms: ["SyCip", "Picazo"],
      observation:
        "Cross-border M&A in Philippines consistently requires local counsel (SyCip for SCGI PH, Picazo for SCGM PH). PwC and KPMG handle audit and compliance components.",
    },
    {
      practiceArea: "Corporate Governance",
      outsourceRate: 10,
      typicalFirms: [],
      observation:
        "Corporate governance work for ASEAN subsidiaries is handled almost entirely in-house, with occasional external research inputs.",
    },
    {
      practiceArea: "Technology / Legal Ops",
      outsourceRate: 0,
      typicalFirms: [],
      observation:
        "All technology evaluation, AI research, and legal operations transformation work is done in-house. Vendor interactions are procurement, not legal advice.",
    },
    {
      practiceArea: "NDA / Routine Contracts",
      outsourceRate: 0,
      typicalFirms: [],
      observation:
        "SCG never uses external counsel for NDA or routine template work. These are fully in-house, high-volume, low-complexity matters.",
    },
    {
      practiceArea: "Data Privacy",
      outsourceRate: 5,
      typicalFirms: [],
      observation:
        "PDPA implementation was handled in-house with minimal external consultation. Regulatory compliance work stays internal.",
    },
  ],
  keyInsights: [
    "SyCip and Picazo are the primary external law firms, used exclusively for Philippine cross-border M&A — SyCip handles SCGI PH matters, Picazo handles SCGM PH.",
    "PwC is the most-mentioned external entity overall (35 mentions), functioning as audit/compliance advisor on the Philippine restructuring alongside external law firms.",
    "External counsel coordination (C02 activity code) represents approximately 38% of total time on matters involving outside firms — a significant coordination overhead.",
    "NDA, template work, and routine contracts are handled 100% in-house — SCG never outsources this type of work.",
    "The legal team invests heavily in technology and AI (MatterSphere, CLM evaluation, AI/ML research) — all done internally without external counsel.",
    "KPMG involvement is specifically for LFAR (Letter for Auditor's Report) matters and hold harmless letters, not general advisory work.",
    "Only 1 out of 8 classified matters uses external counsel, but that single matter (Philippine M&A) accounts for ~43% of total billing units — suggesting outsourcing is reserved for high-value, jurisdiction-specific work.",
    "The legal operations transformation program (MatterSphere, outside counsel framework, CLM) spans 5+ years and is entirely in-house, demonstrating strong internal capability building.",
  ],
};

async function main() {
  // Cross-reference firm mentions with OCP firms
  const firms = await prisma.firm.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, shortName: true },
  });

  for (const mention of analysis.firmMentions) {
    const match = firms.find(
      (f) =>
        f.name.toLowerCase().includes(mention.shortName.toLowerCase()) ||
        (f.shortName &&
          f.shortName.toLowerCase().includes(mention.shortName.toLowerCase()))
    );
    if (match) {
      mention.matchedFirmId = match.id;
      mention.matchedFirmName = match.name;
    }
  }

  // Find the upload and update it
  const upload = await prisma.timesheetUpload.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!upload) {
    console.error("No upload found!");
    process.exit(1);
  }

  await prisma.timesheetUpload.update({
    where: { id: upload.id },
    data: {
      status: "ANALYZED",
      analysisJson: JSON.stringify(analysis),
      processedRows: 444,
    },
  });

  console.log(`✅ Seeded analysis for upload ${upload.id}`);

  // Log matched firms
  const matched = analysis.firmMentions.filter((m) => m.matchedFirmId);
  console.log(
    `Matched ${matched.length} firms to OCP: ${matched
      .map((m) => `${m.shortName} → ${m.matchedFirmName}`)
      .join(", ")}`
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
