import { Sparkles } from "lucide-react";
import { getCurrentUser } from "@/server/current-user";
import { getUserPreference } from "@/server/preferences";
import { PageHeader } from "@/components/ui/PageHeader";
import { PreferenceForm } from "@/components/settings/PreferenceForm";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const weights = await getUserPreference(user.id);

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Customize how the directory ranks and recommends firms and lawyers for you"
      />

      <div className="mx-auto max-w-2xl">
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <Sparkles size={18} className="mt-0.5 text-amber-500" />
            <div>
              <h3 className="text-sm font-semibold text-amber-800">
                How scoring works
              </h3>
              <p className="mt-1 text-xs text-amber-700">
                Your weights control how the composite fit score is calculated
                on the Directory page. Move sliders toward &ldquo;Very
                important&rdquo; for criteria you care about most. The scoring
                engine combines internal ratings, NPS peer sentiment, and
                external rankings into a single personalized score.
              </p>
            </div>
          </div>
        </div>

        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Scoring Weights
        </h3>

        <PreferenceForm userId={user.id} currentWeights={weights} />

        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            About You
          </h3>
          <div className="space-y-2 text-sm text-gray-500">
            <p>
              <span className="font-medium text-gray-700">Name:</span>{" "}
              {user.name ?? "—"}
            </p>
            <p>
              <span className="font-medium text-gray-700">Email:</span>{" "}
              {user.email}
            </p>
            <p>
              <span className="font-medium text-gray-700">Role:</span>{" "}
              {user.role}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
