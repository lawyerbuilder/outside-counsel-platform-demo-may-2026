// ─── GraphRAG Query Pipeline ──────────────────────────────────────────────────
// Two-step Claude pipeline:
//   1. Strategy: analyze the question → TraversalStrategy (JSON)
//   2. Answer: traverse the graph → serialize context → generate answer
//
// Includes fast-path regex matching for common query patterns.

import { callClaude, streamClaude } from "@/server/ai/anthropic";
import { sanitizeLabel } from "@/server/ai/untrusted";
import { getGraph, getGraphStats } from "./graph-builder";
import type { LegalKnowledgeGraph } from "./graph-builder";
import {
  extractSubgraph,
  COMMON_TRAVERSALS,
  serializeContext,
} from "./graph-context";
import { STRATEGY_PROMPT, ANSWER_PROMPT } from "./prompts";
import type {
  TraversalStrategy,
  SubgraphContext,
  GraphQueryResult,
  GraphNodeType,
  GraphEdgeType,
} from "./types";

// ─── Fast-path regex patterns ────────────────────────────────────────────────

type FastPathPattern = {
  pattern: RegExp;
  /**
   * Extract capture groups and call the appropriate COMMON_TRAVERSALS function
   * directly, returning the SubgraphContext (or null if the match doesn't apply).
   */
  execute: (
    graph: LegalKnowledgeGraph,
    match: RegExpMatchArray
  ) => SubgraphContext | null;
};

const FAST_PATH_PATTERNS: FastPathPattern[] = [
  {
    // "find firms for M&A in Thailand", "recommend a firm for IP in Singapore"
    pattern:
      /(?:find|recommend|suggest|search|show|list).*(?:firm|counsel)s?\s+(?:for|doing|practicing|in)\s+(.+?)\s+in\s+(.+)/i,
    execute: (graph, match) =>
      COMMON_TRAVERSALS.firmsByPracticeAndJurisdiction(
        graph,
        match[1].trim(),
        match[2].trim()
      ),
  },
  {
    // "compare Baker McKenzie and Linklaters", "Baker vs Clifford Chance"
    pattern:
      /compare\s+(.+?)\s+(?:and|vs\.?|versus|with)\s+(.+)/i,
    execute: (graph, match) =>
      COMMON_TRAVERSALS.compareFirms(graph, [
        match[1].trim(),
        match[2].trim(),
      ]),
  },
  {
    // "alumni from Baker McKenzie", "who left Clifford Chance"
    pattern:
      /(?:alumni|who\s+left|former\s+lawyers?\s+(?:at|from)|ex[- ]lawyers?\s+(?:at|from))\s+(.+)/i,
    execute: (graph, match) =>
      COMMON_TRAVERSALS.alumniNetwork(graph, match[1].trim()),
  },
  {
    // "lawyers at Baker McKenzie", "show me the team at Linklaters for disputes"
    pattern:
      /(?:lawyers?|partners?|associates?|team|people)\s+(?:at|from|in)\s+(.+?)(?:\s+(?:for|doing|in|practicing)\s+(.+))?$/i,
    execute: (graph, match) =>
      COMMON_TRAVERSALS.lawyersAtFirmByPractice(
        graph,
        match[1].trim(),
        match[2]?.trim() ?? ""
      ),
  },
];

// ─── Main query function ─────────────────────────────────────────────────────

export async function queryGraph(
  question: string,
  conversationHistory?: string
): Promise<GraphQueryResult> {
  const totalStart = performance.now();
  const graph = await getGraph();
  const graphStats = getGraphStats(graph);

  // ── Step 0: Try fast-path pattern matching ──
  const fastPathStart = performance.now();
  const fastResult = tryFastPath(graph, question);
  const strategyTimeMs = performance.now() - fastPathStart;

  let strategy: TraversalStrategy | null = null;
  let context: SubgraphContext;
  let usedFastPath = false;
  let finalStrategyTimeMs = strategyTimeMs;
  let traversalTimeMs: number;

  if (fastResult) {
    // Fast path succeeded -- skip the strategy Claude call
    context = fastResult;
    usedFastPath = true;
    traversalTimeMs = strategyTimeMs; // Fast path includes traversal
  } else {
    // ── Step 1: Ask Claude to generate a TraversalStrategy ──
    const strategyStart = performance.now();
    strategy = await generateStrategy(graph, question, conversationHistory);
    finalStrategyTimeMs = performance.now() - strategyStart;

    // ── Step 2: Execute the traversal ──
    const traversalStart = performance.now();
    context = extractSubgraph(graph, strategy);
    traversalTimeMs = performance.now() - traversalStart;
  }

  // ── Step 3: Generate the answer ──
  const answerStart = performance.now();
  const serialized = serializeContext(context);
  const fullPrompt = buildAnswerUserMessage(serialized, question, graphStats);

  const response = await callClaude({
    systemPrompt: ANSWER_PROMPT,
    userMessage: fullPrompt,
  });
  const answerTimeMs = performance.now() - answerStart;

  const totalTimeMs = performance.now() - totalStart;

  return {
    answer: response.content,
    strategy,
    context,
    stats: {
      graphNodes: graphStats.nodeCount,
      graphEdges: graphStats.edgeCount,
      subgraphNodes: context.nodes.length,
      subgraphEdges: context.edges.length,
      strategyTimeMs: Math.round(finalStrategyTimeMs),
      traversalTimeMs: Math.round(traversalTimeMs),
      answerTimeMs: Math.round(answerTimeMs),
      totalTimeMs: Math.round(totalTimeMs),
      usedFastPath,
    },
  };
}

