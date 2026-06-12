import { PageHeader } from "@/components/ui/PageHeader";
import { FirmRankingForm } from "@/components/forms/FirmRankingForm";
import { createFirmRankingAction } from "@/server/actions/ranking-actions";
import { listFirmsForSelect, listPracticeAreas, listJurisdictions } from "@/server/reference-data";
import { listRankingSources } from "@/server/rankings";

export const dynamic = "force-dynamic";

export default async function NewFirmRankingPage() {
  const [firms, practiceAreas, jurisdictions, sources] = await Promise.all([
    listFirmsForSelect(),
    listPracticeAreas(),
    listJurisdictions(),
    listRankingSources(),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Add Firm Ranking"
        breadcrumbs={[
          { label: "Admin" },
          { label: "Rankings", href: "/admin/rankings" },
          { label: "Rank Firm" },
        ]}
      />
      <div className="surface p-6">
        <FirmRankingForm
          action={createFirmRankingAction}
          firms={firms}
          practiceAreas={practiceAreas.map((p) => ({ id: p.id, name: p.name }))}
          jurisdictions={jurisdictions.map((j) => ({ id: j.id, name: j.name }))}
          sources={sources.map((s) => ({ id: s.id, name: s.name, publisher: s.publisher }))}
        />
      </div>
    </div>
  );
}
