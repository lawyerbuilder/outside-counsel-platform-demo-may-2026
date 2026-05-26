"use client";

import { Navigation } from "lucide-react";

export function RestartTourButton() {
  function handleRestart() {
    const fn = (window as Record<string, unknown>).__restartProductTour;
    if (typeof fn === "function") {
      (fn as () => void)();
    }
  }

  return (
    <button
      onClick={handleRestart}
      className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
    >
      <Navigation size={14} />
      Restart Product Tour
    </button>
  );
}
