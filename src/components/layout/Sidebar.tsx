"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
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
  Menu,
  X,
  Compass,
  ClipboardCheck,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

/**
 * Grouped by user journey:
 * 1. Know the market (browse, search, compare)
 * 2. Source counsel for a matter (triage, RFP)
 * 3. Manage the work and the panel (engagements, intelligence, reviews)
 */
const navGroups: Array<{
  label: string | null;
  items: Array<{ label: string; href: string; icon: typeof LayoutDashboard; tourId: string }>;
}> = [
  {
    label: null,
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, tourId: "tour-dashboard" },
    ],
  },
  {
    label: "Market",
    items: [
      { label: "Directory", href: "/directory", icon: Search, tourId: "tour-directory" },
      { label: "Firms", href: "/firms", icon: Building2, tourId: "tour-firms" },
      { label: "Lawyers", href: "/lawyers", icon: Users, tourId: "tour-lawyers" },
      { label: "Rankings", href: "/rankings", icon: Trophy, tourId: "tour-rankings" },
      { label: "Network", href: "/network", icon: GitBranch, tourId: "tour-network" },
    ],
  },
  {
    label: "Sourcing",
    items: [
      { label: "Source Counsel", href: "/intake", icon: Compass, tourId: "tour-intake" },
      { label: "RFP", href: "/rfp", icon: FileText, tourId: "tour-rfp" },
    ],
  },
  {
    label: "Performance",
    items: [
      { label: "Engagements", href: "/engagements", icon: Briefcase, tourId: "tour-engagements" },
      { label: "Insights", href: "/insights", icon: Brain, tourId: "tour-insights" },
      { label: "Panel", href: "/panel", icon: ClipboardCheck, tourId: "tour-panel" },
    ],
  },
  {
    label: null,
    items: [
      { label: "Settings", href: "/settings", icon: Settings, tourId: "tour-settings" },
    ],
  },
];

const adminItems = [
  { label: "Manage Rankings", href: "/admin/rankings", icon: Shield },
  { label: "AI Research", href: "/admin/research", icon: Bot },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const sidebarContent = (
    <>
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
          className="hidden rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:block"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:hidden"
        >
          <X size={18} />
        </button>
      </div>

      <nav id="sidebar-nav" role="navigation" aria-label="Main navigation" className="flex-1 overflow-y-auto px-2 py-3">
        {navGroups.map((group, gi) => (
          <div key={group.label ?? `group-${gi}`} className={gi > 0 ? "mt-4" : undefined}>
            {group.label && !collapsed && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    id={item.tourId}
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
          </div>
        ))}
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
    </>
  );

  return (
    <>
      {/* Mobile hamburger button — shown in topbar area */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3.5 z-50 rounded-md p-1.5 text-gray-600 hover:bg-gray-100 lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile slide-out sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-gray-200 bg-white transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden flex-col border-r border-gray-200 bg-white transition-all duration-200 lg:flex",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
