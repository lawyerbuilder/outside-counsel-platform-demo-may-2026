import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  label?: string;
}

export function ScoreBadge({ score, label = "Fit Score" }: ScoreBadgeProps) {
  const color =
    score >= 75
      ? "bg-green-50 text-green-700 border-green-200"
      : score >= 50
      ? "bg-teal-50 text-teal-700 border-teal-200"
      : score >= 25
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-gray-50 text-gray-600 border-gray-200";

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center rounded-lg border px-3 py-1.5",
        color
      )}
    >
      <span className="text-lg font-bold">{score}</span>
      <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">
        {label}
      </span>
    </div>
  );
}
