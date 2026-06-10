"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Loader2,
  Compass,
  AlertTriangle,
  Building2,
  ArrowRight,
  FileText,
  Send,
  Search,
  UserX,
} from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { AiGeneratedBadge } from "@/components/shared/AiGeneratedBadge";

type IntakeFirm = {
  firmId: string | null;
  firmName: string;
  firmType: string | null;
  panelStatus: string | null;
  overallScore: number | null;
  lastScorecardTier: string | null;
  notes: string | null;
  warnings: string[];
  inDirectory: boolean;
};

type ResearchFirm = {
  name: string;
  note: string;
  inDirectory: boolean;
  firmId: string | null;
  panelStatus: string | null;
};

type Assessment = {
  practiceAreaId: string;
  jurisdictionId: string;
  practiceArea: string;
  jurisdiction: string;
  complexityTier: string;
  urgency: string;
  riskLevel: string;
  budgetBandUsd: { low: number; high: number } | null;
  missingFacts?: string[];
  summary: string;
  title: string;
};

type Turn = {
  role: "user" | "assistant";
  text: string;
  firms?: IntakeFirm[];
  addedFirm?: IntakeFirm;
  researchFirms?: ResearchFirm[];
};

const EXAMPLES = [
  "We are acquiring a packaging plant in Vietnam, deal value around USD 40M, need M&A counsel, signing in 8 weeks",
  "Supplier in Thailand is disputing a THB 50M contract termination and threatening arbitration",
  "Need to review and update employment contracts for our Singapore office, around 30 employees",
];

const levelVariant: Record<string, BadgeVariant> = {
  HIGH: "red",
  COMPLEX: "red",
  MEDIUM: "amber",
  STANDARD: "amber",
  LOW: "green",
  ROUTINE: "green",
};

function fmtBudget(band: { low: number; high: number } | null): string {
  if (!band) return "Not provided";
  const f = (n: number) => (n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`);
  return band.low === band.high ? f(band.high) : `${f(band.low)} - ${f(band.high)}`;
}

function FirmCard({ firm, topMatch }: { firm: IntakeFirm; topMatch?: boolean }) {
  const inner = (
    <>
      <div className="flex items-start justify-between">
        <span className="text-sm font-semibold text-gray-900">{firm.firmName}</span>
        {firm.overallScore != null && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              firm.overallScore >= 80
                ? "bg-green-50 text-green-700"
                : firm.overallScore >= 60
                  ? "bg-amber-50 text-amber-700"
                  : "bg-red-50 text-red-700"
            }`}
          >
            {Math.round(firm.overallScore)}
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {firm.firmType && (
          <Badge variant="outline" className="text-[10px]">{firm.firmType}</Badge>
        )}
        {topMatch && <Badge variant="scg" className="text-[10px]">Top match</Badge>}
        {!firm.inDirectory && (
          <Badge variant="amber" className="text-[10px]">AI-researched</Badge>
        )}
        {firm.lastScorecardTier && (
          <Badge variant="gray" className="text-[10px]">
            {firm.lastScorecardTier.replace(/_/g, " ")}
          </Badge>
        )}
      </div>
      {firm.notes && <p className="mt-2 text-xs text-gray-500 line-clamp-2">{firm.notes}</p>}
      {firm.warnings.length > 0 && (
        <div className="mt-2 flex items-start gap-1 text-xs text-amber-600">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <span>{firm.warnings.join("; ")}</span>
        </div>
      )}
    </>
  );

  if (firm.firmId) {
    return (
      <Link
        href={`/firms/${firm.firmId}`}
        className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
      >
        {inner}
      </Link>
    );
  }
  return <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4">{inner}</div>;
}

