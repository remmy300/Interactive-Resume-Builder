import { matchHeading, matchInlineHeading, type HeadingKey, type SectionKey } from "./headings";
import { isHeading } from "./patterns";

/** A section the builder has no field for, kept so its text is never lost. */
export interface ExtraSection {
  key: "languages" | "contact" | "other";
  heading: string;
  lines: string[];
}

export interface SplitSections {
  /** Index of the first line that belongs to a section; everything above is the header. */
  headerEnd: number;
  sections: Record<SectionKey, string[]>;
  extras: ExtraSection[];
  /** Line numbers (in the whole CV) of each line under Projects, for link matching. */
  projectLineIndexes: number[];
}

/** A heading may stand alone ("EXPERIENCE:") or carry its text ("Skills: Java"). */
const startsSection = (line: string) =>
  isHeading(line) !== null || matchInlineHeading(line) !== null;

/** Sorts every line of the CV into the section it sits under. */
export function splitSections(rawLines: string[]): SplitSections {
  const firstHeading = rawLines.findIndex(startsSection);
  const headerEnd = firstHeading < 0 ? Math.min(rawLines.length, 12) : firstHeading;

  const sections: Record<SectionKey, string[]> = {
    summary: [],
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
  };
  const extras: ExtraSection[] = [];
  const projectLineIndexes: number[] = [];
  let current: HeadingKey | null = null;
  let extra: ExtraSection | null = null;

  rawLines.forEach((line, index) => {
    if (index < headerEnd) return;
    let match = matchHeading(line);
    let rest = "";
    // "Languages" inside Skills is a label ("Languages: JavaScript"), not a section.
    if (match?.key === "languages" && current === "skills") match = null;
    if (!match) {
      const inline = matchInlineHeading(line);
      if (inline && !(inline.key === "languages" && current === "skills")) {
        match = inline;
        rest = inline.rest;
      }
    }

    if (match) {
      current = match.key;
      if (match.key === "languages" || match.key === "contact" || match.key === "other") {
        extra = { key: match.key, heading: match.label, lines: [] };
        extras.push(extra);
        if (rest) extra.lines.push(rest);
      } else {
        extra = null;
        if (rest) sections[match.key].push(rest);
      }
      return;
    }
    if (!current) return;
    if (extra) {
      extra.lines.push(line);
      return;
    }
    sections[current as SectionKey].push(line);
    if (current === "projects") projectLineIndexes.push(index);
  });

  return { headerEnd, sections, extras, projectLineIndexes };
}
