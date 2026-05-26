"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { FirmSuggestionCard } from "@/components/rfp/FirmSuggestionCard";
import { Plus, Search, Sparkles, X } from "lucide-react";
import type { EnrichedFirmSuggestion } from "@/server/rfp/firm-suggestions";

type ManualFirm = {
  name: string;
  status: "pending" | "researching" | "added" | "error";
  info?: string;
  tempId: string;
};

export function SelectFirmsStep({
  firms,
  draftId,
  defaultFirmIds,
}: {
  firms: EnrichedFirmSuggestion[];
  draftId?: string;
  defaultFirmIds?: string[];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(defaultFirmIds ?? [])
  );
  const [manualFirms, setManualFirms] = useState<ManualFirm[]>([]);
  const [newFirmName, setNewFirmName] = useState("");

  function toggle(firmId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(firmId)) next.delete(firmId);
      else next.add(firmId);
      return next;
    });
  }

  function addManualFirm() {
    const name = newFirmName.trim();
    if (!name) return;
    if (manualFirms.some((f) => f.name.toLowerCase() === name.toLowerCase())) return;

    const tempId = `manual_${Date.now()}`;
    const firm: ManualFirm = { name, status: "pending", tempId };
    setManualFirms((prev) => [...prev, firm]);
    setSelectedIds((prev) => new Set(prev).add(tempId));
    setNewFirmName("");

    researchFirm(tempId, name);
  }

  async function researchFirm(tempId: string, name: string) {
    setManualFirms((prev) =>
      prev.map((f) => (f.tempId === tempId ? { ...f, status: "researching" as const } : f))
    );

    try {
      const res = await fetch("/api/rfp/research-firm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firmName: name }),
      });

      if (res.ok) {
        const data = await res.json();
        setManualFirms((prev) =>
          prev.map((f) =>
            f.tempId === tempId
              ? { ...f, status: "added" as const, info: data.summary, tempId: data.firmId ?? tempId }
              : f
          )
        );
        if (data.firmId) {
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(tempId);
            next.add(data.firmId);
            return next;
          });
        }
      } else {
        setManualFirms((prev) =>
          prev.map((f) =>
            f.tempId === tempId
              ? { ...f, status: "added" as const, info: "Added as unranked — no additional information available" }
              : f
          )
        );
      }
    } catch {
      setManualFirms((prev) =>
        prev.map((f) =>
          f.tempId === tempId
            ? { ...f, status: "added" as const, info: "Added as unranked — research unavailable" }
            : f
        )
      );
    }
  }

  function removeManualFirm(tempId: string) {
    setManualFirms((prev) => prev.filter((f) => f.tempId !== tempId));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(tempId);
      return next;
    });
  }

  const totalSelected = selectedIds.size;
  const canProceed = totalSelected > 0;

  const searchParams = useSearchParams();

  function handleNext() {
    if (!canProceed) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", "10");
    if (draftId) params.set("draftId", draftId);

    const panelFirmIds = Array.from(selectedIds).filter((id) => !id.startsWith("manual_"));
    const manualNames = manualFirms
      .filter((f) => selectedIds.has(f.tempId))
      .map((f) => f.name);

    if (panelFirmIds.length > 0) params.set("firmIds", panelFirmIds.join(","));
    else params.delete("firmIds");
    if (manualNames.length > 0) params.set("manualFirms", manualNames.join("||"));
    else params.delete("manualFirms");

    router.push(`/rfp/new?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">Select firms to invite</Label>
        <p className="mt-1 text-sm text-gray-500">
          {firms.length > 0
            ? "These firms were suggested based on your jurisdiction, practice area, and complexity tier. You can also add firms manually."
            : "No panel firms match your criteria. You can suggest a firm or lawyer below — AI will research them."}
        </p>
      </div>

      {firms.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {firms.length} firm(s) suggested &middot; {totalSelected} selected
            </span>
            <button
              onClick={() => {
                if (selectedIds.size >= firms.length) {
                  const manualIds = manualFirms.map((f) => f.tempId);
                  setSelectedIds(new Set(manualIds));
                } else {
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    firms.forEach((f) => next.add(f.firmId));
                    return next;
                  });
                }
              }}
              className="text-xs text-scg-700 hover:text-scg-800"
            >
              {firms.every((f) => selectedIds.has(f.firmId)) ? "Deselect all" : "Select all"}
            </button>
          </div>
          {firms.map((firm) => (
            <FirmSuggestionCard
              key={firm.firmId}
              firm={firm}
              selected={selectedIds.has(firm.firmId)}
              onToggle={() => toggle(firm.firmId)}
            />
          ))}
        </div>
      )}

      {/* Manual firm entry */}
      <div className="border-t border-gray-100 pt-4">
        <Label className="text-sm font-medium">
          {firms.length > 0 ? "Add other firms" : "Suggest a firm or lawyer"}
        </Label>
        <p className="mt-1 text-xs text-gray-400">
          Type a firm or lawyer name. AI will research and add them to the database as unranked.
        </p>
        <div className="mt-2 flex gap-2">
          <Input
            value={newFirmName}
            onChange={(e) => setNewFirmName(e.target.value)}
            placeholder="e.g., Clifford Chance, Weerawong C&P"
            onKeyDown={(e) => e.key === "Enter" && addManualFirm()}
          />
          <button
            onClick={addManualFirm}
            disabled={!newFirmName.trim()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-scg-700 px-3 py-2 text-sm font-medium text-white hover:bg-scg-800 disabled:bg-gray-200 disabled:text-gray-400"
          >
            <Plus size={14} />
            Add
          </button>
        </div>

        {manualFirms.length > 0 && (
          <div className="mt-3 space-y-2">
            {manualFirms.map((firm) => (
              <div
                key={firm.tempId}
                className={`flex items-start gap-3 rounded-lg border p-3 ${
                  selectedIds.has(firm.tempId)
                    ? "border-scg-500 bg-scg-50"
                    : "border-gray-200"
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{firm.name}</span>
                    <Badge variant="outline" className="text-[10px] border-gray-300 text-gray-500">
                      Unranked
                    </Badge>
                    {firm.status === "researching" && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-600">
                        <Search size={10} className="animate-pulse" />
                        Researching...
                      </span>
                    )}
                    {firm.status === "added" && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-scg-600">
                        <Sparkles size={10} />
                        Researched
                      </span>
                    )}
                  </div>
                  {firm.info && (
                    <p className="mt-1 text-xs text-gray-500">{firm.info}</p>
                  )}
                </div>
                <button
                  onClick={() => removeManualFirm(firm.tempId)}
                  className="rounded p-1 text-gray-400 hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleNext}
          disabled={!canProceed}
          className="rounded-md bg-scg-700 px-4 py-2 text-sm font-medium text-white hover:bg-scg-800 disabled:bg-gray-200 disabled:text-gray-400"
        >
          Next
        </button>
      </div>
    </div>
  );
}
