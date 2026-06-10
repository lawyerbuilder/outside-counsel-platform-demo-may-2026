import { prisma } from "@/server/db";
import { suggestFirmsForRfp } from "@/server/rfp/firm-suggestions";
import { WizardShell } from "@/components/rfp/WizardShell";
import { CostCenterStep } from "@/components/rfp/steps/CostCenterStep";
import { SelectJurisdictionStep } from "@/components/rfp/steps/SelectJurisdictionStep";
import { SelectPracticeAreaStep } from "@/components/rfp/steps/SelectPracticeAreaStep";
import { AssessComplexityStep } from "@/components/rfp/steps/AssessComplexityStep";
import { DescribeMatterStep } from "@/components/rfp/steps/DescribeMatterStep";
import { SetUrgencyStep } from "@/components/rfp/steps/SetUrgencyStep";
import { RfpDetailsStep } from "@/components/rfp/steps/RfpDetailsStep";
import { EvaluationCriteriaStep } from "@/components/rfp/steps/EvaluationCriteriaStep";
import { SelectFirmsStep } from "@/components/rfp/steps/SelectFirmsStep";
import { AiRfpAssistant } from "@/components/rfp/AiRfpAssistant";
import { ReviewAndSendClient } from "./review-client";
import type { ComplexityTier } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function NewRfpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const isAiMode = params.ai === "true";
  const step = Number(params.step ?? "1");
  const draftId = typeof params.draftId === "string" ? params.draftId : undefined;

  if (isAiMode) {
    const firmIdStr = typeof params.firmIds === "string" ? params.firmIds : "";
    const firmIdList = firmIdStr.split(",").filter(Boolean);

    const [firms, jurisdictions, practiceAreas] = await Promise.all([
      firmIdList.length > 0
        ? prisma.firm.findMany({
            where: { id: { in: firmIdList } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      prisma.jurisdiction.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.practiceArea.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const firmNames = Object.fromEntries(firms.map((f) => [f.id, f.name]));

    return (
      <div>
        <h1 className="mb-6 text-2xl font-semibold text-gray-900">New RFP</h1>
        <AiRfpAssistant
          firmIds={firmIdList}
          firmNames={firmNames}
          draftId={draftId}
          jurisdictions={jurisdictions}
          practiceAreas={practiceAreas}
        />
      </div>
    );
  }

  const stepContent = await renderStep(step, params, draftId);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">New RFP</h1>
      <WizardShell draftId={draftId}>{stepContent}</WizardShell>
    </div>
  );
}

async function renderStep(
  step: number,
  params: Record<string, string | string[] | undefined>,
  draftId?: string
) {
  switch (step) {
    case 1: {
      return <CostCenterStep draftId={draftId} />;
    }

    case 2: {
      const jurisdictions = await prisma.jurisdiction.findMany({
        select: { id: true, name: true, region: true },
        orderBy: { name: "asc" },
      });
      const defaultValue = typeof params.jurisdictionId === "string" ? params.jurisdictionId : undefined;
      return <SelectJurisdictionStep jurisdictions={jurisdictions} draftId={draftId} defaultValue={defaultValue} />;
    }

    case 3: {
      const practiceAreas = await prisma.practiceArea.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
      const defaultValue = typeof params.practiceAreaId === "string" ? params.practiceAreaId : undefined;
      return <SelectPracticeAreaStep practiceAreas={practiceAreas} draftId={draftId} defaultValue={defaultValue} />;
    }

    case 4: {
      const defaultValue = typeof params.complexity === "string" ? params.complexity : undefined;
      return <AssessComplexityStep draftId={draftId} defaultValue={defaultValue} />;
    }

    case 5: {
      const defaultValue = typeof params.description === "string" ? params.description : undefined;
      return <DescribeMatterStep draftId={draftId} defaultValue={defaultValue} />;
    }

    case 6: {
      const defaultValue = typeof params.urgency === "string" ? params.urgency : undefined;
      return <SetUrgencyStep draftId={draftId} defaultValue={defaultValue} />;
    }

    case 7: {
      const defaults = {
        title: typeof params.title === "string" ? params.title : undefined,
        matterNumber: typeof params.matterNumber === "string" ? params.matterNumber : undefined,
        scopeDocument: typeof params.scopeDocument === "string" ? params.scopeDocument : undefined,
        pricingRequirements:
          typeof params.pricingRequirements === "string" ? params.pricingRequirements : undefined,
      };
      return <RfpDetailsStep draftId={draftId} defaults={defaults} />;
    }

    case 8: {
      return <EvaluationCriteriaStep draftId={draftId} />;
    }

    case 9: {
      const jurisdictionId = typeof params.jurisdictionId === "string" ? params.jurisdictionId : "";
      const practiceAreaId = typeof params.practiceAreaId === "string" ? params.practiceAreaId : "";
      const complexity = typeof params.complexityTier === "string" ? params.complexityTier : "STANDARD";

      let firms: Awaited<ReturnType<typeof suggestFirmsForRfp>> = [];
      if (jurisdictionId && practiceAreaId) {
        try {
          firms = await suggestFirmsForRfp(
            jurisdictionId,
            practiceAreaId,
            complexity as ComplexityTier
          );
        } catch {
          firms = [];
        }
      }

      const defaultFirmIds = typeof params.firmIds === "string"
        ? params.firmIds.split(",").filter(Boolean)
        : undefined;

      return <SelectFirmsStep firms={firms} draftId={draftId} defaultFirmIds={defaultFirmIds} />;
    }

    case 10: {
      const firmIdStr = typeof params.firmIds === "string" ? params.firmIds : "";
      const firmIdList = firmIdStr.split(",").filter(Boolean);
      const manualFirmStr = typeof params.manualFirms === "string" ? params.manualFirms : "";
      const manualFirmNames = manualFirmStr.split("||").filter(Boolean);

      let firmNameMap: Record<string, string> = {};
      if (firmIdList.length > 0) {
        const firms = await prisma.firm.findMany({
          where: { id: { in: firmIdList } },
          select: { id: true, name: true },
        });
        firmNameMap = Object.fromEntries(firms.map((f) => [f.id, f.name]));
      }

      return (
        <ReviewAndSendClient
          params={params}
          draftId={draftId}
          firmNameMap={firmNameMap}
          manualFirmNames={manualFirmNames}
        />
      );
    }

    default:
      return <p className="text-sm text-gray-500">Unknown step.</p>;
  }
}
