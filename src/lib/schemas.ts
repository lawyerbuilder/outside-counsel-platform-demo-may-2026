import { z } from "zod";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const firmTypeEnum = z.enum([
  "FULL_SERVICE",
  "BOUTIQUE",
  "MID_SIZE",
  "REGIONAL",
]);
export type FirmTypeEnum = z.infer<typeof firmTypeEnum>;

export const lawyerRoleEnum = z.enum([
  "PARTNER",
  "OF_COUNSEL",
  "ASSOCIATE",
  "COUNSEL",
  "OTHER",
]);
export type LawyerRoleEnum = z.infer<typeof lawyerRoleEnum>;

export const regionEnum = z.enum(["APAC", "EMEA", "AMERICAS", "GLOBAL"]);
export type RegionEnum = z.infer<typeof regionEnum>;

export const rankingPublisherEnum = z.enum([
  "CHAMBERS",
  "LEGAL500",
  "BENCHMARK_LITIGATION",
  "ASIALAW",
]);
export type RankingPublisherEnum = z.infer<typeof rankingPublisherEnum>;

export const lawyerRankingCategoryEnum = z.enum([
  "LEADING",
  "RECOMMENDED",
  "UP_AND_COMING",
  "STAR",
  "RECOGNISED",
]);
export type LawyerRankingCategoryEnum = z.infer<typeof lawyerRankingCategoryEnum>;

// ─── Firm schemas ────────────────────────────────────────────────────────────

export const createFirmSchema = z.object({
  name: z.string().min(1, "Firm name is required").max(200),
  shortName: z.string().max(50).optional(),
  country: z.string().min(1, "Country is required").max(100),
  city: z.string().min(1, "City is required").max(100),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  firmType: firmTypeEnum,
  headcount: z.coerce.number().int().positive().optional(),
  foundedYear: z.coerce
    .number()
    .int()
    .min(1800)
    .max(new Date().getFullYear())
    .optional(),
  parentFirmId: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateFirmInput = z.infer<typeof createFirmSchema>;

export const updateFirmSchema = createFirmSchema.partial();
export type UpdateFirmInput = z.infer<typeof updateFirmSchema>;

// ─── Lawyer schemas ──────────────────────────────────────────────────────────

export const createLawyerSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Must be a valid email").optional().or(z.literal("")),
  title: z.string().max(100).optional(),
  qualificationYear: z.coerce
    .number()
    .int()
    .min(1950)
    .max(new Date().getFullYear())
    .optional(),
  barAdmissions: z.string().max(500).optional(),
  bio: z.string().max(5000).optional(),
  linkedInUrl: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
});

export type CreateLawyerInput = z.infer<typeof createLawyerSchema>;

export const updateLawyerSchema = createLawyerSchema.partial();
export type UpdateLawyerInput = z.infer<typeof updateLawyerSchema>;

// ─── FirmLawyer schemas ──────────────────────────────────────────────────────

export const createFirmLawyerSchema = z.object({
  firmId: z.string().min(1),
  lawyerId: z.string().min(1),
  role: lawyerRoleEnum,
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isCurrent: z.boolean().default(true),
  notes: z.string().max(1000).optional(),
});

export type CreateFirmLawyerInput = z.infer<typeof createFirmLawyerSchema>;

// ─── Filter schemas ──────────────────────────────────────────────────────────

export const firmFilterSchema = z.object({
  search: z.string().optional(),
  country: z.string().optional(),
  firmType: firmTypeEnum.optional(),
  practiceAreaId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
});

export type FirmFilterInput = z.infer<typeof firmFilterSchema>;

export const lawyerFilterSchema = z.object({
  search: z.string().optional(),
  firmId: z.string().optional(),
  practiceAreaId: z.string().optional(),
  jurisdictionId: z.string().optional(),
  role: lawyerRoleEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
});

export type LawyerFilterInput = z.infer<typeof lawyerFilterSchema>;

// ─── Display helpers ─────────────────────────────────────────────────────────

export const FIRM_TYPE_LABELS: Record<FirmTypeEnum, string> = {
  FULL_SERVICE: "Full Service",
  BOUTIQUE: "Boutique",
  MID_SIZE: "Mid-Size",
  REGIONAL: "Regional",
};

export const LAWYER_ROLE_LABELS: Record<LawyerRoleEnum, string> = {
  PARTNER: "Partner",
  OF_COUNSEL: "Of Counsel",
  ASSOCIATE: "Associate",
  COUNSEL: "Counsel",
  OTHER: "Other",
};

export const RANKING_PUBLISHER_LABELS: Record<RankingPublisherEnum, string> = {
  CHAMBERS: "Chambers",
  LEGAL500: "Legal 500",
  BENCHMARK_LITIGATION: "Benchmark Litigation",
  ASIALAW: "AsiaLaw",
};

export const LAWYER_RANKING_CATEGORY_LABELS: Record<LawyerRankingCategoryEnum, string> = {
  LEADING: "Leading",
  RECOMMENDED: "Recommended",
  UP_AND_COMING: "Up & Coming",
  STAR: "Star",
  RECOGNISED: "Recognised",
};

