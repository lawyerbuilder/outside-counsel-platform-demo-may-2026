import { PageHeader } from "@/components/ui/PageHeader";
import { FirmForm } from "@/components/forms/FirmForm";
import { createFirmAction } from "@/server/actions/firm-actions";
import { listFirmsForSelect } from "@/server/reference-data";

export const dynamic = "force-dynamic";

export default async function NewFirmPage() {
  const firms = await listFirmsForSelect();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Add Firm"
        breadcrumbs={[
          { label: "Firms", href: "/firms" },
          { label: "New Firm" },
        ]}
      />

      <div className="surface p-6">
        <FirmForm
          action={createFirmAction}
          firms={firms}
          submitLabel="Create Firm"
        />
      </div>
    </div>
  );
}
