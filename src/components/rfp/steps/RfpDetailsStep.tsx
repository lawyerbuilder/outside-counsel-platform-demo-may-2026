"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

export function RfpDetailsStep({
  draftId,
  defaults,
}: {
  draftId?: string;
  defaults?: { title?: string; matterNumber?: string; scopeDocument?: string; pricingRequirements?: string };
}) {
  const router = useRouter();
  const [title, setTitle] = useState(defaults?.title ?? "");
  const [matterNumber, setMatterNumber] = useState(defaults?.matterNumber ?? "");
  const [scope, setScope] = useState(defaults?.scopeDocument ?? "");
  const [pricing, setPricing] = useState(defaults?.pricingRequirements ?? "");

  const searchParams = useSearchParams();

  function handleNext() {
    if (title.length < 3) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", "8");
    if (draftId) params.set("draftId", draftId);
    params.set("title", title);
    if (matterNumber) params.set("matterNumber", matterNumber);
    if (scope) params.set("scopeDocument", scope);
    if (pricing) params.set("pricingRequirements", pricing);
    router.push(`/rfp/new?${params.toString()}`);
  }

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-base font-medium">RFP Details</Label>
        <p className="mt-1 text-sm text-gray-500">
          Define the title, scope, and pricing requirements for this RFP.
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="title">Request name *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Litigation 2Q, Vietnam M&A Advisory"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="matterNumber">Matter No. (MatterSphere)</Label>
        <Input
          id="matterNumber"
          value={matterNumber}
          onChange={(e) => setMatterNumber(e.target.value)}
          placeholder="e.g., MS-2026-00123"
        />
        <p className="text-xs text-gray-400">Link this RFP to a MatterSphere matter for tracking</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="scope">Scope of work</Label>
        <Textarea
          id="scope"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          placeholder="Describe what you need the firm to do. Include deliverables, phases, and any constraints."
          rows={4}
          className="resize-none"
        />
        <p className="text-xs text-gray-400">{1000 - scope.length} character(s) left</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="pricing">Pricing requirements</Label>
        <Textarea
          id="pricing"
          value={pricing}
          onChange={(e) => setPricing(e.target.value)}
          placeholder="e.g., Fixed fee preferred, include alternative fee arrangements, hourly rates for overflow"
          rows={3}
          className="resize-none"
        />
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleNext}
          disabled={title.length < 3}
          className="rounded-md bg-scg-700 px-4 py-2 text-sm font-medium text-white hover:bg-scg-800 disabled:bg-gray-200 disabled:text-gray-400"
        >
          Next
        </button>
      </div>
    </div>
  );
}
