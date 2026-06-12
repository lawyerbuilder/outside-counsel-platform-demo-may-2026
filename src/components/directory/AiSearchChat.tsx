"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  X,
  MessageSquare,
  ListChecks,
  Plus,
  Trash2,
  ArrowRight,
  FileText,
  Wand2,
  Check,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

type ShortlistFirm = {
  id: string;
  name: string;
  shortName: string | null;
  country: string;
  city: string | null;
  invitationId: string;
};

type ActionButton = {
  type: string;
  param?: string;
  label: string;
};

// ─── Parsing helpers ────────────────────────────────────────────────────────

const ACTION_RE = /^\{\{(\w+)(?::([^}]*))?\}\}\s*$/;
const FIRM_LINK_RE = /\[([^\]]+)\]\(\/firms\/([^)]+)\)/;

function parseActionLine(line: string): ActionButton | null {
  const m = line.trim().match(ACTION_RE);
  if (!m) return null;
  const type = m[1];
  const parts = m[2]?.split(":") ?? [];

  switch (type) {
    case "add_shortlist":
      return {
        type: "add_shortlist",
        param: parts[0],
        label: parts.slice(1).join(":") || "Add to Shortlist",
      };
    case "view_shortlist":
      return { type: "view_shortlist", label: "View Shortlist" };
    case "approve_shortlist":
      return { type: "approve_shortlist", label: "Approve Shortlist & Send RFP" };
    case "rfp_wizard":
      return { type: "rfp_wizard", label: "Use RFP Wizard (Step-by-Step)" };
    case "rfp_ai":
      return { type: "rfp_ai", label: "Use AI RFP Assistant" };
    default:
      return null;
  }
}

function parseResultLinks(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);

    const linkIdx = linkMatch?.index ?? Infinity;
    const boldIdx = boldMatch?.index ?? Infinity;

    if (linkIdx === Infinity && boldIdx === Infinity) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    if (linkIdx <= boldIdx && linkMatch && linkMatch.index !== undefined) {
      if (linkMatch.index > 0) {
        parts.push(
          <span key={key++}>{remaining.slice(0, linkMatch.index)}</span>
        );
      }
      const href = linkMatch[2];
      const isExternal = href.startsWith("http");
      if (isExternal) {
        parts.push(
          <a
            key={key++}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-blue-600 underline hover:text-blue-800"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        parts.push(
          <Link
            key={key++}
            href={href}
            className="font-medium text-scg-700 underline hover:text-scg-900"
          >
            {linkMatch[1]}
          </Link>
        );
      }
      remaining = remaining.slice(linkMatch.index + linkMatch[0].length);
    } else if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) {
        parts.push(
          <span key={key++}>{remaining.slice(0, boldMatch.index)}</span>
        );
      }
      parts.push(
        <strong key={key++} className="font-semibold text-gray-900">
          {parseResultLinks(boldMatch[1])}
        </strong>
      );
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
    }
  }

  return parts;
}

// ─── Action button component ────────────────────────────────────────────────

function ActionButtonUI({
  action,
  onAction,
  disabled,
  consumed,
}: {
  action: ActionButton;
  onAction: (action: ActionButton) => void;
  disabled?: boolean;
  consumed?: boolean;
}) {
  const iconMap: Record<string, React.ReactNode> = {
    add_shortlist: consumed ? <Check size={14} /> : <Plus size={14} />,
    view_shortlist: <ListChecks size={14} />,
    approve_shortlist: consumed ? <Check size={14} /> : <ArrowRight size={14} />,
    rfp_wizard: <FileText size={14} />,
    rfp_ai: <Wand2 size={14} />,
  };

  const styleMap: Record<string, string> = {
    add_shortlist:
      "border-scg-300 bg-scg-50 text-scg-700 hover:bg-scg-100",
    view_shortlist:
      "border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100",
    approve_shortlist:
      "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100",
    rfp_wizard:
      "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100",
    rfp_ai:
      "border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100",
  };

  const consumedStyle = "border-gray-200 bg-gray-50 text-gray-400 cursor-default";

  return (
    <button
      onClick={() => !consumed && onAction(action)}
      disabled={disabled || consumed}
      className={`mt-1 inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-default disabled:opacity-50 ${
        consumed
          ? consumedStyle
          : (styleMap[action.type] ?? "border-gray-300 bg-gray-50 text-gray-700")
      }`}
    >
      {iconMap[action.type]}
      {consumed && action.type === "add_shortlist" ? "Added" : ""}
      {consumed && action.type === "approve_shortlist" ? "Approved" : ""}
      {!consumed ? action.label : ""}
      {consumed && action.type !== "add_shortlist" && action.type !== "approve_shortlist" ? action.label : ""}
    </button>
  );
}

