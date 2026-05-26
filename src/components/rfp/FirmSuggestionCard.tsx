import { Checkbox } from "@/components/ui/Checkbox";
import { Badge } from "@/components/ui/Badge";
import { AlertTriangle, Building2, Star } from "lucide-react";
import type { EnrichedFirmSuggestion } from "@/server/rfp/firm-suggestions";

export function FirmSuggestionCard({
  firm,
  selected,
  onToggle,
}: {
  firm: EnrichedFirmSuggestion;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${
        selected ? "border-scg-500 bg-scg-50" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={onToggle}
        className="mt-0.5"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-900">{firm.firmName}</span>
          <Badge variant="outline" className="text-[10px]">
            {firm.firmType}
          </Badge>
          {firm.panelStatus === "PROBATION" && (
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-[10px]">
              Probation
            </Badge>
          )}
        </div>

        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Star size={12} className="text-amber-500" />
            Score: {firm.overallScore?.toFixed(1) ?? "N/A"}
          </span>
          <span>{firm.complexityTier} tier</span>
          <span>{firm.activeMatters} active matter(s)</span>
          {firm.lastScorecardTier && <span>Scorecard: {firm.lastScorecardTier.replace(/_/g, " ").toLowerCase()}</span>}
        </div>

        {firm.warnings.length > 0 && (
          <div className="mt-2 space-y-1">
            {firm.warnings.map((w, i) => (
              <p key={i} className="flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle size={12} /> {w}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
