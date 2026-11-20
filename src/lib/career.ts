import { z } from "zod";
import { mergeSkillList, skillItems, suggestSkillsField } from "./ats";
import type { ResumeData, Skills } from "./resume-schema";

/*Application tracker   */

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

/* Cover Letter */

export const coverLetterInputSchema = z.object({
  title: z.string().trim().min(1, "Give the letter a title.").max(120),
  company: z.string().trim().max(120).default(""),
  role: z.string().trim().max(120).default(""),
  content: z.string().trim().min(1, "The letter is empty.").max(20000),
});

export const coverLetterUpdateSchema = coverLetterInputSchema.partial();

export type CoverLetterInput = z.infer<typeof coverLetterInputSchema>;

export {
  COVER_LETTER_TONES,
  generateCoverLetter,
  type CoverLetterDraftInput,
  type CoverLetterTone,
} from "./cover-letter";

/* Job Description*/

export interface BulletSuggestion {
  id: string;
  entryId: string;
  entryLabel: string;
  original: string;
  suggested: string;
  reasons: string[];
}

const WEAK_OPENINGS: Array<[RegExp, string, string]> = [
  [
    /^responsible for\s+/i,
    "Owned ",
    "Replace “responsible for” with a strong action verb.",
  ],
  [
    /^worked on\s+/i,
    "Delivered ",
    "Replace “worked on” with a result-oriented verb.",
  ],
  [
    /^helped (with|to)\s+/i,
    "Supported ",
    "Replace “helped” with a specific contribution.",
  ],
  [
    /^assisted (with|in)\s+/i,
    "Supported ",
    "Replace “assisted” with a specific contribution.",
  ],
  [
    /^(involved in|participated in)\s+/i,
    "Contributed to ",
    "Show ownership instead of participation.",
  ],
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

  // Only suggest a rewrite when the wording really changed, and never insert
  // bracketed placeholder text: it would end up in the saved resume. Metrics are
  // a bonus, not a requirement, so a bullet without a number is left alone.
  if (/[.!?]$/.test(bullet.trim()) === false) {
    text = text.replace(/[.]+$/, "");
  }

  return { text, reasons };
}

