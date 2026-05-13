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
