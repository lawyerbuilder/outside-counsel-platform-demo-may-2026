import { PageHeader } from "@/components/ui/PageHeader";
import { LawyerRankingForm } from "@/components/forms/LawyerRankingForm";
import { createLawyerRankingAction } from "@/server/actions/ranking-actions";
import { listLawyersForSelect, listPracticeAreas, listJurisdictions } from "@/server/reference-data";
import { listRankingSources } from "@/server/rankings";

export const dynamic = "force-dynamic";

export default async function NewLawyerRankingPage() {
  const [lawyers, practiceAreas, jurisdictions, sources] = await Promise.all([
    listLawyersForSelect(),
    listPracticeAreas(),
    listJurisdictions(),
    listRankingSources(),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Add Lawyer Ranking"
        breadcrumbs={[
          { label: "Admin" },
          { label: "Rankings", href: "/admin/rankings" },
          { label: "Rank Lawyer" },
        ]}
      />
      <div className="surface p-6">
        <LawyerRankingForm
          action={createLawyerRankingAction}
          lawyers={lawyers}
          practiceAreas={practiceAreas.map((p) => ({ id: p.id, name: p.name }))}
          jurisdictions={jurisdictions.map((j) => ({ id: j.id, name: j.name }))}
          sources={sources.map((s) => ({ id: s.id, name: s.name }))}
        />
      </div>
    </div>
  );
}
