/** Turns one block of lines into a role, a school, a project or a certification. */
import { classifyProjectLinks } from "../import-links";
import { type CertificationEntry, type EducationEntry, type ExperienceEntry, type ProjectEntry, createId } from "../resume-schema";
import { LINK_TAIL, STACK_LABEL, headerLines, isCommaStack, isStackLine, mergeWrappedLines, splitBlocks, splitSectionBlocks } from "./lines";
import { COMPANY_LINE, DEGREE_WORDS, ROLE_WORDS, SCHOOL_WORDS, URL_PATTERN, hasText, stripBullet } from "./patterns";
import { DATE_RANGE_PATTERN, SINGLE_DATE_PATTERN, parseDatesDetailed } from "./validate";

export function parseDates(text: string): {
  startDate: string;
  endDate: string;
  current: boolean;
} {
  const { startDate, endDate, current } = parseDatesDetailed(text);
  return { startDate, endDate, current };
}

export const companyName = (value: string) =>
  COMPANY_LINE.test(value.trim())
    ? value.trim().split(",")[0].trim()
    : value.trim().replace(/\.$/, "");

export function splitHeaderLine(line: string): string[] {
  // Remove dates first so "Jan 2022 – Present" cannot be split into fake fields.
  return (
    line
      .replace(DATE_RANGE_PATTERN, " ")
      .replace(SINGLE_DATE_PATTERN, " ")
      // The brackets that held the dates are left empty: "Acme ( )".
      .replace(/[([]\s*[)\]]/g, " ")
      .split(/\s+(?:\||•|·|—|–|-)\s+/)
      .map((part) => part.trim().replace(/[\s,;:]+$/, ""))
      .filter(Boolean)
      .flatMap((part) => {
        const pieces = part.split(/,\s+/);
        return pieces.length === 2 &&
          ROLE_WORDS.test(pieces[0]) &&
          !ROLE_WORDS.test(pieces[1])
          ? pieces
          : [part];
      })
  );
}

export function parseExperienceBlock(block: string[]): ExperienceEntry | null {
  const { headers, details } = headerLines(block);
  const joined = block.join(" ");
  const dates = parseDates(joined);
  if (headers.length === 0) return null;

  // Company and role come from the first header lines.
  const picked: string[] = [];
  let consumed = 0;
  for (const header of headers) {
    if (picked.length >= 2) break;
    consumed += 1;
    for (const part of splitHeaderLine(header)) {
      if (
        picked.length < 2 &&
        !DATE_RANGE_PATTERN.test(part) &&
        !SINGLE_DATE_PATTERN.test(part)
      ) {
        picked.push(part);
      }
    }
  }
  const leftoverHeaders = headers
    .slice(consumed)
    .filter((line) => hasText(splitHeaderLine(line).join("")));
  details.unshift(...leftoverHeaders);
  const primary = picked[0] ?? "";
  const secondary = picked[1] ?? "";
  const nameOf = (value: string) =>
    ROLE_WORDS.test(value) ? value : companyName(value);

  let company = "";
  let role = "";
  if (secondary) {
    if (ROLE_WORDS.test(primary) && !ROLE_WORDS.test(secondary)) {
      role = primary;
      company = nameOf(secondary);
    } else {
      company = nameOf(primary);
      role = secondary;
    }
  } else if (ROLE_WORDS.test(primary)) {
    role = primary;
  } else {
    company = nameOf(primary);
  }

  if (!hasText(company) && !hasText(role)) return null;

  return {
    id: createId(),
    company,
    role,
    description: details.join("\n").slice(0, 5000),
    ...dates,
  };
}

export const GRADUATION_NOTE =
  /,?\s*graduat\w*(?:\s+year)?\s*[:(]?\s*(?:19|20)\d{2}\)?/i;

