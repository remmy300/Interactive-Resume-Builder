import { z } from "zod";
import {
  extractKeywords,
  matchKeywords,
  mergeSkillList,
  skillItems,
  suggestSkillsField,
  type JobKeyword,
} from "./ats";
import type { ResumeData, Skills } from "./resume-schema";

/* -------------------------------------------------------------------------- */
/*                              Application tracker                           */
/* -------------------------------------------------------------------------- */

export const APPLICATION_STATUSES = [
  "saved",
  "applied",
  "interview",
  "offer",
  "rejected",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export const applicationInputSchema = z.object({
  company: z.string().trim().min(1, "Company is required.").max(160),
  role: z.string().trim().min(1, "Role is required.").max(160),
  status: z.enum(APPLICATION_STATUSES).default("saved"),
  url: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value === "" || isHttpUrl(value), {
      message: "Use a link that starts with http:// or https://.",
    })
    .default(""),
  notes: z.string().trim().max(5000).default(""),
  appliedAt: z.string().trim().max(40).optional(),
});

export const applicationUpdateSchema = applicationInputSchema.partial();

export type ApplicationInput = z.infer<typeof applicationInputSchema>;

/* -------------------------------------------------------------------------- */
/*                                Cover letters                               */
/* -------------------------------------------------------------------------- */

export const coverLetterInputSchema = z.object({
  title: z.string().trim().min(1, "Give the letter a title.").max(120),
  company: z.string().trim().max(120).default(""),
  role: z.string().trim().max(120).default(""),
  content: z.string().trim().min(1, "The letter is empty.").max(20000),
});

export const coverLetterUpdateSchema = coverLetterInputSchema.partial();

export type CoverLetterInput = z.infer<typeof coverLetterInputSchema>;

export const COVER_LETTER_TONES = [
  "professional",
  "enthusiastic",
  "concise",
] as const;

export type CoverLetterTone = (typeof COVER_LETTER_TONES)[number];

export interface CoverLetterDraftInput {
  resume: ResumeData;
  company: string;
  role: string;
  manager?: string;
  jobDescription?: string;
  tone?: CoverLetterTone;
}

function topSkills(data: ResumeData, limit = 4): string[] {
  const ordered = [...skillItems(data.skills.technologies), ...skillItems(data.skills.languages)];
  return [...new Set(ordered)].slice(0, limit);
}

function bestBullets(data: ResumeData, limit = 2): string[] {
  const bullets = data.experience
    .flatMap((entry) =>
      entry.description
        .split("\n")
        .map((line) => line.replace(/^\s*[-•*]\s*/, "").trim())
        .filter(Boolean),
    )
    .filter((line) => line.length > 20);

  // Prefer quantified achievements, then shorter, punchier bullets.
  return bullets
    .sort((a, b) => Number(/\d/.test(b)) - Number(/\d/.test(a)))
    .slice(0, limit);
}

/**
 * Builds an editable cover-letter draft from the user's own resume content and
 * optional job-description keywords. The user always reviews the text before
 * saving it.
 */
