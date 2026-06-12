import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { LawyerForm } from "@/components/forms/LawyerForm";
import { updateLawyerAction } from "@/server/actions/lawyer-actions";
import { getLawyerById } from "@/server/lawyers";

export const dynamic = "force-dynamic";

interface EditLawyerPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditLawyerPage({ params }: EditLawyerPageProps) {
  const { id } = await params;
  const lawyer = await getLawyerById(id);

  if (!lawyer || lawyer.deletedAt) {
    notFound();
  }

  const boundAction = updateLawyerAction.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={`Edit ${lawyer.name}`}
        breadcrumbs={[
          { label: "Lawyers", href: "/lawyers" },
          { label: lawyer.name, href: `/lawyers/${lawyer.id}` },
          { label: "Edit" },
        ]}
      />

      <div className="surface p-6">
        <LawyerForm
          action={boundAction}
          initialData={lawyer}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
}
