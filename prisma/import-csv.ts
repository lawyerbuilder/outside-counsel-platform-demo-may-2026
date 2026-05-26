/**
 * Direct CSV import script — bypasses the web server.
 * Run: npx tsx prisma/import-csv.ts <path-to-csv>
 */
import { readFileSync } from "fs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseDate(str: string): Date | null {
  if (!str) return null;
  const match = str.match(/^(\d{1,2})-(\w{3})-(\d{2})$/);
  if (match) {
    const day = parseInt(match[1]);
    const months: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    const month = months[match[2]];
    if (month === undefined) return null;
    const year = parseInt(match[3]);
    return new Date(year >= 50 ? 1900 + year : 2000 + year, month, day);
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function clean(val: string): string {
  return val.replace(/^=''/g, "").replace(/''$/g, "").trim();
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npx tsx prisma/import-csv.ts <path-to-csv>");
    process.exit(1);
  }

  console.log(`Reading ${filePath}...`);
  const rawText = readFileSync(filePath, "utf-8");
  const lines = rawText.split(/\r?\n/).filter((l) => l.trim());

  const rows = lines.map(parseCsvLine);
  if (rows.length < 2) {
    console.error("CSV too small");
    process.exit(1);
  }

  const headers = rows[0].map((h) =>
    h.toLowerCase().replace(/\s+/g, "_").replace(/\./g, "")
  );
  console.log(`Headers: ${headers.join(", ")}`);

  function findCol(key: string): number {
    const aliases: Record<string, string[]> = {
      client_no: ["client_no"],
      matter_no: ["matter_no"],
      matter_short_name: ["matter_short_name"],
      activity: ["activity"],
      activity_description: ["activity_description"],
      lawyer_initials: ["lawyer_initials"],
      entry_rate: ["entry_fe_rate", "entry_rate"],
      date_worked: ["date_worked"],
      billing_units: ["billing_units"],
      billing_amount: ["billing_thb", "billing_amount"],
    };
    const keys = aliases[key] ?? [key];
    for (const k of keys) {
      const idx = headers.indexOf(k);
      if (idx !== -1) return idx;
    }
    for (const k of keys) {
      const idx = headers.findIndex((h) => h.includes(k));
      if (idx !== -1) return idx;
    }
    return -1;
  }

  // Find default user
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("No user found in database");
    process.exit(1);
  }

  const fileName = filePath.split(/[\\/]/).pop() ?? "import.csv";

  const upload = await prisma.timesheetUpload.create({
    data: {
      fileName,
      totalRows: rows.length - 1,
      uploadedById: user.id,
    },
  });
  console.log(`Created upload ${upload.id} (${rows.length - 1} rows)`);

  let imported = 0;
  const CHUNK = 50;
  const dataRows = rows.slice(1);

  for (let c = 0; c < dataRows.length; c += CHUNK) {
    const chunk = dataRows.slice(c, c + CHUNK);
    await Promise.all(
      chunk.map((row, idx) => {
        const matterNo = findCol("matter_no") >= 0 ? clean(row[findCol("matter_no")]) : null;
        const desc = findCol("activity_description") >= 0 ? row[findCol("activity_description")] : null;
        if (!matterNo && !desc) return Promise.resolve();
        imported++;

        const rateStr = findCol("entry_rate") >= 0 ? row[findCol("entry_rate")] : "";
        const unitsStr = findCol("billing_units") >= 0 ? row[findCol("billing_units")] : "";
        const amountStr = findCol("billing_amount") >= 0 ? row[findCol("billing_amount")] : "";
        const dateStr = findCol("date_worked") >= 0 ? row[findCol("date_worked")] : "";

        return prisma.timesheetEntry.create({
          data: {
            uploadId: upload.id,
            rowNumber: c + idx + 2,
            clientNo: findCol("client_no") >= 0 ? clean(row[findCol("client_no")]) : null,
            matterNo,
            matterShortName: findCol("matter_short_name") >= 0 ? row[findCol("matter_short_name")] : null,
            activity: findCol("activity") >= 0 ? row[findCol("activity")] : null,
            activityDescription: desc,
            lawyerInitials: findCol("lawyer_initials") >= 0 ? row[findCol("lawyer_initials")] : null,
            entryRate: rateStr ? parseFloat(rateStr.replace(/,/g, "")) || null : null,
            dateWorked: parseDate(dateStr),
            billingUnits: unitsStr ? parseFloat(unitsStr.replace(/,/g, "")) || null : null,
            billingAmount: amountStr ? parseFloat(amountStr.replace(/,/g, "")) || null : null,
            currencyCode: "THB",
          },
        });
      })
    );
    process.stdout.write(`\r  Imported ${Math.min(c + CHUNK, dataRows.length)}/${dataRows.length}`);
  }

  await prisma.timesheetUpload.update({
    where: { id: upload.id },
    data: { processedRows: imported },
  });

  console.log(`\n✅ Imported ${imported} entries into upload ${upload.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
