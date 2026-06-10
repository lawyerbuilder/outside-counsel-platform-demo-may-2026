import { writeFileSync, unlinkSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// ─── Provider Detection ──────────────────────────────────────────────────────
// If GROQ_API_KEY is set, use Groq HTTP API (for Vercel deployment).
// Otherwise, fall back to Claude CLI (for local dev with Claude Max).

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";
const GROQ_FAST_MODEL = "llama-3.1-8b-instant";

export const DEFAULT_MODEL = GROQ_API_KEY ? GROQ_DEFAULT_MODEL : "claude-sonnet-4-6";

function useGroq(): boolean {
  return !!GROQ_API_KEY;
}

// ─── Shared Types ────────────────────────────────────────────────────────────

export type ClaudeRequest = {
  systemPrompt: string;
  userMessage: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
};

export type ClaudeResponse = {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  stopReason: string | null;
};

// ─── Groq HTTP API (OpenAI-compatible) ───────────────────────────────────────

/** Map Claude model names to Groq equivalents */
function mapModelToGroq(model: string): string {
  if (model.includes("haiku") || model.includes("fast")) return GROQ_FAST_MODEL;
  if (model.includes("opus") || model.includes("sonnet")) return GROQ_DEFAULT_MODEL;
  // If already a Groq model name, pass through
  if (model.includes("llama") || model.includes("deepseek") || model.includes("qwen")) return model;
  return GROQ_DEFAULT_MODEL;
}

async function callGroq(request: ClaudeRequest): Promise<ClaudeResponse> {
  const model = mapModelToGroq(request.model ?? DEFAULT_MODEL);
  console.log(`[Groq API] Calling ${model}...`);

  const body = {
    model,
    messages: [
      { role: "system", content: request.systemPrompt },
      { role: "user", content: request.userMessage },
    ],
    max_tokens: request.maxTokens ?? 4096,
    temperature: request.temperature ?? 0.3,
  };

  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Groq API error ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  let content = choice?.message?.content ?? "";

  // DeepSeek R1 models wrap answers in <think>...</think> tags — strip them
  content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

  console.log(`[Groq API] Response received (${content.length} chars)`);

  return {
    content,
    model: data.model ?? model,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
    stopReason: choice?.finish_reason ?? null,
  };
}

async function streamGroq(
  request: ClaudeRequest,
  onText: (chunk: string) => void,
): Promise<ClaudeResponse> {
  const model = mapModelToGroq(request.model ?? DEFAULT_MODEL);
  console.log(`[Groq API Stream] Calling ${model}...`);

  const body = {
    model,
    messages: [
      { role: "system", content: request.systemPrompt },
      { role: "user", content: request.userMessage },
    ],
    max_tokens: request.maxTokens ?? 4096,
    temperature: request.temperature ?? 0.3,
    stream: true,
  };

  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Groq API stream error ${res.status}: ${errText.slice(0, 500)}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body from Groq");

  const decoder = new TextDecoder();
  let fullContent = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let stopReason: string | null = null;
  let buffer = "";
  let insideThink = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") continue;

      try {
        const chunk = JSON.parse(payload);
        const delta = chunk.choices?.[0]?.delta?.content ?? "";
        const finish = chunk.choices?.[0]?.finish_reason;

        if (finish) stopReason = finish;

        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens ?? inputTokens;
          outputTokens = chunk.usage.completion_tokens ?? outputTokens;
        }

        if (delta) {
          fullContent += delta;

          // Strip <think>...</think> from DeepSeek R1 streaming output
          // Track whether we're inside a think block
          if (delta.includes("<think>")) insideThink = true;
          if (insideThink) {
            if (delta.includes("</think>")) {
              insideThink = false;
              // Emit anything after </think>
              const afterThink = delta.split("</think>").pop() ?? "";
              if (afterThink) onText(afterThink);
            }
            // Don't emit while inside think block
          } else {
            onText(delta);
          }
        }
      } catch {
        // Skip malformed SSE lines
      }
    }
  }

  // Clean up the full content too
  fullContent = fullContent.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

  return {
    content: fullContent,
    model,
    inputTokens,
    outputTokens,
    stopReason,
  };
}

// ─── Claude CLI (child process via Claude Max — local dev only) ──────────────

function writeSystemPromptFile(systemPrompt: string): string {
  const dir = mkdtempSync(join(tmpdir(), "claude-"));
  const filePath = join(dir, "system-prompt.txt");
  writeFileSync(filePath, systemPrompt, "utf-8");
  return filePath;
}

/** Map abstract model names ("fast") to Claude CLI aliases */
function mapModelToClaudeCLI(model: string): string {
  if (model.includes("fast")) return "haiku";
  return model;
}

