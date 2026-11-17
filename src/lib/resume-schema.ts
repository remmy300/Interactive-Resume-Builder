import { z } from "zod";

export const TEMPLATE_IDS = [
  "professional",
  "classic",
  "ats",
  "compact",
  "two-column",
] as const;

export const templateSchema = z.enum(TEMPLATE_IDS);

export type TemplateId = z.infer<typeof templateSchema>;

export const TEMPLATES: Array<{
  id: TemplateId;
  name: string;
  description: string;
}> = [
  {
    id: "professional",
    name: "Classic Professional",
    description:
      "Serif type, left-aligned header with a bold rule, ruled section headings, and projects on one line with their stack and links.",
  },
  {
    id: "classic",
    name: "Classic",
    description: "Single column, centered header. A safe choice for any role.",
  },
  {
    id: "ats",
    name: "ATS safe",
    description:
      "Plain single column with black text and no graphics. Best for online job applications.",
  },
  {
    id: "compact",
    name: "Compact",
    description: "Tighter spacing so more experience fits on one page.",
  },
  {
    id: "two-column",
    name: "Two column",
    description: "Sidebar for contact and skills, main column for experience.",
  },
];

export const entryIdSchema = z.string().min(1).max(64);

export const personalSchema = z.object({
  name: z.string().max(120),
  title: z.string().max(120),
  phone: z.string().max(50),
  email: z.string().max(254),
  location: z.string().max(120),
  linkedIn: z.string().max(500),
  portfolio: z.string().max(500),
  github: z.string().max(500),
});

export const educationSchema = z.object({
  id: entryIdSchema,
  college: z.string().max(200),
  degree: z.string().max(200),
  startDate: z.string().max(20),
  endDate: z.string().max(20),
  current: z.boolean(),
});

export const experienceSchema = z.object({
  id: entryIdSchema,
  company: z.string().max(200),
  role: z.string().max(200),
  description: z.string().max(5000),
  startDate: z.string().max(20),
  endDate: z.string().max(20),
  current: z.boolean(),
});

export const projectSchema = z.object({
  id: entryIdSchema,
  title: z.string().max(200),
  description: z.string().max(5000),
  link: z.string().max(500),
  github: z.string().max(500).default(""),
});

export const certificationSchema = z.object({
  id: entryIdSchema,
  name: z.string().max(200),
  issuer: z.string().max(200),
  date: z.string().max(20),
  link: z.string().max(500),
});

export const skillsSchema = z.object({
  languages: z.string().max(1000),
  technologies: z.string().max(1000),
  databases: z.string().max(1000),
  spoken: z.string().max(500),
});

/* ------------------------------ Design settings ----------------------------- */

export const FONT_IDS = [
  "template",
  "georgia",
  "times",
  "garamond",
  "palatino",
  "cambria",
  "arial",
  "calibri",
  "verdana",
  "trebuchet",
] as const;

export type FontId = (typeof FONT_IDS)[number];

/** Fonts that exist on most computers, so the PDF matches what you see. */
export const FONT_CHOICES: Array<{ id: FontId; label: string; stack: string }> = [
  { id: "template", label: "Template default", stack: "" },
  { id: "georgia", label: "Georgia", stack: 'Georgia, "Times New Roman", serif' },
  { id: "times", label: "Times New Roman", stack: '"Times New Roman", Times, serif' },
  {
    id: "garamond",
    label: "Garamond",
    stack: 'Garamond, "EB Garamond", "Palatino Linotype", Georgia, serif',
  },
  {
    id: "palatino",
    label: "Palatino",
    stack: '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
  },
  { id: "cambria", label: "Cambria", stack: "Cambria, Georgia, serif" },
  { id: "arial", label: "Arial", stack: "Arial, Helvetica, sans-serif" },
  {
    id: "calibri",
    label: "Calibri",
    stack: 'Calibri, Carlito, "Segoe UI", Arial, sans-serif',
  },
  { id: "verdana", label: "Verdana", stack: "Verdana, Geneva, sans-serif" },
  {
    id: "trebuchet",
    label: "Trebuchet MS",
    stack: '"Trebuchet MS", Tahoma, sans-serif',
  },
];

export const SPACING_IDS = ["tight", "normal", "relaxed"] as const;
export const PAGE_SIZE_IDS = ["a4", "letter"] as const;

export const FONT_SCALE_MIN = 0.8;
export const FONT_SCALE_MAX = 1.4;
export const FONT_SCALE_STEP = 0.05;

export const styleSchema = z.object({
  font: z.enum(FONT_IDS).default("template"),
  /** Multiplies every font size in the resume. 1 is the template's own size. */
  fontScale: z.number().min(FONT_SCALE_MIN).max(FONT_SCALE_MAX).default(1),
  /** Space between lines, entries and sections. */
  spacing: z.enum(SPACING_IDS).default("normal"),
  pageSize: z.enum(PAGE_SIZE_IDS).default("a4"),
});

export type ResumeStyle = z.infer<typeof styleSchema>;

export const DEFAULT_STYLE: ResumeStyle = {
  font: "template",
  fontScale: 1,
  spacing: "normal",
  pageSize: "a4",
};

export const resumeDataSchema = z.object({
  template: templateSchema,
  summary: z.string().max(2000),
  personal: personalSchema,
  education: z.array(educationSchema).max(30),
  experience: z.array(experienceSchema).max(30),
  projects: z.array(projectSchema).max(30),
  certifications: z.array(certificationSchema).max(30),
  skills: skillsSchema,
  style: styleSchema.default(DEFAULT_STYLE),
});

