import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { FeeDelta } from "@/server/rfp/benchmarking";

/**
 * Shows how a proposed fee compares to historical median:
 * green = 10%+ below, gray = within 10%, amber = 10-30% above, red = 30%+ above.
 */
export function FeeBenchmarkBadge({ delta }: { delta: FeeDelta | null }) {
  if (!delta) return null;

  const { deltaPercent, basis, sampleSize } = delta;

  let variant: BadgeVariant = "gray";
  if (deltaPercent <= -10) variant = "green";
  else if (deltaPercent > 30) variant = "red";
  else if (deltaPercent > 10) variant = "amber";

  const Icon = deltaPercent <= -10 ? TrendingDown : deltaPercent > 10 ? TrendingUp : Minus;
  const label =
    deltaPercent === 0
      ? "At historical median"
      : `${Math.abs(deltaPercent)}% ${deltaPercent > 0 ? "above" : "below"} historical median`;

  return (
    <Badge
      variant={variant}
      className="gap-1"
      // title renders as a native tooltip
    >
      <span title={`Based on ${basis} (${sampleSize} data points)`} className="inline-flex items-center gap-1">
        <Icon size={11} />
        {label}
      </span>
    </Badge>
  );
}
