import { Sparkles, Brain, MessageSquare, Navigation } from "lucide-react";
import { getCurrentUser } from "@/server/current-user";
import { getUserPreference } from "@/server/preferences";
import { getAiBriefing } from "@/server/platform-settings";
import { PageHeader } from "@/components/ui/PageHeader";
import { PreferenceForm } from "@/components/settings/PreferenceForm";
import { AiBriefingForm } from "@/components/settings/AiBriefingForm";
import { AiNotesAssistant } from "@/components/settings/AiNotesAssistant";
import { RestartTourButton } from "@/components/settings/RestartTourButton";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const [weights, aiBriefing] = await Promise.all([
    getUserPreference(user.id),
    getAiBriefing(),
  ]);

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Customize how the directory ranks and recommends firms and lawyers for you"
      />

      <div className="mx-auto max-w-2xl">
        {/* AI Briefing Section */}
        <div className="mb-8 surface p-6">
          <div className="mb-4 flex items-start gap-3">
            <Brain size={20} className="mt-0.5 text-scg-600" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                AI Knowledge Briefing
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Global instructions for the AI Counsel Finder. Use this to encode
                institutional knowledge that should guide all recommendations —
                e.g. which firms are limited to specific work types, preferred
                firms for certain practice areas, or caveats about timesheet data.
              </p>
            </div>
          </div>
          <AiBriefingForm currentBriefing={aiBriefing} />
        </div>

        {/* AI Notes Assistant */}
        <div className="mb-8 surface p-6">
          <div className="mb-4 flex items-start gap-3">
            <MessageSquare size={20} className="mt-0.5 text-scg-600" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Firm Notes Assistant
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Tell the AI what you know about firms in plain English. It will
                find matching firms, draft the notes, and let you review before
                saving.
              </p>
            </div>
          </div>
          <AiNotesAssistant />
        </div>

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

        {/* Product Tour */}
        <div className="mt-8 surface p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Navigation size={20} className="mt-0.5 text-scg-600" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Product Tour
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Replay the guided walkthrough that introduces the key areas of
                  the platform.
                </p>
              </div>
            </div>
            <RestartTourButton />
          </div>
        </div>

        <div className="mt-8 surface p-6">
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
