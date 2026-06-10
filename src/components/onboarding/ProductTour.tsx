"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_STORAGE_KEY = "ocp-tour-completed";
const TOUR_DISMISSED_KEY = "ocp-tour-dismissed";
/** Flag to prevent the welcome prompt re-appearing while the tour navigates between pages */
const TOUR_ACTIVE_KEY = "ocp-tour-active";

/**
 * Each tour step maps a sidebar element to the page it should navigate to.
 * The tour navigates FIRST, waits for the page to render, THEN highlights.
 */
const STEP_CONFIG = [
  {
    // Step 0 — welcome (no element, no navigation)
    popover: {
      title: "Welcome to the Outside Counsel Platform",
      description:
        "Let us give you a quick tour of the key areas. This will take about 30 seconds.",
      side: "over" as const,
      align: "center" as const,
    },
  },
  {
    element: "#tour-dashboard",
    href: "/dashboard",
    popover: {
      title: "Dashboard",
      description:
        "Your home base. See active RFPs, firm panel health, pending responses, and recent AI activity at a glance.",
      side: "bottom" as const,
      align: "start" as const,
    },
  },
  {
    element: "#tour-intake",
    href: "/intake",
    popover: {
      title: "Source Counsel",
      description:
        "When an internal client opens a matter, describe it here. AI assesses complexity and risk, then recommends the sourcing path: instruct a panel firm directly or run a competitive RFP.",
      side: "bottom" as const,
      align: "start" as const,
    },
  },
  {
    element: "#tour-directory",
    href: "/directory",
    popover: {
      title: "AI Counsel Finder",
      description:
        "Search across firms and lawyers with AI-powered recommendations ranked by your personalised fit score.",
      side: "bottom" as const,
      align: "start" as const,
    },
  },
  {
    element: "#tour-firms",
    href: "/firms",
    popover: {
      title: "Firms",
      description:
        "View and manage outside counsel firms. See ratings, practice areas, active engagements, and AI-powered timesheet intelligence.",
      side: "bottom" as const,
      align: "start" as const,
    },
  },
  {
    element: "#tour-lawyers",
    href: "/lawyers",
    popover: {
      title: "Lawyers",
      description:
        "Browse individual lawyers across all firms. Filter by practice area, jurisdiction, seniority, and firm. View career history and alumni connections.",
      side: "bottom" as const,
      align: "start" as const,
    },
  },
  {
    element: "#tour-rankings",
    href: "/rankings",
    popover: {
      title: "Rankings",
      description:
        "Chambers, Legal 500, and AsiaLaw rankings across all practice areas and jurisdictions. Filter and compare firm and lawyer rankings side by side.",
      side: "bottom" as const,
      align: "start" as const,
    },
  },
  {
    element: "#tour-engagements",
    href: "/engagements",
    popover: {
      title: "Engagements",
      description:
        "Track active legal engagements with firms. Monitor budgets, timelines, and matter progress.",
      side: "bottom" as const,
      align: "start" as const,
    },
  },
  {
    element: "#tour-rfp",
    href: "/rfp",
    popover: {
      title: "Request for Proposals",
      description:
        "Create RFPs, invite firms to bid, and get AI-powered comparison reports that analyse scope coverage, fees, and risk across all proposals.",
      side: "bottom" as const,
      align: "start" as const,
    },
  },
  {
    element: "#tour-panel",
    href: "/panel",
    popover: {
      title: "Panel Management",
      description:
        "Panel composition, per-firm spend, scorecard tiers, and recommended actions. Start a review cycle in one click to snapshot panel health.",
      side: "bottom" as const,
      align: "start" as const,
    },
  },
  {
    element: "#tour-insights",
    href: "/insights",
    popover: {
      title: "Timesheet Intelligence",
      description:
        "Upload MatterSphere timesheet exports and get AI-powered analysis of external counsel usage patterns, outsource rates, and practice area trends.",
      side: "bottom" as const,
      align: "start" as const,
    },
  },
  {
    element: "#tour-network",
    href: "/network",
    popover: {
      title: "Boutique Network",
      description:
        "Visualise firm spin-offs, partner movements, and alumni career paths. See how boutique firms connect to the major firms they spun off from.",
      side: "bottom" as const,
      align: "start" as const,
    },
  },
  {
    element: "#tour-settings",
    href: "/settings",
    popover: {
      title: "Settings",
      description:
        "Configure your AI briefing context, scoring weights, and evaluation criteria. Add institutional knowledge that guides all AI recommendations.",
      side: "bottom" as const,
      align: "start" as const,
    },
  },
  {
    // Final step — no element, navigate back to dashboard
    href: "/dashboard",
    popover: {
      title: "You're all set!",
      description:
        'Start by exploring the <strong>Dashboard</strong> or create your first <strong>RFP</strong>. You can restart this tour anytime from the <strong>Tour</strong> button in the top bar.',
      side: "over" as const,
      align: "center" as const,
    },
  },
];

