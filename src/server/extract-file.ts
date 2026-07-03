/**
 * Extract plain text from an uploaded proposal file (PDF or Word .docx).
 *
 * Pure-JS parsers only, so this runs fine on the Node serverless runtime:
 *   - PDF  -> pdf-parse (pdfjs under the hood)
 *   - DOCX -> mammoth (extractRawText)
 *
 * Legacy binary .doc is not reliably parseable in pure JS and is rejected.
 * The returned text is whitespace-normalised and capped at 200k chars. Callers
 * must still treat the text as untrusted (it comes from an outside law firm).
 */

const MAX_TEXT_CHARS = 200_000;

export class UnsupportedFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedFileError";
  }
}

const PDF_MIMES = new Set(["application/pdf", "application/x-pdf"]);
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    // Collapse runs of 3+ newlines to a paragraph break
    .replace(/\n{3,}/g, "\n\n")
    // Trim trailing spaces on each line
    .replace(/[ \t]+\n/g, "\n")
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

/**
 * Decide the file kind from BOTH the provided mime and the filename extension.
 * Never trust the client-supplied mime alone.
 */
function detectKind(mime: string, filename: string): "pdf" | "docx" | "doc" | "unknown" {
  const lowerName = filename.toLowerCase();
  const ext = lowerName.slice(lowerName.lastIndexOf("."));
  const m = (mime || "").toLowerCase().split(";")[0].trim();

  if (ext === ".pdf" || PDF_MIMES.has(m)) return "pdf";
  if (ext === ".docx" || m === DOCX_MIME) return "docx";
  if (ext === ".doc" || m === "application/msword") return "doc";
  return "unknown";
}

export async function extractTextFromFile(
  buffer: Buffer,
  mime: string,
  filename: string
): Promise<string> {
  const kind = detectKind(mime, filename);

  if (kind === "doc") {
    throw new UnsupportedFileError(
      "Legacy .doc not supported, please upload PDF or .docx or paste the text"
    );
  }

  if (kind === "pdf") {
    // pdf-parse v2 exports a class; construct with the buffer as data.
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return normalizeWhitespace(result.text ?? "");
    } finally {
      await parser.destroy().catch(() => {});
    }
  }

  if (kind === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return normalizeWhitespace(result.value ?? "");
  }

  throw new UnsupportedFileError(
    "Unsupported file type. Please upload a PDF or Word (.docx) file, or paste the text."
  );
}
