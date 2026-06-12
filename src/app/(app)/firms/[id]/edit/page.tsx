import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { FirmForm } from "@/components/forms/FirmForm";
import { updateFirmAction } from "@/server/actions/firm-actions";
import { getFirmById } from "@/server/firms";
import { listFirmsForSelect } from "@/server/reference-data";

export const dynamic = "force-dynamic";

interface EditFirmPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditFirmPage({ params }: EditFirmPageProps) {
  const { id } = await params;
  const [firm, firms] = await Promise.all([
    getFirmById(id),
    listFirmsForSelect(),
  ]);

  if (!firm || firm.deletedAt) {
    notFound();
  }

  // Exclude current firm from parent options
  const parentOptions = firms.filter((f) => f.id !== firm.id);

  const boundAction = updateFirmAction.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={`Edit ${firm.shortName ?? firm.name}`}
        breadcrumbs={[
          { label: "Firms", href: "/firms" },
          { label: firm.shortName ?? firm.name, href: `/firms/${firm.id}` },
          { label: "Edit" },
        ]}
      />

      <div className="surface p-6">
        <FirmForm
          action={boundAction}
          initialData={firm}
          firms={parentOptions}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
}
