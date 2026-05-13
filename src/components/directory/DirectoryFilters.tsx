"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useTransition } from "react";
import { Search } from "lucide-react";

interface FilterOption {
  value: string;
  label: string;
}

interface DirectoryFiltersProps {
  practiceAreas: FilterOption[];
  jurisdictions: FilterOption[];
}

export function DirectoryFilters({
  practiceAreas,
  jurisdictions,
}: DirectoryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startTransition(() => {
        router.push(`/directory?${params.toString()}`);
      });
    },
    [router, searchParams, startTransition]
  );

  const currentType = searchParams.get("type") ?? "firms";
  const currentSearch = searchParams.get("search") ?? "";
  const currentPa = searchParams.get("practiceAreaId") ?? "";
  const currentJur = searchParams.get("jurisdictionId") ?? "";
  const currentFirmType = searchParams.get("firmType") ?? "";
  const currentMinNps = searchParams.get("minNps") ?? "";

  return (
    <div className="space-y-4">
      {/* Type toggle */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => updateParam("type", "firms")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            currentType === "firms"
              ? "bg-white text-teal-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Firms
        </button>
        <button
          onClick={() => updateParam("type", "lawyers")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            currentType === "lawyers"
              ? "bg-white text-teal-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Lawyers
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder={`Search ${currentType}...`}
          defaultValue={currentSearch}
          onChange={(e) => {
            const val = e.target.value;
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
              updateParam("search", val);
            }, 300);
          }}
          className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3">
        <select
          value={currentPa}
          onChange={(e) => updateParam("practiceAreaId", e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none"
        >
          <option value="">All Practice Areas</option>
          {practiceAreas.map((pa) => (
            <option key={pa.value} value={pa.value}>
              {pa.label}
            </option>
          ))}
        </select>

        <select
          value={currentJur}
          onChange={(e) => updateParam("jurisdictionId", e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none"
        >
          <option value="">All Jurisdictions</option>
          {jurisdictions.map((j) => (
            <option key={j.value} value={j.value}>
              {j.label}
            </option>
          ))}
        </select>

        {currentType === "firms" && (
          <select
            value={currentFirmType}
            onChange={(e) => updateParam("firmType", e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none"
          >
            <option value="">All Firm Types</option>
            <option value="FULL_SERVICE">Full Service</option>
            <option value="BOUTIQUE">Boutique</option>
            <option value="MID_SIZE">Mid-Size</option>
            <option value="REGIONAL">Regional</option>
          </select>
        )}

        <select
          value={currentMinNps}
          onChange={(e) => updateParam("minNps", e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none"
        >
          <option value="">Any NPS</option>
          <option value="50">NPS ≥ 50</option>
          <option value="0">NPS ≥ 0</option>
          <option value="-50">NPS ≥ -50</option>
        </select>
      </div>

      {isPending && (
        <div className="text-xs text-gray-400">Updating results...</div>
      )}
    </div>
  );
}
