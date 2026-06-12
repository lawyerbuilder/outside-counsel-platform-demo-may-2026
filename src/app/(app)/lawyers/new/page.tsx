import { PageHeader } from "@/components/ui/PageHeader";
import { LawyerForm } from "@/components/forms/LawyerForm";
import { createLawyerAction } from "@/server/actions/lawyer-actions";

export const dynamic = "force-dynamic";

export default function NewLawyerPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Add Lawyer"
        breadcrumbs={[
          { label: "Lawyers", href: "/lawyers" },
          { label: "New Lawyer" },
        ]}
      />

      <div className="surface p-6">
        <LawyerForm action={createLawyerAction} submitLabel="Create Lawyer" />
      </div>
    </div>
  );
}
