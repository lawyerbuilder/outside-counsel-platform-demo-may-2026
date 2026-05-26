"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useCallback, useTransition } from "react";
import { FIRM_TYPE_LABELS } from "@/lib/schemas";
import type { FirmTypeEnum } from "@/lib/schemas";

interface FirmFiltersProps {
  countries: string[];
  practiceAreas: { id: string; name: string }[];
  currentFilters: Record<string, string | undefined>;
}

export function FirmFilters({
  countries,
  practiceAreas,
  currentFilters,
}: FirmFiltersProps) {
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
      params.delete("page"); // reset to page 1 on filter change
      startTransition(() => {
        router.push(`/firms?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Search firms..."
          defaultValue={currentFilters.search ?? ""}
          onChange={(e) => updateFilter("search", e.target.value)}
          className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500"
        />
      </div>

      {/* Country */}
      <select
        value={currentFilters.country ?? ""}
        onChange={(e) => updateFilter("country", e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500"
      >
        <option value="">All countries</option>
        {countries.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {/* Firm Type */}
      <select
        value={currentFilters.firmType ?? ""}
        onChange={(e) => updateFilter("firmType", e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500"
      >
        <option value="">All types</option>
        {(
          Object.entries(FIRM_TYPE_LABELS) as [FirmTypeEnum, string][]
        ).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {/* Practice Area */}
      <select
        value={currentFilters.practiceAreaId ?? ""}
        onChange={(e) => updateFilter("practiceAreaId", e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500"
      >
        <option value="">All practice areas</option>
        {practiceAreas.map((pa) => (
          <option key={pa.id} value={pa.id}>
            {pa.name}
          </option>
        ))}
      </select>

      {isPending && (
        <span className="text-xs text-gray-400">Filtering...</span>
      )}
    </div>
  );
}
