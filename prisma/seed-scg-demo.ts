/**
 * Demo data for the SCG product-demo video: a coherent Singapore M&A thread.
 * A "Singapore Technology Acquisition" RFP in EVALUATING with 3 submitted
 * proposals from the top Singapore M&A firms, so the comparison/benchmark
 * screens show a Singapore matter end to end.
 *
 * Idempotent. Run with: npm run db:seed-scg-demo
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url, ...(authToken ? { authToken } : {}) }) });

async function firmByName(name: string) {
  const f = await prisma.firm.findFirst({ where: { name: { contains: name } } });
  if (!f) throw new Error(`Firm not found: ${name}`);
  return f;
}

async function main() {
  console.log("Seeding Singapore M&A demo thread...");
  const sarah = await prisma.user.findFirstOrThrow({ where: { email: "sarah.scales@example.com" } });
  const pa = await prisma.practiceArea.findFirstOrThrow({ where: { slug: "corporate-ma" } });
  const jd = await prisma.jurisdiction.findFirstOrThrow({ where: { name: "Singapore" } });

  const ag = await firmByName("Allen & Gledhill");
  const wp = await firmByName("WongPartnership");
  const rt = await firmByName("Rajah & Tann");

  const title = "Singapore Technology Acquisition — M&A Advisory";
  let rfp = await prisma.rfp.findFirst({ where: { title } });
  if (!rfp) {
    rfp = await prisma.rfp.create({
      data: {
        title,
        status: "EVALUATING",
        practiceAreaId: pa.id,
        jurisdictionId: jd.id,
        scopeDocument:
          "Acquisition of a Singapore-incorporated technology company (deal value ~USD 40M). Scope: legal due diligence, share purchase agreement drafting and negotiation, competition (merger) assessment, key-employee and IP assignment review, regulatory approvals, and closing support.",
        pricingRequirements: "Fee cap required. Phased fixed fees preferred (DD / SPA / regulatory / closing). State assumptions and exclusions explicitly.",
        evaluationCriteria: JSON.stringify([
          { name: "Relevant deal experience", weight: 30 },
          { name: "Fee competitiveness", weight: 30 },
          { name: "Team quality and partner attention", weight: 25 },
          { name: "Responsiveness and project management", weight: 15 },
        ]),
        matterNumber: "MS-2026-0518",
        deadline: new Date("2026-07-31"),
        createdById: sarah.id,
      },
    });
    console.log("  Singapore RFP created");
  } else {
    console.log("  Singapore RFP already exists");
  }

  const proposals = [
    {
      firmId: ag.id, feeCents: 26000000, feeType: "CAPPED" as const,
      staffing: JSON.stringify({ partner: "1 lead corporate partner + competition partner", associates: "2 senior associates, 1 associate", note: "Partner-led negotiation, dedicated deal room" }),
      breakdown: JSON.stringify([
        { phase: "Due diligence", feeCents: 9000000 },
        { phase: "SPA drafting & negotiation", feeCents: 9500000 },
        { phase: "Regulatory & merger review", feeCents: 4500000 },
        { phase: "Closing", feeCents: 3000000 },
      ]),
      doc: "Full-service Singapore M&A led by our corporate practice with in-house competition counsel. Fee capped at USD 260,000 excluding disbursements and GST. Assumes a data room under 2,500 documents; IP and key-employee review included. Exclusions: tax structuring outside Singapore, post-closing integration.",
      ai: "AI-assisted document review for due diligence, all output reviewed by qualified lawyers.",
    },
    {
      firmId: wp.id, feeCents: 23000000, feeType: "PHASED_FIXED" as const,
      staffing: JSON.stringify({ partner: "1 corporate partner", associates: "1 senior associate, 2 associates", note: "Phased team scaling by workstream" }),
      breakdown: JSON.stringify([
        { phase: "Due diligence", feeCents: 8000000 },
        { phase: "SPA drafting & negotiation", feeCents: 8500000 },
        { phase: "Regulatory & merger review", feeCents: 4000000 },
        { phase: "Closing", feeCents: 2500000 },
      ]),
      doc: "Phased fixed fees totalling USD 230,000, each phase invoiced on completion. Includes competition assessment under the Competition Act. Employee transfer advice included. Exclusions: tax structuring (available for USD 20,000), IP litigation searches beyond standard scope.",
      ai: "Machine translation for foreign-language documents with lawyer verification. No generative AI on client confidential data.",
    },
    {
      firmId: rt.id, feeCents: 19500000, feeType: "FIXED" as const,
      staffing: JSON.stringify({ partner: "1 partner supervising", associates: "1 senior associate + regional support", note: "Lean team, weekly status calls" }),
      breakdown: JSON.stringify([
        { phase: "Due diligence", feeCents: 7000000 },
        { phase: "SPA drafting & negotiation", feeCents: 7500000 },
        { phase: "Regulatory & merger review", feeCents: 3000000 },
        { phase: "Closing", feeCents: 2000000 },
      ]),
      doc: "Single fixed fee of USD 195,000 covering all phases. Strong value for a mid-market technology acquisition. Partner supervision with weekly calls. Assumes standard share acquisition without restructuring. Exclusions: tax structuring memo, work permit applications, post-closing integration.",
      ai: "No AI tools used on this engagement.",
    },
  ];

  let n = 0;
  for (const p of proposals) {
    await prisma.rfpInvitation.upsert({
      where: { rfpId_firmId: { rfpId: rfp.id, firmId: p.firmId } },
      update: {
        status: "SUBMITTED", proposedFeeCents: p.feeCents, proposedFeeType: p.feeType,
        staffingPlan: p.staffing, feeBreakdown: p.breakdown, responseDocument: p.doc, aiDisclosure: p.ai,
      },
      create: {
        rfpId: rfp.id, firmId: p.firmId, status: "SUBMITTED",
        invitedAt: new Date("2026-06-20"), respondedAt: new Date("2026-07-05"),
        proposedFeeCents: p.feeCents, proposedFeeType: p.feeType, currencyCode: "USD",
        staffingPlan: p.staffing, feeBreakdown: p.breakdown, responseDocument: p.doc, aiDisclosure: p.ai,
        responseToken: crypto.randomUUID(),
      },
    });
    n++;
  }
  console.log(`  Singapore proposals: ${n}`);
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