// ─── Ranking schemas ─────────────────────────────────────────────────────────

export const createRankingSourceSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  publisher: rankingPublisherEnum,
  editionYear: z.coerce.number().int().min(2000).max(new Date().getFullYear() + 1),
  url: z.string().url().optional().or(z.literal("")),
});

export type CreateRankingSourceInput = z.infer<typeof createRankingSourceSchema>;

export const createFirmRankingSchema = z.object({
  firmId: z.string().min(1, "Firm is required"),
  rankingSourceId: z.string().min(1, "Source is required"),
  practiceAreaId: z.string().min(1, "Practice area is required"),
  jurisdictionId: z.string().min(1, "Jurisdiction is required"),
  band: z.coerce.number().int().min(1).max(6).optional(),
  tier: z.coerce.number().int().min(1).max(5).optional(),
  starRating: z.coerce.number().int().min(1).max(5).optional(),
  editorialExcerpt: z.string().max(2000).optional(),
  url: z.string().url().optional().or(z.literal("")),
});

export type CreateFirmRankingInput = z.infer<typeof createFirmRankingSchema>;

export const createLawyerRankingSchema = z.object({
  lawyerId: z.string().min(1, "Lawyer is required"),
  rankingSourceId: z.string().min(1, "Source is required"),
  practiceAreaId: z.string().min(1, "Practice area is required"),
  jurisdictionId: z.string().min(1, "Jurisdiction is required"),
  category: lawyerRankingCategoryEnum,
  editorialExcerpt: z.string().max(2000).optional(),
  url: z.string().url().optional().or(z.literal("")),
});

export type CreateLawyerRankingInput = z.infer<typeof createLawyerRankingSchema>;

export const rankingFilterSchema = z.object({
  publisher: rankingPublisherEnum.optional(),
  practiceAreaId: z.string().optional(),
  jurisdictionId: z.string().optional(),
  editionYear: z.coerce.number().int().optional(),
});

export type RankingFilterInput = z.infer<typeof rankingFilterSchema>;

// ─── User Preference schemas ────────────────────────────────────────────────

export const updatePreferenceSchema = z.object({
  weightResponsiveness: z.coerce.number().min(0).max(2).default(1.0),
  weightQuality: z.coerce.number().min(0).max(2).default(1.0),
  weightCommercialAwareness: z.coerce.number().min(0).max(2).default(1.0),
  weightValue: z.coerce.number().min(0).max(2).default(1.0),
  weightSubjectMatterExpertise: z.coerce.number().min(0).max(2).default(1.0),
  weightNps: z.coerce.number().min(0).max(2).default(1.0),
});

export type UpdatePreferenceInput = z.infer<typeof updatePreferenceSchema>;

export const PREFERENCE_LABELS: Record<keyof UpdatePreferenceInput, string> = {
  weightResponsiveness: "Responsiveness",
  weightQuality: "Quality of Work",
  weightCommercialAwareness: "Commercial Awareness",
  weightValue: "Value for Money",
  weightSubjectMatterExpertise: "Subject-Matter Expertise",
  weightNps: "Peer Sentiment (NPS)",
};

export const PREFERENCE_DESCRIPTIONS: Record<keyof UpdatePreferenceInput, string> = {
  weightResponsiveness: "How quickly they respond and meet deadlines",
  weightQuality: "Thoroughness, accuracy, and depth of legal analysis",
  weightCommercialAwareness: "Understanding of business context and commercial implications",
  weightValue: "Cost efficiency and value relative to fees charged",
  weightSubjectMatterExpertise: "Depth of expertise in the specific area of law",
  weightNps: "How strongly peers recommend them (Net Promoter Score)",
};

// ─── Directory filter schemas ───────────────────────────────────────────────

export const directoryFilterSchema = z.object({
  search: z.string().optional(),
  type: z.enum(["firms", "lawyers"]).default("firms"),
  practiceAreaId: z.string().optional(),
  jurisdictionId: z.string().optional(),
  firmType: firmTypeEnum.optional(),
  minNps: z.coerce.number().int().min(-100).max(100).optional(),
});

export type DirectoryFilterInput = z.infer<typeof directoryFilterSchema>;

// ─── Ranking display helpers ─────────────────────────────────────────────────

/** Chambers bands: 1 = best */
export function formatBand(band: number): string {
  return `Band ${band}`;
}

/** Legal 500 tiers: 1 = best */
export function formatTier(tier: number): string {
  return `Tier ${tier}`;
}

/** Star ratings for Benchmark */
export function formatStars(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

/** Badge variant based on ranking quality */
export function rankingBadgeVariant(
  publisher: RankingPublisherEnum,
  value: number
): "green" | "teal" | "blue" | "amber" | "gray" {
  if (publisher === "CHAMBERS") {
    if (value <= 2) return "green";
    if (value <= 4) return "teal";
    return "gray";
  }
  if (publisher === "LEGAL500") {
    if (value <= 2) return "green";
    if (value <= 3) return "teal";
    return "gray";
  }
  // Benchmark / AsiaLaw star ratings (higher = better)
  if (value >= 4) return "green";
  if (value >= 3) return "teal";
  return "gray";
}