// ─── Streaming variant ───────────────────────────────────────────────────────

export async function streamGraphQuery(
  question: string,
  conversationHistory: string | undefined,
  onText: (chunk: string) => void
): Promise<GraphQueryResult> {
  const totalStart = performance.now();
  const graph = await getGraph();
  const graphStats = getGraphStats(graph);

  // ── Fast path (non-streaming -- it is instant) ──
  const fastPathStart = performance.now();
  const fastResult = tryFastPath(graph, question);
  const fastPathMs = performance.now() - fastPathStart;

  let strategy: TraversalStrategy | null = null;
  let context: SubgraphContext;
  let usedFastPath = false;
  let finalStrategyTimeMs: number;

  if (fastResult) {
    context = fastResult;
    usedFastPath = true;
    finalStrategyTimeMs = fastPathMs;
  } else {
    // ── Strategy step (non-streaming -- just JSON) ──
    const strategyStart = performance.now();
    strategy = await generateStrategy(graph, question, conversationHistory);
    finalStrategyTimeMs = performance.now() - strategyStart;

    // ── Traversal ──
    context = extractSubgraph(graph, strategy);
  }

  const traversalTimeMs = performance.now() - totalStart - finalStrategyTimeMs;

  // ── Answer step (streaming) ──
  const answerStart = performance.now();
  const serialized = serializeContext(context);
  const fullPrompt = buildAnswerUserMessage(serialized, question, graphStats);

  const response = await streamClaude(
    {
      systemPrompt: ANSWER_PROMPT,
      userMessage: fullPrompt,
    },
    onText
  );
  const answerTimeMs = performance.now() - answerStart;

  const totalTimeMs = performance.now() - totalStart;

  return {
    answer: response.content,
    strategy,
    context,
    stats: {
      graphNodes: graphStats.nodeCount,
      graphEdges: graphStats.edgeCount,
      subgraphNodes: context.nodes.length,
      subgraphEdges: context.edges.length,
      strategyTimeMs: Math.round(finalStrategyTimeMs),
      traversalTimeMs: Math.round(traversalTimeMs),
      answerTimeMs: Math.round(answerTimeMs),
      totalTimeMs: Math.round(totalTimeMs),
      usedFastPath,
    },
  };
}

// ─── Fast-path matching ──────────────────────────────────────────────────────

function tryFastPath(
  graph: LegalKnowledgeGraph,
  question: string
): SubgraphContext | null {
  for (const { pattern, execute } of FAST_PATH_PATTERNS) {
    const match = question.match(pattern);
    if (!match) continue;

    try {
      const context = execute(graph, match);
      // Only use fast path if we actually found nodes
      if (context && context.nodes.length > 0) {
        return context;
      }
    } catch (err) {
      console.warn("[GraphRAG] Fast-path failed:", err);
    }
  }

  return null;
}

// ─── Strategy generation via Claude ──────────────────────────────────────────

async function generateStrategy(
  graph: LegalKnowledgeGraph,
  question: string,
  conversationHistory?: string
): Promise<TraversalStrategy> {
  const schemaDescription = getGraphSchemaDescription(graph);
  const systemPrompt = STRATEGY_PROMPT + "\n\n## Live graph statistics\n" + schemaDescription;

  const userMessage = conversationHistory
    ? `Conversation so far:\n${conversationHistory}\n\nLatest question: ${question}`
    : question;

  const response = await callClaude({
    systemPrompt,
    userMessage,
  });

  return parseStrategy(response.content);
}

/**
 * Parse the strategy JSON from Claude's response.
 * Falls back to a broad search if parsing fails.
 */
