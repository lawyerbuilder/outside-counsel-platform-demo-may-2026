import { PageHeader } from "@/components/shared/PageHeader";
import { IntakeClient } from "./intake-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Source Counsel",
};

export default function IntakePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Source Outside Counsel"
        description="Your internal client has opened a matter. Describe what you need and we'll recommend the sourcing path: instruct a panel firm directly or run an RFP."
      />
      <IntakeClient />
    </div>
  );
}
