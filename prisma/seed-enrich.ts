/**
 * seed-enrich.ts — Enrich bulk-imported firms with practice areas, lawyers, and rankings.
 *
 * Run:  npx tsx prisma/seed-enrich.ts
 *
 * Idempotent: uses upsert / findFirst checks so it can be re-run safely.
 * Deterministic: uses a simple string-hash seeded PRNG so output is stable across runs.
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const adapter = new PrismaLibSql({ url, ...(authToken ? { authToken } : {}) });
const prisma = new PrismaClient({ adapter });

// ─── Deterministic PRNG (mulberry32) ────────────────────────────────────────

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick n unique items from arr using rng */
function pickN<T>(arr: T[], n: number, rng: () => number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

/** Pick one item from arr using rng */
function pickOne<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Random int between min and max inclusive */
function randInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// ─── Country-specific lawyer name pools ─────────────────────────────────────

const NAME_POOLS: Record<string, { firstNames: string[]; lastNames: string[]; barAdmission: string }> = {
  Thailand: {
    firstNames: [
      "Somchai", "Pranee", "Thawatchai", "Siriporn", "Kittipong",
      "Ratchanee", "Nattapong", "Supatra", "Chaiwat", "Kanokwan",
      "Piyapong", "Narumol", "Wichai", "Patcharee", "Thanawat",
      "Parichat", "Anuwat", "Duangjai", "Somsak", "Kamolrat",
      "Suthep", "Wilaiwan", "Chatchai", "Jintana", "Teerawat",
      "Orapan", "Kritsada", "Mallika", "Worapat", "Sureeporn",
    ],
    lastNames: [
      "Srisawat", "Thongchai", "Wongsakul", "Chantrarath", "Prasertpol",
      "Boonchuay", "Limcharoen", "Petcharat", "Rattanakul", "Suthisan",
      "Narongrit", "Thaiprasert", "Wongtrakul", "Phromkhiri", "Kunakorn",
      "Chaisiri", "Sopaporn", "Boonmee", "Tantivorawong", "Sitthichok",
      "Pannachet", "Kanchanapan", "Sanguanwong", "Thamrongwit", "Rungruang",
    ],
    barAdmission: "Thai Bar",
  },
  Vietnam: {
    firstNames: [
      "Minh", "Lan", "Duc", "Huong", "Tuan",
      "Thao", "Hung", "Mai", "Quang", "Linh",
      "Hai", "Thanh", "Binh", "Phuong", "Dung",
      "Ngoc", "Long", "Hien", "Trung", "Trang",
      "Hoang", "Van", "Khanh", "Yen", "Anh",
    ],
    lastNames: [
      "Nguyen", "Tran", "Le", "Pham", "Hoang",
      "Phan", "Vu", "Dang", "Bui", "Do",
      "Ngo", "Duong", "Ly", "Truong", "Dinh",
    ],
    barAdmission: "Vietnam Bar Federation",
  },
  Indonesia: {
    firstNames: [
      "Budi", "Siti", "Andi", "Dewi", "Rizky",
      "Putri", "Agus", "Ratna", "Hendra", "Indah",
      "Bambang", "Wulan", "Denny", "Rina", "Fajar",
      "Lestari", "Wahyu", "Ayu", "Arif", "Kartika",
      "Surya", "Nadia", "Bayu", "Sri", "Rudi",
    ],
    lastNames: [
      "Pratama", "Wijaya", "Santoso", "Kusuma", "Hidayat",
      "Saputra", "Rachman", "Hakim", "Setiawan", "Nugroho",
      "Suryadi", "Purnama", "Hartono", "Wibowo", "Gunawan",
    ],
    barAdmission: "PERADI (Indonesian Bar Association)",
  },
  Singapore: {
    firstNames: [
      "Wei Ming", "Shu Fen", "Kah Wai", "Li Ting", "Jun Wei",
      "Mei Ling", "Zhi Hao", "Hui Min", "Kai Xiang", "Sze Ying",
      "Raj", "Priya", "Vikram", "Deepa", "Arjun",
      "Azmi", "Nurul", "Farhan", "Aisha", "Hafiz",
      "Jia Hao", "Xin Yi", "Yi Lin", "Cheng Wei", "Wen Xin",
    ],
    lastNames: [
      "Tan", "Lim", "Lee", "Wong", "Ng",
      "Goh", "Chua", "Ong", "Koh", "Teo",
      "Kumar", "Singh", "Nair", "Pillai", "Menon",
      "Abdullah", "Ibrahim", "Rashid", "Hassan", "Yusof",
    ],
    barAdmission: "Singapore Bar",
  },
  Philippines: {
    firstNames: [
      "Jose", "Maria", "Antonio", "Teresa", "Ricardo",
      "Carmen", "Miguel", "Patricia", "Fernando", "Rosario",
      "Carlos", "Lourdes", "Rafael", "Cristina", "Eduardo",
      "Maricris", "Roberto", "Angelica", "Francis", "Socorro",
      "Marco", "Dolores", "Ernesto", "Imelda", "Romulo",
    ],
    lastNames: [
      "Santos", "Reyes", "Cruz", "Ramos", "Garcia",
      "Mendoza", "Torres", "Villanueva", "Gonzales", "Fernandez",
      "Aquino", "Bautista", "Castillo", "Rivera", "Soriano",
    ],
    barAdmission: "Philippine Bar",
  },
  Malaysia: {
    firstNames: [
      "Ahmad", "Siti", "Muhammad", "Noraziah", "Hafiz",
      "Farah", "Azman", "Nuraisyah", "Rizal", "Aminah",
      "Wei Liang", "Siew Ping", "Kok Wai", "Mei Yee", "Chee Keong",
      "Suresh", "Anita", "Ravi", "Priya", "Ganesh",
      "Noor", "Azizah", "Ismail", "Zainab", "Kamal",
    ],
    lastNames: [
      "Abdullah", "Ibrahim", "Ismail", "Hassan", "Rahman",
      "Tan", "Lee", "Ng", "Wong", "Lim",
      "Nair", "Kumar", "Pillai", "Subramaniam", "Krishnan",
    ],
    barAdmission: "Malaysian Bar",
  },
  Japan: {
    firstNames: [
      "Takeshi", "Yuko", "Hiroshi", "Akiko", "Kenji",
      "Naoko", "Masashi", "Emi", "Daisuke", "Ayumi",
      "Kazuhiro", "Sachiko", "Taro", "Reiko", "Shinichi",
      "Haruka", "Yuichi", "Maiko", "Nobuyuki", "Kanako",
      "Ryota", "Misaki", "Shota", "Chie", "Takuya",
    ],
    lastNames: [
      "Tanaka", "Yamamoto", "Watanabe", "Suzuki", "Takahashi",
      "Ito", "Nakamura", "Kobayashi", "Saito", "Yoshida",
      "Matsumoto", "Inoue", "Kimura", "Hayashi", "Shimizu",
    ],
    barAdmission: "Japan Federation of Bar Associations (Bengoshi)",
  },
  China: {
    firstNames: [
      "Wei", "Jing", "Hao", "Min", "Lei",
      "Xia", "Yong", "Fang", "Chen", "Li",
      "Tao", "Yan", "Jun", "Hong", "Ping",
      "Xin", "Bo", "Mei", "Gang", "Ying",
      "Chao", "Rui", "Qiang", "Hua", "Lin",
    ],
    lastNames: [
      "Wang", "Li", "Zhang", "Liu", "Chen",
      "Yang", "Huang", "Wu", "Zhou", "Xu",
      "Sun", "Ma", "Hu", "Guo", "Lin",
    ],
    barAdmission: "All China Lawyers Association",
  },
  "South Korea": {
    firstNames: [
      "Joon-ho", "Soo-jin", "Min-seok", "Hye-won", "Sang-woo",
      "Eun-ji", "Tae-hyun", "Ji-yeon", "Dong-hyuk", "Yun-ah",
      "Seung-hoon", "Na-young", "Woo-jin", "Se-hee", "Hyun-woo",
      "Mi-ran", "Jun-seo", "Bo-young", "Ki-hoon", "So-yeon",
      "Sung-ho", "Da-hye", "Young-min", "Ha-na", "Jae-won",
    ],
    lastNames: [
      "Kim", "Lee", "Park", "Choi", "Jung",
      "Kang", "Cho", "Yoon", "Jang", "Lim",
      "Shin", "Han", "Oh", "Seo", "Kwon",
    ],
    barAdmission: "Korean Bar Association",
  },
  "United Kingdom": {
    firstNames: [
      "James", "Sarah", "William", "Charlotte", "Edward",
      "Victoria", "Henry", "Eleanor", "George", "Catherine",
      "Thomas", "Rebecca", "Oliver", "Alexandra", "Benjamin",
      "Harriet", "Sebastian", "Philippa", "Nicholas", "Caroline",
      "Alexander", "Madeleine", "Richard", "Elizabeth", "Andrew",
    ],
    lastNames: [
      "Taylor", "Brown", "Wilson", "Davies", "Evans",
      "Thomas", "Roberts", "Walker", "Wright", "Thompson",
      "Green", "Harris", "Clark", "Lewis", "Young",
    ],
    barAdmission: "Solicitor, England & Wales",
  },
  Germany: {
    firstNames: [
      "Hans", "Anna", "Klaus", "Sabine", "Markus",
      "Petra", "Stefan", "Katrin", "Andreas", "Monika",
      "Tobias", "Claudia", "Jens", "Martina", "Bernd",
      "Ulrike", "Matthias", "Birgit", "Christian", "Susanne",
      "Felix", "Johanna", "Maximilian", "Katharina", "Friedrich",
    ],
    lastNames: [
      "Mueller", "Schmidt", "Schneider", "Fischer", "Weber",
      "Wagner", "Becker", "Hofmann", "Richter", "Klein",
      "Schroeder", "Neumann", "Braun", "Zimmermann", "Hartmann",
    ],
    barAdmission: "Rechtsanwalt, Germany",
  },
  "United States": {
    firstNames: [
      "Michael", "Jennifer", "Robert", "Elizabeth", "David",
      "Katherine", "Christopher", "Margaret", "Daniel", "Laura",
      "John", "Stephanie", "Matthew", "Rachel", "Jonathan",
      "Christine", "Brian", "Melissa", "Patrick", "Andrea",
      "Kevin", "Amy", "Steven", "Nicole", "Mark",
    ],
    lastNames: [
      "Johnson", "Williams", "Anderson", "Martinez", "Robinson",
      "Miller", "Davis", "Wilson", "Thompson", "Sullivan",
      "Kennedy", "Patterson", "Morrison", "Henderson", "Campbell",
    ],
    barAdmission: "New York Bar",
  },
};

// ─── Practice area assignment logic ─────────────────────────────────────────

const PRACTICE_AREA_SLUGS = [
  "corporate-ma",
  "dispute-resolution",
  "banking-finance",
  "capital-markets",
  "employment-labour",
  "intellectual-property",
  "real-estate-construction",
  "energy-natural-resources",
];

/** How many practice areas to assign based on firm type */
const PA_COUNT: Record<string, [number, number]> = {
  FULL_SERVICE: [3, 5],
  MID_SIZE: [2, 3],
  BOUTIQUE: [1, 2],
  REGIONAL: [2, 4],
  ALSP: [1, 2],
};

/**
 * Weight certain practice areas higher for specific firm types / countries.
 * All firms get Corporate & M&A as the most likely, but we bias based on type.
 */
function weightedPracticeAreas(
  firmType: string,
  _country: string,
  allSlugs: string[],
  rng: () => number
): string[] {
  const [min, max] = PA_COUNT[firmType] ?? [2, 3];
  const count = randInt(min, max, rng);

  // Corporate & M&A is always included for FULL_SERVICE firms
  if (firmType === "FULL_SERVICE") {
    const rest = allSlugs.filter((s) => s !== "corporate-ma");
    const picked = pickN(rest, count - 1, rng);
    return ["corporate-ma", ...picked];
  }

  return pickN(allSlugs, count, rng);
}

// ─── Jurisdiction mapping ───────────────────────────────────────────────────

/** Map firm country to jurisdiction name (as stored in DB) */
const COUNTRY_TO_JURISDICTION: Record<string, string> = {
  Thailand: "Thailand",
  Vietnam: "Vietnam",
  Indonesia: "Indonesia",
  Singapore: "Singapore",
  Philippines: "Philippines",
  Malaysia: "Malaysia",
  Japan: "Japan",
  China: "China",
  "South Korea": "South Korea",
  "United Kingdom": "England & Wales",
  Germany: "Germany",
  "United States": "New York",
  "Hong Kong": "Hong Kong SAR",
  Myanmar: "Myanmar",
};

// ─── Lawyer title patterns ──────────────────────────────────────────────────

const PARTNER_TITLES = [
  "Managing Partner",
  "Senior Partner",
  "Partner",
  "Partner",
  "Partner",
  "Equity Partner",
];

const ASSOCIATE_TITLES = [
  "Senior Associate",
  "Senior Associate",
  "Associate",
  "Associate",
  "Associate",
  "Of Counsel",
];

// ─── Main enrichment logic ──────────────────────────────────────────────────

async function main() {
  console.log("=== Seed Enrichment: Adding practice areas, lawyers, and rankings ===\n");

  // ─── 1. Load reference data from DB ─────────────────────────────────────
  const practiceAreas = await prisma.practiceArea.findMany();
  const jurisdictions = await prisma.jurisdiction.findMany();
  const rankingSources = await prisma.rankingSource.findMany();

  const paBySlug = Object.fromEntries(practiceAreas.map((p) => [p.slug, p]));
  const jurByName = Object.fromEntries(jurisdictions.map((j) => [j.name, j]));
  const rsBySlug = Object.fromEntries(rankingSources.map((r) => [r.slug, r]));

  console.log(`  Loaded ${practiceAreas.length} practice areas`);
  console.log(`  Loaded ${jurisdictions.length} jurisdictions`);
  console.log(`  Loaded ${rankingSources.length} ranking sources\n`);

  // ─── 2. Find all firms that have 0 practice areas ───────────────────────
  const allFirms = await prisma.firm.findMany({
    include: {
      practiceAreas: { select: { id: true } },
      firmLawyers: { select: { id: true } },
      rankings: { select: { id: true } },
    },
  });

  const emptyFirms = allFirms.filter(
    (f) => f.practiceAreas.length === 0 && f.firmLawyers.length === 0
  );

  console.log(`  Total firms: ${allFirms.length}`);
  console.log(`  Firms needing enrichment: ${emptyFirms.length}\n`);

  if (emptyFirms.length === 0) {
    console.log("  Nothing to enrich -- all firms already have data.");
    return;
  }

  // ─── 3. Enrich each firm ────────────────────────────────────────────────
  let totalPAs = 0;
  let totalLawyers = 0;
  let totalRankings = 0;

  for (const firm of emptyFirms) {
    const rng = mulberry32(hashString(firm.name));
    const jurName = COUNTRY_TO_JURISDICTION[firm.country] ?? null;
    const jurisdiction = jurName ? jurByName[jurName] ?? null : null;

    // ── Practice Areas ──────────────────────────────────────────────────
    const selectedSlugs = weightedPracticeAreas(
      firm.firmType,
      firm.country,
      PRACTICE_AREA_SLUGS,
      rng
    );

    const firmPAs: { practiceAreaId: string; jurisdictionId: string | null }[] = [];

    for (const slug of selectedSlugs) {
      const pa = paBySlug[slug];
      if (!pa) continue;

      // Upsert to be idempotent
      const existing = await prisma.firmPracticeArea.findFirst({
        where: {
          firmId: firm.id,
          practiceAreaId: pa.id,
          jurisdictionId: jurisdiction?.id ?? null,
        },
      });

      if (!existing) {
        await prisma.firmPracticeArea.create({
          data: {
            firmId: firm.id,
            practiceAreaId: pa.id,
            jurisdictionId: jurisdiction?.id ?? null,
          },
        });
      }
      firmPAs.push({
        practiceAreaId: pa.id,
        jurisdictionId: jurisdiction?.id ?? null,
      });
    }
    totalPAs += firmPAs.length;

    // ── Lawyers ─────────────────────────────────────────────────────────
    const namePool = NAME_POOLS[firm.country] ?? NAME_POOLS["United States"];
    const lawyerCount = firm.firmType === "BOUTIQUE" ? randInt(2, 3, rng) :
                        firm.firmType === "MID_SIZE" ? randInt(2, 4, rng) :
                        firm.firmType === "REGIONAL" ? randInt(3, 4, rng) :
                        randInt(3, 4, rng); // FULL_SERVICE

    // Track used name combos to avoid duplicates within one firm
    const usedNames = new Set<string>();

    for (let li = 0; li < lawyerCount; li++) {
      // Generate a unique name for this firm
      let firstName: string;
      let lastName: string;
      let fullName: string;
      let attempts = 0;
      do {
        firstName = pickOne(namePool.firstNames, rng);
        lastName = pickOne(namePool.lastNames, rng);
        fullName = `${firstName} ${lastName}`;
        attempts++;
      } while (usedNames.has(fullName) && attempts < 20);
      usedNames.add(fullName);

      const isPartner = li < Math.ceil(lawyerCount / 2);
      const title = isPartner
        ? pickOne(PARTNER_TITLES, rng)
        : pickOne(ASSOCIATE_TITLES, rng);
      const role = isPartner ? "PARTNER" as const : "ASSOCIATE" as const;
      const qualYear = isPartner
        ? randInt(1990, 2008, rng)
        : randInt(2008, 2018, rng);

      // Bar admissions -- some senior partners have dual admission
      let barAdmissions = namePool.barAdmission;
      if (isPartner && li === 0 && rng() > 0.5) {
        // Lead partner sometimes has international admission too
        const extra = firm.country === "Thailand" ? ", New York Bar" :
                      firm.country === "Singapore" ? ", England & Wales" :
                      firm.country === "Japan" ? ", New York Bar" :
                      firm.country === "South Korea" ? ", New York Bar" :
                      firm.country === "China" ? ", New York Bar" :
                      firm.country === "Vietnam" ? ", New York Bar" :
                      firm.country === "Indonesia" ? ", New York Bar" :
                      firm.country === "Philippines" ? ", New York Bar" :
                      firm.country === "Malaysia" ? ", England & Wales" :
                      "";
        barAdmissions += extra;
      }

      // Check if lawyer already exists (by name -- close enough for seed data)
      let lawyer = await prisma.lawyer.findFirst({
        where: { name: fullName },
      });

      if (!lawyer) {
        lawyer = await prisma.lawyer.create({
          data: {
            name: fullName,
            title,
            qualificationYear: qualYear,
            barAdmissions,
          },
        });
      }

      // FirmLawyer link (check for existence)
      const existingLink = await prisma.firmLawyer.findFirst({
        where: {
          firmId: firm.id,
          lawyerId: lawyer.id,
        },
      });
      if (!existingLink) {
        const startYear = Math.max(qualYear + randInt(2, 8, rng), 2000);
        await prisma.firmLawyer.create({
          data: {
            firmId: firm.id,
            lawyerId: lawyer.id,
            role,
            startDate: new Date(`${startYear}-01-01`),
            isCurrent: true,
          },
        });
      }

      // LawyerPracticeArea links
      // Partners get all of the firm's PAs; associates get 1-2
      const lawyerPASlugs = isPartner
        ? selectedSlugs
        : pickN(selectedSlugs, randInt(1, 2, rng), rng);

      for (const slug of lawyerPASlugs) {
        const pa = paBySlug[slug];
        if (!pa) continue;

        const existingLPA = await prisma.lawyerPracticeArea.findFirst({
          where: {
            lawyerId: lawyer.id,
            practiceAreaId: pa.id,
            jurisdictionId: jurisdiction?.id ?? null,
          },
        });
        if (!existingLPA) {
          await prisma.lawyerPracticeArea.create({
            data: {
              lawyerId: lawyer.id,
              practiceAreaId: pa.id,
              jurisdictionId: jurisdiction?.id ?? null,
            },
          });
        }
      }

      totalLawyers++;
    }

    // ── Rankings ─────────────────────────────────────────────────────────
    // Assign Chambers 2025 and/or Legal500 2025 rankings based on firm type
    const firmRankingCount =
      firm.firmType === "FULL_SERVICE" ? randInt(2, 3, rng) :
      firm.firmType === "REGIONAL" ? randInt(1, 3, rng) :
      firm.firmType === "MID_SIZE" ? randInt(1, 2, rng) :
      1; // BOUTIQUE

    // Determine band/tier ranges based on firm type
    const bandRange: [number, number] =
      firm.firmType === "FULL_SERVICE" ? [1, 2] :
      firm.firmType === "MID_SIZE" ? [2, 3] :
      firm.firmType === "BOUTIQUE" ? [3, 4] :
      [2, 3]; // REGIONAL

    const tierRange: [number, number] =
      firm.firmType === "FULL_SERVICE" ? [1, 2] :
      firm.firmType === "MID_SIZE" ? [2, 3] :
      firm.firmType === "BOUTIQUE" ? [3, 4] :
      [2, 3]; // REGIONAL

    if (jurisdiction) {
      // Choose which practice areas get ranked (top ones from our assignment)
      const rankedPASlugs = pickN(selectedSlugs, Math.min(firmRankingCount, selectedSlugs.length), rng);

      // Available ranking source slugs that exist in the DB
      const chambersSources = ["chambers-2025", "chambers-2024"].filter((s) => rsBySlug[s]);
      const legal500Sources = ["legal500-2025", "legal500-2024"].filter((s) => rsBySlug[s]);
      const asialawSources = ["asialaw-2025", "asialaw-2024"].filter((s) => rsBySlug[s]);

      for (let ri = 0; ri < rankedPASlugs.length; ri++) {
        const paSlug = rankedPASlugs[ri];
        const pa = paBySlug[paSlug];
        if (!pa) continue;

        // Chambers ranking (most firms get one)
        if (chambersSources.length > 0 && rng() > 0.2) {
          const sourceSlug = chambersSources[0]; // use 2025 edition
          const rs = rsBySlug[sourceSlug];
          const band = randInt(bandRange[0], bandRange[1], rng);

          const existingRanking = await prisma.firmRanking.findFirst({
            where: {
              firmId: firm.id,
              rankingSourceId: rs.id,
              practiceAreaId: pa.id,
              jurisdictionId: jurisdiction.id,
            },
          });
          if (!existingRanking) {
            await prisma.firmRanking.create({
              data: {
                firmId: firm.id,
                rankingSourceId: rs.id,
                practiceAreaId: pa.id,
                jurisdictionId: jurisdiction.id,
                band,
                tier: null,
                starRating: null,
              },
            });
            totalRankings++;
          }
        }

        // Legal500 ranking
        if (legal500Sources.length > 0 && rng() > 0.25) {
          const sourceSlug = legal500Sources[0];
          const rs = rsBySlug[sourceSlug];
          const tier = randInt(tierRange[0], tierRange[1], rng);

          const existingRanking = await prisma.firmRanking.findFirst({
            where: {
              firmId: firm.id,
              rankingSourceId: rs.id,
              practiceAreaId: pa.id,
              jurisdictionId: jurisdiction.id,
            },
          });
          if (!existingRanking) {
            await prisma.firmRanking.create({
              data: {
                firmId: firm.id,
                rankingSourceId: rs.id,
                practiceAreaId: pa.id,
                jurisdictionId: jurisdiction.id,
                band: null,
                tier,
                starRating: null,
              },
            });
            totalRankings++;
          }
        }

        // AsiaLaw star rating (APAC firms only, first PA only)
        if (
          asialawSources.length > 0 &&
          ri === 0 &&
          ["Thailand", "Vietnam", "Indonesia", "Singapore", "Philippines",
           "Malaysia", "Japan", "China", "South Korea"].includes(firm.country)
        ) {
          const sourceSlug = asialawSources[0];
          const rs = rsBySlug[sourceSlug];
          const stars = firm.firmType === "FULL_SERVICE" ? randInt(4, 5, rng) :
                        firm.firmType === "MID_SIZE" ? randInt(3, 4, rng) :
                        randInt(2, 3, rng);

          const existingRanking = await prisma.firmRanking.findFirst({
            where: {
              firmId: firm.id,
              rankingSourceId: rs.id,
              practiceAreaId: pa.id,
              jurisdictionId: jurisdiction.id,
            },
          });
          if (!existingRanking) {
            await prisma.firmRanking.create({
              data: {
                firmId: firm.id,
                rankingSourceId: rs.id,
                practiceAreaId: pa.id,
                jurisdictionId: jurisdiction.id,
                band: null,
                tier: null,
                starRating: stars,
              },
            });
            totalRankings++;
          }
        }
      }
    }

    console.log(
      `  Enriching ${firm.name}: ${firmPAs.length} practice areas, ` +
      `${lawyerCount} lawyers, ${jurisdiction ? "rankings added" : "no jurisdiction match (rankings skipped)"}`
    );
  }

  // ─── Summary ──────────────────────────────────────────────────────────
  console.log("\n=== Enrichment Complete ===");
  console.log(`  Firms enriched: ${emptyFirms.length}`);
  console.log(`  Practice area links created: ${totalPAs}`);
  console.log(`  Lawyers created: ${totalLawyers}`);
  console.log(`  Rankings created: ${totalRankings}`);
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
