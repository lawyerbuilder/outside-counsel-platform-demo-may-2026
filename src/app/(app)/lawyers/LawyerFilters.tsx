"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useCallback, useTransition } from "react";
import { LAWYER_ROLE_LABELS } from "@/lib/schemas";
import type { LawyerRoleEnum } from "@/lib/schemas";

interface LawyerFiltersProps {
  firms: { id: string; name: string; shortName: string | null }[];
  practiceAreas: { id: string; name: string }[];
  jurisdictions: { id: string; name: string }[];
  currentFilters: Record<string, string | undefined>;
}

export function LawyerFilters({
  firms,
  practiceAreas,
  jurisdictions,
  currentFilters,
}: LawyerFiltersProps) {
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
      params.delete("page");
      startTransition(() => {
        router.push(`/lawyers?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Search lawyers..."
          defaultValue={currentFilters.search ?? ""}
          onChange={(e) => updateFilter("search", e.target.value)}
          className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <select
        value={currentFilters.firmId ?? ""}
        onChange={(e) => updateFilter("firmId", e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
      >
        <option value="">All firms</option>
        {firms.map((f) => (
          <option key={f.id} value={f.id}>
            {f.shortName ?? f.name}
          </option>
        ))}
      </select>

      <select
        value={currentFilters.role ?? ""}
        onChange={(e) => updateFilter("role", e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
      >
        <option value="">All roles</option>
        {(
          Object.entries(LAWYER_ROLE_LABELS) as [LawyerRoleEnum, string][]
        ).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <select
        value={currentFilters.practiceAreaId ?? ""}
        onChange={(e) => updateFilter("practiceAreaId", e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
      >
        <option value="">All practice areas</option>
        {practiceAreas.map((pa) => (
          <option key={pa.id} value={pa.id}>
            {pa.name}
          </option>
        ))}
      </select>

      <select
        value={currentFilters.jurisdictionId ?? ""}
        onChange={(e) => updateFilter("jurisdictionId", e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
      >
        <option value="">All jurisdictions</option>
        {jurisdictions.map((j) => (
          <option key={j.id} value={j.id}>
            {j.name}
          </option>
        ))}
      </select>

      {isPending && (
        <span className="text-xs text-gray-400">Filtering...</span>
      )}
    </div>
  );
}
