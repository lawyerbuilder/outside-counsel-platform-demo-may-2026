import { writeFileSync, unlinkSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export const DEFAULT_MODEL = "claude-sonnet-4-6";

// ─── Claude CLI (child process via Claude Max) ─────────────────────────────

export type ClaudeRequest = {
  systemPrompt: string;
  userMessage: string;
  model?: string;
  /** @deprecated Claude CLI manages its own token limits */
  maxTokens?: number;
  /** @deprecated Claude CLI does not support temperature */
  temperature?: number;
};

export type ClaudeResponse = {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  stopReason: string | null;
};

/**
 * Write the system prompt to a temp file and return its path.
 * This avoids ENAMETOOLONG on Windows when the prompt is large.
 */
function writeSystemPromptFile(systemPrompt: string): string {
  const dir = mkdtempSync(join(tmpdir(), "claude-"));
  const filePath = join(dir, "system-prompt.txt");
  writeFileSync(filePath, systemPrompt, "utf-8");
  return filePath;
}

/**
 * Call Claude via child_process.spawn with stdin piping.
 * Uses the `claude` CLI powered by Claude Max subscription.
 *
 * System prompt is written to a temp file (avoids Windows arg length limits),
 * user message is piped via stdin.
 */
export async function callClaude(request: ClaudeRequest): Promise<ClaudeResponse> {
  const model = request.model ?? DEFAULT_MODEL;
  const systemPromptFile = writeSystemPromptFile(request.systemPrompt);

  const args = [
    "-p",
    "--model", model,
    "--output-format", "json",
    "--system-prompt", `$(cat "${systemPromptFile}")`,
  ];

  // On Windows, --system-prompt with shell expansion won't work.
  // Instead, concatenate system + user into stdin and skip --system-prompt.
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

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

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
        // Parse the JSON output from --output-format json
        const parsed = JSON.parse(stdout);

        // The CLI JSON output has: { result, model, session_id, ... }
        // The result field contains the text response
        const content = typeof parsed.result === "string"
          ? parsed.result
          : typeof parsed.content === "string"
          ? parsed.content
          : stdout; // fallback to raw output

        console.log(`[Claude CLI] Response received (${content.length} chars)`);

        resolve({
          content,
          model: parsed.model ?? model,
          inputTokens: parsed.input_tokens ?? parsed.usage?.input_tokens ?? 0,
          outputTokens: parsed.output_tokens ?? parsed.usage?.output_tokens ?? 0,
          stopReason: parsed.stop_reason ?? null,
        });
      } catch {
        // If JSON parsing fails, treat stdout as raw text
        console.log(`[Claude CLI] Raw response (${stdout.length} chars)`);
        resolve({
          content: stdout.trim(),
          model,
          inputTokens: 0,
          outputTokens: 0,
          stopReason: null,
        });
      }
    });

    // Write prompt to stdin and close
    child.stdin.write(stdinContent);
    child.stdin.end();

    function cleanup() {
      try { unlinkSync(systemPromptFile); } catch { /* ignore */ }
    }
  });
}

/**
 * Stream Claude via the CLI.
 */
export async function streamClaude(
  request: ClaudeRequest,
  onText: (chunk: string) => void
): Promise<ClaudeResponse> {
  const model = request.model ?? DEFAULT_MODEL;

  const useFileArg = process.platform !== "win32";
  const finalArgs = useFileArg
    ? ["-p", "--model", model, "--output-format", "stream-json", "--system-prompt", request.systemPrompt]
    : ["-p", "--model", model, "--output-format", "stream-json"];

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
      // stream-json outputs one JSON object per line
      const lines = text.split("\n").filter((l: string) => l.trim());
      for (const line of lines) {
        try {
          const obj = JSON.parse(line);
          if (obj.type === "assistant" && obj.message) {
            // Content block
            const content = typeof obj.message === "string" ? obj.message : "";
            if (content) {
              fullContent += content;
              onText(content);
            }
          } else if (obj.type === "result") {
            lastParsed = obj;
            if (obj.result) {
              // Final result — extract any remaining content
              const remaining = String(obj.result).slice(fullContent.length);
              if (remaining) {
                fullContent += remaining;
                onText(remaining);
              }
            }
          }
        } catch {
          // Not JSON, treat as raw text chunk
          fullContent += line;
          onText(line);
        }
      }
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

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

// ─── Legacy helpers (kept for backward compatibility) ───────────────────────

export function hasServerApiKey(): boolean {
  return true; // CLI always available via Claude Max
}