export function generateCoverLetter({
  resume,
  company,
  role,
  manager,
  jobDescription = "",
  tone = "professional",
}: CoverLetterDraftInput): string {
  const name = resume.personal.name.trim() || "Your name";
  const targetRole = role.trim() || "the advertised role";
  const targetCompany = company.trim() || "your company";
  const skills = topSkills(resume);
  const keywords = jobDescription
    ? matchKeywords(resume, extractKeywords(jobDescription)).matched.slice(0, 3)
    : [];
  const bullets = bestBullets(resume);
  const greeting = manager?.trim()
    ? `Dear ${manager.trim()},`
    : "Dear Hiring Manager,";

  const opening =
    tone === "enthusiastic"
      ? `I was excited to see the opening for ${targetRole} at ${targetCompany}, and I would love to bring my experience to your team.`
      : tone === "concise"
        ? `I am applying for the ${targetRole} role at ${targetCompany}.`
        : `I am writing to apply for the ${targetRole} position at ${targetCompany}.`;

  const background = resume.personal.title.trim()
    ? `I am a ${resume.personal.title.trim()}${skills.length ? ` with hands-on experience in ${skills.join(", ")}` : ""}.`
    : skills.length
      ? `My background includes ${skills.join(", ")}.`
      : "";

  const summary = resume.summary.trim();
  const proof = bullets.length
    ? `In previous roles I ${bullets
        .map((bullet) => {
          const clean = bullet.replace(/^I\s+/i, "");
          return clean.charAt(0).toLowerCase() + clean.slice(1).replace(/\.$/, "");
        })
        .join(", and I ")}.`
    : "";

  const fit = keywords.length
    ? `Your focus on ${keywords.join(", ")} aligns closely with the work I enjoy doing, and I would be glad to go into detail about how I can contribute.`
    : `I would welcome the opportunity to discuss how my background can support ${targetCompany}.`;

  const closing =
    tone === "concise"
      ? "Thank you for your consideration. I look forward to hearing from you."
      : "Thank you for your time and consideration. I would welcome the chance to discuss how I can contribute to your team.";

  const contact = [
    resume.personal.email,
    resume.personal.phone,
    resume.personal.linkedIn,
    resume.personal.portfolio,
  ]
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" · ");

  return [
    greeting,
    [opening, background].filter(Boolean).join(" "),
    summary,
    proof,
    fit,
    closing,
    `Sincerely,\n${name}${contact ? `\n${contact}` : ""}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/* -------------------------------------------------------------------------- */
/*                         Job-description assistant                          */
/* -------------------------------------------------------------------------- */

export interface BulletSuggestion {
  id: string;
  entryId: string;
  entryLabel: string;
  original: string;
  suggested: string;
  reasons: string[];
  missingKeywords: string[];
}

const WEAK_OPENINGS: Array<[RegExp, string, string]> = [
  [/^responsible for\s+/i, "Owned ", "Replace “responsible for” with a strong action verb."],
  [/^worked on\s+/i, "Delivered ", "Replace “worked on” with a result-oriented verb."],
  [/^helped (with|to)\s+/i, "Supported ", "Replace “helped” with a specific contribution."],
  [/^assisted (with|in)\s+/i, "Supported ", "Replace “assisted” with a specific contribution."],
  [/^(involved in|participated in)\s+/i, "Contributed to ", "Show ownership instead of participation."],
  [/^duties included\s+/i, "Delivered ", "Describe outcomes, not duties."],
  [/^tasked with\s+/i, "Led ", "Describe what you delivered."],
];

function polishBullet(bullet: string): { text: string; reasons: string[] } {
  let text = bullet.replace(/^\s*[-•*]\s*/, "").trim();
  const reasons: string[] = [];

  if (/^i\s+/i.test(text)) {
    text = text.replace(/^i\s+/i, "");
    text = text.charAt(0).toUpperCase() + text.slice(1);
    reasons.push("Removed first-person wording.");
  }

  for (const [pattern, replacement, reason] of WEAK_OPENINGS) {
    if (pattern.test(text)) {
      text = text.replace(pattern, replacement);
      reasons.push(reason);
      break;
    }
  }

  text = text.replace(/\s+/g, " ").trim();
  if (text && !/[.!?]$/.test(text)) {
    text = `${text}.`;
  }

  if (!/\d/.test(text)) {
    text = text.replace(/[.]+$/, "");
    text = `${text}, [add a measurable result: %, time saved, users, or revenue].`;
    reasons.push("Add a measurable outcome to make the impact concrete.");
  }

  return { text, reasons };
}

/**
 * Suggests conservative rewrites of the user's real bullets. It never invents
 * tools or claims — missing job keywords are surfaced as hints instead of being
 * inserted into the text.
 */
export function suggestBulletImprovements(
  data: ResumeData,
  keywords: JobKeyword[],
  limit = 12,
): BulletSuggestion[] {
  const { missing } = matchKeywords(data, keywords);
  const hints = missing.slice(0, 3);
  const suggestions: BulletSuggestion[] = [];

  for (const entry of data.experience) {
    const lines = entry.description
      .split("\n")
      .map((line) => line.replace(/^\s*[-•*]\s*/, "").trim())
      .filter(Boolean);
    const entryLabel = [entry.role, entry.company].filter(Boolean).join(" at ") || "Experience";

    for (const original of lines) {
      const { text, reasons } = polishBullet(original);
      if (reasons.length === 0) continue;
      suggestions.push({
        id: `${entry.id}-${suggestions.length}`,
        entryId: entry.id,
        entryLabel,
        original,
        suggested: text,
        reasons,
        missingKeywords: hints,
      });
      if (suggestions.length >= limit) return suggestions;
    }
  }

  return suggestions;
}

export interface BulletChange {
  entryId: string;
  original: string;
  suggested: string;
}

/** Applies only the bullet rewrites the user approved. */
export function applyBulletChanges(
  data: ResumeData,
  changes: BulletChange[],
): ResumeData {
  if (changes.length === 0) return data;
  const byEntry = new Map<string, BulletChange[]>();
  for (const change of changes) {
    byEntry.set(change.entryId, [...(byEntry.get(change.entryId) ?? []), change]);
  }

  return {
    ...data,
    experience: data.experience.map((entry) => {
      const entryChanges = byEntry.get(entry.id);
      if (!entryChanges) return entry;
      const next = entry.description.split("\n").map((line) => {
        const clean = line.replace(/^\s*[-•*]\s*/, "").trim();
        const match = entryChanges.find((change) => change.original.trim() === clean);
        return match ? match.suggested : line;
      });
      return { ...entry, description: next.join("\n") };
    }),
  };
}

/** Adds reviewed keywords to the right skills groups. */
export function addSkillsToResume(data: ResumeData, terms: string[]): ResumeData {
  if (terms.length === 0) return data;
  const grouped: Partial<Record<keyof Skills, string[]>> = {};
  for (const term of terms) {
    const field = suggestSkillsField(term);
    grouped[field] = [...(grouped[field] ?? []), term];
  }

  const skills = { ...data.skills };
  for (const [field, values] of Object.entries(grouped)) {
    if (!values?.length) continue;
    const key = field as keyof Skills;
    skills[key] = mergeSkillList(skills[key], values);
  }
  return { ...data, skills };
}

/* -------------------------------------------------------------------------- */
/*                               Interview prep                               */
/* -------------------------------------------------------------------------- */

export const INTERVIEW_CATEGORIES = [
  "behavioral",
  "technical",
  "role",
  "company",
] as const;

export type InterviewCategory = (typeof INTERVIEW_CATEGORIES)[number];

export const interviewNoteInputSchema = z.object({
  question: z.string().trim().min(1, "A question is required.").max(500),
  answer: z.string().max(10000).default(""),
  category: z.enum(INTERVIEW_CATEGORIES).default("behavioral"),
});

export const interviewNoteUpdateSchema = interviewNoteInputSchema.partial();

export interface InterviewQuestion {
  question: string;
  category: InterviewCategory;
}

const BEHAVIORAL_QUESTIONS = [
  "Tell me about a time you handled a difficult stakeholder or conflicting priorities.",
  "Describe a project that failed. What did you learn, and what would you do differently?",
  "Tell me about a time you had to learn something quickly to deliver a result.",
  "Give an example of when you improved a process or made work more efficient.",
  "Describe a time you received tough feedback. How did you respond?",
  "Tell me about a time you disagreed with a teammate. How did you resolve it?",
];

/** Builds a question bank grounded in the user's own CV. */
export function buildInterviewQuestions(
  data: ResumeData,
  company?: string,
): InterviewQuestion[] {
  const questions: InterviewQuestion[] = BEHAVIORAL_QUESTIONS.map((question) => ({
    question,
    category: "behavioral" as const,
  }));

  const role = data.personal.title.trim();
  if (role) {
    questions.push({
      question: `Walk me through your experience as a ${role}. Which accomplishment best shows your impact?`,
      category: "role",
    });
  }

  for (const entry of data.experience.slice(0, 2)) {
    const label = entry.company.trim() || "your last role";
    questions.push({
      question: `What was your biggest achievement at ${label}, and how did you measure it?`,
      category: "role",
    });
  }

  const skills = topSkills(data, 4);
  for (const skill of skills) {
    questions.push({
      question: `Describe a project where you used ${skill}. What trade-offs did you make?`,
      category: "technical",
    });
  }

  const projects = data.projects.filter((project) => project.title.trim()).slice(0, 2);
  for (const project of projects) {
    questions.push({
      question: `Tell me about ${project.title.trim()}. What problem did it solve and what would you improve?`,
      category: "technical",
    });
  }

  if (company?.trim()) {
    questions.push({
      question: `Why do you want to work at ${company.trim()}, and how does your experience fit our product?`,
      category: "company",
    });
    questions.push({
      question: `What do you know about ${company.trim()}, and what would you want to learn first?`,
      category: "company",
    });
  } else {
    questions.push({
      question: "What do you know about our company, and why are you applying here?",
      category: "company",
    });
  }

  const seen = new Set<string>();
  return questions.filter((item) => {
    if (seen.has(item.question)) return false;
    seen.add(item.question);
    return true;
  });
}

export interface CoverLetterRecord {
  id: string;
  title: string;
  company: string;
  role: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationRecord {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  url: string;
  notes: string;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewNoteRecord {
  id: string;
  question: string;
  answer: string;
  category: InterviewCategory;
  createdAt: string;
  updatedAt: string;
}
