"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  FileText,
} from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ExtractedFields = {
  costCenterCode?: string;
  jurisdictionId?: string;
  jurisdictionName?: string;
  practiceAreaId?: string;
  practiceAreaName?: string;
  complexityTier?: string;
  description?: string;
  urgency?: string;
  feeStructure?: string;
  feeCap?: string;
  evaluationCriteria?: string[];
  title?: string;
};

function FieldBadge({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-scg-50 px-2.5 py-1 text-xs">
      <CheckCircle2 size={12} className="text-scg-600" />
      <span className="font-medium text-scg-800">{label}:</span>
      <span className="text-scg-600">{value}</span>
    </div>
  );
}

export function AiRfpAssistant({
  firmIds,
  firmNames,
  draftId,
  jurisdictions,
  practiceAreas,
}: {
  firmIds: string[];
  firmNames: Record<string, string>;
  draftId?: string;
  jurisdictions: { id: string; name: string }[];
  practiceAreas: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fields, setFields] = useState<ExtractedFields>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const firmNameList = firmIds.map((id) => firmNames[id] ?? id).join(", ");
    const greeting: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `I'll help you create an RFP for your shortlisted firms: **${firmNameList}**.\n\nLet's start — what type of legal matter do you need counsel for? Describe the situation in your own words and I'll help structure the RFP.`,
    };
    setMessages([greeting]);
  }, [firmIds, firmNames]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/rfp/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          currentFields: fields,
          firmIds,
          firmNames,
          jurisdictions,
          practiceAreas,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Something went wrong. Please try again.",
          },
        ]);
        return;
      }

      if (data.fields) {
        setFields((prev) => ({ ...prev, ...data.fields }));
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.message,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Failed to connect. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleCreateRfp() {
    const params = new URLSearchParams();
    if (draftId) params.set("draftId", draftId);
    if (firmIds.length) params.set("firmIds", firmIds.join(","));
    if (fields.jurisdictionId) params.set("jurisdictionId", fields.jurisdictionId);
    if (fields.practiceAreaId) params.set("practiceAreaId", fields.practiceAreaId);
    if (fields.complexityTier) params.set("complexityTier", fields.complexityTier);
    if (fields.description) params.set("description", fields.description);
    if (fields.urgency) params.set("urgency", fields.urgency);
    if (fields.costCenterCode) params.set("costCenterCode", fields.costCenterCode);
    params.set("step", "10");
    router.push(`/rfp/new?${params.toString()}`);
  }

  function handleSwitchToWizard() {
    const params = new URLSearchParams();
    if (draftId) params.set("draftId", draftId);
    if (firmIds.length) params.set("firmIds", firmIds.join(","));
    router.push(`/rfp/new?${params.toString()}`);
  }

  const fieldCount = Object.values(fields).filter((v) =>
    Array.isArray(v) ? v.length > 0 : !!v
  ).length;

  const requiredReady = !!(fields.description && fields.jurisdictionName && fields.practiceAreaName);

  return (
    <div className="flex gap-6">
      {/* Chat panel */}
      <div className="flex flex-1 flex-col surface shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-600">
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                AI RFP Assistant
              </h3>
              <p className="text-[10px] text-gray-400">
                Describe your needs, I&apos;ll structure the RFP
              </p>
            </div>
          </div>
          <button
            onClick={handleSwitchToWizard}
            className="flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            <ArrowLeft size={12} />
            Switch to Wizard
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3" style={{ minHeight: "400px", maxHeight: "60vh" }}>
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    msg.role === "user" ? "bg-scg-600" : "bg-purple-100"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User size={14} className="text-white" />
                  ) : (
                    <Bot size={14} className="text-purple-700" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-scg-600 text-white"
                      : "border border-gray-200 bg-white text-gray-800"
                  }`}
                >
                  {msg.content.split("\n").map((line, i) => {
                    if (!line.trim()) return <div key={i} className="h-1.5" />;
                    const boldRe = /\*\*([^*]+)\*\*/g;
                    const parts = line.split(boldRe);
                    return (
                      <p key={i} className={msg.role === "user" ? "" : "text-gray-700"}>
                        {parts.map((part, j) =>
                          j % 2 === 1 ? (
                            <strong key={j} className="font-semibold">
                              {part}
                            </strong>
                          ) : (
                            <span key={j}>{part}</span>
                          )
                        )}
                      </p>
                    );
                  })}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-100">
                  <Bot size={14} className="text-purple-700" />
                </div>
                <div className="flex items-center gap-2 surface px-3.5 py-2.5 text-sm text-gray-500">
                  <Loader2 size={14} className="animate-spin" />
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your legal matter..."
              rows={2}
              className="flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              style={{ minHeight: "44px", maxHeight: "120px" }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex h-[44px] w-[44px] items-center justify-center rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      </div>

      {/* Side panel — extracted fields */}
      <div className="w-72 shrink-0">
        <div className="sticky top-4 surface p-4 shadow-sm">
          <h4 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <FileText size={14} />
            RFP Fields ({fieldCount})
          </h4>

          <div className="space-y-2">
            {firmIds.length > 0 && (
              <FieldBadge
                label="Firms"
                value={firmIds.map((id) => firmNames[id] ?? "Unknown").join(", ")}
              />
            )}
            <FieldBadge label="Jurisdiction" value={fields.jurisdictionName} />
            <FieldBadge label="Practice area" value={fields.practiceAreaName} />
            <FieldBadge label="Complexity" value={fields.complexityTier} />
            <FieldBadge label="Urgency" value={fields.urgency} />
            <FieldBadge label="Fee structure" value={fields.feeStructure} />
            <FieldBadge label="Fee cap" value={fields.feeCap} />
            <FieldBadge label="Cost center" value={fields.costCenterCode} />
            {fields.description && (
              <div className="mt-2 rounded-md bg-gray-50 p-2 text-xs text-gray-600">
                <p className="mb-1 font-medium text-gray-700">Description:</p>
                <p className="line-clamp-4">{fields.description}</p>
              </div>
            )}
          </div>

          <button
            onClick={handleCreateRfp}
            disabled={!requiredReady}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md bg-scg-600 px-3 py-2 text-xs font-medium text-white hover:bg-scg-700 disabled:opacity-40"
          >
            <FileText size={14} />
            Review & Send RFP
          </button>
          {!requiredReady && (
            <p className="mt-1.5 text-center text-[10px] text-gray-400">
              Need: description, jurisdiction, practice area
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