export type PersonalDetails = z.infer<typeof personalSchema>;
export type EducationEntry = z.infer<typeof educationSchema>;
export type ExperienceEntry = z.infer<typeof experienceSchema>;
export type ProjectEntry = z.infer<typeof projectSchema>;
export type CertificationEntry = z.infer<typeof certificationSchema>;
export type Skills = z.infer<typeof skillsSchema>;
export type ResumeData = z.infer<typeof resumeDataSchema>;

export type ListSection = "education" | "experience" | "projects" | "certifications";

export const saveResumeSchema = z.object({
  title: z.string().trim().min(1, "Give your resume a title.").max(100),
  data: resumeDataSchema,
});

export const updateResumeSchema = saveResumeSchema.extend({
  updatedAt: z.string().max(40).optional(),
});

export const shareResumeSchema = z.object({
  enabled: z.boolean(),
});

/** Small id helper that works in Node and the browser. */
export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

export function createEmptyResume(): ResumeData {
  return {
    template: "professional",
    summary: "",
    personal: {
      name: "",
      title: "",
      phone: "",
      email: "",
      location: "",
      linkedIn: "",
      portfolio: "",
      github: "",
    },
    education: [
      {
        id: createId(),
        college: "",
        degree: "",
        startDate: "",
        endDate: "",
        current: false,
      },
    ],
    experience: [
      {
        id: createId(),
        company: "",
        role: "",
        description: "",
        startDate: "",
        endDate: "",
        current: false,
      },
    ],
    projects: [
      {
        id: createId(),
        title: "",
        description: "",
        link: "",
        github: "",
      },
    ],
    certifications: [],
    skills: { languages: "", technologies: "", databases: "", spoken: "" },
    style: { ...DEFAULT_STYLE },
  };
}

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const asBoolean = (value: unknown): boolean => value === true;

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const asId = (value: unknown): string =>
  typeof value === "string" && value.length > 0 && value.length <= 64
    ? value
    : createId();

function normalizeEducation(value: unknown): EducationEntry {
  const entry = asRecord(value);
  return {
    id: asId(entry.id),
    college: asString(entry.college),
    degree: asString(entry.degree),
    startDate: asString(entry.startDate),
    endDate: asString(entry.endDate),
    current: asBoolean(entry.current),
  };
}

function normalizeExperience(value: unknown): ExperienceEntry {
  const entry = asRecord(value);
  return {
    id: asId(entry.id),
    company: asString(entry.company),
    role: asString(entry.role),
    description: asString(entry.description),
    startDate: asString(entry.startDate),
    endDate: asString(entry.endDate),
    current: asBoolean(entry.current),
  };
}

function normalizeProject(value: unknown): ProjectEntry {
  const entry = asRecord(value);
  return {
    id: asId(entry.id),
    title: asString(entry.title),
    description: asString(entry.description),
    link: asString(entry.link),
    github: asString(entry.github),
  };
}

function normalizeCertification(value: unknown): CertificationEntry {
  const entry = asRecord(value);
  return {
    id: asId(entry.id),
    name: asString(entry.name),
    issuer: asString(entry.issuer),
    date: asString(entry.date),
    link: asString(entry.link),
  };
}

/**
 * Converts stored JSON (which may predate the current schema) into a complete
 * `ResumeData`. Arrays are replaced rather than merged so deleting an entry is
 * never undone by a default value, and every list item receives a stable id.
 */
export function normalizeResumeData(input: unknown): ResumeData {
  const root = asRecord(input);
  const personal = asRecord(root.personal);
  const skills = asRecord(root.skills);

  return {
    template: templateSchema.safeParse(root.template).success
      ? (root.template as TemplateId)
      : "classic",
    summary: asString(root.summary),
    personal: {
      name: asString(personal.name),
      title: asString(personal.title),
      phone: asString(personal.phone),
      email: asString(personal.email),
      location: asString(personal.location),
      linkedIn: asString(personal.linkedIn),
      portfolio: asString(personal.portfolio),
      github: asString(personal.github),
    },
    education: asArray(root.education).map(normalizeEducation),
    experience: asArray(root.experience).map(normalizeExperience),
    projects: asArray(root.projects).map(normalizeProject),
    certifications: asArray(root.certifications).map(normalizeCertification),
    skills: {
      languages: asString(skills.languages),
      technologies: asString(skills.technologies),
      databases: asString(skills.databases),
      spoken: asString(skills.spoken),
    },
    style: normalizeStyle(root.style),
  };
}

/** Design settings from older or hand-edited data, clamped to valid values. */
export function normalizeStyle(input: unknown): ResumeStyle {
  const value = asRecord(input);
  const scale = typeof value.fontScale === "number" ? value.fontScale : DEFAULT_STYLE.fontScale;
  return {
    font: (FONT_IDS as readonly unknown[]).includes(value.font)
      ? (value.font as FontId)
      : DEFAULT_STYLE.font,
    fontScale: Number.isFinite(scale)
      ? Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Math.round(scale * 100) / 100))
      : DEFAULT_STYLE.fontScale,
    spacing: (SPACING_IDS as readonly unknown[]).includes(value.spacing)
      ? (value.spacing as ResumeStyle["spacing"])
      : DEFAULT_STYLE.spacing,
    pageSize: (PAGE_SIZE_IDS as readonly unknown[]).includes(value.pageSize)
      ? (value.pageSize as ResumeStyle["pageSize"])
      : DEFAULT_STYLE.pageSize,
  };
}

/** Fields shown in the editor, used for human-readable validation errors. */
export const SECTION_LABELS: Record<ListSection, string> = {
  education: "Education",
  experience: "Experience",
  projects: "Projects",
  certifications: "Certifications",
};
