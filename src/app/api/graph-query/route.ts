import { z } from "zod";
import { streamGraphQuery, getGraph, getGraphStats } from "@/server/graph-rag";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // 2 minutes for Claude CLI calls

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      })
    )
    .min(1)
    .max(20),
});

/**
 * POST /api/graph-query
 *
 * GraphRAG-powered query endpoint. Builds an in-memory knowledge graph
 * from the Prisma database, traverses it to find relevant context,
 * and streams a Claude-generated answer.
 *
 * Request body: { messages: [{ role: "user"|"assistant", content: string }] }
 * Response: NDJSON stream of { t: string } chunks, ending with { done: true, stats: {...} }
 */
export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    const { messages } = parsed.data;

    const latestMessage = messages[messages.length - 1].content;
    const historyMessages = messages.slice(0, -1) as Array<{ role: string; content: string }>;
    const history =
      historyMessages.length > 0
        ? historyMessages.map((m) => `${m.role}: ${m.content}`).join("\n")
        : undefined;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await streamGraphQuery(
            latestMessage,
            history,
            (chunk: string) => {
              controller.enqueue(
                encoder.encode(JSON.stringify({ t: chunk }) + "\n"),
              );
            },
          );

          // Send completion metadata
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                done: true,
                stats: result.stats,
                nodesUsed: result.context.nodes.length,
                edgesUsed: result.context.edges.length,
              }) + "\n",
            ),
          );
          controller.close();
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          console.error("[GraphQuery] Error:", msg);
          controller.enqueue(
            encoder.encode(JSON.stringify({ error: msg }) + "\n"),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/graph-query
 *
 * Returns graph statistics (for debugging / dashboard).
 */
export async function GET() {
  try {
    const graph = await getGraph();
    const stats = getGraphStats(graph);
    return Response.json({ ok: true, stats });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
