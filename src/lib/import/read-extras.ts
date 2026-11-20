import type { ResumeData } from "../resume-schema";
import { parseCertifications } from "./entries";
import { mergeWrappedLines } from "./lines";
import { BULLET_START, hasText, stripBullet } from "./patterns";
import type { Collector } from "./report";
import type { ExtraSection } from "./sections";
import { parseSkills } from "./skills";

export function readCertifications(lines: string[], resume: ResumeData, collector: Collector): void {
  resume.certifications = parseCertifications(lines, (lost) =>
    collector.rejected.push({
      section: "certifications",
      text: lost,
      reason: "No certification name could be read.",
    }),
  );
}

export function readSkills(lines: string[], resume: ResumeData, collector: Collector): void {
  if (!lines.some(hasText)) return;

  // A long skill line wraps ("…AWS Code" / "Pipeline"): rejoin it before splitting.
  // Only for bulleted lists: unbulleted label lines ("DATABASES" / "PostgreSQL, …")
  // are separate on purpose.
  const skillLines = lines.some((line) => BULLET_START.test(line))
    ? mergeWrappedLines(lines)
    : lines;
  const dropped: string[] = [];
  resume.skills = parseSkills(skillLines.filter(hasText), dropped);
  for (const item of dropped) {
    collector.rejected.push({
      section: "skills",
      text: item,
      reason: "Too long to be a single skill.",
    });
  }
}

/**
 * Sections outside the main six: a "Languages" section lists spoken languages;
 * anything else (Interests, References…) is reported, not silently dropped.
 */
export function readExtraSections(
  extras: ExtraSection[],
  resume: ResumeData,
  collector: Collector,
): void {
  for (const section of extras.filter((item) => item.key === "languages")) {
    const known = new Set(
      resume.skills.spoken.split(",").map((item) => item.trim().toLowerCase()),
    );
    const items = section.lines
      .flatMap((line) => stripBullet(line).split(/[;|•]|,(?![^()]*\))/))
      .map((item) => item.trim().replace(/\.$/, ""))
      .filter((item) => item && item.length < 60 && !known.has(item.toLowerCase()));
    for (const item of items) {
      resume.skills.spoken = resume.skills.spoken ? `${resume.skills.spoken}, ${item}` : item;
    }
  }

  for (const section of extras.filter((item) => item.key === "other")) {
    const body = section.lines.filter(hasText).join("\n");
    if (body) collector.unassigned.push({ heading: section.heading, text: body });
  }
}
