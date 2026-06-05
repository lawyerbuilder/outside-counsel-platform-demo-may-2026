import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const adapter = new PrismaLibSql({ url, ...(authToken ? { authToken } : {}) });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // ─── Users ───────────────────────────────────────────────────────────────
  const userSarah = await prisma.user.upsert({
    where: { email: "sarah.scales@example.com" },
    update: {},
    create: { email: "sarah.scales@example.com", name: "Sarah Scales", role: "LAWYER" },
  });

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { email: "admin@example.com", name: "Admin User", role: "ADMIN" },
  });

  const userJames = await prisma.user.upsert({
    where: { email: "james.chen@example.com" },
    update: {},
    create: { email: "james.chen@example.com", name: "James Chen", role: "LAWYER" },
  });

  console.log("  Users: 3");

  // ─── Practice Areas ────────────────────────────────────────────────────
  const practiceAreas = await Promise.all(
    [
      { name: "Corporate & M&A", slug: "corporate-ma" },
      { name: "Dispute Resolution", slug: "dispute-resolution" },
      { name: "Banking & Finance", slug: "banking-finance" },
      { name: "Capital Markets", slug: "capital-markets" },
      { name: "Employment & Labour", slug: "employment-labour" },
      { name: "Intellectual Property", slug: "intellectual-property" },
      { name: "Real Estate & Construction", slug: "real-estate-construction" },
      { name: "Energy & Natural Resources", slug: "energy-natural-resources" },
    ].map((pa) =>
      prisma.practiceArea.upsert({
        where: { slug: pa.slug },
        update: {},
        create: pa,
      })
    )
  );
  console.log(`  Practice Areas: ${practiceAreas.length}`);

  // ─── Jurisdictions ─────────────────────────────────────────────────────
  const jurisdictions = await Promise.all(
    [
      { name: "Thailand", country: "Thailand", region: "APAC" },
      { name: "Singapore", country: "Singapore", region: "APAC" },
      { name: "Hong Kong SAR", country: "Hong Kong", region: "APAC" },
      { name: "Indonesia", country: "Indonesia", region: "APAC" },
      { name: "Vietnam", country: "Vietnam", region: "APAC" },
      { name: "Myanmar", country: "Myanmar", region: "APAC" },
      { name: "Philippines", country: "Philippines", region: "APAC" },
      { name: "England & Wales", country: "United Kingdom", region: "EMEA" },
      { name: "New York", country: "United States", region: "AMERICAS" },
      { name: "Japan", country: "Japan", region: "APAC" },
      { name: "Malaysia", country: "Malaysia", region: "APAC" },
      { name: "China", country: "China", region: "APAC" },
      { name: "South Korea", country: "South Korea", region: "APAC" },
      { name: "Germany", country: "Germany", region: "EMEA" },
    ].map((j) =>
      prisma.jurisdiction.upsert({
        where: { name: j.name },
        update: {},
        create: j,
      })
    )
  );
  console.log(`  Jurisdictions: ${jurisdictions.length}`);

  // Convenience lookups
  const pa = Object.fromEntries(practiceAreas.map((p) => [p.slug, p]));
  const jur = Object.fromEntries(jurisdictions.map((j) => [j.name, j]));

  // ─── Firms ─────────────────────────────────────────────────────────────
  const firmData = [
    {
      name: "Baker McKenzie",
      shortName: "Baker",
      country: "Thailand",
      city: "Bangkok",
      website: "https://www.bakermckenzie.com",
      firmType: "FULL_SERVICE" as const,
      headcount: 4700,
      foundedYear: 1949,
    },
    {
      name: "Allen & Overy (A&O Shearman)",
      shortName: "A&O",
      country: "Thailand",
      city: "Bangkok",
      website: "https://www.aoshearman.com",
      firmType: "FULL_SERVICE" as const,
      headcount: 5500,
      foundedYear: 1930,
    },
    {
      name: "Linklaters",
      shortName: "Linklaters",
      country: "Thailand",
      city: "Bangkok",
      website: "https://www.linklaters.com",
      firmType: "FULL_SERVICE" as const,
      headcount: 5200,
      foundedYear: 1838,
    },
    {
      name: "Tilleke & Gibbins",
      shortName: "T&G",
      country: "Thailand",
      city: "Bangkok",
      website: "https://www.tilleke.com",
      firmType: "REGIONAL" as const,
      headcount: 350,
      foundedYear: 1890,
    },
    {
      name: "Weerawong, Chinnavat & Partners",
      shortName: "WCP",
      country: "Thailand",
      city: "Bangkok",
      website: "https://www.weerawongcp.com",
      firmType: "FULL_SERVICE" as const,
      headcount: 130,
      foundedYear: 2002,
    },
    {
      name: "Chandler MHM",
      shortName: "Chandler",
      country: "Thailand",
      city: "Bangkok",
      website: "https://www.chandlermhm.com",
      firmType: "FULL_SERVICE" as const,
      headcount: 100,
      foundedYear: 2015,
    },
    {
      name: "Rajah & Tann",
      shortName: "R&T",
      country: "Singapore",
      city: "Singapore",
      website: "https://www.rajahtannasia.com",
      firmType: "FULL_SERVICE" as const,
      headcount: 1000,
      foundedYear: 1954,
    },
    {
      name: "Norton Rose Fulbright",
      shortName: "NRF",
      country: "Thailand",
      city: "Bangkok",
      website: "https://www.nortonrosefulbright.com",
      firmType: "FULL_SERVICE" as const,
      headcount: 3000,
      foundedYear: 2013,
    },
    {
      name: "Kudun & Partners",
      shortName: "Kudun",
      country: "Thailand",
      city: "Bangkok",
      website: "https://www.kap.co.th",
      firmType: "BOUTIQUE" as const,
      headcount: 65,
      foundedYear: 2015,
    },
    {
      name: "Pisut & Partners",
      shortName: "Pisut",
      country: "Thailand",
      city: "Bangkok",
      website: "https://www.pisutandpartners.com",
      firmType: "BOUTIQUE" as const,
      headcount: 20,
      foundedYear: 2019,
    },
  ];

  const firms: Record<string, { id: string }> = {};
  for (const fd of firmData) {
    const firm = await prisma.firm.upsert({
      where: { id: fd.name }, // will not match — create path
      update: {},
      create: { ...fd, panelStatus: "ACTIVE" as const },
    });
    firms[fd.shortName ?? fd.name] = firm;
  }

  // Boutique spin-off links
  // Kudun & Partners was founded by partners from Baker McKenzie
  await prisma.firm.update({
    where: { id: firms["Kudun"].id },
    data: { parentFirmId: firms["Baker"].id },
  });

  // Pisut & Partners — boutique spin-off from WCP
  await prisma.firm.update({
    where: { id: firms["Pisut"].id },
    data: { parentFirmId: firms["WCP"].id },
  });

  console.log(`  Firms: ${firmData.length}`);

  // ─── Firm Practice Areas ───────────────────────────────────────────────
  const firmPALinks = [
    { firm: "Baker", pa: "corporate-ma", jur: "Thailand" },
    { firm: "Baker", pa: "dispute-resolution", jur: "Thailand" },
    { firm: "Baker", pa: "banking-finance", jur: "Thailand" },
    { firm: "Baker", pa: "employment-labour", jur: "Thailand" },
    { firm: "Baker", pa: "intellectual-property", jur: "Thailand" },
    { firm: "A&O", pa: "corporate-ma", jur: "Thailand" },
    { firm: "A&O", pa: "banking-finance", jur: "Thailand" },
    { firm: "A&O", pa: "capital-markets", jur: "Thailand" },
    { firm: "Linklaters", pa: "corporate-ma", jur: "Thailand" },
    { firm: "Linklaters", pa: "banking-finance", jur: "Thailand" },
    { firm: "Linklaters", pa: "capital-markets", jur: "Thailand" },
    { firm: "T&G", pa: "intellectual-property", jur: "Thailand" },
    { firm: "T&G", pa: "corporate-ma", jur: "Thailand" },
    { firm: "T&G", pa: "dispute-resolution", jur: "Thailand" },
    { firm: "WCP", pa: "corporate-ma", jur: "Thailand" },
    { firm: "WCP", pa: "banking-finance", jur: "Thailand" },
    { firm: "WCP", pa: "dispute-resolution", jur: "Thailand" },
    { firm: "Chandler", pa: "corporate-ma", jur: "Thailand" },
    { firm: "Chandler", pa: "energy-natural-resources", jur: "Thailand" },
    { firm: "R&T", pa: "corporate-ma", jur: "Singapore" },
    { firm: "R&T", pa: "dispute-resolution", jur: "Singapore" },
    { firm: "R&T", pa: "banking-finance", jur: "Singapore" },
    { firm: "NRF", pa: "corporate-ma", jur: "Thailand" },
    { firm: "NRF", pa: "energy-natural-resources", jur: "Thailand" },
    { firm: "NRF", pa: "banking-finance", jur: "Thailand" },
    { firm: "Kudun", pa: "corporate-ma", jur: "Thailand" },
    { firm: "Kudun", pa: "banking-finance", jur: "Thailand" },
    { firm: "Kudun", pa: "real-estate-construction", jur: "Thailand" },
    { firm: "Pisut", pa: "corporate-ma", jur: "Thailand" },
    { firm: "Pisut", pa: "dispute-resolution", jur: "Thailand" },
  ];

  for (const link of firmPALinks) {
    await prisma.firmPracticeArea.create({
      data: {
        firmId: firms[link.firm].id,
        practiceAreaId: pa[link.pa].id,
        jurisdictionId: jur[link.jur].id,
      },
    });
  }
  console.log(`  Firm Practice Areas: ${firmPALinks.length}`);

  // ─── Lawyers ───────────────────────────────────────────────────────────
  const lawyerData: {
    name: string;
    title: string;
    qualificationYear: number;
    barAdmissions: string;
    currentFirm: string;
    role: "PARTNER" | "OF_COUNSEL" | "ASSOCIATE" | "COUNSEL";
    practiceAreas: string[];
    jurisdiction: string;
    bio?: string;
    startYear: number;
    previousFirm?: string;
    previousRole?: "PARTNER" | "OF_COUNSEL" | "ASSOCIATE" | "COUNSEL";
    previousStart?: number;
    previousEnd?: number;
  }[] = [
    // Baker McKenzie — 6 lawyers
    { name: "Kullarat Phongsathaporn", title: "Managing Partner", qualificationYear: 1994, barAdmissions: "Thai Bar", currentFirm: "Baker", role: "PARTNER", practiceAreas: ["corporate-ma", "banking-finance"], jurisdiction: "Thailand", startYear: 2005, bio: "Leading M&A practitioner with 30+ years of experience advising multinational corporations on cross-border transactions in Thailand and ASEAN." },
    { name: "Paralee Techanarong", title: "Senior Partner", qualificationYear: 1998, barAdmissions: "Thai Bar", currentFirm: "Baker", role: "PARTNER", practiceAreas: ["dispute-resolution"], jurisdiction: "Thailand", startYear: 2008 },
    { name: "Pimvimol Vipamaneerut", title: "Partner", qualificationYear: 2002, barAdmissions: "Thai Bar", currentFirm: "Baker", role: "PARTNER", practiceAreas: ["employment-labour"], jurisdiction: "Thailand", startYear: 2012 },
    { name: "Dhiraphol Suwanprateep", title: "Partner", qualificationYear: 1999, barAdmissions: "Thai Bar", currentFirm: "Baker", role: "PARTNER", practiceAreas: ["intellectual-property"], jurisdiction: "Thailand", startYear: 2010 },
    { name: "Kowit Somwaiya", title: "Senior Associate", qualificationYear: 2012, barAdmissions: "Thai Bar", currentFirm: "Baker", role: "ASSOCIATE", practiceAreas: ["corporate-ma"], jurisdiction: "Thailand", startYear: 2015 },
    { name: "Natthida Praween", title: "Associate", qualificationYear: 2016, barAdmissions: "Thai Bar", currentFirm: "Baker", role: "ASSOCIATE", practiceAreas: ["banking-finance"], jurisdiction: "Thailand", startYear: 2018 },

    // A&O — 4 lawyers
    { name: "Patrick Leysen", title: "Partner", qualificationYear: 2000, barAdmissions: "England & Wales, Thai Bar", currentFirm: "A&O", role: "PARTNER", practiceAreas: ["corporate-ma", "capital-markets"], jurisdiction: "Thailand", startYear: 2010, bio: "Advises on major cross-border M&A and capital markets transactions across Southeast Asia." },
    { name: "Montien Bunjarnondha", title: "Partner", qualificationYear: 2001, barAdmissions: "Thai Bar", currentFirm: "A&O", role: "PARTNER", practiceAreas: ["banking-finance"], jurisdiction: "Thailand", startYear: 2012 },
    { name: "Sriprai Lertpitayapoom", title: "Counsel", qualificationYear: 2005, barAdmissions: "Thai Bar", currentFirm: "A&O", role: "COUNSEL", practiceAreas: ["corporate-ma"], jurisdiction: "Thailand", startYear: 2015 },
    { name: "Narun Popattanachai", title: "Associate", qualificationYear: 2014, barAdmissions: "Thai Bar, New York Bar", currentFirm: "A&O", role: "ASSOCIATE", practiceAreas: ["capital-markets"], jurisdiction: "Thailand", startYear: 2017 },

    // Linklaters — 4 lawyers
    { name: "John Frangos", title: "Partner", qualificationYear: 1997, barAdmissions: "England & Wales", currentFirm: "Linklaters", role: "PARTNER", practiceAreas: ["corporate-ma", "banking-finance"], jurisdiction: "Thailand", startYear: 2008, bio: "Leads the Thailand practice, specializing in complex financial transactions and M&A across ASEAN." },
    { name: "Watcharapong Kunakorn", title: "Partner", qualificationYear: 2003, barAdmissions: "Thai Bar", currentFirm: "Linklaters", role: "PARTNER", practiceAreas: ["capital-markets"], jurisdiction: "Thailand", startYear: 2014 },
    { name: "Suvimon Cherdchaipan", title: "Counsel", qualificationYear: 2007, barAdmissions: "Thai Bar", currentFirm: "Linklaters", role: "COUNSEL", practiceAreas: ["banking-finance"], jurisdiction: "Thailand", startYear: 2016 },
    { name: "Tanapon Sritanondha", title: "Associate", qualificationYear: 2015, barAdmissions: "Thai Bar", currentFirm: "Linklaters", role: "ASSOCIATE", practiceAreas: ["corporate-ma"], jurisdiction: "Thailand", startYear: 2018 },

    // Tilleke & Gibbins — 4 lawyers
    { name: "Darani Vachanavuttivong", title: "Director", qualificationYear: 1989, barAdmissions: "Thai Bar", currentFirm: "T&G", role: "PARTNER", practiceAreas: ["intellectual-property"], jurisdiction: "Thailand", startYear: 1995, bio: "One of Thailand's most recognized IP practitioners, with over 35 years advising on trademarks, patents, and technology licensing." },
    { name: "Wayu Suthisarnsuntorn", title: "Partner", qualificationYear: 2000, barAdmissions: "Thai Bar", currentFirm: "T&G", role: "PARTNER", practiceAreas: ["corporate-ma"], jurisdiction: "Thailand", startYear: 2005 },
    { name: "Alan Adcock", title: "Partner", qualificationYear: 1995, barAdmissions: "England & Wales, Thai Bar", currentFirm: "T&G", role: "PARTNER", practiceAreas: ["dispute-resolution"], jurisdiction: "Thailand", startYear: 2003 },
    { name: "Suebsiri Taweepon", title: "Associate", qualificationYear: 2017, barAdmissions: "Thai Bar", currentFirm: "T&G", role: "ASSOCIATE", practiceAreas: ["intellectual-property"], jurisdiction: "Thailand", startYear: 2019 },

    // WCP — 4 lawyers
    { name: "Veeranuch Thammavaranucupt", title: "Senior Partner", qualificationYear: 1992, barAdmissions: "Thai Bar, New York Bar", currentFirm: "WCP", role: "PARTNER", practiceAreas: ["corporate-ma", "banking-finance"], jurisdiction: "Thailand", startYear: 2002, bio: "Founding partner of WCP, recognized as a leading corporate lawyer in Thailand with deep experience in M&A and project finance." },
    { name: "Samart Poopoksakul", title: "Partner", qualificationYear: 2001, barAdmissions: "Thai Bar", currentFirm: "WCP", role: "PARTNER", practiceAreas: ["dispute-resolution"], jurisdiction: "Thailand", startYear: 2006 },
    { name: "Supatra Jaovisidha", title: "Partner", qualificationYear: 2004, barAdmissions: "Thai Bar", currentFirm: "WCP", role: "PARTNER", practiceAreas: ["banking-finance"], jurisdiction: "Thailand", startYear: 2010 },
    { name: "Pakorn Nilprapunt", title: "Associate", qualificationYear: 2016, barAdmissions: "Thai Bar", currentFirm: "WCP", role: "ASSOCIATE", practiceAreas: ["corporate-ma"], jurisdiction: "Thailand", startYear: 2018 },

    // Chandler MHM — 3 lawyers
    { name: "Albert Chandler", title: "Chairman", qualificationYear: 1985, barAdmissions: "England & Wales, Thai Bar", currentFirm: "Chandler", role: "PARTNER", practiceAreas: ["corporate-ma", "energy-natural-resources"], jurisdiction: "Thailand", startYear: 2015, bio: "Renowned energy and infrastructure lawyer with decades of experience in Southeast Asian project development." },
    { name: "Jessada Sawatdipong", title: "Partner", qualificationYear: 2003, barAdmissions: "Thai Bar", currentFirm: "Chandler", role: "PARTNER", practiceAreas: ["energy-natural-resources"], jurisdiction: "Thailand", startYear: 2015 },
    { name: "Ratana Poonsombudlert", title: "Of Counsel", qualificationYear: 1998, barAdmissions: "Thai Bar", currentFirm: "Chandler", role: "OF_COUNSEL", practiceAreas: ["corporate-ma"], jurisdiction: "Thailand", startYear: 2017 },

    // Rajah & Tann — 4 lawyers
    { name: "Lee Eng Beng", title: "Senior Partner", qualificationYear: 1990, barAdmissions: "Singapore Bar", currentFirm: "R&T", role: "PARTNER", practiceAreas: ["dispute-resolution"], jurisdiction: "Singapore", startYear: 1995, bio: "One of Singapore's top litigators, appointed Senior Counsel, specializing in complex commercial and investment treaty disputes." },
    { name: "Chia Kim Huat", title: "Regional Head, Corporate", qualificationYear: 1993, barAdmissions: "Singapore Bar", currentFirm: "R&T", role: "PARTNER", practiceAreas: ["corporate-ma", "banking-finance"], jurisdiction: "Singapore", startYear: 1998 },
    { name: "Tan Beng Hwee", title: "Partner", qualificationYear: 2004, barAdmissions: "Singapore Bar", currentFirm: "R&T", role: "PARTNER", practiceAreas: ["banking-finance"], jurisdiction: "Singapore", startYear: 2010 },
    { name: "Rachel Eng", title: "Senior Partner", qualificationYear: 1991, barAdmissions: "Singapore Bar", currentFirm: "R&T", role: "PARTNER", practiceAreas: ["corporate-ma"], jurisdiction: "Singapore", startYear: 1996 },

    // Norton Rose Fulbright — 3 lawyers
    { name: "Bob Kongyingyong", title: "Partner", qualificationYear: 2000, barAdmissions: "Thai Bar", currentFirm: "NRF", role: "PARTNER", practiceAreas: ["energy-natural-resources", "corporate-ma"], jurisdiction: "Thailand", startYear: 2013 },
    { name: "Scott Olson", title: "Partner", qualificationYear: 1998, barAdmissions: "New York Bar, Thai Bar", currentFirm: "NRF", role: "PARTNER", practiceAreas: ["banking-finance"], jurisdiction: "Thailand", startYear: 2015 },
    { name: "Wiriya Pupipat", title: "Associate", qualificationYear: 2015, barAdmissions: "Thai Bar", currentFirm: "NRF", role: "ASSOCIATE", practiceAreas: ["corporate-ma"], jurisdiction: "Thailand", startYear: 2017 },

    // Kudun & Partners — 3 lawyers (boutique spin-off from Baker)
    { name: "Kudun Sukhumananda", title: "Founding Partner", qualificationYear: 1995, barAdmissions: "Thai Bar, New York Bar", currentFirm: "Kudun", role: "PARTNER", practiceAreas: ["corporate-ma", "banking-finance"], jurisdiction: "Thailand", startYear: 2015, bio: "Founded Kudun & Partners after 20 years at Baker McKenzie. Recognized by Chambers and Legal 500 for corporate/M&A in Thailand.", previousFirm: "Baker", previousRole: "PARTNER", previousStart: 1998, previousEnd: 2015 },
    { name: "Pariyapol Kamolsilp", title: "Partner", qualificationYear: 2004, barAdmissions: "Thai Bar", currentFirm: "Kudun", role: "PARTNER", practiceAreas: ["real-estate-construction"], jurisdiction: "Thailand", startYear: 2015, previousFirm: "Baker", previousRole: "ASSOCIATE", previousStart: 2007, previousEnd: 2015 },
    { name: "Chinawat Assavapokee", title: "Partner", qualificationYear: 2006, barAdmissions: "Thai Bar", currentFirm: "Kudun", role: "PARTNER", practiceAreas: ["banking-finance"], jurisdiction: "Thailand", startYear: 2016, previousFirm: "Baker", previousRole: "ASSOCIATE", previousStart: 2009, previousEnd: 2016 },

    // Pisut & Partners — 3 lawyers (boutique spin-off from WCP)
    { name: "Pisut Rakwong", title: "Managing Partner", qualificationYear: 2003, barAdmissions: "Thai Bar", currentFirm: "Pisut", role: "PARTNER", practiceAreas: ["corporate-ma", "dispute-resolution"], jurisdiction: "Thailand", startYear: 2019, bio: "Left WCP in 2019 to found Pisut & Partners, focusing on M&A advisory and commercial litigation for mid-market clients.", previousFirm: "WCP", previousRole: "PARTNER", previousStart: 2008, previousEnd: 2019 },
    { name: "Nattavut Chaimanat", title: "Partner", qualificationYear: 2008, barAdmissions: "Thai Bar", currentFirm: "Pisut", role: "PARTNER", practiceAreas: ["dispute-resolution"], jurisdiction: "Thailand", startYear: 2019, previousFirm: "WCP", previousRole: "COUNSEL", previousStart: 2012, previousEnd: 2019 },
    { name: "Sirikanya Chongmankhong", title: "Senior Associate", qualificationYear: 2013, barAdmissions: "Thai Bar", currentFirm: "Pisut", role: "ASSOCIATE", practiceAreas: ["corporate-ma"], jurisdiction: "Thailand", startYear: 2020, previousFirm: "WCP", previousRole: "ASSOCIATE", previousStart: 2015, previousEnd: 2020 },
  ];

  const lawyers: Record<string, { id: string }> = {};
  for (const ld of lawyerData) {
    const lawyer = await prisma.lawyer.create({
      data: {
        name: ld.name,
        title: ld.title,
        qualificationYear: ld.qualificationYear,
        barAdmissions: ld.barAdmissions,
        bio: ld.bio ?? null,
      },
    });
    lawyers[ld.name] = lawyer;

    // Current firm link
    await prisma.firmLawyer.create({
      data: {
        firmId: firms[ld.currentFirm].id,
        lawyerId: lawyer.id,
        role: ld.role,
        startDate: new Date(`${ld.startYear}-01-01`),
        isCurrent: true,
      },
    });

    // Previous firm link (for alumni tracking)
    if (ld.previousFirm && ld.previousStart && ld.previousEnd) {
      await prisma.firmLawyer.create({
        data: {
          firmId: firms[ld.previousFirm].id,
          lawyerId: lawyer.id,
          role: ld.previousRole ?? "ASSOCIATE",
          startDate: new Date(`${ld.previousStart}-01-01`),
          endDate: new Date(`${ld.previousEnd}-01-01`),
          isCurrent: false,
        },
      });
    }

    // Lawyer practice areas
    for (const paSlug of ld.practiceAreas) {
      await prisma.lawyerPracticeArea.create({
        data: {
          lawyerId: lawyer.id,
          practiceAreaId: pa[paSlug].id,
          jurisdictionId: jur[ld.jurisdiction].id,
        },
      });
    }
  }

  console.log(`  Lawyers: ${lawyerData.length}`);

  // ─── Ranking Sources ─────────────────────────────────────────────────
  const rankingSources = await Promise.all([
    prisma.rankingSource.create({ data: { name: "Chambers Asia-Pacific 2025", slug: "chambers-2025", publisher: "CHAMBERS", editionYear: 2025 } }),
    prisma.rankingSource.create({ data: { name: "Chambers Asia-Pacific 2024", slug: "chambers-2024", publisher: "CHAMBERS", editionYear: 2024 } }),
    prisma.rankingSource.create({ data: { name: "Legal 500 Asia Pacific 2025", slug: "legal500-2025", publisher: "LEGAL500", editionYear: 2025 } }),
    prisma.rankingSource.create({ data: { name: "Legal 500 Asia Pacific 2024", slug: "legal500-2024", publisher: "LEGAL500", editionYear: 2024 } }),
    prisma.rankingSource.create({ data: { name: "Benchmark Litigation Asia-Pacific 2025", slug: "benchmark-2025", publisher: "BENCHMARK_LITIGATION", editionYear: 2025 } }),
    prisma.rankingSource.create({ data: { name: "AsiaLaw Profiles 2025", slug: "asialaw-2025", publisher: "ASIALAW", editionYear: 2025 } }),
    prisma.rankingSource.create({ data: { name: "AsiaLaw Profiles 2024", slug: "asialaw-2024", publisher: "ASIALAW", editionYear: 2024 } }),
  ]);

  const rs: Record<string, { id: string }> = {};
  for (const src of rankingSources) {
    rs[src.slug] = src;
  }
  console.log(`  Ranking Sources: ${rankingSources.length}`);

  // ─── Firm Rankings ─────────────────────────────────────────────────────
  const firmRankingData: { firm: string; source: string; pa: string; jur: string; band?: number; tier?: number; starRating?: number }[] = [
    // Baker McKenzie
    { firm: "Baker", source: "chambers-2025", pa: "corporate-ma", jur: "Thailand", band: 1 },
    { firm: "Baker", source: "chambers-2024", pa: "corporate-ma", jur: "Thailand", band: 1 },
    { firm: "Baker", source: "chambers-2025", pa: "dispute-resolution", jur: "Thailand", band: 2 },
    { firm: "Baker", source: "legal500-2025", pa: "corporate-ma", jur: "Thailand", tier: 1 },
    { firm: "Baker", source: "legal500-2024", pa: "corporate-ma", jur: "Thailand", tier: 1 },
    { firm: "Baker", source: "legal500-2025", pa: "employment-labour", jur: "Thailand", tier: 1 },
    { firm: "Baker", source: "asialaw-2025", pa: "corporate-ma", jur: "Thailand", starRating: 5 },

    // A&O
    { firm: "A&O", source: "chambers-2025", pa: "corporate-ma", jur: "Thailand", band: 1 },
    { firm: "A&O", source: "chambers-2024", pa: "corporate-ma", jur: "Thailand", band: 2 },
    { firm: "A&O", source: "chambers-2025", pa: "banking-finance", jur: "Thailand", band: 1 },
    { firm: "A&O", source: "legal500-2025", pa: "corporate-ma", jur: "Thailand", tier: 1 },
    { firm: "A&O", source: "legal500-2025", pa: "capital-markets", jur: "Thailand", tier: 2 },
    { firm: "A&O", source: "asialaw-2025", pa: "banking-finance", jur: "Thailand", starRating: 5 },

    // Linklaters
    { firm: "Linklaters", source: "chambers-2025", pa: "banking-finance", jur: "Thailand", band: 1 },
    { firm: "Linklaters", source: "chambers-2025", pa: "capital-markets", jur: "Thailand", band: 2 },
    { firm: "Linklaters", source: "legal500-2025", pa: "banking-finance", jur: "Thailand", tier: 1 },
    { firm: "Linklaters", source: "asialaw-2025", pa: "banking-finance", jur: "Thailand", starRating: 5 },

    // Tilleke & Gibbins
    { firm: "T&G", source: "chambers-2025", pa: "intellectual-property", jur: "Thailand", band: 1 },
    { firm: "T&G", source: "chambers-2024", pa: "intellectual-property", jur: "Thailand", band: 1 },
    { firm: "T&G", source: "legal500-2025", pa: "intellectual-property", jur: "Thailand", tier: 1 },
    { firm: "T&G", source: "legal500-2025", pa: "dispute-resolution", jur: "Thailand", tier: 2 },
    { firm: "T&G", source: "asialaw-2025", pa: "intellectual-property", jur: "Thailand", starRating: 5 },

    // WCP
    { firm: "WCP", source: "chambers-2025", pa: "corporate-ma", jur: "Thailand", band: 2 },
    { firm: "WCP", source: "chambers-2024", pa: "corporate-ma", jur: "Thailand", band: 2 },
    { firm: "WCP", source: "legal500-2025", pa: "corporate-ma", jur: "Thailand", tier: 2 },
    { firm: "WCP", source: "legal500-2025", pa: "banking-finance", jur: "Thailand", tier: 2 },
    { firm: "WCP", source: "asialaw-2025", pa: "corporate-ma", jur: "Thailand", starRating: 4 },

    // Chandler MHM
    { firm: "Chandler", source: "chambers-2025", pa: "corporate-ma", jur: "Thailand", band: 3 },
    { firm: "Chandler", source: "legal500-2025", pa: "energy-natural-resources", jur: "Thailand", tier: 2 },
    { firm: "Chandler", source: "asialaw-2025", pa: "corporate-ma", jur: "Thailand", starRating: 4 },

    // Rajah & Tann
    { firm: "R&T", source: "chambers-2025", pa: "dispute-resolution", jur: "Singapore", band: 1 },
    { firm: "R&T", source: "chambers-2025", pa: "corporate-ma", jur: "Singapore", band: 2 },
    { firm: "R&T", source: "legal500-2025", pa: "dispute-resolution", jur: "Singapore", tier: 1 },
    { firm: "R&T", source: "asialaw-2025", pa: "dispute-resolution", jur: "Singapore", starRating: 5 },

    // Norton Rose Fulbright
    { firm: "NRF", source: "chambers-2025", pa: "energy-natural-resources", jur: "Thailand", band: 2 },
    { firm: "NRF", source: "legal500-2025", pa: "energy-natural-resources", jur: "Thailand", tier: 1 },
    { firm: "NRF", source: "asialaw-2025", pa: "energy-natural-resources", jur: "Thailand", starRating: 4 },

    // Kudun & Partners
    { firm: "Kudun", source: "chambers-2025", pa: "corporate-ma", jur: "Thailand", band: 3 },
    { firm: "Kudun", source: "legal500-2025", pa: "corporate-ma", jur: "Thailand", tier: 3 },
    { firm: "Kudun", source: "legal500-2025", pa: "real-estate-construction", jur: "Thailand", tier: 2 },
    { firm: "Kudun", source: "asialaw-2025", pa: "corporate-ma", jur: "Thailand", starRating: 3 },

    // Pisut & Partners
    { firm: "Pisut", source: "legal500-2025", pa: "corporate-ma", jur: "Thailand", tier: 4 },
    { firm: "Pisut", source: "benchmark-2025", pa: "dispute-resolution", jur: "Thailand", starRating: 3 },
  ];

  for (const fr of firmRankingData) {
    await prisma.firmRanking.create({
      data: {
        firmId: firms[fr.firm].id,
        rankingSourceId: rs[fr.source].id,
        practiceAreaId: pa[fr.pa].id,
        jurisdictionId: jur[fr.jur].id,
        band: fr.band ?? null,
        tier: fr.tier ?? null,
        starRating: fr.starRating ?? null,
      },
    });
  }
  console.log(`  Firm Rankings: ${firmRankingData.length}`);

  // ─── Lawyer Rankings ───────────────────────────────────────────────────
  type LRC = "LEADING" | "RECOMMENDED" | "UP_AND_COMING" | "STAR" | "RECOGNISED";
  const lawyerRankingData: { lawyer: string; source: string; pa: string; jur: string; category: LRC }[] = [
    // Baker
    { lawyer: "Kullarat Phongsathaporn", source: "chambers-2025", pa: "corporate-ma", jur: "Thailand", category: "LEADING" },
    { lawyer: "Kullarat Phongsathaporn", source: "legal500-2025", pa: "corporate-ma", jur: "Thailand", category: "LEADING" },
    { lawyer: "Paralee Techanarong", source: "chambers-2025", pa: "dispute-resolution", jur: "Thailand", category: "RECOMMENDED" },
    { lawyer: "Dhiraphol Suwanprateep", source: "chambers-2025", pa: "intellectual-property", jur: "Thailand", category: "LEADING" },
    { lawyer: "Pimvimol Vipamaneerut", source: "legal500-2025", pa: "employment-labour", jur: "Thailand", category: "LEADING" },

    // A&O
    { lawyer: "Patrick Leysen", source: "chambers-2025", pa: "corporate-ma", jur: "Thailand", category: "LEADING" },
    { lawyer: "Patrick Leysen", source: "legal500-2025", pa: "capital-markets", jur: "Thailand", category: "LEADING" },
    { lawyer: "Montien Bunjarnondha", source: "chambers-2025", pa: "banking-finance", jur: "Thailand", category: "RECOMMENDED" },

    // Linklaters
    { lawyer: "John Frangos", source: "chambers-2025", pa: "banking-finance", jur: "Thailand", category: "LEADING" },
    { lawyer: "John Frangos", source: "legal500-2025", pa: "banking-finance", jur: "Thailand", category: "LEADING" },
    { lawyer: "Watcharapong Kunakorn", source: "chambers-2025", pa: "capital-markets", jur: "Thailand", category: "RECOMMENDED" },

    // Tilleke & Gibbins
    { lawyer: "Darani Vachanavuttivong", source: "chambers-2025", pa: "intellectual-property", jur: "Thailand", category: "STAR" },
    { lawyer: "Darani Vachanavuttivong", source: "legal500-2025", pa: "intellectual-property", jur: "Thailand", category: "LEADING" },
    { lawyer: "Alan Adcock", source: "chambers-2025", pa: "dispute-resolution", jur: "Thailand", category: "RECOMMENDED" },

    // WCP
    { lawyer: "Veeranuch Thammavaranucupt", source: "chambers-2025", pa: "corporate-ma", jur: "Thailand", category: "LEADING" },
    { lawyer: "Veeranuch Thammavaranucupt", source: "legal500-2025", pa: "corporate-ma", jur: "Thailand", category: "LEADING" },
    { lawyer: "Samart Poopoksakul", source: "chambers-2025", pa: "dispute-resolution", jur: "Thailand", category: "RECOMMENDED" },

    // Chandler
    { lawyer: "Albert Chandler", source: "chambers-2025", pa: "energy-natural-resources", jur: "Thailand", category: "LEADING" },

    // Rajah & Tann
    { lawyer: "Lee Eng Beng", source: "chambers-2025", pa: "dispute-resolution", jur: "Singapore", category: "STAR" },
    { lawyer: "Lee Eng Beng", source: "legal500-2025", pa: "dispute-resolution", jur: "Singapore", category: "LEADING" },
    { lawyer: "Rachel Eng", source: "chambers-2025", pa: "corporate-ma", jur: "Singapore", category: "LEADING" },
    { lawyer: "Chia Kim Huat", source: "legal500-2025", pa: "corporate-ma", jur: "Singapore", category: "LEADING" },

    // NRF
    { lawyer: "Bob Kongyingyong", source: "chambers-2025", pa: "energy-natural-resources", jur: "Thailand", category: "RECOMMENDED" },
    { lawyer: "Scott Olson", source: "legal500-2025", pa: "banking-finance", jur: "Thailand", category: "RECOMMENDED" },

    // Kudun
    { lawyer: "Kudun Sukhumananda", source: "chambers-2025", pa: "corporate-ma", jur: "Thailand", category: "RECOMMENDED" },
    { lawyer: "Kudun Sukhumananda", source: "legal500-2025", pa: "corporate-ma", jur: "Thailand", category: "RECOMMENDED" },

    // Pisut
    { lawyer: "Pisut Rakwong", source: "legal500-2025", pa: "corporate-ma", jur: "Thailand", category: "UP_AND_COMING" },
  ];

  for (const lr of lawyerRankingData) {
    await prisma.lawyerRanking.create({
      data: {
        lawyerId: lawyers[lr.lawyer].id,
        rankingSourceId: rs[lr.source].id,
        practiceAreaId: pa[lr.pa].id,
        jurisdictionId: jur[lr.jur].id,
        category: lr.category,
      },
    });
  }
  console.log(`  Lawyer Rankings: ${lawyerRankingData.length}`);

  // ─── NPS Recommendations ───────────────────────────────────────────────
  const npsData: { target: "FIRM" | "LAWYER"; firm?: string; lawyer?: string; user: string; nps: number; pa?: string; reason?: string }[] = [
    // Firm-level NPS
    { target: "FIRM", firm: "Baker", user: userSarah.id, nps: 9, pa: "corporate-ma", reason: "Excellent responsiveness and deep market knowledge" },
    { target: "FIRM", firm: "Baker", user: userJames.id, nps: 8, pa: "corporate-ma", reason: "Strong team but premium pricing" },
    { target: "FIRM", firm: "A&O", user: userSarah.id, nps: 9, pa: "banking-finance", reason: "Top-tier banking expertise" },
    { target: "FIRM", firm: "A&O", user: userJames.id, nps: 7, reason: "Good quality but slow turnaround on some matters" },
    { target: "FIRM", firm: "Linklaters", user: userSarah.id, nps: 8, pa: "banking-finance", reason: "Consistent quality" },
    { target: "FIRM", firm: "T&G", user: userSarah.id, nps: 10, pa: "intellectual-property", reason: "Best IP team in Thailand, hands down" },
    { target: "FIRM", firm: "T&G", user: userJames.id, nps: 9, pa: "intellectual-property", reason: "Very strong IP practice" },
    { target: "FIRM", firm: "WCP", user: userSarah.id, nps: 8, pa: "corporate-ma", reason: "Solid Thai firm with good M&A capability" },
    { target: "FIRM", firm: "WCP", user: userJames.id, nps: 7, reason: "Good but sometimes overstretched" },
    { target: "FIRM", firm: "Chandler", user: userSarah.id, nps: 7, pa: "energy-natural-resources", reason: "Strong on energy/infrastructure" },
    { target: "FIRM", firm: "R&T", user: userJames.id, nps: 9, pa: "dispute-resolution", reason: "Outstanding litigation team in Singapore" },
    { target: "FIRM", firm: "NRF", user: userSarah.id, nps: 7, pa: "energy-natural-resources" },
    { target: "FIRM", firm: "Kudun", user: userSarah.id, nps: 8, pa: "corporate-ma", reason: "Great value for boutique quality" },
    { target: "FIRM", firm: "Kudun", user: userJames.id, nps: 9, pa: "corporate-ma", reason: "More personal attention than big firms" },
    { target: "FIRM", firm: "Pisut", user: userSarah.id, nps: 6, reason: "Still building their team" },
    { target: "FIRM", firm: "Pisut", user: userJames.id, nps: 5, reason: "Too junior for complex matters" },

    // Lawyer-level NPS
    { target: "LAWYER", lawyer: "Kullarat Phongsathaporn", user: userSarah.id, nps: 10, pa: "corporate-ma", reason: "Best M&A lawyer we've worked with" },
    { target: "LAWYER", lawyer: "Patrick Leysen", user: userSarah.id, nps: 9, pa: "capital-markets", reason: "Excellent cross-border expertise" },
    { target: "LAWYER", lawyer: "Darani Vachanavuttivong", user: userJames.id, nps: 10, pa: "intellectual-property", reason: "Unmatched IP expertise in Thailand" },
    { target: "LAWYER", lawyer: "Veeranuch Thammavaranucupt", user: userSarah.id, nps: 9, pa: "corporate-ma" },
    { target: "LAWYER", lawyer: "Lee Eng Beng", user: userJames.id, nps: 10, pa: "dispute-resolution", reason: "World-class litigator" },
    { target: "LAWYER", lawyer: "Kudun Sukhumananda", user: userSarah.id, nps: 8, pa: "corporate-ma", reason: "Brings big-firm quality at boutique rates" },
    { target: "LAWYER", lawyer: "Kudun Sukhumananda", user: userJames.id, nps: 9, pa: "banking-finance" },
    { target: "LAWYER", lawyer: "John Frangos", user: userSarah.id, nps: 8, pa: "banking-finance" },
    { target: "LAWYER", lawyer: "Pisut Rakwong", user: userSarah.id, nps: 6, pa: "corporate-ma", reason: "Capable but needs more seasoning" },
  ];

  for (const n of npsData) {
    await prisma.recommendation.create({
      data: {
        targetType: n.target,
        firmId: n.firm ? firms[n.firm].id : null,
        lawyerId: n.lawyer ? lawyers[n.lawyer].id : null,
        recommenderId: n.user,
        npsScore: n.nps,
        practiceAreaId: n.pa ? pa[n.pa].id : null,
        reason: n.reason ?? null,
      },
    });
  }
  console.log(`  NPS Recommendations: ${npsData.length}`);

  // ─── Internal Ratings ──────────────────────────────────────────────────
  const ratingData: { target: "FIRM" | "LAWYER"; firm?: string; lawyer?: string; user: string; r: number; q: number; c: number; v: number; s: number; comment?: string }[] = [
    { target: "FIRM", firm: "Baker", user: userSarah.id, r: 5, q: 5, c: 4, v: 3, s: 5, comment: "Outstanding quality but expensive" },
    { target: "FIRM", firm: "Baker", user: userJames.id, r: 4, q: 5, c: 4, v: 3, s: 5 },
    { target: "FIRM", firm: "A&O", user: userSarah.id, r: 4, q: 5, c: 5, v: 3, s: 5 },
    { target: "FIRM", firm: "T&G", user: userSarah.id, r: 5, q: 5, c: 4, v: 4, s: 5, comment: "Best IP team, good value" },
    { target: "FIRM", firm: "WCP", user: userSarah.id, r: 4, q: 4, c: 4, v: 4, s: 4 },
    { target: "FIRM", firm: "Kudun", user: userSarah.id, r: 5, q: 4, c: 4, v: 5, s: 4, comment: "Great value boutique" },
    { target: "FIRM", firm: "Kudun", user: userJames.id, r: 5, q: 4, c: 3, v: 5, s: 4 },
    { target: "LAWYER", lawyer: "Kullarat Phongsathaporn", user: userSarah.id, r: 5, q: 5, c: 5, v: 4, s: 5 },
    { target: "LAWYER", lawyer: "Darani Vachanavuttivong", user: userJames.id, r: 5, q: 5, c: 4, v: 4, s: 5 },
    { target: "LAWYER", lawyer: "Kudun Sukhumananda", user: userSarah.id, r: 5, q: 4, c: 4, v: 5, s: 4 },
  ];

  for (const rd of ratingData) {
    const overall = (rd.r + rd.q + rd.c + rd.v + rd.s) / 5;
    await prisma.internalRating.create({
      data: {
        targetType: rd.target,
        firmId: rd.firm ? firms[rd.firm].id : null,
        lawyerId: rd.lawyer ? lawyers[rd.lawyer].id : null,
        ratedById: rd.user,
        responsiveness: rd.r,
        quality: rd.q,
        commercialAwareness: rd.c,
        value: rd.v,
        subjectMatterExpertise: rd.s,
        overallScore: overall,
        comment: rd.comment ?? null,
      },
    });
  }
  console.log(`  Internal Ratings: ${ratingData.length}`);

  // ─── Engagements ───────────────────────────────────────────────────────
  const engagementData: { firm: string; lawyer?: string; matter: string; type: "TRANSACTIONAL" | "LITIGATION" | "ADVISORY" | "REGULATORY" | "IP"; jur: string; entity: string; start: string; end?: string; outcome: "COMPLETED" | "ONGOING" | "WON" | "SETTLED"; fees?: number }[] = [
    { firm: "Baker", lawyer: "Kullarat Phongsathaporn", matter: "SCG Packaging Acquisition", type: "TRANSACTIONAL", jur: "Thailand", entity: "SCG Packaging", start: "2023-03-01", end: "2023-09-15", outcome: "COMPLETED", fees: 45000000 },
    { firm: "Baker", lawyer: "Pimvimol Vipamaneerut", matter: "Employment Restructuring Advisory", type: "ADVISORY", jur: "Thailand", entity: "SCG Chemicals", start: "2024-01-15", end: "2024-06-30", outcome: "COMPLETED", fees: 12000000 },
    { firm: "A&O", lawyer: "Patrick Leysen", matter: "Green Bond Issuance", type: "TRANSACTIONAL", jur: "Thailand", entity: "SCG", start: "2024-06-01", end: "2024-12-20", outcome: "COMPLETED", fees: 35000000 },
    { firm: "Linklaters", lawyer: "John Frangos", matter: "Project Finance — Solar Farm", type: "TRANSACTIONAL", jur: "Thailand", entity: "SCG Cleanergy", start: "2024-09-01", outcome: "ONGOING", fees: 28000000 },
    { firm: "T&G", lawyer: "Darani Vachanavuttivong", matter: "Trademark Portfolio Review", type: "IP", jur: "Thailand", entity: "SCG", start: "2024-04-01", end: "2024-08-15", outcome: "COMPLETED", fees: 8500000 },
    { firm: "WCP", lawyer: "Veeranuch Thammavaranucupt", matter: "JV Agreement — Vietnam Cement", type: "TRANSACTIONAL", jur: "Thailand", entity: "SCG", start: "2023-11-01", end: "2024-04-30", outcome: "COMPLETED", fees: 22000000 },
    { firm: "R&T", lawyer: "Lee Eng Beng", matter: "Singapore Arbitration — Supply Dispute", type: "LITIGATION", jur: "Singapore", entity: "SCG Trading", start: "2023-06-01", end: "2024-12-15", outcome: "WON", fees: 55000000 },
    { firm: "Kudun", lawyer: "Kudun Sukhumananda", matter: "Real Estate Acquisition Advisory", type: "TRANSACTIONAL", jur: "Thailand", entity: "SCG", start: "2025-01-15", outcome: "ONGOING", fees: 15000000 },
    { firm: "NRF", lawyer: "Bob Kongyingyong", matter: "Power Plant Regulatory Compliance", type: "REGULATORY", jur: "Thailand", entity: "SCG Cleanergy", start: "2024-02-01", end: "2024-07-30", outcome: "COMPLETED", fees: 9500000 },
    { firm: "Pisut", lawyer: "Pisut Rakwong", matter: "Supplier Contract Dispute", type: "LITIGATION", jur: "Thailand", entity: "SCG Chemicals", start: "2025-02-01", outcome: "ONGOING", fees: 5000000 },
  ];

  for (const e of engagementData) {
    await prisma.engagement.create({
      data: {
        firmId: firms[e.firm].id,
        lawyerId: e.lawyer ? lawyers[e.lawyer].id : null,
        matterName: e.matter,
        matterType: e.type,
        jurisdictionId: jur[e.jur].id,
        entityName: e.entity,
        startDate: new Date(e.start),
        endDate: e.end ? new Date(e.end) : null,
        outcome: e.outcome,
        totalFeesUsd: e.fees ?? null,
        createdById: userSarah.id,
      },
    });
  }
  console.log(`  Engagements: ${engagementData.length}`);

  // ─── Relationship Notes ────────────────────────────────────────────────
  const noteData: { target: "FIRM" | "LAWYER"; firm?: string; lawyer?: string; user: string; content: string; pinned: boolean }[] = [
    { target: "FIRM", firm: "Baker", user: userSarah.id, content: "Strong relationship with managing partner. Preferred firm for complex M&A.", pinned: true },
    { target: "FIRM", firm: "Kudun", user: userSarah.id, content: "Kudun team came from Baker — they know our business well. Consider for mid-market deals.", pinned: true },
    { target: "FIRM", firm: "Pisut", user: userJames.id, content: "New firm, still proving themselves. Monitor quality on current engagement.", pinned: false },
    { target: "LAWYER", lawyer: "Kullarat Phongsathaporn", user: userSarah.id, content: "Go-to lawyer for any Thailand M&A over $50M. Always available.", pinned: true },
    { target: "LAWYER", lawyer: "Lee Eng Beng", user: userJames.id, content: "Extraordinary litigator. Book well in advance — very busy.", pinned: true },
    { target: "LAWYER", lawyer: "Darani Vachanavuttivong", user: userSarah.id, content: "Knows our entire IP portfolio. Irreplaceable for trademark matters.", pinned: true },
  ];

  for (const n of noteData) {
    await prisma.relationshipNote.create({
      data: {
        targetType: n.target,
        firmId: n.firm ? firms[n.firm].id : null,
        lawyerId: n.lawyer ? lawyers[n.lawyer].id : null,
        authorId: n.user,
        content: n.content,
        isPinned: n.pinned,
      },
    });
  }
  console.log(`  Relationship Notes: ${noteData.length}`);

  // ─── User Preferences ──────────────────────────────────────────────────
  await prisma.userPreference.upsert({
    where: { userId: userSarah.id },
    update: {},
    create: {
      userId: userSarah.id,
      weightResponsiveness: 1.2,
      weightQuality: 1.5,
      weightCommercialAwareness: 1.0,
      weightValue: 0.8,
      weightSubjectMatterExpertise: 1.3,
      weightNps: 1.4,
    },
  });
  await prisma.userPreference.upsert({
    where: { userId: userJames.id },
    update: {},
    create: {
      userId: userJames.id,
      weightResponsiveness: 1.0,
      weightQuality: 1.0,
      weightCommercialAwareness: 1.2,
      weightValue: 1.5,
      weightSubjectMatterExpertise: 1.0,
      weightNps: 1.3,
    },
  });
  console.log("  User Preferences: 2");

  // ─── Entities & Cost Centers ─────────────────────────────────────────────
  const entityData = [
    { name: "The Siam Cement Public Company Limited", shortName: "SCC", country: "Thailand" },
    { name: "SCG International Corporation Co., Ltd.", shortName: "SCGi", country: "Thailand" },
    { name: "SCG Chemicals Public Company Limited", shortName: "SCGC", country: "Thailand" },
    { name: "SCG Packaging Public Company Limited", shortName: "SCGP", country: "Thailand" },
    { name: "SCG Cement-Building Materials Co., Ltd.", shortName: "SCG CBM", country: "Thailand" },
    { name: "SCG Decor Public Company Limited", shortName: "SCG Decor", country: "Thailand" },
    { name: "SCG Legal Counsel Limited", shortName: "SCG Legal", country: "Thailand" },
    { name: "SCG Cleanergy Co., Ltd.", shortName: "SCG Cleanergy", country: "Thailand" },
    { name: "SCG Smart Living Co., Ltd.", shortName: "SCG Smart Living", country: "Thailand" },
  ];

  const entities: Record<string, { id: string }> = {};
  for (const ed of entityData) {
    const entity = await prisma.entity.upsert({
      where: { name: ed.name },
      update: {},
      create: ed,
    });
    entities[ed.shortName] = entity;
  }
  console.log(`  Entities: ${entityData.length}`);

  const costCenterData = [
    { code: "7040", name: "Legal — General Counsel", entityShortName: "SCG Legal" },
    { code: "7041", name: "Legal — Litigation", entityShortName: "SCG Legal" },
    { code: "7042", name: "Legal — IP & Technology", entityShortName: "SCG Legal" },
    { code: "7043", name: "Legal — Compliance", entityShortName: "SCG Legal" },
    { code: "5010", name: "Procurement — Chemical", entityShortName: "SCGC" },
    { code: "5011", name: "Procurement — Packaging", entityShortName: "SCGP" },
    { code: "5020", name: "Business Development — CBM", entityShortName: "SCG CBM" },
    { code: "5021", name: "Business Development — Decor", entityShortName: "SCG Decor" },
    { code: "3010", name: "Treasury — Group", entityShortName: "SCC" },
    { code: "3011", name: "Treasury — International", entityShortName: "SCGi" },
    { code: "6010", name: "HR & Labour Relations", entityShortName: "SCC" },
    { code: "6011", name: "HR — Chemicals Division", entityShortName: "SCGC" },
    { code: "8010", name: "Corporate Planning — Group", entityShortName: "SCC" },
    { code: "8011", name: "Corporate Planning — International", entityShortName: "SCGi" },
    { code: "9010", name: "Sustainability & Clean Energy", entityShortName: "SCG Cleanergy" },
    { code: "9020", name: "Smart Living R&D", entityShortName: "SCG Smart Living" },
  ];

  for (const cc of costCenterData) {
    await prisma.costCenter.upsert({
      where: { code: cc.code },
      update: {},
      create: {
        code: cc.code,
        name: cc.name,
        entityId: entities[cc.entityShortName].id,
      },
    });
  }
  console.log(`  Cost Centers: ${costCenterData.length}`);

  // ─── Bulk Firms from seed-firms.json ──────────────────────────────────────
  // Import the 66 firms from data/seed-firms.json, skipping any that already exist
  const fs = await import("fs");
  const path = await import("path");
  const seedFirmsPath = path.join(__dirname, "..", "data", "seed-firms.json");
  const seedFirmsRaw = fs.readFileSync(seedFirmsPath, "utf-8");
  const seedFirms: { name: string; shortName: string | null; firmType: string; country: string; city: string; website: string }[] = JSON.parse(seedFirmsRaw);

  // Collect existing firm names to avoid duplicates
  const existingFirms = await prisma.firm.findMany({ select: { name: true } });
  const existingNames = new Set(existingFirms.map((f) => f.name));

  let bulkFirmCount = 0;
  for (const sf of seedFirms) {
    if (existingNames.has(sf.name)) continue;
    await prisma.firm.create({
      data: {
        name: sf.name,
        shortName: sf.shortName,
        firmType: sf.firmType as "FULL_SERVICE" | "BOUTIQUE" | "MID_SIZE" | "REGIONAL" | "ALSP",
        country: sf.country,
        city: sf.city,
        website: sf.website,
        panelStatus: "ACTIVE",
      },
    });
    existingNames.add(sf.name);
    bulkFirmCount++;
  }
  console.log(`  Bulk Firms (from seed-firms.json): ${bulkFirmCount} new (skipped ${seedFirms.length - bulkFirmCount} duplicates)`);

  // ─── Bulk Entities (SCG Subsidiaries) ─────────────────────────────────────
  // SCG has 350+ subsidiaries across 4 BUs in multiple countries.
  // We generate realistic entity names for each BU × country combination.

  const buDefs = [
    { prefix: "SCGC", fullName: "SCG Chemicals", segments: [
      "Olefins", "Polyethylene", "Polypropylene", "PVC", "Chlor-Alkali",
      "Performance Chemicals", "Petrochemicals Trading", "Specialty Polymers",
      "Chemicals Logistics", "Feedstock Supply", "Aromatics",
    ]},
    { prefix: "SCGP", fullName: "SCG Packaging", segments: [
      "Corrugated", "Flexible Packaging", "Fiber-Based", "Consumer Packaging",
      "Packaging Solutions", "Board & Paper", "Rigid Containers", "Recycling",
      "Printing & Converting", "Packaging Automation", "Sustainable Materials",
    ]},
    { prefix: "CBM", fullName: "SCG Cement-Building Materials", segments: [
      "Cement", "Ready-Mixed Concrete", "Mortar & Plaster", "Roof Tiles",
      "Ceramic Tiles", "Sanitaryware", "Fiber Cement", "Concrete Products",
      "Building Adhesives", "Distribution", "Pipe Systems",
    ]},
    { prefix: "SCGD", fullName: "SCG Decor", segments: [
      "Decor Solutions", "Surface Materials", "Design Studio", "Décor Distribution",
    ]},
    { prefix: "SCGE", fullName: "SCG Cleanergy", segments: [
      "Solar", "Wind Energy", "Battery Storage", "Green Hydrogen", "EV Charging",
    ]},
    { prefix: "SCGL", fullName: "SCG Smart Living", segments: [
      "Home Solutions", "Digital Products", "Retail", "Smart Home",
    ]},
    { prefix: "SCGi", fullName: "SCG International", segments: [
      "Trading", "Logistics", "Investment Holding", "Procurement",
    ]},
  ];

  const subCountries = [
    { name: "Thailand", code: "TH" },
    { name: "Vietnam", code: "VN" },
    { name: "Indonesia", code: "ID" },
    { name: "Philippines", code: "PH" },
    { name: "Myanmar", code: "MM" },
    { name: "Cambodia", code: "KH" },
    { name: "Laos", code: "LA" },
    { name: "Malaysia", code: "MY" },
    { name: "China", code: "CN" },
    { name: "India", code: "IN" },
    { name: "Japan", code: "JP" },
    { name: "United States", code: "US" },
    { name: "United Kingdom", code: "GB" },
    { name: "Germany", code: "DE" },
  ];

  // Collect existing entity names
  const existingEntities = await prisma.entity.findMany({ select: { name: true } });
  const existingEntityNames = new Set(existingEntities.map((e) => e.name));

  // Collect existing cost center codes
  const existingCCs = await prisma.costCenter.findMany({ select: { code: true } });
  const existingCCCodes = new Set(existingCCs.map((c) => c.code));

  let entityCount = existingEntities.length;
  let ccCount = existingCCs.length;
  let ccCodeCounter = 1000; // Start cost center codes from 1000

  for (const bu of buDefs) {
    for (const country of subCountries) {
      for (const segment of bu.segments) {
        if (entityCount >= 355) break; // Target ~350

        const entityName = `${bu.fullName} ${segment} (${country.name})`;
        const shortName = `${bu.prefix}-${segment.replace(/[^A-Za-z]/g, "").substring(0, 6)}-${country.code}`;

        if (existingEntityNames.has(entityName)) continue;

        const entity = await prisma.entity.create({
          data: {
            name: entityName,
            shortName: shortName,
            country: country.name,
          },
        });
        existingEntityNames.add(entityName);
        entityCount++;

        // Create 1 cost center per entity
        const ccCode = String(ccCodeCounter++);
        if (!existingCCCodes.has(ccCode)) {
          await prisma.costCenter.create({
            data: {
              code: ccCode,
              name: `${segment} — ${country.code}`,
              entityId: entity.id,
            },
          });
          existingCCCodes.add(ccCode);
          ccCount++;
        }
      }
      if (entityCount >= 355) break;
    }
    if (entityCount >= 355) break;
  }

  console.log(`  Total Entities (subsidiaries): ${entityCount}`);
  console.log(`  Total Cost Centers: ${ccCount}`);

  console.log("Seed complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
