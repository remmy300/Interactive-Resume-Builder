import type { ResumeData } from "../resume-schema";

/** A block of CV text that could not be turned into an entry. The text is kept. */
export interface RejectedBlock {
  section: "experience" | "projects" | "education" | "certifications" | "skills";
  text: string;
  reason: string;
}

/** Text under a heading the app has no field for ("Interests", "References"). */
export interface UnassignedText {
  heading: string;
  text: string;
}

/** An entry that was imported but is missing something worth filling in. */
export interface IncompleteEntry {
  section: "personal" | "experience" | "education" | "projects";
  index: number;
  label: string;
  missing: string[];
  /** Date problems such as an end date before the start date. */
  issues: string[];
}

export type ConfidenceLevel = "high" | "medium" | "low";

export interface FieldConfidence {
  level: ConfidenceLevel;
  reason: string;
}

export interface ImportStats {
  characters: number;
  experience: number;
  education: number;
  projects: number;
  skills: number;
}

export interface ImportResult {
  data: ResumeData;
  warnings: string[];
  stats: ImportStats;
  /** Everything the importer could not place, so nothing is lost silently. */
  rejected: RejectedBlock[];
  unassigned: UnassignedText[];
  /** Imported entries with empty or doubtful fields. */
  incomplete: IncompleteEntry[];
  /** How sure the importer is about each field, e.g. "personal.title". */
  confidence: Record<string, FieldConfidence>;
}

const FIELD_LABELS: Record<string, string> = {
  "personal.name": "name",
  "personal.title": "job title",
  "personal.email": "email",
  "personal.phone": "phone number",
  "personal.location": "location",
  summary: "summary",
};

/** Human label for a confidence key: "experience.1.company" -> "company of role 2". */
export function labelForField(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const entry = key.match(/^(experience|education|projects)\.(\d+)\.(\w+)$/);
  if (!entry) return key;
  const noun = { experience: "role", education: "education entry", projects: "project" }[
    entry[1] as "experience" | "education" | "projects"
  ];
  const field = { college: "school", degree: "qualification", dates: "dates", role: "job title" }[entry[3]] ?? entry[3];
  return `${field} of ${noun} ${Number(entry[2]) + 1}`;
}

/** Fields the importer guessed at, in a stable order. */
export function lowConfidenceFields(
  confidence: Record<string, FieldConfidence>,
): string[] {
  return Object.entries(confidence)
    .filter(([, value]) => value.level === "low")
    .map(([key]) => key);
}

const snippet = (text: string, max = 90) => {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
};

const SECTION_NAMES: Record<RejectedBlock["section"], string> = {
  experience: "Work experience",
  projects: "Projects",
  education: "Education",
  certifications: "Certifications",
  skills: "Skills",
};

/**
 * Plain-language warnings for everything above. One line per kind of problem,
 * with a short example, so the notice stays readable.
 */
export function buildReportWarnings({
  rejected,
  unassigned,
  incomplete,
  confidence,
}: Pick<ImportResult, "rejected" | "unassigned" | "incomplete" | "confidence">): string[] {
  const warnings: string[] = [];

  const bySection = new Map<RejectedBlock["section"], RejectedBlock[]>();
  for (const block of rejected) {
    bySection.set(block.section, [...(bySection.get(block.section) ?? []), block]);
  }
  for (const [section, blocks] of bySection) {
    const first = blocks[0];
    warnings.push(
      `${blocks.length} item${blocks.length === 1 ? "" : "s"} under ${SECTION_NAMES[section]} could not be read and ${blocks.length === 1 ? "was" : "were"} skipped (for example “${snippet(first.text)}”). Add ${blocks.length === 1 ? "it" : "them"} manually.`,
    );
  }

  if (unassigned.length > 0) {
    const headings = [...new Set(unassigned.map((item) => item.heading))];
    warnings.push(
      `Text under ${headings.map((heading) => `“${heading}”`).join(", ")} was not imported because the builder has no section for it.`,
    );
  }

  const gaps = incomplete.filter((entry) => entry.missing.length > 0);
  if (gaps.length > 0) {
    const shown = gaps
      .slice(0, 3)
      .map((entry) => `${entry.label}: ${entry.missing.join(", ")}`)
      .join("; ");
    warnings.push(
      `Some entries are incomplete (${shown}${gaps.length > 3 ? `; and ${gaps.length - 3} more` : ""}).`,
    );
  }

  const dateIssues = incomplete.flatMap((entry) =>
    entry.issues.map((issue) => `${entry.label}: ${issue}`),
  );
  if (dateIssues.length > 0) {
    warnings.push(`Check the dates. ${dateIssues.slice(0, 2).join(" ")}`);
  }

  const guessed = lowConfidenceFields(confidence);
  if (guessed.length > 0) {
    warnings.push(
      `Please check these, they were hard to read: ${guessed.slice(0, 5).map(labelForField).join(", ")}.`,
    );
  }
  return warnings;
}

/** Collects what the importer could not place, and how sure it is of each field. */
export interface Collector {
  rejected: RejectedBlock[];
  unassigned: UnassignedText[];
  incomplete: IncompleteEntry[];
  confidence: Record<string, FieldConfidence>;
  rate: (key: string, level: ConfidenceLevel, reason: string) => void;
}

export function createCollector(): Collector {
  const confidence: Record<string, FieldConfidence> = {};
  return {
    rejected: [],
    unassigned: [],
    incomplete: [],
    confidence,
    rate: (key, level, reason) => {
      confidence[key] = { level, reason };
    },
  };
}