function parseStrategy(raw: string): TraversalStrategy {
  try {
    // Claude might wrap the JSON in markdown code fences
    const cleaned = raw
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```\s*$/m, "")
      .trim();

    const parsed = JSON.parse(cleaned) as TraversalStrategy;

    // Basic validation
    if (!parsed.intent || !Array.isArray(parsed.startNodes) || !Array.isArray(parsed.traversals)) {
      throw new Error("Missing required fields in TraversalStrategy");
    }

    // Validate node types
    const validNodeTypes: GraphNodeType[] = [
      "firm", "lawyer", "practiceArea", "jurisdiction",
      "entity", "rankingSource", "engagement",
    ];
    for (const sn of parsed.startNodes) {
      if (!validNodeTypes.includes(sn.nodeType)) {
        throw new Error(`Invalid nodeType: ${sn.nodeType}`);
      }
    }

    // Validate edge types
    const validEdgeTypes: GraphEdgeType[] = [
      "EMPLOYS", "FORMERLY_EMPLOYED", "PRACTICES", "SPECIALIZES_IN",
      "OPERATES_IN", "FIRM_RANKED", "LAWYER_RANKED", "ENGAGED_FIRM",
      "ENGAGED_LAWYER", "ENGAGED_IN", "SPIN_OFF_OF",
    ];
    for (const tr of parsed.traversals) {
      for (const et of tr.edgeTypes) {
        if (!validEdgeTypes.includes(et as GraphEdgeType)) {
          throw new Error(`Invalid edgeType: ${et}`);
        }
      }
      // Validate direction
      if (!["outbound", "inbound", "both"].includes(tr.direction)) {
        throw new Error(`Invalid direction: ${tr.direction}`);
      }
    }

    return parsed;
  } catch (err) {
    console.warn("[GraphRAG] Strategy parsing failed, falling back to broad search:", err);
    return createFallbackStrategy(raw);
  }
}

/**
 * Create a fallback strategy that searches broadly across firms.
 */
function createFallbackStrategy(originalResponse: string): TraversalStrategy {
  return {
    intent: `Broad search (strategy parsing failed). Original: ${originalResponse.slice(0, 100)}`,
    startNodes: [{ nodeType: "firm", match: {} }],
    traversals: [
      {
        edgeTypes: ["PRACTICES", "OPERATES_IN"],
        direction: "outbound",
        maxDepth: 1,
      },
      {
        edgeTypes: ["FIRM_RANKED"],
        direction: "outbound",
        targetNodeType: "rankingSource",
        maxDepth: 1,
      },
    ],
    filters: {},
    rankBy: "compositeScore",
    limit: 20,
  };
}

// ─── Graph schema description ────────────────────────────────────────────────

function getGraphSchemaDescription(graph: LegalKnowledgeGraph): string {
  const stats = getGraphStats(graph);
  const lines: string[] = [];

  lines.push(`Total nodes: ${stats.nodeCount}`);
  lines.push(`Total edges: ${stats.edgeCount}`);
  lines.push("");
  lines.push("Node type counts:");
  for (const [type, count] of Object.entries(stats.nodesByType)) {
    if (count > 0) lines.push(`  - ${type}: ${count}`);
  }
  lines.push("");
  lines.push("Edge type counts:");
  for (const [type, count] of Object.entries(stats.edgesByType)) {
    if (count > 0) lines.push(`  - ${type}: ${count}`);
  }

  // Collect sample node labels directly from the graph (up to 5 per type).
  // Labels originate from firm/lawyer names (untrusted) so sanitize them
  // before they enter the prompt.
  const sampleLabels = new Map<string, string[]>();
  graph.forEachNode((_id, attrs) => {
    const type = attrs.nodeType;
    const label = sanitizeLabel(attrs.label, 60);
    const existing = sampleLabels.get(type);
    if (!existing) {
      sampleLabels.set(type, [label]);
    } else if (existing.length < 5) {
      existing.push(label);
    }
  });

  if (sampleLabels.size > 0) {
    lines.push("");
    lines.push("Sample node labels (for matching reference):");
    for (const [type, labels] of sampleLabels) {
      lines.push(`  ${type}: ${labels.join(", ")}`);
    }
  }

  return lines.join("\n");
}

// ─── Answer message builder ──────────────────────────────────────────────────

function buildAnswerUserMessage(
  serializedContext: string,
  question: string,
  graphStats: { nodeCount: number; edgeCount: number }
): string {
  return [
    "## Graph context",
    "",
    serializedContext,
    "",
    `## Graph statistics`,
    `- Total graph: ${graphStats.nodeCount} nodes, ${graphStats.edgeCount} edges`,
    "",
    `## Question`,
    "",
    question,
  ].join("\n");
}
