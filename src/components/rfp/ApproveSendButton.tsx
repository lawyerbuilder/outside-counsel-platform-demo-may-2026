"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

export function ApproveSendButton({ rfpId }: { rfpId: string }) {
  const router = useRouter();
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setIsApproving(true);
    setError(null);
    try {
      const res = await fetch(`/api/rfp/${rfpId}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Approval failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsApproving(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleApprove}
        disabled={isApproving}
        className="inline-flex items-center gap-2 rounded-md bg-scg-700 px-4 py-2 text-sm font-medium text-white hover:bg-scg-800 disabled:opacity-50"
      >
        {isApproving ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Sending invitations...
          </>
        ) : (
          <>
            <CheckCircle2 size={16} />
            Approve and send invitations
          </>
        )}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
