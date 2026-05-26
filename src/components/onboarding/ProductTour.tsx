"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_STORAGE_KEY = "ocp-tour-completed";
const TOUR_DISMISSED_KEY = "ocp-tour-dismissed";

const tourSteps: DriveStep[] = [
  {
    popover: {
      title: "Welcome to the Outside Counsel Platform",
      description:
        "Let us give you a quick tour of the key areas. This will take about 30 seconds.",
      side: "over",
      align: "center",
    },
  },
  {
    element: "#tour-directory",
    popover: {
      title: "Directory",
      description:
        "Your starting point. Browse and search your full database of outside counsel lawyers across all jurisdictions.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "#tour-firms",
    popover: {
      title: "Firms",
      description:
        "View and manage outside counsel firms. See ratings, practice areas, active engagements, and AI-powered timesheet intelligence.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "#tour-rfp",
    popover: {
      title: "Request for Proposals",
      description:
        "Create RFPs, invite firms to bid, and get AI-powered comparison reports that analyse scope coverage, fees, and risk across all proposals.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "#tour-engagements",
    popover: {
      title: "Engagements",
      description:
        "Track active legal engagements with firms. Monitor budgets, timelines, and matter progress.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "#tour-insights",
    popover: {
      title: "Insights",
      description:
        "AI-powered timesheet analysis. Upload invoices and get instant insights on billing patterns, rate anomalies, and cost optimisation opportunities.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "#tour-rankings",
    popover: {
      title: "Rankings",
      description:
        "See how firms stack up. View rankings by practice area, jurisdiction, and internal performance scores.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "#tour-settings",
    popover: {
      title: "Settings",
      description:
        "Configure your platform preferences, AI briefing context, and evaluation criteria.",
      side: "right",
      align: "start",
    },
  },
  {
    popover: {
      title: "You're all set!",
      description:
        "Start by exploring the <strong>Directory</strong> or create your first <strong>RFP</strong>. You can always restart this tour from Settings.",
      side: "over",
      align: "center",
    },
  },
];

export function ProductTour() {
  const pathname = usePathname();
  const router = useRouter();
  const [showPrompt, setShowPrompt] = useState(false);

  const checkFirstVisit = useCallback(() => {
    if (typeof window === "undefined") return false;
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    const dismissed = localStorage.getItem(TOUR_DISMISSED_KEY);
    return !completed && !dismissed;
  }, []);

  useEffect(() => {
    // Only show on the main pages, not deep links
    const mainPaths = ["/directory", "/firms", "/rfp", "/engagements", "/insights", "/rankings", "/lawyers", "/network", "/settings"];
    const isMainPage = mainPaths.some((p) => pathname === p);

    if (isMainPage && checkFirstVisit()) {
      // Small delay so the page renders first
      const timer = setTimeout(() => setShowPrompt(true), 800);
      return () => clearTimeout(timer);
    }
  }, [pathname, checkFirstVisit]);

  function startTour() {
    setShowPrompt(false);

    const driverObj = driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      overlayColor: "rgba(0, 0, 0, 0.6)",
      stagePadding: 8,
      stageRadius: 8,
      popoverClass: "ocp-tour-popover",
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Get Started",
      progressText: "{{current}} of {{total}}",
      steps: tourSteps,
      onDestroyStarted: () => {
        localStorage.setItem(TOUR_STORAGE_KEY, "true");
        driverObj.destroy();
      },
    });

    driverObj.drive();
  }

  function dismissTour() {
    setShowPrompt(false);
    localStorage.setItem(TOUR_DISMISSED_KEY, "true");
  }

  // Also expose a function to restart the tour (callable from Settings)
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as Record<string, unknown>).__restartProductTour = () => {
        localStorage.removeItem(TOUR_STORAGE_KEY);
        localStorage.removeItem(TOUR_DISMISSED_KEY);
        setShowPrompt(false);

        const driverObj = driver({
          showProgress: true,
          animate: true,
          smoothScroll: true,
          allowClose: true,
          overlayColor: "rgba(0, 0, 0, 0.6)",
          stagePadding: 8,
          stageRadius: 8,
          popoverClass: "ocp-tour-popover",
          nextBtnText: "Next",
          prevBtnText: "Back",
          doneBtnText: "Get Started",
          progressText: "{{current}} of {{total}}",
          steps: tourSteps,
          onDestroyStarted: () => {
            localStorage.setItem(TOUR_STORAGE_KEY, "true");
            driverObj.destroy();
          },
        });

        driverObj.drive();
      };
    }
  }, []);

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
          Would you like a quick guided tour? We'll show you around the key features in about 30 seconds.
        </p>

        <div className="flex gap-3">
          <button
            onClick={dismissTour}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Skip for now
          </button>
          <button
            onClick={startTour}
            className="flex-1 rounded-lg bg-scg-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-scg-700"
          >
            Start Tour
          </button>
        </div>
      </div>
    </div>
  );
}