// ─── Message bubble ─────────────────────────────────────────────────────────

function MessageBubble({
  message,
  onAction,
  isActionDisabled,
  consumedActions,
}: {
  message: Message;
  onAction: (action: ActionButton, messageId: string) => void;
  isActionDisabled?: boolean;
  consumedActions: Set<string>;
}) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-scg-600" : "bg-amber-100"
        }`}
      >
        {isUser ? (
          <User size={14} className="text-white" />
        ) : (
          <Bot size={14} className="text-amber-700" />
        )}
      </div>
      <div
        className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-scg-600 text-white"
            : "border border-gray-200 bg-white text-gray-800"
        }`}
      >
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          (() => {
            const lines = message.content.split("\n");
            // Pre-scan: collect firm IDs that already have explicit {{add_shortlist}} tokens
            const explicitIds = new Set<string>();
            for (const l of lines) {
              const m = l.trim().match(/^\{\{add_shortlist:([^:}]+)/);
              if (m) explicitIds.add(m[1]);
            }

            // Track firm IDs that already got an auto-generated button (avoid duplicates)
            const autoButtonIds = new Set<string>();

            // Helper: render an inline "Add to shortlist" button for a firm link
            function autoShortlistBtn(line: string) {
              const fm = line.match(FIRM_LINK_RE);
              if (!fm) return null;
              const [, firmName, firmId] = fm;
              if (explicitIds.has(firmId)) return null; // AI already emitted a button
              if (autoButtonIds.has(firmId)) return null; // already rendered for this firm
              autoButtonIds.add(firmId);
              const actionKey = `${message.id}:add_shortlist:${firmId}`;
              const isConsumed = consumedActions.has(actionKey);
              const action: ActionButton = {
                type: "add_shortlist",
                param: firmId,
                label: firmName,
              };
              return (
                <ActionButtonUI
                  action={action}
                  onAction={(a) => onAction(a, message.id)}
                  disabled={isActionDisabled}
                  consumed={isConsumed}
                />
              );
            }

            return (
              <div className="space-y-2">
                {lines.map((line, i) => {
                  if (!line.trim()) return <div key={i} className="h-1.5" />;

                  const action = parseActionLine(line);
                  if (action) {
                    const actionKey = `${message.id}:${action.type}:${action.param ?? ""}`;
                    return (
                      <div key={i}>
                        <ActionButtonUI
                          action={action}
                          onAction={(a) => onAction(a, message.id)}
                          disabled={isActionDisabled}
                          consumed={consumedActions.has(actionKey)}
                        />
                      </div>
                    );
                  }

                  if (/^---+$/.test(line.trim())) {
                    return <hr key={i} className="my-2 border-gray-200" />;
                  }

                  // Firm heading (## or ### Firm Name — details)
                  if (/^#{2,3}\s/.test(line.trim())) {
                    return (
                      <div key={i}>
                        <p className="mt-2 font-semibold text-gray-900">
                          {parseResultLinks(line.trim().replace(/^#{2,3}\s*/, ""))}
                        </p>
                        {autoShortlistBtn(line)}
                      </div>
                    );
                  }

                  if (
                    line.trim().startsWith("- ") ||
                    line.trim().startsWith("• ")
                  ) {
                    return (
                      <p key={i} className="pl-3 text-gray-700">
                        {parseResultLinks(line)}
                      </p>
                    );
                  }
                  if (/^\d+\./.test(line.trim())) {
                    const btn = autoShortlistBtn(line);
                    return (
                      <div key={i} className="text-gray-700">
                        {parseResultLinks(line)}
                        {btn}
                      </div>
                    );
                  }
                  return (
                    <div key={i}>
                      <p className="text-gray-700">
                        {parseResultLinks(line)}
                      </p>
                      {autoShortlistBtn(line)}
                    </div>
                  );
                })}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}

// ─── Shortlist panel ────────────────────────────────────────────────────────

function ShortlistPanel({
  firms,
  onRemove,
  onClose,
}: {
  firms: ShortlistFirm[];
  onRemove: (firmId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="border-b border-gray-200 bg-scg-50/50 px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold text-scg-800">
          <ListChecks size={14} />
          Shortlist ({firms.length} firm{firms.length !== 1 ? "s" : ""})
        </h4>
        <button
          onClick={onClose}
          className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
        >
          <X size={12} />
        </button>
      </div>
      {firms.length === 0 ? (
        <p className="text-xs text-gray-500">
          No firms shortlisted yet. Ask the AI to recommend firms and add them.
        </p>
      ) : (
        <div className="space-y-1">
          {firms.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between rounded bg-white px-2 py-1.5 text-xs"
            >
              <span className="font-medium text-gray-800">
                {f.shortName || f.name}{" "}
                <span className="font-normal text-gray-400">
                  {f.city ? `${f.city}, ` : ""}
                  {f.country}
                </span>
              </span>
              <button
                onClick={() => onRemove(f.id)}
                className="rounded p-0.5 text-gray-400 hover:text-red-500"
                title="Remove from shortlist"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function AiSearchChat() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [shortlist, setShortlist] = useState<ShortlistFirm[]>([]);
  const [shortlistRfpId, setShortlistRfpId] = useState<string | null>(null);
  const [showShortlist, setShowShortlist] = useState(false);
  const [consumedActions, setConsumedActions] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/shortlist")
      .then((r) => r.json())
      .then((data) => {
        if (data.firms) setShortlist(data.firms);
        if (data.rfpId) setShortlistRfpId(data.rfpId);
      })
      .catch(() => {});
  }, [isOpen]);

  const markConsumed = useCallback((messageId: string, action: ActionButton) => {
    setConsumedActions((prev) => {
      const next = new Set(prev);
      next.add(`${messageId}:${action.type}:${action.param ?? ""}`);
      return next;
    });
  }, []);

  const addSystemMessage = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content,
        timestamp: new Date(),
      },
    ]);
  }, []);

  // ─── Shortlist actions ──────────────────────────────────────────────────

  async function handleAddToShortlist(firmId: string, firmName: string, messageId: string, action: ActionButton) {
    markConsumed(messageId, action);
    try {
      const res = await fetch("/api/shortlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_firm", firmId }),
      });
      const data = await res.json();
      if (data.firms) {
        setShortlist(data.firms);
        setShortlistRfpId(data.rfpId);
        addSystemMessage(
          `**${firmName}** has been added to your shortlist. You now have **${data.firms.length}** firm${data.firms.length !== 1 ? "s" : ""} shortlisted.\n\n${data.firms.length >= 2 ? "When you're ready, you can approve the shortlist and send an RFP.\n{{approve_shortlist}}" : "Keep searching to add more firms, or approve when ready."}`
        );
      }
    } catch {
      addSystemMessage("Failed to add firm to shortlist. Please try again.");
    }
  }

  async function handleRemoveFromShortlist(firmId: string) {
    try {
      const res = await fetch("/api/shortlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_firm", firmId }),
      });
      const data = await res.json();
      if (data.firms) setShortlist(data.firms);
    } catch {}
  }

  function handleViewShortlist() {
    setShowShortlist(true);
  }

  async function handleApproveShortlist(messageId: string, action: ActionButton) {
    if (shortlist.length === 0) {
      addSystemMessage(
        "Your shortlist is empty. Search for firms and add them first."
      );
      return;
    }

    markConsumed(messageId, action);

    addSystemMessage(
      `Your shortlist with **${shortlist.length}** firm${shortlist.length !== 1 ? "s" : ""} is approved! How would you like to create the RFP?\n\n{{rfp_wizard}}\n{{rfp_ai}}`
    );
  }

  function handleRfpWizard() {
    const firmIds = shortlist.map((f) => f.id).join(",");
    router.push(`/rfp/new?firmIds=${firmIds}&draftId=${shortlistRfpId ?? ""}`);
  }

  function handleRfpAiAssistant() {
    const firmIds = shortlist.map((f) => f.id).join(",");
    router.push(
      `/rfp/new?ai=true&firmIds=${firmIds}&draftId=${shortlistRfpId ?? ""}`
    );
  }

  // ─── Action dispatch ────────────────────────────────────────────────────

  function handleAction(action: ActionButton, messageId: string) {
    switch (action.type) {
      case "add_shortlist":
        if (action.param) {
          handleAddToShortlist(action.param, action.label, messageId, action);
        }
        break;
      case "view_shortlist":
        handleViewShortlist();
        break;
      case "approve_shortlist":
        handleApproveShortlist(messageId, action);
        break;
      case "rfp_wizard":
        handleRfpWizard();
        break;
      case "rfp_ai":
        handleRfpAiAssistant();
        break;
    }
  }

  // ─── Chat submit ────────────────────────────────────────────────────────

  async function submitMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    if (!isOpen) setIsOpen(true);

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    const assistantId = crypto.randomUUID();

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const chatHistory = [...messages, userMsg]
        .filter(
          (m) =>
            !m.content.startsWith("**") ||
            !m.content.includes("has been added to your shortlist")
        )
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatHistory }),
      });

      // Non-streaming error response (JSON)
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong");
        return;
      }

      // Streaming response — create assistant message and fill progressively
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant" as const, content: "", timestamp: new Date() },
      ]);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.t) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + data.t }
                    : m
                )
              );
            } else if (data.error) {
              setError(data.error);
            }
          } catch {
            /* skip malformed lines */
          }
        }
      }
    } catch {
      setError("Failed to connect. Check your network and try again.");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitMessage(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  // ─── Suggested prompts ──────────────────────────────────────────────────

  const suggestions = [
    "Find me a litigation firm in Thailand",
    "Top M&A lawyers we've worked with",
    "IP boutique in Singapore",
    "Compare firms for banking & finance",
  ];

  function handleSuggestionClick(suggestion: string) {
    setIsOpen(true);
    submitMessage(suggestion);
  }

  // ─── Inline trigger bar (always visible in page flow) ──────────────────

  const triggerBar = (
    <div className="space-y-2">
      <div
        onClick={() => setIsOpen(true)}
        className="flex cursor-pointer items-center gap-3 rounded-lg border border-scg-200 bg-gradient-to-r from-scg-50 to-amber-50/30 px-4 py-2.5 transition-all hover:border-scg-300 hover:shadow-md"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-scg-600">
          <Sparkles size={14} className="text-white" />
        </div>
        <span className="flex-1 text-sm text-gray-400">
          Find me a lawyer for...
        </span>
        {messages.length > 0 && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-scg-100 text-scg-600">
            <MessageSquare size={12} />
          </div>
        )}
      </div>
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => handleSuggestionClick(s)}
              className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 transition-colors hover:border-scg-300 hover:bg-scg-50 hover:text-scg-700"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // ─── Floating drawer (overlay, doesn't push content) ───────────────────

  const drawer = isOpen && (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"
        onClick={() => setIsOpen(false)}
      />

      {/* Panel */}
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-scg-600">
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                AI Counsel Finder
              </h3>
              <p className="text-[10px] text-gray-400">AI-powered search</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {shortlist.length > 0 && (
              <button
                onClick={() => setShowShortlist((v) => !v)}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  showShortlist
                    ? "bg-scg-600 text-white"
                    : "bg-scg-100 text-scg-700 hover:bg-scg-200"
                }`}
              >
                <ListChecks size={12} />
                {shortlist.length}
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Shortlist panel */}
        {showShortlist && (
          <ShortlistPanel
            firms={shortlist}
            onRemove={handleRemoveFromShortlist}
            onClose={() => setShowShortlist(false)}
          />
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Bot size={32} className="mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">
                How can I help you find counsel?
              </p>
              <p className="mt-1 text-xs text-gray-400">Try something like:</p>
              <div className="mt-3 space-y-2">
                {[
                  "Find me a litigation firm in Thailand with strong Chambers rankings",
                  "Who are the top M&A lawyers we've worked with?",
                  "I need a cost-effective boutique firm for an IP dispute in Singapore",
                  "Compare Baker McKenzie and Linklaters for banking work",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => submitMessage(suggestion)}
                    className="block w-full rounded-md border border-gray-200 px-3 py-2 text-left text-xs text-gray-600 hover:border-scg-300 hover:bg-scg-50/50"
                  >
                    &ldquo;{suggestion}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onAction={handleAction}
                isActionDisabled={isLoading}
                consumedActions={consumedActions}
              />
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100">
                  <Bot size={14} className="text-amber-700" />
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-500">
                  <Loader2 size={14} className="animate-spin" />
                  Searching the directory...
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
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
              placeholder="Find me a lawyer for..."
              rows={1}
              className="flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-scg-500 focus:outline-none"
              style={{ minHeight: "38px", maxHeight: "100px" }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex h-[38px] w-[38px] items-center justify-center rounded-md bg-scg-600 text-white hover:bg-scg-700 disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {triggerBar}
      {drawer}
    </>
  );
}
