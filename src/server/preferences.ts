import { prisma } from "./db";
import type { UpdatePreferenceInput } from "@/lib/schemas";

export type UserWeights = {
  weightResponsiveness: number;
  weightQuality: number;
  weightCommercialAwareness: number;
  weightValue: number;
  weightSubjectMatterExpertise: number;
  weightNps: number;
};

const DEFAULT_WEIGHTS: UserWeights = {
  weightResponsiveness: 1.0,
  weightQuality: 1.0,
  weightCommercialAwareness: 1.0,
  weightValue: 1.0,
  weightSubjectMatterExpertise: 1.0,
  weightNps: 1.0,
};

export async function getUserPreference(userId: string): Promise<UserWeights> {
  const pref = await prisma.userPreference.findUnique({
    where: { userId },
  });
  if (!pref) return DEFAULT_WEIGHTS;
  return {
    weightResponsiveness: pref.weightResponsiveness,
    weightQuality: pref.weightQuality,
    weightCommercialAwareness: pref.weightCommercialAwareness,
    weightValue: pref.weightValue,
    weightSubjectMatterExpertise: pref.weightSubjectMatterExpertise,
    weightNps: pref.weightNps,
  };
}

export async function upsertUserPreference(
  userId: string,
  data: UpdatePreferenceInput
): Promise<UserWeights> {
  const pref = await prisma.userPreference.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
  return {
    weightResponsiveness: pref.weightResponsiveness,
    weightQuality: pref.weightQuality,
    weightCommercialAwareness: pref.weightCommercialAwareness,
    weightValue: pref.weightValue,
    weightSubjectMatterExpertise: pref.weightSubjectMatterExpertise,
    weightNps: pref.weightNps,
  };
}
