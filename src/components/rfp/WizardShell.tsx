"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const STEPS = [
  "Cost Center",
  "Jurisdiction",
  "Practice Area",
  "Complexity",
  "Description",
  "Urgency",
  "RFP Details",
  "Criteria",
  "Select Firms",
  "Review & Send",
];

export function WizardShell({
  children,
  draftId,
}: {
  children: React.ReactNode;
  draftId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStep = Number(searchParams.get("step") ?? "1");

  function navigate(step: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", String(step));
    if (draftId) params.set("draftId", draftId);
    router.push(`/rfp/new?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-1">
          {STEPS.map((label, i) => {
            const step = i + 1;
            const isActive = step === currentStep;
            const isCompleted = step < currentStep;
            return (
              <div key={step} className="flex items-center">
                <button
                  onClick={() => isCompleted && navigate(step)}
                  disabled={!isCompleted}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
                    isActive && "bg-scg-700 text-white",
                    isCompleted && "bg-scg-100 text-scg-700 hover:bg-scg-200 cursor-pointer",
                    !isActive && !isCompleted && "bg-gray-100 text-gray-400"
                  )}
                >
                  {step}
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 w-6",
                      step < currentStep ? "bg-scg-300" : "bg-gray-200"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-sm font-medium text-gray-700">
          Step {currentStep}: {STEPS[currentStep - 1]}
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {children}
      </div>

      <div className="mt-4 flex justify-between">
        <button
          onClick={() => navigate(currentStep - 1)}
          disabled={currentStep <= 1}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium",
            currentStep <= 1
              ? "text-gray-300 cursor-not-allowed"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          Back
        </button>
        <div className="text-xs text-gray-400">
          {currentStep} of {STEPS.length}
        </div>
      </div>
    </div>
  );
}

export { STEPS };
