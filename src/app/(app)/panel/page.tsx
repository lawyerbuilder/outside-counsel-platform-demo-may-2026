import { redirect } from "next/navigation";
import { Building2, ShieldCheck, AlertTriangle, Compass } from "lucide-react";
import { getDemoRole, canSee } from "@/server/demo-role";
import { getPanelComposition, getPanelFirmRows } from "@/server/panel";
import { PageHeader } from "@/components/shared/PageHeader";
import { PanelTable } from "@/components/panel/PanelTable";
import { StartReviewButton } from "@/components/panel/StartReviewButton";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function PanelPage() {
  const role = await getDemoRole();
  if (!canSee(role, "panel")) redirect("/dashboard");

  const [composition, rows, latestReview] = await Promise.all([
    getPanelComposition(),
    getPanelFirmRows(),
    prisma.panelReview.findFirst({ orderBy: { createdAt: "desc" } }),
  ]);

  const cards = [
    {
      label: "Active on Panel",
      value: composition["ACTIVE"] ?? 0,
      icon: ShieldCheck,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "On Probation",
      value: composition["PROBATION"] ?? 0,
      icon: AlertTriangle,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "Prospective",
      value: composition["PROSPECTIVE"] ?? 0,
      icon: Compass,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Exited",
      value: composition["EXITED"] ?? 0,
      icon: Building2,
      color: "text-gray-500 bg-gray-50",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Panel Management"
        description={
          latestReview
            ? `Last review: ${latestReview.title} (${new Date(latestReview.createdAt).toLocaleDateString()})`
            : "Panel composition, spend, performance, and review actions"
        }
        action={<StartReviewButton />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="surface p-4">
              <div className={`inline-flex rounded-md p-2 ${card.color}`}>
                <Icon size={18} />
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          Firms with Panel Activity ({rows.length})
        </h2>
        <PanelTable rows={rows} />
      </div>
    </div>
  );
}
