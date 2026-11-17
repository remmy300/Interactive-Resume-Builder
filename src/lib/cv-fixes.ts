import { normalizeTerm } from "./ats-skills";
import { leadingWord } from "./ats-quality";
import { skillItems } from "./ats-text";
import type { EducationEntry, ResumeData } from "./resume-schema";

/**
 * One-click fixes for CV check findings. Each one only changes what the resume
 * already says (removing a claim, rewording an opening word, filling a gap the
 * user types in), and the user reviews every change before it is applied.
 */

const hasText = (value: string) => value.trim().length > 0;

/* ------------------------------ unevidenced skills ------------------------- */

/** Removes the named skills from every skills group, keeping the rest in order. */
export function removeSkills(data: ResumeData, remove: string[]): ResumeData {
  if (remove.length === 0) return data;
  const gone = new Set(remove.map((skill) => normalizeTerm(skill)));
  const keep = (value: string) =>
    skillItems(value)
      .filter((skill) => !gone.has(normalizeTerm(skill)))
      .join(", ");
  return {
    ...data,
    skills: {
      languages: keep(data.skills.languages),
      technologies: keep(data.skills.technologies),
      databases: keep(data.skills.databases),
      spoken: data.skills.spoken,
    },
  };
}

/* ------------------------------ repeated openings -------------------------- */

export interface WordingFix {
  id: string;
  entryId: string;
  entryLabel: string;
  original: string;
  suggested: string;
  reason: string;
}

// Past-tense synonyms that keep the sentence grammatical, so only the first word
// changes. The user can still edit the result before applying it.
const SYNONYMS: Record<string, string[]> = {
  built: ["Developed", "Created", "Engineered"],
  developed: ["Created", "Engineered", "Produced"],
  created: ["Developed", "Produced"],
  integrated: ["Incorporated", "Embedded"],
  implemented: ["Delivered", "Introduced", "Applied"],
  used: ["Applied", "Leveraged"],
  designed: ["Architected", "Structured"],
  wrote: ["Authored", "Created"],
  added: ["Introduced", "Included"],
  managed: ["Led", "Oversaw"],
  improved: ["Enhanced", "Strengthened"],
  optimized: ["Improved", "Tuned"],
  fixed: ["Resolved", "Corrected"],
  led: ["Directed", "Guided"],
  worked: ["Collaborated"],
};

const MAX_REPEATS = 2;

function bulletLines(description: string): string[] {
  return description
    .split("\n")
    .map((line) => line.replace(/^\s*[-•*]\s*/, "").trim())
    .filter((line) => line && !/^tech(?:nology)? stack\s*:/i.test(line));
}

/**
 * When the same opening word starts more than two bullets, proposes another word
 * for the extra ones. The first two uses stay as they are.
 */
export function suggestOpeningVariety(data: ResumeData): WordingFix[] {
  const bullets: Array<{ entryId: string; label: string; text: string; word: string }> = [];
  for (const entry of data.experience) {
    const label = [entry.role, entry.company].filter(Boolean).join(" at ") || "Experience";
    for (const text of bulletLines(entry.description)) {
      bullets.push({ entryId: entry.id, label, text, word: leadingWord(text) });
    }
  }
  for (const entry of data.projects) {
    const label = entry.title.trim() || "Project";
    for (const text of bulletLines(entry.description)) {
      bullets.push({ entryId: entry.id, label, text, word: leadingWord(text) });
    }
  }

  const counts = new Map<string, number>();
  for (const bullet of bullets) {
    if (bullet.word) counts.set(bullet.word, (counts.get(bullet.word) ?? 0) + 1);
  }

  const inUse = new Set(bullets.map((bullet) => bullet.word));
  const seen = new Map<string, number>();
  const fixes: WordingFix[] = [];

  for (const bullet of bullets) {
    if (!bullet.word || (counts.get(bullet.word) ?? 0) <= MAX_REPEATS) continue;
    const position = (seen.get(bullet.word) ?? 0) + 1;
    seen.set(bullet.word, position);
    if (position <= MAX_REPEATS) continue;

    const choice = (SYNONYMS[bullet.word] ?? []).find(
      (candidate) => !inUse.has(candidate.toLowerCase()),
    );
    if (!choice) continue;
    inUse.add(choice.toLowerCase());

    const match = bullet.text.match(/^([^A-Za-z]*)([A-Za-z]+)/);
    if (!match) continue;
    fixes.push({
      id: `${bullet.entryId}-${fixes.length}`,
      entryId: bullet.entryId,
      entryLabel: bullet.label,
      original: bullet.text,
      suggested: `${match[1]}${choice}${bullet.text.slice(match[0].length)}`,
      reason: `“${match[2]}” already opens ${MAX_REPEATS} other bullets.`,
    });
  }
  return fixes;
}

/* --------------------------------- contact -------------------------------- */

export function setLocation(data: ResumeData, location: string): ResumeData {
  return { ...data, personal: { ...data.personal, location: location.trim() } };
}

/* -------------------------------- education ------------------------------- */

const QUALIFICATION_WORDS =
  /\b(graduate|diploma|certificate|degree|bachelor|master|bsc|msc|ba|ma|mba|phd|kcse|a-levels?|high ?school)\b/i;

/** The first education entry that is missing its institution or its qualification. */
export function incompleteEducation(
  data: ResumeData,
): { entry: EducationEntry; institution: string; qualification: string } | null {
  const entry = data.education.find(
    (item) =>
      (hasText(item.college) || hasText(item.degree)) &&
      !(hasText(item.college) && hasText(item.degree)),
  );
  if (!entry) return null;

  // "Highschool Graduate" is a qualification that was typed into the school field.
  const collegeIsQualification =
    hasText(entry.college) && !hasText(entry.degree) && QUALIFICATION_WORDS.test(entry.college);
  return {
    entry,
    institution: collegeIsQualification ? "" : entry.college,
    qualification: collegeIsQualification ? entry.college : entry.degree,
  };
}

export function completeEducation(
  data: ResumeData,
  entryId: string,
  institution: string,
  qualification: string,
): ResumeData {
  return {
    ...data,
    education: data.education.map((entry) =>
      entry.id === entryId
        ? { ...entry, college: institution.trim(), degree: qualification.trim() }
        : entry,
    ),
  };
}
