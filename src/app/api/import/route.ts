import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import {
  enforceRateLimit,
  HttpError,
  jsonResponse,
  requireUser,
  withApiHandler,
} from "@/lib/api";
import { parseResumeText } from "@/lib/resume-import";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PDF_PAGES = 10;
const MAX_TEXT_CHARS = 100_000;
const IMPORT_LIMIT_PER_MINUTE = 8;

/** Magic bytes, so a renamed file cannot reach the PDF/DOCX parsers. */
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46]; // %PDF
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04]; // DOCX is a zip container

const hasSignature = (bytes: Uint8Array, signature: number[]) =>
  signature.every((byte, index) => bytes[index] === byte);

const UNSUPPORTED =
  "Upload a PDF, DOCX, TXT, or Markdown file. For other formats, export to PDF first.";

export const POST = withApiHandler(async (request) => {
  const user = await requireUser();
  enforceRateLimit(user.id, "cv-import", IMPORT_LIMIT_PER_MINUTE);

  const form = await request.formData().catch(() => null);
  if (!form) throw new HttpError(400, "Attach a CV file to import.");

  const file = form.get("file");
  if (!file || typeof file === "string") {
    throw new HttpError(400, "Attach a CV file to import.");
  }

  if (file.size === 0) throw new HttpError(400, "That file is empty.");
  if (file.size > MAX_BYTES) {
    throw new HttpError(413, "That file is larger than 5 MB.");
  }

  const fileName = file.name.toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());
  let text = "";

  try {
    if (fileName.endsWith(".pdf")) {
      if (!hasSignature(bytes, PDF_SIGNATURE)) throw new HttpError(415, UNSUPPORTED);
      const pdf = await getDocumentProxy(bytes);
      if (pdf.numPages > MAX_PDF_PAGES) {
        throw new HttpError(
          413,
          `That PDF has ${pdf.numPages} pages. CVs longer than ${MAX_PDF_PAGES} pages cannot be imported.`,
        );
      }
      const extracted = await extractText(pdf, { mergePages: true });
      text = extracted.text;
    } else if (fileName.endsWith(".docx")) {
      if (!hasSignature(bytes, ZIP_SIGNATURE)) throw new HttpError(415, UNSUPPORTED);
      const extracted = await mammoth.extractRawText({
        buffer: Buffer.from(bytes),
      });
      text = extracted.value;
    } else if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
      text = Buffer.from(bytes).toString("utf8");
    } else {
      throw new HttpError(415, UNSUPPORTED);
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.error("CV import failed", error);
    throw new HttpError(
      422,
      "We could not read that file. If it is a scanned PDF, export a text-based PDF and try again.",
    );
  }

  if (!text.trim()) {
    throw new HttpError(
      422,
      "No text was found in that file. Scanned images cannot be imported yet — use a text-based PDF.",
    );
  }

  if (text.length > MAX_TEXT_CHARS) {
    throw new HttpError(413, "That file contains too much text to import.");
  }

  const result = parseResumeText(text);
  return jsonResponse({ ...result, fileName: file.name });
});
