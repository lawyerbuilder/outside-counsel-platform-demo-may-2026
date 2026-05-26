import { prisma } from "./db";
import type { TimesheetUploadStatus } from "@/generated/prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FirmMention = {
  name: string;
  shortName: string;
  mentionCount: number;
  matters: string[];
  activityTypes: string[];
  matchedFirmId: string | null;
  matchedFirmName: string | null;
  entityType: "LAW_FIRM" | "CONSULTING" | "VENDOR" | "OTHER";
};

export type MatterClassification = {
  matterNo: string;
  name: string;
  practiceArea: string;
  jurisdiction: string | null;
  usesExternalCounsel: boolean;
  externalFirms: string[];
  complexity: "COMPLEX" | "STANDARD" | "ROUTINE";
  totalBillingUnits: number;
  dateRange: { from: string; to: string };
};

export type OutsourcePattern = {
  practiceArea: string;
  outsourceRate: number; // 0-100%
  typicalFirms: string[];
  observation: string;
};

export type TimesheetAnalysis = {
  summary: {
    totalEntries: number;
    totalMatters: number;
    dateRange: { from: string; to: string };
    totalBillingUnits: number;
    totalBillingAmount: number;
    currencyCode: string;
    lawyerCount: number;
  };
  firmMentions: FirmMention[];
  matterClassifications: MatterClassification[];
  outsourcePatterns: OutsourcePattern[];
  keyInsights: string[];
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function listTimesheetUploads() {
  return prisma.timesheetUpload.findMany({
    include: {
      uploadedBy: { select: { name: true } },
      _count: { select: { entries: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTimesheetUpload(id: string) {
  return prisma.timesheetUpload.findUnique({
    where: { id },
    include: {
      uploadedBy: { select: { name: true } },
      _count: { select: { entries: true } },
    },
  });
}

export async function getTimesheetEntries(uploadId: string) {
  return prisma.timesheetEntry.findMany({
    where: { uploadId },
    orderBy: [{ matterNo: "asc" }, { dateWorked: "asc" }],
  });
}

export async function getAnalysis(
  uploadId: string
): Promise<TimesheetAnalysis | null> {
  const upload = await prisma.timesheetUpload.findUnique({
    where: { id: uploadId },
    select: { analysisJson: true },
  });
  if (!upload?.analysisJson) return null;
  try {
    return JSON.parse(upload.analysisJson) as TimesheetAnalysis;
  } catch {
    return null;
  }
}

export async function updateUploadStatus(
  id: string,
  status: TimesheetUploadStatus,
  extra?: { analysisJson?: string; errorMessage?: string; processedRows?: number }
) {
  return prisma.timesheetUpload.update({
    where: { id },
    data: { status, ...extra },
  });
}

// ─── Cross-reference with OCP data ───────────────────────────────────────────

export async function getOcpCrossReference() {
  const [firms, engagements, practiceAreas] = await Promise.all([
    prisma.firm.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        shortName: true,
        country: true,
        practiceAreas: {
          include: { practiceArea: true, jurisdiction: true },
        },
        _count: { select: { engagements: true, invoices: true } },
      },
    }),
    prisma.engagement.findMany({
      where: { deletedAt: null },
      include: {
        firm: { select: { id: true, name: true, shortName: true } },
        jurisdiction: true,
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.practiceArea.findMany({
      select: { id: true, name: true, slug: true },
    }),
  ]);

  return { firms, engagements, practiceAreas };
}

// ─── Firm-specific timesheet mentions ─────────────────────────────────────────

export type FirmTimesheetMention = {
  uploadId: string;
  uploadFileName: string;
  analyzedAt: string;
  mention: FirmMention;
};

export async function getFirmTimesheetMentions(
  firmId: string
): Promise<FirmTimesheetMention[]> {
  const uploads = await prisma.timesheetUpload.findMany({
    where: { status: "ANALYZED", analysisJson: { not: null } },
    select: {
      id: true,
      fileName: true,
      createdAt: true,
      analysisJson: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const mentions: FirmTimesheetMention[] = [];

  for (const upload of uploads) {
    if (!upload.analysisJson) continue;
    try {
      const analysis = JSON.parse(upload.analysisJson) as TimesheetAnalysis;
      for (const fm of analysis.firmMentions) {
        if (fm.matchedFirmId === firmId) {
          mentions.push({
            uploadId: upload.id,
            uploadFileName: upload.fileName,
            analyzedAt: upload.createdAt.toISOString(),
            mention: fm,
          });
        }
      }
    } catch {
      // skip malformed JSON
    }
  }

  return mentions;
}

// ─── Aggregated insights across all uploads ──────────────────────────────────

export async function getAggregatedInsights(): Promise<{
  uploads: Awaited<ReturnType<typeof listTimesheetUploads>>;
  mergedAnalysis: TimesheetAnalysis | null;
}> {
  const uploads = await listTimesheetUploads();
  const analyzedUploads = uploads.filter((u) => u.status === "ANALYZED");

  if (analyzedUploads.length === 0) {
    return { uploads, mergedAnalysis: null };
  }

  // For now, return the most recent analysis
  // In the future, merge multiple uploads
  const latestUpload = analyzedUploads[0];
  const analysis = await getAnalysis(latestUpload.id);

  return { uploads, mergedAnalysis: analysis };
}
