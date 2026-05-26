"use server";

import { revalidatePath } from "next/cache";
import { parseCsv } from "@/lib/csv";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/current-user";

export type TimesheetImportResult = {
  success: boolean;
  uploadId: string | null;
  imported: number;
  skipped: number;
  errors: string[];
};

/**
 * Parse and store timesheet CSV.
 * Expected columns (MatterSphere export):
 *   Client No., Matter No., Matter Short Name, Activity, Activity Description,
 *   Lawyer Initials, Entry FE Rate, Date Worked, Original Units, Billing Units,
 *   Original THB, Billing THB, Bill Number, Adjusted By, Date Adjusted
 */
export async function importTimesheetCsv(
  _prev: TimesheetImportResult,
  formData: FormData
): Promise<TimesheetImportResult> {
  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, uploadId: null, imported: 0, skipped: 0, errors: ["No file provided"] };
  }

  const text = await file.text();
  const rows = parseCsv(text);

  if (rows.length < 2) {
    return {
      success: false,
      uploadId: null,
      imported: 0,
      skipped: 0,
      errors: ["CSV must have a header row and at least one data row"],
    };
  }

  const headers = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, "_").replace(/\./g, ""));
  const colIdx = (name: string) => {
    const idx = headers.indexOf(name);
    return idx;
  };

  // Map known column aliases
  const COL_MAP: Record<string, string[]> = {
    client_no: ["client_no", "client_no,"],
    matter_no: ["matter_no", "matter_no,"],
    matter_short_name: ["matter_short_name"],
    activity: ["activity"],
    activity_description: ["activity_description"],
    lawyer_initials: ["lawyer_initials"],
    entry_rate: ["entry_fe_rate", "entry_rate"],
    date_worked: ["date_worked"],
    billing_units: ["billing_units"],
    billing_amount: ["billing_thb", "billing_amount"],
  };

  function findCol(key: string): number {
    const aliases = COL_MAP[key] ?? [key];
    for (const alias of aliases) {
      const idx = colIdx(alias);
      if (idx !== -1) return idx;
    }
    // Fuzzy match
    for (const alias of aliases) {
      const idx = headers.findIndex((h) => h.includes(alias));
      if (idx !== -1) return idx;
    }
    return -1;
  }

  const user = await getCurrentUser();

  // Create the upload record
  const upload = await prisma.timesheetUpload.create({
    data: {
      fileName: file.name,
      totalRows: rows.length - 1,
      uploadedById: user.id,
    },
  });

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Parse date like "05-May-26" or "23-Apr-26"
  function parseDate(str: string): Date | null {
    if (!str) return null;
    // Try "DD-MMM-YY" format
    const match = str.match(/^(\d{1,2})-(\w{3})-(\d{2})$/);
    if (match) {
      const day = parseInt(match[1]);
      const monthStr = match[2];
      const year = parseInt(match[3]);
      const months: Record<string, number> = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
      };
      const month = months[monthStr];
      if (month === undefined) return null;
      // Assume 20xx for 2-digit years
      const fullYear = year >= 50 ? 1900 + year : 2000 + year;
      return new Date(fullYear, month, day);
    }
    // Try standard date parse
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  // Clean the =''7040'' Excel formula artifacts
  function cleanField(val: string): string {
    return val.replace(/^=''/g, "").replace(/''$/g, "").trim();
  }

  // Batch entries for bulk insert
  const entries: Array<{
    uploadId: string;
    rowNumber: number;
    clientNo: string | null;
    matterNo: string | null;
    matterShortName: string | null;
    activity: string | null;
    activityDescription: string | null;
    lawyerInitials: string | null;
    entryRate: number | null;
    dateWorked: Date | null;
    billingUnits: number | null;
    billingAmount: number | null;
    currencyCode: string;
  }> = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    try {
      const clientNo = findCol("client_no") >= 0 ? cleanField(row[findCol("client_no")]) : null;
      const matterNo = findCol("matter_no") >= 0 ? cleanField(row[findCol("matter_no")]) : null;
      const matterShortName = findCol("matter_short_name") >= 0 ? row[findCol("matter_short_name")] : null;
      const activity = findCol("activity") >= 0 ? row[findCol("activity")] : null;
      const activityDescription = findCol("activity_description") >= 0 ? row[findCol("activity_description")] : null;
      const lawyerInitials = findCol("lawyer_initials") >= 0 ? row[findCol("lawyer_initials")] : null;

      const rateStr = findCol("entry_rate") >= 0 ? row[findCol("entry_rate")] : "";
      const entryRate = rateStr ? parseFloat(rateStr.replace(/,/g, "")) : null;

      const dateStr = findCol("date_worked") >= 0 ? row[findCol("date_worked")] : "";
      const dateWorked = parseDate(dateStr);

      const unitsStr = findCol("billing_units") >= 0 ? row[findCol("billing_units")] : "";
      const billingUnits = unitsStr ? parseFloat(unitsStr.replace(/,/g, "")) : null;

      const amountStr = findCol("billing_amount") >= 0 ? row[findCol("billing_amount")] : "";
      const billingAmount = amountStr ? parseFloat(amountStr.replace(/,/g, "")) : null;

      // Skip completely empty rows
      if (!matterNo && !activityDescription) {
        skipped++;
        continue;
      }

      entries.push({
        uploadId: upload.id,
        rowNumber: rowNum,
        clientNo,
        matterNo,
        matterShortName,
        activity,
        activityDescription,
        lawyerInitials,
        entryRate: entryRate && !isNaN(entryRate) ? entryRate : null,
        dateWorked,
        billingUnits: billingUnits && !isNaN(billingUnits) ? billingUnits : null,
        billingAmount: billingAmount && !isNaN(billingAmount) ? billingAmount : null,
        currencyCode: "THB",
      });

      imported++;
    } catch (err) {
      errors.push(`Row ${rowNum}: ${err instanceof Error ? err.message : "Parse error"}`);
      skipped++;
    }
  }

  // Bulk insert
  if (entries.length > 0) {
    // SQLite doesn't support createMany well, so batch in chunks
    const CHUNK_SIZE = 50;
    for (let c = 0; c < entries.length; c += CHUNK_SIZE) {
      const chunk = entries.slice(c, c + CHUNK_SIZE);
      await Promise.all(
        chunk.map((entry) => prisma.timesheetEntry.create({ data: entry }))
      );
    }
  }

  await prisma.timesheetUpload.update({
    where: { id: upload.id },
    data: { processedRows: imported },
  });

  revalidatePath("/insights");

  return {
    success: errors.length === 0,
    uploadId: upload.id,
    imported,
    skipped,
    errors: errors.slice(0, 20),
  };
}
