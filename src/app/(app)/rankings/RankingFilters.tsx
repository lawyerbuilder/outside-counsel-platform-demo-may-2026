"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { RANKING_PUBLISHER_LABELS } from "@/lib/schemas";
import type { RankingPublisherEnum } from "@/lib/schemas";

interface RankingFiltersProps {
  practiceAreas: { id: string; name: string }[];
  jurisdictions: { id: string; name: string }[];
  editionYears: number[];
  currentFilters: Record<string, string | undefined>;
}

export function RankingFilters({
  practiceAreas,
  jurisdictions,
  editionYears,
  currentFilters,
}: RankingFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startTransition(() => {
        router.push(`/rankings?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <select
        value={currentFilters.publisher ?? ""}
        onChange={(e) => updateFilter("publisher", e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500"
      >
        <option value="">All publishers</option>
        {(Object.entries(RANKING_PUBLISHER_LABELS) as [RankingPublisherEnum, string][]).map(
          ([value, label]) => (
            <option key={value} value={value}>{label}</option>
          )
        )}
      </select>

      <select
        value={currentFilters.practiceAreaId ?? ""}
        onChange={(e) => updateFilter("practiceAreaId", e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500"
      >
        <option value="">All practice areas</option>
        {practiceAreas.map((pa) => (
          <option key={pa.id} value={pa.id}>{pa.name}</option>
        ))}
      </select>

      <select
        value={currentFilters.jurisdictionId ?? ""}
        onChange={(e) => updateFilter("jurisdictionId", e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500"
      >
        <option value="">All jurisdictions</option>
        {jurisdictions.map((j) => (
          <option key={j.id} value={j.id}>{j.name}</option>
        ))}
      </select>

      <select
        value={currentFilters.editionYear ?? ""}
        onChange={(e) => updateFilter("editionYear", e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500"
      >
        <option value="">All years</option>
        {editionYears.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      {isPending && <span className="text-xs text-gray-400">Filtering...</span>}
    </div>
  );
}