export function parseEducationBlock(block: string[]): EducationEntry | null {
  let { headers } = headerLines(block);
  if (headers.length === 0) {
    const firstSentence = (block[0] ?? "").split(/\.\s/)[0].slice(0, 220);
    if (SCHOOL_WORDS.test(firstSentence) || DEGREE_WORDS.test(firstSentence)) {
      headers = [firstSentence];
    }
  }
  // "Multimedia university of Kenya." ends in a full stop, so it is not read as a
  // header line, but a short line naming a school or a degree still belongs here.
  const extras = block
    .map(stripBullet)
    .filter(
      (line) =>
        !headers.includes(line) &&
        line.length <= 100 &&
        line.split(/\s+/).length <= 10 &&
        /^[A-Z]/.test(line) &&
        (SCHOOL_WORDS.test(line) || DEGREE_WORDS.test(line)),
    )
    .slice(0, 2);
  const parts = [...headers, ...extras]
    .map((line) => line.replace(GRADUATION_NOTE, "").trim().replace(/\.$/, ""))
    .flatMap(splitHeaderLine);
  const filtered = parts.filter(
    (part) => !DATE_RANGE_PATTERN.test(part) && !SINGLE_DATE_PATTERN.test(part),
  );
  if (filtered.length === 0) return null;

  const college =
    filtered.find((part) => SCHOOL_WORDS.test(part)) ?? filtered[0] ?? "";
  const degree =
    filtered.find((part) => part !== college && DEGREE_WORDS.test(part)) ??
    filtered.find((part) => part !== college) ??
    "";

  const text = block.join(" ");
  const dates = parseDates(text);
  const graduated = text.match(
    /graduat\w*(?:\s+year)?\s*[:(]?\s*((?:19|20)\d{2})/i,
  )?.[1];
  if (!dates.startDate && !dates.endDate && graduated)
    dates.endDate = `${graduated}-01`;

  return { id: createId(), college, degree, ...dates };
}

/**
 * Drops a trailing detail
 */
export function stripTrailingDetail(text: string): string {
  return text.replace(/\s*(?:[|·•–—]|\s-\s).*$/, "").trim();
}

export function parseProjectBlock(
  block: string[],
  urls: string[] = [],
): ProjectEntry | null {
  const { headers, details } = headerLines(block);
  // Project titles can legitimately contain dashes
  // so only a bar or dot starts trailing detail.
  const firstHeader = headers[0] ?? "";
  const title = firstHeader.replace(/\s*[|·•].*$/, "").trim();
  if (!hasText(title)) return null;

  const inlineStack = firstHeader
    .slice(firstHeader.indexOf(title) + title.length)
    .replace(
      /\b(?:live\s+demo|demo|github|gitlab|source|code|repo(?:sitory)?)\s*:\s*(?:\[[^\]]*\]|https?:\/\/\S+|\S+)/gi,
      " ",
    )
    .replace(LINK_TAIL, " ")
    .replace(/[|·•]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const stackFromHeader =
    (inlineStack.match(/,/g) ?? []).length >= 1
      ? [`Tech stack: ${inlineStack}`]
      : [];
  // The live demo and the repository are different addresses: a GitHub link goes
  // to its own field instead of overwriting the demo link.
  const { link, github } = classifyProjectLinks([
    ...urls,
    ...(block.join(" ").match(new RegExp(URL_PATTERN.source, "gi")) ?? []),
  ]);
  const extra = headers
    .slice(1)
    .map((line) =>
      isStackLine(line) || isCommaStack(line)
        ? `Tech stack: ${line.replace(STACK_LABEL, "").trim()}`
        : line,
    );
  return {
    id: createId(),
    title,
    description: [...stackFromHeader, ...extra, ...details]
      .join("\n")
      .slice(0, 5000),
    link,
    github,
  };
}

export function parseCertificationBlock(block: string[]): CertificationEntry | null {
  const { headers } = headerLines(block.map(stripBullet));
  const name = headers[0]?.trim().replace(/\.$/, "") ?? "";
  if (!hasText(name)) return null;
  const dates = parseDates(block.join(" "));
  return {
    id: createId(),
    name,
    issuer: headers[1]?.replace(/\s*[|·—-]\s*.*$/, "").trim() ?? "",
    date: dates.startDate,
    link: block.join(" ").match(URL_PATTERN)?.[0] ?? "",
  };
}

/**
 * A bulleted list of certifications ("• AWS Cloud Practitioner", "• ITIL 4
 * Foundation") is one certification per line, unlike roles, which span lines.
 */
export function parseCertifications(
  lines: string[],
  onReject: (text: string) => void = () => {},
): CertificationEntry[] {
  const merged = mergeWrappedLines(lines);
  const blocks = splitBlocks(merged);
  const oneEach =
    blocks.length === 1 &&
    blocks[0].length > 1 &&
    !blocks[0].some((line) => DATE_RANGE_PATTERN.test(line));
  const entries = oneEach
    ? blocks[0].map((line) => [line])
    : splitSectionBlocks(merged);
  return entries
    .map((block) => {
      const parsed = parseCertificationBlock(block);
      if (!parsed) onReject(block.join(" "));
      return parsed;
    })
    .filter((entry): entry is CertificationEntry => entry !== null);
}
