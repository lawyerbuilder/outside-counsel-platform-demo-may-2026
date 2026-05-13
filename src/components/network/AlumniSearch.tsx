"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface AlumniSearchProps {
  firms: { id: string; name: string; shortName: string | null }[];
}

export function AlumniSearch({ firms }: AlumniSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFirmId = searchParams.get("alumniFrom") ?? "";

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-gray-700">
        Show alumni from:
      </label>
      <select
        value={currentFirmId}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          if (e.target.value) {
            params.set("alumniFrom", e.target.value);
          } else {
            params.delete("alumniFrom");
          }
          router.push(`/network?${params.toString()}`);
        }}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none"
      >
        <option value="">Select a firm...</option>
        {firms.map((f) => (
          <option key={f.id} value={f.id}>
            {f.shortName ?? f.name}
          </option>
        ))}
      </select>
    </div>
  );
}
