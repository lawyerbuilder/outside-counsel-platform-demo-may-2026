import { PageHeader } from "@/components/shared/PageHeader";
import { IntakeClient } from "./intake-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Start a Matter",
};

export default function IntakePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Start a Matter"
        description="Describe what you need in plain language. We'll assess it and recommend the fastest sourcing path."
      />
      <IntakeClient />
    </div>
  );
}
