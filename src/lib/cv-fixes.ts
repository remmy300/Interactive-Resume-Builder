import { normalizeTerm } from "./ats-skills";
import { leadingWord } from "./ats-quality";
import { skillItems } from "./ats-text";
import type { EducationEntry, ResumeData } from "./resume-schema";

const hasText = (value: string) => value.trim().length > 0;

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

export interface WordingFix {
  id: string;
  entryId: string;
  entryLabel: string;
  original: string;
  suggested: string;
  reason: string;
}

const SYNONYMS: Record<string, string[]> = {
  built: ["Developed", "Created", "Engineered"],
  developed: ["Created", "Engineered", "Produced"],
  created: ["Developed", "Produced"],
  integrated: ["Connected"],
  implemented: ["Delivered", "Introduced", "Applied"],
  used: ["Applied", "Leveraged"],
  designed: ["Architected", "Structured"],
  wrote: ["Authored", "Created"],
  added: ["Introduced"],
  managed: ["Led", "Oversaw"],
  improved: ["Enhanced", "Strengthened"],
  optimized: ["Improved", "Tuned"],
  fixed: ["Resolved", "Corrected"],
  led: ["Directed", "Guided"],
};

const MAX_REPEATS = 2;

const nameWords = (value: string) =>
  new Set(value.toLowerCase().match(/[a-z]+/g) ?? []);

function bulletLines(description: string): string[] {
  return description
    .split("\n")
    .map((line) => line.replace(/^\s*[-•*]\s*/, "").trim())
    .filter((line) => line && !/^tech(?:nology)? stack\s*:/i.test(line));
}

export function suggestOpeningVariety(data: ResumeData): WordingFix[] {
  const bullets: Array<{
    entryId: string;
    label: string;
    text: string;
    word: string;
    names: Set<string>;
  }> = [];
  for (const entry of data.experience) {
    const label =
      [entry.role, entry.company].filter(Boolean).join(" at ") || "Experience";
    const names = nameWords(`${entry.role} ${entry.company}`);
    for (const text of bulletLines(entry.description)) {
      bullets.push({
        entryId: entry.id,
        label,
        text,
        word: leadingWord(text),
        names,
      });
    }
  }
  for (const entry of data.projects) {
    const label = entry.title.trim() || "Project";
    const names = nameWords(entry.title);
    for (const text of bulletLines(entry.description)) {
      bullets.push({
        entryId: entry.id,
        label,
        text,
        word: leadingWord(text),
        names,
      });
    }
  }

  const counts = new Map<string, number>();
  for (const bullet of bullets) {
    if (bullet.word)
      counts.set(bullet.word, (counts.get(bullet.word) ?? 0) + 1);
  }

  const inUse = new Set(bullets.map((bullet) => bullet.word));
  const seen = new Map<string, number>();
  const fixes: WordingFix[] = [];

  for (const bullet of bullets) {
    if (!bullet.word || (counts.get(bullet.word) ?? 0) <= MAX_REPEATS) continue;
    const position = (seen.get(bullet.word) ?? 0) + 1;
    seen.set(bullet.word, position);
    if (position <= MAX_REPEATS) continue;

    // Never offer a verb the bullet already contains, or one that is part of the
    // role, company or project name ("Developer" at "Developed Labs").
    const present = new Set(bullet.text.toLowerCase().match(/[a-z]+/g) ?? []);
    const choice = (SYNONYMS[bullet.word] ?? []).find((candidate) => {
      const lower = candidate.toLowerCase();
      return (
        !inUse.has(lower) && !present.has(lower) && !bullet.names.has(lower)
      );
    });
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

export function setLocation(data: ResumeData, location: string): ResumeData {
  return { ...data, personal: { ...data.personal, location: location.trim() } };
}

/* -------------------------------- education ------------------------------- */

const QUALIFICATION_WORDS =
  /\b(graduate|diploma|certificate|degree|bachelor|master|bsc|msc|ba|ma|mba|phd|kcse|a-levels?|high ?school)\b/i;

export function incompleteEducation(data: ResumeData): {
  entry: EducationEntry;
  institution: string;
  qualification: string;
} | null {
  const entry = data.education.find(
    (item) =>
      (hasText(item.college) || hasText(item.degree)) &&
      !(hasText(item.college) && hasText(item.degree)),
  );
  if (!entry) return null;

  const collegeIsQualification =
    hasText(entry.college) &&
    !hasText(entry.degree) &&
    QUALIFICATION_WORDS.test(entry.college);
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
        ? {
            ...entry,
            college: institution.trim(),
            degree: qualification.trim(),
          }
        : entry,
    ),
  };
}
