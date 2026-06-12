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
import type { DemoRole } from "@/server/demo-role";

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

/** Hrefs hidden from the LAWYER role (sensitive management views) */
const managerOnlyHrefs = ["/panel", "/insights"];

export function Sidebar({ role = "MANAGER" }: { role?: DemoRole }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items:
        role === "LAWYER"
          ? group.items.filter((item) => !managerOnlyHrefs.includes(item.href))
          : group.items,
    }))
    .filter((group) => group.items.length > 0);

  const showAdmin = role === "ADMIN";

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center justify-between border-b border-white/[0.07] px-4">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-scg-600 shadow-sm">
              <span className="text-[10px] font-bold text-white">SCG</span>
            </div>
            <div className="leading-tight">
              <span className="block text-sm font-semibold text-white">Legal OCP</span>
              <span className="block text-[10px] text-white/55">Outside Counsel</span>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden rounded-md p-1 text-white/40 hover:bg-white/10 hover:text-white lg:block"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="rounded-md p-1 text-white/40 hover:bg-white/10 hover:text-white lg:hidden"
        >
          <X size={18} />
        </button>
      </div>

      <nav id="sidebar-nav" role="navigation" aria-label="Main navigation" className="flex-1 overflow-y-auto px-2 py-3">
        {visibleGroups.map((group, gi) => (
          <div key={group.label ?? `group-${gi}`} className={gi > 0 ? "mt-4" : undefined}>
            {group.label && !collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
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
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-scg-600 text-white shadow-sm shadow-scg-900/30"
                        : "text-white/75 hover:bg-white/[0.08] hover:text-white"
                    )}
                  >
                    <Icon size={18} className={isActive ? "" : "opacity-90"} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {showAdmin && (
      <div className="border-t border-white/[0.07] px-2 py-3">
        {!collapsed && (
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">
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
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-scg-600 text-white shadow-sm shadow-scg-900/30"
                  : "text-white/55 hover:bg-white/[0.06] hover:text-white"
              )}
            >
              <Icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>
      )}
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
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-[#0a2540] transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden flex-col bg-[#0a2540] transition-all duration-200 lg:flex",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
