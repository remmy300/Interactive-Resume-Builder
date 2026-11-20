import type { ResumeData } from "../resume-schema";
import { parseEducationBlock, parseExperienceBlock, parseProjectBlock } from "./entries";
import { mergeWrappedLines, splitSectionBlocks, splitTitleBlocks } from "./lines";
import { locateBlocks } from "./link-lines";
import { DEGREE_WORDS, ROLE_WORDS, SCHOOL_WORDS } from "./patterns";
import type { Collector } from "./report";
import { parseDatesDetailed } from "./validate";

type Confidence = "high" | "medium" | "low";

/** Splits Work experience into roles, and notes what is unclear or missing in each. */
export function readExperience(lines: string[], resume: ResumeData, collector: Collector): void {
  for (const block of splitSectionBlocks(mergeWrappedLines(lines))) {
    const entry = parseExperienceBlock(block);
    if (!entry) {
      collector.rejected.push({
        section: "experience",
        text: block.join(" "),
        reason: "No company or job title could be read.",
      });
      continue;
    }
    const index = resume.experience.length;
    resume.experience.push(entry);

    const dates = parseDatesDetailed(block.join(" "));
    const prefix = `experience.${index}`;
    const company: Confidence = !entry.company ? "low" : entry.role ? "high" : "medium";
    const role: Confidence = !entry.role ? "low" : ROLE_WORDS.test(entry.role) ? "high" : "medium";
    const when: Confidence =
      !entry.startDate || dates.issues.length > 0
        ? "low"
        : entry.endDate || entry.current
          ? "high"
          : "medium";
    collector.rate(
      `${prefix}.company`,
      company,
      entry.company ? "Read from the role header." : "No company name found.",
    );
    collector.rate(
      `${prefix}.role`,
      role,
      entry.role ? "Read from the role header." : "No job title found.",
    );
    collector.rate(
      `${prefix}.dates`,
      when,
      entry.startDate ? "Read from the date range." : "No dates found.",
    );

    const missing = [
      !entry.company && "company",
      !entry.role && "job title",
      !entry.startDate && "start date",
      !entry.endDate && !entry.current && "end date",
      !entry.description.trim() && "achievements",
    ].filter((item): item is string => Boolean(item));
    if (missing.length > 0 || dates.issues.length > 0) {
      collector.incomplete.push({
        section: "experience",
        index,
        label: `Role ${index + 1}${entry.company ? ` (${entry.company})` : ""}`,
        missing,
        issues: dates.issues,
      });
    }
  }
}

export function readEducation(lines: string[], resume: ResumeData, collector: Collector): void {
  for (const block of splitTitleBlocks(mergeWrappedLines(lines))) {
    const entry = parseEducationBlock(block);
    if (!entry) {
      collector.rejected.push({
        section: "education",
        text: block.join(" "),
        reason: "It does not name a school or a qualification.",
      });
      continue;
    }
    const index = resume.education.length;
    resume.education.push(entry);

    const school: Confidence = !entry.college
      ? "low"
      : SCHOOL_WORDS.test(entry.college)
        ? "high"
        : "medium";
    const degree: Confidence = !entry.degree
      ? "low"
      : DEGREE_WORDS.test(entry.degree)
        ? "high"
        : "medium";
    collector.rate(
      `education.${index}.college`,
      school,
      entry.college ? "Read from the education header." : "No school found.",
    );
    collector.rate(
      `education.${index}.degree`,
      degree,
      entry.degree ? "Read from the education header." : "No qualification found.",
    );

    const missing = [!entry.college && "school", !entry.degree && "qualification"].filter(
      (item): item is string => Boolean(item),
    );
    if (missing.length > 0) {
      collector.incomplete.push({
        section: "education",
        index,
        label: `Education ${index + 1}${entry.college ? ` (${entry.college})` : ""}`,
        missing,
        issues: [],
      });
    }
  }
}

interface ProjectInput {
  lines: string[];
  /** Line numbers of `lines` in the whole CV, to find each project's links. */
  lineIndexes: number[];
  urlsByLine: Map<number, string[]>;
}

export function readProjects(
  { lines, lineIndexes, urlsByLine }: ProjectInput,
  resume: ResumeData,
  collector: Collector,
): void {
  const blocks = splitTitleBlocks(mergeWrappedLines(lines));
  const starts = locateBlocks(blocks, lines);

  blocks.forEach((block, position) => {
    // Links belong to the project whose lines they sit on.
    const from = starts[position];
    const to = starts.slice(position + 1).find((start) => start >= 0) ?? lines.length;
    const urls: string[] = [];
    for (let line = from; from >= 0 && line < to; line += 1) {
      urls.push(...(urlsByLine.get(lineIndexes[line]) ?? []));
    }

    const entry = parseProjectBlock(block, urls);
    if (!entry) {
      collector.rejected.push({
        section: "projects",
        text: block.join(" "),
        reason: "No project title could be read.",
      });
      return;
    }
    const index = resume.projects.length;
    resume.projects.push(entry);
    collector.rate(`projects.${index}.title`, "high", "The first line of the project.");
    if (!entry.description.trim()) {
      collector.incomplete.push({
        section: "projects",
        index,
        label: `Project ${index + 1} (${entry.title})`,
        missing: ["description"],
        issues: [],
      });
    }
  });
}
