import { z } from "zod";

export const complexityTierSchema = z.enum(["COMPLEX", "STANDARD", "ROUTINE"]);
export const urgencySchema = z.enum(["ROUTINE", "URGENT", "CRITICAL"]);
export const feeTypeSchema = z.enum(["HOURLY", "FIXED", "CAPPED", "PHASED_FIXED", "BLENDED", "SUCCESS"]);

export const evaluationCriterionSchema = z.object({
  name: z.string().min(1),
  weight: z.number().min(0).max(100),
  description: z.string().optional(),
});

export const evaluationCriteriaSchema = z
  .array(evaluationCriterionSchema)
  .min(1, "At least one evaluation criterion is required")
  .refine(
    (criteria) => {
      const total = criteria.reduce((sum, c) => sum + c.weight, 0);
      return Math.abs(total - 100) < 0.01;
    },
    { message: "Evaluation criteria weights must sum to 100%" }
  );

export const contactPersonSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.string().optional(),
});

export const rfpStep1Schema = z.object({
  costCenterCode: z.string().min(1, "Cost center code is required"),
  contactPersons: z.array(contactPersonSchema).min(1, "At least one contact person is required"),
});

export const rfpStep2Schema = z.object({
  jurisdictionId: z.string().min(1, "Jurisdiction is required"),
});

export const rfpStep3Schema = z.object({
  practiceAreaId: z.string().min(1, "Practice area is required"),
});

export const rfpStep4Schema = z.object({
  complexityTier: complexityTierSchema,
});

export const rfpStep5Schema = z.object({
  description: z.string().min(10, "Please provide at least a brief description"),
});

export const rfpStep6Schema = z.object({
  urgency: urgencySchema,
});

export const rfpStep7Schema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  scopeDocument: z.string().optional(),
  pricingRequirements: z.string().optional(),
});

export const rfpStep7ExtSchema = z.object({
  title: z.string().min(3),
  matterNumber: z.string().optional(),
  scopeDocument: z.string().optional(),
  pricingRequirements: z.string().optional(),
});

export const rfpStep8Schema = z.object({
  evaluationCriteria: evaluationCriteriaSchema,
  requestFeeCap: z.boolean(),
  requestSuggestedBudget: z.boolean(),
  additionalRequirements: z.string().optional(),
  deadline: z.string().min(1, "Deadline is required"),
});

export const rfpStep9Schema = z.object({
  firmIds: z.array(z.string()).min(1, "Select at least one firm"),
});

export const draftRfpSchema = z.object({
  costCenterId: z.string().optional(),
  contactPersons: z.string().optional(),
  jurisdictionId: z.string().optional(),
  practiceAreaId: z.string().optional(),
  complexityTier: complexityTierSchema.optional(),
  description: z.string().optional(),
  urgency: urgencySchema.optional(),
  title: z.string().optional(),
  matterNumber: z.string().optional(),
  scopeDocument: z.string().optional(),
  pricingRequirements: z.string().optional(),
  evaluationCriteria: z.string().optional(),
  requestFeeCap: z.boolean().optional(),
  requestSuggestedBudget: z.boolean().optional(),
  additionalRequirements: z.string().optional(),
  deadline: z.string().optional(),
});

export const feePhaseSchema = z.object({
  phase: z.string().min(1).max(200),
  feeCents: z.number().int().nonnegative(),
});

// Length caps matter here: this schema accepts unauthenticated input from the
// public portal (POST /api/respond/[token]).
export const invitationResponseSchema = z.object({
  proposedFeeCents: z.number().int().positive().optional(),
  proposedFeeType: feeTypeSchema.optional(),
  currencyCode: z.string().length(3).optional(),
  feeBreakdown: z.array(feePhaseSchema).max(30).optional(),
  staffingPlan: z.string().max(20000).optional(),
  responseDocument: z.string().max(20000).optional(),
  aiDisclosure: z.string().max(20000).optional(),
});

export const evaluationScoreSchema = z.object({
  criterionName: z.string().min(1),
  criterionWeight: z.number().min(0).max(100),
  score: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export const proposalExtractionSchema = z.object({
  feeType: feeTypeSchema.optional(),
  currencyCode: z.string().length(3).optional(),
  phases: z
    .array(
      z.object({
        phase: z.string(),
        feeCents: z.number().int().nonnegative(),
      })
    )
    .optional(),
  staffingPlan: z.string().optional(),
  narrative: z.string().optional(),
  totalFeeCents: z.number().int().nonnegative().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type ProposalExtraction = z.infer<typeof proposalExtractionSchema>;
export type EvaluationCriterion = z.infer<typeof evaluationCriterionSchema>;
export type DraftRfpInput = z.infer<typeof draftRfpSchema>;
export type InvitationResponseInput = z.infer<typeof invitationResponseSchema>;
export type EvaluationScoreInput = z.infer<typeof evaluationScoreSchema>;
