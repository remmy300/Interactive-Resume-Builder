import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import {
  enforceRateLimit,
  HttpError,
  jsonResponse,
  requireUser,
  withApiHandler,
} from "@/lib/api";
import {
  linksFromHtml,
  linksFromMarkdown,
  type LinkRef,
} from "@/lib/import-links";
import { parseResumeText } from "@/lib/resume-import";
import { logServerError } from "@/lib/server-log";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PDF_PAGES = 10;
const MAX_TEXT_CHARS = 100_000;
const IMPORT_LIMIT_PER_MINUTE = 8;

/** Magic bytes, so a renamed file cannot reach the PDF/DOCX parsers. */
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46];
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04]; // DOCX is a zip container

const hasSignature = (bytes: Uint8Array, signature: number[]) =>
  signature.every((byte, index) => bytes[index] === byte);

const UNSUPPORTED =
  "Upload a PDF, DOCX, TXT, or Markdown file. For other formats, export to PDF first.";

interface TextItem {
  str: string;
  transform: number[];
  width?: number;
  height?: number;
}

async function readPdfLinks(
  pdf: Awaited<ReturnType<typeof getDocumentProxy>>,
): Promise<LinkRef[]> {
  const links: LinkRef[] = [];
  try {
    for (let number = 1; number <= pdf.numPages; number += 1) {
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      const words = (content.items as unknown[]).filter(
        (item): item is TextItem =>
          typeof (item as TextItem).str === "string" &&
          Array.isArray((item as TextItem).transform),
      );

      const onPage: Array<LinkRef & { x: number; y: number }> = [];
      for (const annotation of await page.getAnnotations()) {
        const { url, rect } = annotation as { url?: string; rect?: number[] };
        if (typeof url !== "string" || !url.toLowerCase().startsWith("http"))
          continue;
        if (!rect || rect.length < 4) {
          onPage.push({ url, label: "", x: 0, y: 0 });
          continue;
        }
        const [x1, y1, x2, y2] = rect;
        const left = Math.min(x1, x2);
        const bottom = Math.min(y1, y2);
        const top = Math.max(y1, y2);
        const label = words
          .filter((word) => {
            const baseline = word.transform[5];
            return baseline >= bottom - 0.5 && baseline <= top + 0.5;
          })
          .sort((one, other) => one.transform[4] - other.transform[4])
          .map((word) => word.str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        onPage.push({
          url,
          label,
          lineKey: `${number}:${Math.round(top)}`,
          x: left,
          y: top,
        });
      }
      onPage.sort((one, other) => other.y - one.y || one.x - other.x);
      links.push(
        ...onPage.map(({ url, label, lineKey }) => ({ url, label, lineKey })),
      );
    }
  } catch {
    // Links are a bonus; never fail the import because of them.
  }
  return links.slice(0, 80);
}

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
  let links: LinkRef[] = [];

  try {
    if (fileName.endsWith(".pdf")) {
      if (!hasSignature(bytes, PDF_SIGNATURE))
        throw new HttpError(415, UNSUPPORTED);
      const pdf = await getDocumentProxy(bytes);
      if (pdf.numPages > MAX_PDF_PAGES) {
        throw new HttpError(
          413,
          `That PDF has ${pdf.numPages} pages. CVs longer than ${MAX_PDF_PAGES} pages cannot be imported.`,
        );
      }
      const extracted = await extractText(pdf, { mergePages: true });
      text = extracted.text;
      links = await readPdfLinks(pdf);
    } else if (fileName.endsWith(".docx")) {
      if (!hasSignature(bytes, ZIP_SIGNATURE))
        throw new HttpError(415, UNSUPPORTED);
      const extracted = await mammoth.extractRawText({
        buffer: Buffer.from(bytes),
      });
      text = extracted.value;
      // Plain text drops hyperlinks, so read them from the HTML conversion.
      const html = await mammoth.convertToHtml({ buffer: Buffer.from(bytes) });
      links = linksFromHtml(html.value);
    } else if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
      text = Buffer.from(bytes).toString("utf8");
      if (fileName.endsWith(".md")) {
        const markdown = linksFromMarkdown(text);
        text = markdown.text;
        links = markdown.links;
      }
    } else {
      throw new HttpError(415, UNSUPPORTED);
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    logServerError("cv-import", error);
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

  const result = parseResumeText(text, links);
  return jsonResponse({ ...result, fileName: file.name });
});
