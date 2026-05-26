"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Building2,
  Users,
  Trophy,
  Briefcase,
  GitBranch,
  FileText,
  Settings,
  Shield,
  Bot,
  Brain,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Directory", href: "/directory", icon: Home },
  { label: "Firms", href: "/firms", icon: Building2 },
  { label: "Lawyers", href: "/lawyers", icon: Users },
  { label: "Rankings", href: "/rankings", icon: Trophy },
  { label: "Engagements", href: "/engagements", icon: Briefcase },
  { label: "RFP", href: "/rfp", icon: FileText },
  { label: "Insights", href: "/insights", icon: Brain },
  { label: "Network", href: "/network", icon: GitBranch },
  { label: "Settings", href: "/settings", icon: Settings },
];

const adminItems = [
  { label: "Manage Rankings", href: "/admin/rankings", icon: Shield },
  { label: "AI Research", href: "/admin/research", icon: Bot },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-gray-200 bg-white transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-scg-600">
              <span className="text-[10px] font-bold text-white">SCG</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              Legal OCP
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          aria-controls="sidebar-nav"
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav id="sidebar-nav" role="navigation" aria-label="Main navigation" className="flex-1 space-y-1 px-2 py-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-scg-50 text-scg-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 px-2 py-3">
        {!collapsed && (
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Admin
          </p>
        )}
        {adminItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-scg-50 text-scg-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
