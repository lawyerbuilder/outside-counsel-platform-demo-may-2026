import { redirect } from "next/navigation";
import { Brain, FileSpreadsheet, Clock } from "lucide-react";
import { getDemoRole, canSee } from "@/server/demo-role";
import { listTimesheetUploads, getAnalysis } from "@/server/timesheet";
import { PageHeader } from "@/components/shared/PageHeader";
import { InsightsClient } from "./InsightsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Timesheet Intelligence",
};

export default async function InsightsPage() {
  const role = await getDemoRole();
  if (!canSee(role, "insights")) redirect("/dashboard");

  const uploads = await listTimesheetUploads();

  // Load analysis for the most recent analyzed upload
  const latestAnalyzed = uploads.find((u) => u.status === "ANALYZED");
  const latestAnalysis = latestAnalyzed
    ? await getAnalysis(latestAnalyzed.id)
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timesheet Intelligence"
        description="Extract insights from timesheet narratives — identify external counsel patterns, practice area trends, and outsourcing decisions"
      />

      <InsightsClient
        uploads={uploads.map((u) => ({
          id: u.id,
          fileName: u.fileName,
          status: u.status,
          totalRows: u.totalRows,
          processedRows: u.processedRows,
          entryCount: u._count.entries,
          uploadedBy: u.uploadedBy.name ?? "—",
          createdAt: u.createdAt.toISOString(),
          errorMessage: u.errorMessage,
        }))}
        latestAnalysis={latestAnalysis}
        latestAnalyzedUploadId={latestAnalyzed?.id ?? null}
      />
    </div>
  );
}
