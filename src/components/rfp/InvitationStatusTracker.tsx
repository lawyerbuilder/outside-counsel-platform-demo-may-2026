import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, XCircle, FileText, Star, ChevronRight } from "lucide-react";

type InvitationStatus = "INVITED" | "SUBMITTED" | "DECLINED" | "SCORED" | "SHORTLISTED" | "SELECTED" | "UNSUCCESSFUL";

const statusConfig: Record<InvitationStatus, { icon: typeof Clock; label: string; className: string }> = {
  INVITED: { icon: Clock, label: "Awaiting response", className: "text-blue-600 bg-blue-50 border-blue-200" },
  SUBMITTED: { icon: FileText, label: "Response received", className: "text-scg-600 bg-scg-50 border-scg-200" },
  DECLINED: { icon: XCircle, label: "Declined", className: "text-red-600 bg-red-50 border-red-200" },
  SCORED: { icon: Star, label: "Scored", className: "text-amber-600 bg-amber-50 border-amber-200" },
  SHORTLISTED: { icon: CheckCircle2, label: "Shortlisted", className: "text-purple-600 bg-purple-50 border-purple-200" },
  SELECTED: { icon: CheckCircle2, label: "Selected", className: "text-scg-700 bg-scg-100 border-scg-300" },
  UNSUCCESSFUL: { icon: XCircle, label: "Unsuccessful", className: "text-gray-500 bg-gray-50 border-gray-200" },
};

type Invitation = {
  id: string;
  firmName: string;
  status: string;
  respondedAt?: string | null;
};

export function InvitationStatusTracker({ rfpId, invitations }: { rfpId: string; invitations: Invitation[] }) {
  if (invitations.length === 0) {
    return <p className="text-sm text-gray-400">No invitations sent yet.</p>;
  }

  const responded = invitations.filter((i) => i.status !== "INVITED" && i.status !== "DECLINED").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{invitations.length} firm(s) invited</span>
        <span>{responded} responded</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-scg-500 transition-all"
          style={{ width: `${(responded / invitations.length) * 100}%` }}
        />
      </div>
      <div className="space-y-1">
        {invitations.map((inv) => {
          const config = statusConfig[inv.status as InvitationStatus] ?? statusConfig.INVITED;
          const Icon = config.icon;
          // The whole row opens the firm's page for this matter, where the
          // actions live (email link, copy draft, copy link, enter response).
          return (
            <Link
              key={inv.id}
              href={`/rfp/${rfpId}/respond/${inv.id}`}
              className="-mx-2 flex items-center justify-between rounded-md px-2 py-2 hover:bg-gray-50"
            >
              <span className="flex items-center gap-1.5 text-sm font-medium text-scg-700">
                {inv.firmName}
                <ChevronRight size={14} className="text-gray-300" />
              </span>
              <Badge
                variant="outline"
                className={cn("gap-1 text-[10px]", config.className)}
              >
                <Icon size={10} />
                {config.label}
              </Badge>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