async function callClaudeCLI(request: ClaudeRequest): Promise<ClaudeResponse> {
  const model = mapModelToClaudeCLI(request.model ?? "claude-sonnet-4-6");
  const systemPromptFile = writeSystemPromptFile(request.systemPrompt);

  const useFileArg = process.platform !== "win32";
  const finalArgs = useFileArg
    ? ["-p", "--model", model, "--output-format", "json", "--system-prompt", request.systemPrompt]
    : ["-p", "--model", model, "--output-format", "json"];

  const stdinContent = useFileArg
    ? request.userMessage
    : `${request.systemPrompt}\n\n---\n\n${request.userMessage}`;

  console.log(`[Claude CLI] Calling ${model}...`);

  return new Promise<ClaudeResponse>((resolve, reject) => {
    const { spawn } = require("child_process");
    const child = spawn("claude", finalArgs, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
      windowsHide: true,
      shell: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

    child.on("error", (err: Error) => {
      cleanup();
      reject(new Error(`Claude CLI failed to start: ${err.message}`));
    });

    child.on("close", (code: number) => {
      cleanup();
      if (code !== 0) {
        console.error(`[Claude CLI] stderr: ${stderr}`);
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr.slice(0, 500)}`));
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        const content = typeof parsed.result === "string"
          ? parsed.result
          : typeof parsed.content === "string"
          ? parsed.content
          : stdout;

        console.log(`[Claude CLI] Response received (${content.length} chars)`);
        resolve({
          content,
          model: parsed.model ?? model,
          inputTokens: parsed.input_tokens ?? parsed.usage?.input_tokens ?? 0,
          outputTokens: parsed.output_tokens ?? parsed.usage?.output_tokens ?? 0,
          stopReason: parsed.stop_reason ?? null,
        });
      } catch {
        console.log(`[Claude CLI] Raw response (${stdout.length} chars)`);
        resolve({ content: stdout.trim(), model, inputTokens: 0, outputTokens: 0, stopReason: null });
      }
    });

    child.stdin.write(stdinContent);
    child.stdin.end();

    function cleanup() {
      try { unlinkSync(systemPromptFile); } catch { /* ignore */ }
    }
  });
}

async function streamClaudeCLI(
  request: ClaudeRequest,
  onText: (chunk: string) => void,
): Promise<ClaudeResponse> {
  const model = mapModelToClaudeCLI(request.model ?? "claude-sonnet-4-6");

  const useFileArg = process.platform !== "win32";
  const finalArgs = useFileArg
    ? ["-p", "--verbose", "--model", model, "--output-format", "stream-json", "--system-prompt", request.systemPrompt]
    : ["-p", "--verbose", "--model", model, "--output-format", "stream-json"];

  const stdinContent = useFileArg
    ? request.userMessage
    : `${request.systemPrompt}\n\n---\n\n${request.userMessage}`;

  console.log(`[Claude CLI Stream] Calling ${model}...`);

  return new Promise<ClaudeResponse>((resolve, reject) => {
    const { spawn } = require("child_process");
    const child = spawn("claude", finalArgs, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
      windowsHide: true,
      shell: true,
    });

    let fullContent = "";
    let stderr = "";
    let lastParsed: Record<string, unknown> = {};

    child.stdout.on("data", (data: Buffer) => {
      const text = data.toString();
      const lines = text.split("\n").filter((l: string) => l.trim());
      for (const line of lines) {
        try {
          const obj = JSON.parse(line);
          if (obj.type === "assistant" && obj.message) {
            const content = typeof obj.message === "string" ? obj.message : "";
            if (content) { fullContent += content; onText(content); }
          } else if (obj.type === "result") {
            lastParsed = obj;
            if (obj.result) {
              const remaining = String(obj.result).slice(fullContent.length);
              if (remaining) { fullContent += remaining; onText(remaining); }
            }
          }
        } catch {
          fullContent += line;
          onText(line);
        }
      }
    });

    child.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

    child.on("error", (err: Error) => {
      reject(new Error(`Claude CLI stream failed: ${err.message}`));
    });

    child.on("close", (code: number) => {
      if (code !== 0) {
        reject(new Error(`Claude CLI stream exited with code ${code}: ${stderr.slice(0, 500)}`));
        return;
      }
      resolve({
        content: fullContent,
        model: (lastParsed.model as string) ?? model,
        inputTokens: (lastParsed.input_tokens as number) ?? 0,
        outputTokens: (lastParsed.output_tokens as number) ?? 0,
        stopReason: (lastParsed.stop_reason as string) ?? null,
      });
    });

    child.stdin.write(stdinContent);
    child.stdin.end();
  });
}

// ─── Public API (auto-routes to Groq or Claude CLI) ──────────────────────────

/**
 * Call the LLM. Automatically routes to:
 * - Groq HTTP API if GROQ_API_KEY is set (Vercel deployment)
 * - Claude CLI if no API key (local dev with Claude Max)
 */
export async function callClaude(request: ClaudeRequest): Promise<ClaudeResponse> {
  if (useGroq()) return callGroq(request);
  return callClaudeCLI(request);
}

/**
 * Stream the LLM response. Same auto-routing as callClaude.
 */
export async function streamClaude(
  request: ClaudeRequest,
  onText: (chunk: string) => void,
): Promise<ClaudeResponse> {
  if (useGroq()) return streamGroq(request, onText);
  return streamClaudeCLI(request, onText);
}

export function hasServerApiKey(): boolean {
  return useGroq() || true; // Groq API key or Claude CLI always available
}

/**
 * Returns the current LLM provider being used.
 */
export function getLLMProvider(): { provider: "groq" | "claude-cli"; model: string } {
  if (useGroq()) {
    return { provider: "groq", model: GROQ_DEFAULT_MODEL };
  }
  return { provider: "claude-cli", model: "claude-sonnet-4-6" };
}
