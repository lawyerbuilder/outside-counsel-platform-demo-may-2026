"use client";

import { Navigation } from "lucide-react";

export function TourTrigger() {
  function handleClick() {
    const fn = (window as unknown as Record<string, unknown>).__restartProductTour;
    if (typeof fn === "function") {
      (fn as () => void)();
    }
  }

  return (
    <button
      onClick={handleClick}
      title="Take a guided tour"
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
    >
      <Navigation size={14} />
      Tour
    </button>
  );
}