/**
 * Build driver.js steps that navigate to the correct page
 * before each highlight, using Next.js router.push().
 */
function buildSteps(push: (href: string) => void): DriveStep[] {
  return STEP_CONFIG.map((step) => {
    const driveStep: DriveStep = {
      popover: step.popover,
    };

    if (step.element) {
      driveStep.element = step.element;
    }

    // Navigate to the target page when the step starts
    if ("href" in step && step.href) {
      const targetHref = step.href;
      driveStep.popover = {
        ...step.popover,
        onPopoverRender: () => {
          // Navigate if we're not already on this page
          if (window.location.pathname !== targetHref) {
            push(targetHref);
          }
        },
      };
    }

    return driveStep;
  });
}

export function ProductTour() {
  const pathname = usePathname();
  const router = useRouter();
  const [showPrompt, setShowPrompt] = useState(false);

  const checkFirstVisit = useCallback(() => {
    if (typeof window === "undefined") return false;
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    const dismissed = localStorage.getItem(TOUR_DISMISSED_KEY);
    const active = sessionStorage.getItem(TOUR_ACTIVE_KEY);
    // Don't show welcome prompt if tour is actively running (navigating between pages)
    return !completed && !dismissed && !active;
  }, []);

  useEffect(() => {
    const mainPaths = [
      "/dashboard", "/intake", "/directory", "/firms", "/rfp",
      "/panel", "/engagements", "/insights", "/rankings",
      "/lawyers", "/network", "/settings",
    ];
    const isMainPage = mainPaths.some((p) => pathname === p);

    if (isMainPage && checkFirstVisit()) {
      const timer = setTimeout(() => setShowPrompt(true), 800);
      return () => clearTimeout(timer);
    }
  }, [pathname, checkFirstVisit]);

  const launchTour = useCallback(() => {
    setShowPrompt(false);
    // Mark tour as active so navigation doesn't re-trigger the welcome prompt
    sessionStorage.setItem(TOUR_ACTIVE_KEY, "true");

    // We need a mutable ref so the onDestroyStarted closure can call destroy()
    let driverObj: ReturnType<typeof driver>;

    const steps = buildSteps((href) => router.push(href));

    driverObj = driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      overlayColor: "rgba(0, 0, 0, 0.12)",
      stagePadding: 8,
      stageRadius: 8,
      popoverClass: "ocp-tour-popover",
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      doneBtnText: "Get Started",
      progressText: "{{current}} of {{total}}",
      steps,
      onDestroyStarted: () => {
        localStorage.setItem(TOUR_STORAGE_KEY, "true");
        sessionStorage.removeItem(TOUR_ACTIVE_KEY);
        driverObj.destroy();
        if (window.location.pathname !== "/dashboard") {
          router.push("/dashboard");
        }
      },
    });

    driverObj.drive();
  }, [router]);

  // Expose restart function globally (for Tour button + Settings)
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as Record<string, unknown>).__restartProductTour = () => {
        localStorage.removeItem(TOUR_STORAGE_KEY);
        localStorage.removeItem(TOUR_DISMISSED_KEY);
        setShowPrompt(false);
        launchTour();
      };
    }
  }, [launchTour]);

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 max-w-md animate-in fade-in zoom-in-95 rounded-xl bg-white p-8 shadow-2xl">
        {/* SCG badge */}
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-scg-600 shadow-lg">
            <span className="text-lg font-bold text-white">SCG</span>
          </div>
        </div>

        <h2 className="mb-2 text-center text-xl font-bold text-gray-900">
          Welcome to the Outside Counsel Platform
        </h2>
        <p className="mb-6 text-center text-sm text-gray-500">
          Would you like a quick guided tour? We&apos;ll walk you through each section of the platform in about 30 seconds.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowPrompt(false);
              localStorage.setItem(TOUR_DISMISSED_KEY, "true");
            }}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Skip for now
          </button>
          <button
            onClick={launchTour}
            className="flex-1 rounded-lg bg-scg-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-scg-700"
          >
            Start Tour
          </button>
        </div>
      </div>
    </div>
  );
}
