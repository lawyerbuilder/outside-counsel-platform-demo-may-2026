"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserCircle } from "lucide-react";
import type { DemoRole } from "@/server/demo-role";

const roleLabels: Record<DemoRole, string> = {
  LAWYER: "Lawyer (Sarah)",
  MANAGER: "Manager (Pranee)",
  ADMIN: "Admin",
};

export function RoleSwitcher({ current }: { current: DemoRole }) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  function switchRole(role: DemoRole) {
    if (role === current) return;
    setSwitching(true);
    document.cookie = `demo-role=${role}; path=/; max-age=${60 * 60 * 24 * 365}`;
    // Role can change page visibility; land on the dashboard to be safe
    router.push("/dashboard");
    router.refresh();
    setTimeout(() => setSwitching(false), 500);
  }

  return (
    <div className="flex items-center gap-1.5">
      <UserCircle size={15} className="hidden text-gray-400 sm:block" />
      <select
        value={current}
        onChange={(e) => switchRole(e.target.value as DemoRole)}
        disabled={switching}
        aria-label="Switch demo role"
        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 focus:border-scg-500 focus:outline-none disabled:opacity-50"
      >
        {(Object.keys(roleLabels) as DemoRole[]).map((role) => (
          <option key={role} value={role}>
            {roleLabels[role]}
          </option>
        ))}
      </select>
    </div>
  );
}
