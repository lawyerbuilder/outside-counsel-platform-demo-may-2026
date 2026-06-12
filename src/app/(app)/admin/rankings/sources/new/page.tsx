import { PageHeader } from "@/components/ui/PageHeader";
import { RankingSourceForm } from "@/components/forms/RankingSourceForm";
import { createRankingSourceAction } from "@/server/actions/ranking-actions";

export const dynamic = "force-dynamic";

export default function NewRankingSourcePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Add Ranking Source"
        breadcrumbs={[
          { label: "Admin" },
          { label: "Rankings", href: "/admin/rankings" },
          { label: "New Source" },
        ]}
      />
      <div className="surface p-6">
        <RankingSourceForm action={createRankingSourceAction} />
      </div>
    </div>
  );
}
