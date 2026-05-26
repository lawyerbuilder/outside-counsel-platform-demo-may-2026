import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-gray-100 text-gray-700" },
  OPEN: { label: "Open", className: "bg-blue-100 text-blue-700" },
  EVALUATING: { label: "Evaluating", className: "bg-amber-100 text-amber-700" },
  SHORTLISTED: { label: "Shortlisted", className: "bg-purple-100 text-purple-700" },
  CLOSED: { label: "Closed", className: "bg-scg-100 text-scg-700" },
  CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-700" },
};

export function RfpStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, className: "bg-gray-100 text-gray-700" };
  return (
    <Badge variant="outline" className={cn("border-0 font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}