export function suggestBulletImprovements(
  data: ResumeData,
  limit = 12,
): BulletSuggestion[] {
  const suggestions: BulletSuggestion[] = [];
  const seen = new Set<string>();

  for (const entry of data.experience) {
    const lines = entry.description
      .split("\n")
      .map((line) => line.replace(/^\s*[-•*]\s*/, "").trim())
      .filter(Boolean);

    const entryLabel =
      [entry.role, entry.company].filter(Boolean).join(" at ") || "Experience";

    for (const original of lines) {
      const dedupeKey = `${entry.id}:${original.toLowerCase()}`;

      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const { text, reasons } = polishBullet(original);

      if (reasons.length === 0) continue;

      suggestions.push({
        id: `${entry.id}-${suggestions.length}`,
        entryId: entry.id,
        entryLabel,
        original,
        suggested: text,
        reasons,
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

export function applyBulletChanges(
  data: ResumeData,
  changes: BulletChange[],
): ResumeData {
  if (changes.length === 0) return data;

  const byEntry = new Map<string, BulletChange[]>();

  for (const change of changes) {
    byEntry.set(change.entryId, [
      ...(byEntry.get(change.entryId) ?? []),
      change,
    ]);
  }

  const rewrite = <T extends { id: string; description: string }>(
    entry: T,
  ): T => {
    const entryChanges = byEntry.get(entry.id);

    if (!entryChanges) return entry;

    const next = entry.description.split("\n").map((line) => {
      const clean = line.replace(/^\s*[-•*]\s*/, "").trim();

      const match = entryChanges.find(
        (change) => change.original.trim() === clean,
      );

      return match ? match.suggested : line;
    });

    return { ...entry, description: next.join("\n") };
  };

  return {
    ...data,
    experience: data.experience.map(rewrite),
    projects: data.projects.map(rewrite),
  };
}

export function addSkillsToResume(
  data: ResumeData,
  terms: string[],
): ResumeData {
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

/*Interview prep*/

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

function topSkills(data: ResumeData, limit = 2): string[] {
  const ordered = [
    ...skillItems(data.skills.languages),
    ...skillItems(data.skills.technologies),
    ...skillItems(data.skills.databases),
  ];

  const seen = new Set<string>();

  return ordered
    .filter((skill) => {
      const key = skill.toLowerCase().trim();

      if (!key || seen.has(key)) return false;

      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

const BEHAVIORAL_QUESTIONS = [
  "Tell me about a time you handled conflicting priorities.",
  "Describe a challenging project. What did you learn?",
  "Tell me about a time you had to learn something quickly.",
  "Give an example of when you improved a process.",
  "Describe a time you received difficult feedback. How did you respond?",
];

/**
 * Curated technical questions for commonly used technologies.
 * Unknown skills receive a general experience-based question.
 */
const TECHNICAL_QUESTION_TEMPLATES: Record<string, string> = {
  react:
    "How does React manage component state, and when would you use Context API?",

  nextjs:
    "How does Next.js handle server-side rendering, and when would you use it?",

  typescript: "What advantages does TypeScript provide over JavaScript?",

  javascript:
    "Can you explain the JavaScript event loop and how asynchronous operations work?",

  nodejs: "How does Node.js handle concurrent requests?",

  express: "How would you structure middleware in an Express application?",

  postgresql: "How would you investigate and optimize a slow PostgreSQL query?",

  mysql: "How would you investigate and optimize a slow MySQL query?",

  mongodb:
    "How do you decide how to structure documents and relationships in MongoDB?",

  docker:
    "What problems does Docker solve during application development and deployment?",

  git: "How do you handle conflicting changes when collaborating with other developers using Git?",

  prisma: "How does Prisma help manage database access and schema changes?",

  firebase:
    "What are some considerations when using Firebase for authentication and data storage?",

  html: "How do semantic HTML elements improve accessibility?",

  css: "How would you approach building a responsive interface using CSS?",

  python:
    "How does Python handle exceptions, and how do you use them in application development?",

  php: "How does PHP handle requests in a typical web application?",

  laravel: "How does Laravel's request lifecycle work?",
};

/**
 * Normalizes questions to detect duplicates even when punctuation differs.
 */
function normalizeQuestion(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDescriptionLines(description: string, limit = 2): string[] {
  return description
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•*]\s*/, "").trim())
    .filter((line) => line.length >= 25)
    .slice(0, limit);
}

/**
 * Produces a technical question based on a listed skill.
 */
function questionFromSkill(skill: string): string {
  const key = skill.toLowerCase().replace(/[^a-z0-9]/g, "");

  return (
    TECHNICAL_QUESTION_TEMPLATES[key] ??
    `How have you used ${skill} in your development work, and what challenges have you encountered?`
  );
}

/**  Maximum number of generated questions per category. */
const QUESTION_LIMITS: Record<InterviewCategory, number> = {
  behavioral: 5,
  technical: 6,
  role: 7,
  company: 2,
};

/**
 * Builds an interview question bank using the candidate's resume.
 * @param data
 * @param company.
 * @param targetRole
 */
export function buildInterviewQuestions(
  data: ResumeData,
  company?: string,
  targetRole?: string,
): InterviewQuestion[] {
  const questions: InterviewQuestion[] = [];

  /* Behavioural questions  */

  for (const question of BEHAVIORAL_QUESTIONS) {
    questions.push({
      question,
      category: "behavioral",
    });
  }

  /*  Target role  */

  const role = targetRole?.trim() || data.personal.title.trim();

  if (role) {
    questions.push({
      question: `What makes your experience and skills relevant to a ${role} position?`,
      category: "role",
    });
  }

  /* Professional experience  */

  for (const entry of data.experience.slice(0, 3)) {
    const label = entry.role.trim() || "this role";
    const companyName = entry.company.trim();

    if (entry.role.trim() || companyName) {
      questions.push({
        question: `What were your main responsibilities as ${label}${
          companyName ? ` at ${companyName}` : ""
        }?`,
        category: "role",
      });
    }

    for (const line of extractDescriptionLines(entry.description, 1)) {
      const excerpt = line.length > 220 ? `${line.slice(0, 217)}...` : line;

      questions.push({
        question: `Your resume mentions: "${excerpt}". What was your specific contribution, and how did you approach it?`,
        category: "role",
      });
    }
  }

  /* . Technical skills  */

  for (const skill of topSkills(data, 2)) {
    questions.push({
      question: questionFromSkill(skill),
      category: "technical",
    });
  }

  /*  Projects  */

  const projects = data.projects
    .filter((project) => project.title.trim())
    .slice(0, 2);

  for (const project of projects) {
    questions.push({
      question: `Walk me through ${project.title.trim()}. What problem did it solve, and what technical decisions did you make?`,
      category: "technical",
    });

    for (const line of extractDescriptionLines(project.description, 1)) {
      const excerpt = line.length > 180 ? `${line.slice(0, 177)}...` : line;

      questions.push({
        question: `Your project "${project.title.trim()}" includes: "${excerpt}". How did you implement this?`,
        category: "technical",
      });
    }
  }

  /*  Company  */

  const companyName = company?.trim();

  if (companyName) {
    questions.push({
      question: `Why are you interested in working at ${companyName}?`,
      category: "company",
    });

    questions.push({
      question: `How would your experience and skills contribute to ${companyName}?`,
      category: "company",
    });
  } else {
    questions.push({
      question:
        "What do you know about the company you are applying to, and why are you interested in joining?",
      category: "company",
    });
  }

  /*  Deduplication  */

  const seen = new Set<string>();

  const categoryCounts: Record<InterviewCategory, number> = {
    behavioral: 0,
    technical: 0,
    role: 0,
    company: 0,
  };

  return questions.filter((item) => {
    const key = normalizeQuestion(item.question);

    if (!key || seen.has(key)) return false;

    if (categoryCounts[item.category] >= QUESTION_LIMITS[item.category]) {
      return false;
    }

    seen.add(key);
    categoryCounts[item.category]++;

    return true;
  });
}

/* Data records */

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