export function IntakeClient() {
  const [description, setDescription] = useState("");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [recommendedPath, setRecommendedPath] = useState<"DIRECT" | "RFP" | null>(null);
  const [currentFirms, setCurrentFirms] = useState<IntakeFirm[]>([]);
  const [excludedFirmNames, setExcludedFirmNames] = useState<string[]>([]);
  const [prefillUrl, setPrefillUrl] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);

  const threadEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (turns.length > 2) threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  async function handleAssess() {
    if (description.trim().length < 20) {
      setError("Please describe the matter in a bit more detail (a sentence or two).");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Assessment failed. Please try again.");
        return;
      }
      setAssessment(data.assessment);
      setRecommendedPath(data.recommendedPath);
      setCurrentFirms(data.firms);
      setPrefillUrl(data.rfpPrefillUrl);
      setExcludedFirmNames([]);
      setTurns([
        { role: "user", text: description.trim() },
        { role: "assistant", text: data.reasoning, firms: data.firms },
      ]);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFollowUp(text?: string) {
    const followUp = (text ?? input).trim();
    if (!followUp || !assessment) return;
    setInput("");
    setError(null);
    setTurns((prev) => [...prev, { role: "user", text: followUp }]);
    setIsLoading(true);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followUp,
          context: {
            description: turns[0]?.text ?? assessment.summary,
            practiceAreaId: assessment.practiceAreaId,
            jurisdictionId: assessment.jurisdictionId,
            practiceArea: assessment.practiceArea,
            jurisdiction: assessment.jurisdiction,
            complexityTier: assessment.complexityTier,
            urgency: assessment.urgency,
            title: assessment.title,
            budgetHighUsd: assessment.budgetBandUsd?.high ?? 0,
            excludedFirmNames,
            history: turns.slice(-6).map((t) => ({ role: t.role, content: t.text })),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTurns((prev) => [
          ...prev,
          { role: "assistant", text: data.error ?? "Something went wrong. Please try again." },
        ]);
        return;
      }
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.message,
          firms: data.firms,
          addedFirm: data.addedFirm,
          researchFirms: data.researchFirms,
        },
      ]);
      if (data.firms) setCurrentFirms(data.firms);
      if (data.recommendedPath) setRecommendedPath(data.recommendedPath);
      if (data.rfpPrefillUrl) setPrefillUrl(data.rfpPrefillUrl);
      if (data.excludedFirmNames) setExcludedFirmNames(data.excludedFirmNames);
      if (data.budgetBandUsd) {
        setAssessment((prev) =>
          prev
            ? {
                ...prev,
                budgetBandUsd: data.budgetBandUsd,
                missingFacts: prev.missingFacts?.filter(
                  (q) => !q.toLowerCase().includes("budget") && !q.toLowerCase().includes("fee")
                ),
              }
            : prev
        );
      }
    } catch {
      setTurns((prev) => [
        ...prev,
        { role: "assistant", text: "Network error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  type Chip = { label: string; sendNow: boolean; text: string };
  const followUpChips: Chip[] = assessment
    ? (
        [
          !assessment.budgetBandUsd
            ? { label: "Provide our budget", sendNow: false, text: "Our budget for external fees is USD " }
            : null,
          currentFirms[0]
            ? {
                label: `Exclude ${currentFirms[0].firmName}`,
                sendNow: true,
                text: `We had a bad experience with ${currentFirms[0].firmName}, exclude them`,
              }
            : null,
          { label: "Research more firms", sendNow: true, text: "Research more firms beyond the panel" },
          {
            label: "Suggest a firm",
            sendNow: false,
            text: "I want to suggest a firm we have worked with before: ",
          },
        ] as Array<Chip | null>
      ).filter((c): c is Chip => c !== null)
    : [];

  return (
    <div className="space-y-6">
      {/* Initial input */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <label htmlFor="matter-description" className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Sparkles size={16} className="text-scg-600" />
          What do you need help with?
        </label>
        <textarea
          id="matter-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="e.g. We are acquiring a packaging plant in Vietnam, deal value USD 40M, need M&A counsel, signing in 8 weeks..."
          className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setDescription(ex)}
              className="rounded-full border border-gray-200 px-3 py-1 text-left text-xs text-gray-500 hover:border-scg-300 hover:text-scg-700"
            >
              {ex.slice(0, 60)}…
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleAssess}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-md bg-scg-700 px-4 py-2 text-sm font-medium text-white hover:bg-scg-800 disabled:opacity-50"
          >
            {isLoading && !assessment ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Assessing matter...
              </>
            ) : (
              <>
                <Compass size={16} />
                {assessment ? "Start over with a new matter" : "Assess and recommend"}
              </>
            )}
          </button>
        </div>
        {error && (
          <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
      </div>

      {assessment && (
        <>
          {/* Assessment summary (pinned) */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">{assessment.title}</h2>
              <AiGeneratedBadge />
            </div>
            <p className="mt-1 text-sm text-gray-500">{assessment.summary}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Practice Area</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{assessment.practiceArea}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Jurisdiction</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{assessment.jurisdiction}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Complexity</p>
                <Badge variant={levelVariant[assessment.complexityTier] ?? "gray"} className="mt-1 text-[10px]">
                  {assessment.complexityTier}
                </Badge>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Risk</p>
                <Badge variant={levelVariant[assessment.riskLevel] ?? "gray"} className="mt-1 text-[10px]">
                  {assessment.riskLevel}
                </Badge>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Urgency</p>
                <Badge variant={levelVariant[assessment.urgency] ?? "gray"} className="mt-1 text-[10px]">
                  {assessment.urgency}
                </Badge>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Budget</p>
                <p className={`mt-1 text-sm font-medium ${assessment.budgetBandUsd ? "text-gray-900" : "text-gray-400"}`}>
                  {fmtBudget(assessment.budgetBandUsd)}
                </p>
              </div>
            </div>
            {assessment.missingFacts && assessment.missingFacts.length > 0 && (
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold text-amber-800">
                  To confirm before sending an RFP (answer below in the chat):
                </p>
                <ul className="mt-1 space-y-0.5">
                  {assessment.missingFacts.map((q) => (
                    <li key={q} className="text-xs text-amber-700">• {q}</li>
                  ))}
                </ul>
              </div>
            )}
            {excludedFirmNames.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Excluded:</span>
                {excludedFirmNames.map((n) => (
                  <Badge key={n} variant="red" className="gap-1 text-[10px]">
                    <UserX size={10} />
                    {n}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Current recommendation banner */}
          <div className="rounded-lg border-2 border-scg-200 bg-scg-50/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Compass size={18} className="text-scg-700" />
                <span className="text-sm font-semibold text-scg-800">
                  Current path:{" "}
                  {recommendedPath === "DIRECT"
                    ? "Instruct a panel firm directly"
                    : "Run a competitive RFP"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {recommendedPath === "DIRECT" && currentFirms[0]?.firmId ? (
                  <>
                    <Link
                      href={`/firms/${currentFirms[0].firmId}`}
                      className="inline-flex items-center gap-2 rounded-md bg-scg-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-scg-800"
                    >
                      <Building2 size={14} />
                      Instruct {currentFirms[0].firmName}
                      <ArrowRight size={12} />
                    </Link>
                    {prefillUrl && (
                      <Link href={prefillUrl} className="text-xs font-medium text-scg-700 hover:text-scg-800">
                        ...or run an RFP anyway
                      </Link>
                    )}
                  </>
                ) : (
                  prefillUrl && (
                    <Link
                      href={prefillUrl}
                      className="inline-flex items-center gap-2 rounded-md bg-scg-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-scg-800"
                    >
                      <FileText size={14} />
                      Continue to RFP wizard (pre-filled)
                      <ArrowRight size={12} />
                    </Link>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Conversation thread */}
          <div className="space-y-3">
            {turns.map((turn, i) => (
              <div key={i}>
                {turn.role === "user" ? (
                  <div className="ml-12 rounded-lg bg-scg-50 px-4 py-3 text-sm text-gray-900">
                    {turn.text}
                  </div>
                ) : (
                  <div className="mr-12 space-y-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Sparkles size={12} className="text-scg-600" />
                      <span className="text-[10px] font-medium uppercase text-gray-400">Sourcing advisor</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-gray-700">{turn.text}</p>

                    {turn.firms && turn.firms.length > 0 && (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {turn.firms.map((firm, fi) => (
                          <FirmCard key={firm.firmId ?? firm.firmName} firm={firm} topMatch={fi === 0} />
                        ))}
                      </div>
                    )}

                    {turn.addedFirm && (
                      <div className="max-w-sm">
                        <FirmCard firm={turn.addedFirm} />
                      </div>
                    )}

                    {turn.researchFirms && turn.researchFirms.length > 0 && (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {turn.researchFirms.map((rf) => (
                          <div
                            key={rf.name}
                            className={`rounded-lg border p-3 ${rf.inDirectory ? "border-gray-200 bg-white" : "border-dashed border-gray-300 bg-gray-50"}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              {rf.firmId ? (
                                <Link href={`/firms/${rf.firmId}`} className="text-sm font-semibold text-scg-700 hover:text-scg-800">
                                  {rf.name}
                                </Link>
                              ) : (
                                <span className="text-sm font-semibold text-gray-900">{rf.name}</span>
                              )}
                              <Badge variant={rf.inDirectory ? "green" : "amber"} className="shrink-0 text-[10px]">
                                {rf.inDirectory ? "In directory" : "AI-researched"}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">{rf.note}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {isLoading && turns.length > 0 && (
              <div className="mr-12 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">
                <Loader2 size={14} className="animate-spin" />
                Working on it...
              </div>
            )}
            <div ref={threadEndRef} />
          </div>

          {/* Follow-up input */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            {turns.length <= 2 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {followUpChips.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => (chip.sendNow ? handleFollowUp(chip.text) : setInput(chip.text))}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-scg-300 hover:text-scg-700 disabled:opacity-50"
                  >
                    {chip.label.startsWith("Research") ? <Search size={11} /> : <UserX size={11} />}
                    {chip.label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleFollowUp();
                  }
                }}
                disabled={isLoading}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500 disabled:opacity-50"
                placeholder="Exclude a firm, suggest one we know, ask for more research, or ask a question..."
              />
              <button
                onClick={() => handleFollowUp()}
                disabled={isLoading || !input.trim()}
                className="rounded-md bg-scg-600 px-4 py-2 text-white hover:bg-scg-700 disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
