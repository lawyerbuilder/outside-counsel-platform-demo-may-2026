import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { extractTextFromFile, UnsupportedFileError } from "@/server/extract-file";

const docsDir = join(process.cwd(), "test-documents");
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

describe("extractTextFromFile", () => {
  it("extracts text from a PDF", async () => {
    const buf = readFileSync(join(docsDir, "sample-proposal.pdf"));
    const text = await extractTextFromFile(buf, "application/pdf", "sample-proposal.pdf");
    expect(text.length).toBeGreaterThan(50);
    expect(text.toUpperCase()).toContain("BAKER MCKENZIE");
  });

  it("extracts text from a .docx", async () => {
    const buf = readFileSync(join(docsDir, "sample-proposal.docx"));
    const text = await extractTextFromFile(buf, DOCX_MIME, "sample-proposal.docx");
    expect(text.length).toBeGreaterThan(50);
    expect(text.toUpperCase()).toContain("BAKER MCKENZIE");
  });

  it("detects a PDF by extension even when the mime is wrong", async () => {
    const buf = readFileSync(join(docsDir, "sample-proposal.pdf"));
    const text = await extractTextFromFile(buf, "application/octet-stream", "sample-proposal.pdf");
    expect(text.length).toBeGreaterThan(50);
  });

  it("rejects a legacy .doc with a clear message", async () => {
    await expect(
      extractTextFromFile(Buffer.from("x"), "application/msword", "old.doc")
    ).rejects.toBeInstanceOf(UnsupportedFileError);
    await expect(
      extractTextFromFile(Buffer.from("x"), "application/msword", "old.doc")
    ).rejects.toThrow(/Legacy \.doc not supported/);
  });

  it("rejects an unsupported type (e.g. .txt)", async () => {
    await expect(
      extractTextFromFile(Buffer.from("hello"), "text/plain", "notes.txt")
    ).rejects.toBeInstanceOf(UnsupportedFileError);
  });

  it("caps returned text at 200k chars", async () => {
    const buf = readFileSync(join(docsDir, "sample-proposal.docx"));
    const text = await extractTextFromFile(buf, DOCX_MIME, "sample-proposal.docx");
    expect(text.length).toBeLessThanOrEqual(200_000);
  });
});
