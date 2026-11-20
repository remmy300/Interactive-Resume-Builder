import type { PersonalDetails } from "../resume-schema";
import { stripTrailingDetail } from "./entries";
import {
  EMAIL_PATTERN,
  NAME_PATTERN,
  ROLE_WORDS,
  URL_PATTERN,
  endsSentence,
  isHeading,
} from "./patterns";
import type { Collector } from "./report";
import { findPhone, splitSegments } from "./validate";

/** Header lines that can hold a name or a headline: not contact details, not headings. */
export function significantHeaderLines(lines: string[]): string[] {
  return lines.filter((line) => {
    if (!line) return false;
    if (EMAIL_PATTERN.test(line) || findPhone(line) || URL_PATTERN.test(line)) {
      return false;
    }
    return line.length <= 100 && !isHeading(line);
  });
}

const isContact = (line: string) =>
  EMAIL_PATTERN.test(line) || findPhone(line) !== null || URL_PATTERN.test(line);

/**
 * Some CVs put the summary straight under the contact details, with no heading.
 * Returns the index in `rows` where that paragraph starts, or -1.
 */
function findLooseSummary(rows: string[]): number {
  return rows.findIndex((line, index) => {
    if (index === 0 || isContact(line)) return false;
    const words = line.split(/\s+/).length;
    if (words < 9 || (line.match(/\s[|·•]\s/g) ?? []).length >= 2) return false;
    const next = rows[index + 1];
    return (
      endsSentence(line) ||
      line.length > 140 ||
      (next !== undefined && next.split(/\s+/).length >= 6 && !isContact(next))
    );
  });
}

interface IdentityInput {
  personal: PersonalDetails;
  /** Non-empty lines above the first section heading. */
  headerRows: string[];
  /** Lines under a "Contact" heading, if there is one. */
  contactRows: string[];
}

/**
 * Reads name, headline and location from the header. Returns the summary
 * paragraph when the CV has one with no heading.
 */
export function readIdentity(
  { personal, headerRows, contactRows }: IdentityInput,
  collector: Collector,
): { looseSummary: string } {
  const { rate } = collector;
  const paragraphAt = findLooseSummary(headerRows);
  const identityRows = paragraphAt < 0 ? headerRows : headerRows.slice(0, paragraphAt);
  const looseSummary = paragraphAt < 0 ? "" : headerRows.slice(paragraphAt).join(" ");

  // Name and headline come from above the first section heading, so a CV with no
  // headline cannot mistake its summary for one.
  const header = significantHeaderLines(identityRows.slice(0, 12));
  if (header[0] && NAME_PATTERN.test(header[0])) {
    personal.name = header[0];
    const words = header[0].split(/\s+/).length;
    const plausible = words >= 2 && words <= 4;
    rate(
      "personal.name",
      plausible ? "high" : "medium",
      plausible
        ? "The first line of the CV, written like a name."
        : "A single word or a long line, so it may not be the full name.",
    );
  }

  // A headline can be long ("Junior Software Developer | React | TypeScript | …").
  let titleLine = "";
  if (header[1] && header[1].length <= 140 && !EMAIL_PATTERN.test(header[1])) {
    personal.title = stripTrailingDetail(header[1]);
    titleLine = header[1];
    const clear = ROLE_WORDS.test(personal.title) && personal.title.length <= 80;
    rate(
      "personal.title",
      clear ? "high" : "medium",
      clear
        ? "A separate headline that names a role."
        : "The line under the name, but it does not name a role.",
    );
  } else {
    // "Software Engineer • Nairobi, Kenya • +254…": the title shares the contact line.
    const fromContact = identityRows
      .flatMap(splitSegments)
      .find(
        (segment) =>
          ROLE_WORDS.test(segment) &&
          segment.length <= 60 &&
          !/\d/.test(segment) &&
          !isContact(segment),
      );
    if (fromContact) {
      personal.title = fromContact;
      rate("personal.title", "medium", "Taken from the contact line.");
    }
  }

  // Location usually shares a line with the contact details:
  // "Nairobi, Kenya | +254… | name@mail.com | github.com/name".
  const place = [...identityRows, ...contactRows]
    .flatMap(splitSegments)
    .map((segment) => segment.replace(/^(location|address|based in|city)\s*:\s*/i, ""))
    .find(
      (segment) =>
        /^[A-Z][A-Za-z.' -]+,\s*[A-Z][A-Za-z.' -]+$/.test(segment) &&
        segment.length <= 60 &&
        !EMAIL_PATTERN.test(segment) &&
        !ROLE_WORDS.test(segment),
    );
  if (place) {
    personal.location = place;
    rate("personal.location", "medium", "A “City, Country” pattern in the header.");
  }

  // Header text that is none of the above would otherwise vanish without a trace.
  const leftover = identityRows.filter(
    (line) =>
      line !== header[0] &&
      line !== titleLine &&
      line !== personal.title &&
      !isContact(line) &&
      !(place && line.includes(place)) &&
      line.split(/\s+/).length >= 3,
  );
  if (leftover.length > 0) {
    collector.unassigned.push({ heading: "Header", text: leftover.join("\n") });
  }

  return { looseSummary };
}

/** Notes which contact details are still empty after reading the header. */
export function reportMissingContact(personal: PersonalDetails, collector: Collector): void {
  const missing = [
    !personal.name && "name",
    !personal.email && "email",
    !personal.phone && "phone number",
    !personal.location && "location",
    !personal.title && "job title",
  ].filter((item): item is string => Boolean(item));
  if (missing.length === 0) return;
  collector.incomplete.unshift({
    section: "personal",
    index: 0,
    label: "Contact details",
    missing,
    issues: [],
  });
}
