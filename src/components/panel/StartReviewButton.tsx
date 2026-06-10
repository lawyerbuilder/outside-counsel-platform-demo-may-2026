"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Loader2 } from "lucide-react";

export function StartReviewButton() {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleStart() {
    setIsStarting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/panel/review", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Failed to start review cycle");
        return;
      }
      setMessage(`Review cycle "${data.title}" created with ${data.firmCount} firm assessments`);
      router.refresh();
    } catch {
      setMessage("Network error — please try again");
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleStart}
        disabled={isStarting}
        className="inline-flex items-center gap-2 rounded-md bg-scg-700 px-4 py-2 text-sm font-medium text-white hover:bg-scg-800 disabled:opacity-50"
      >
        {isStarting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Starting...
          </>
        ) : (
          <>
            <ClipboardCheck size={16} />
            Start review cycle
          </>
        )}
      </button>
      {message && <p className="text-xs text-gray-500">{message}</p>}
    </div>
  );
}
