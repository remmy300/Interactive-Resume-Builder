import type { ResumeData } from "@/lib/resume-schema";

export type ResumeEvidenceSource =
  | "summary"
  | "skill"
  | "experience"
  | "project"
  | "certification";

export interface ResumeEvidence {
  id: string;
  source: ResumeEvidenceSource;
  title: string;
  text: string;
  keywords: string[];
}

/**
 * Extracts searchable evidence from a resume.
 *
 * Original resume wording is preserved. Empty fields are ignored.
 */
export function extractResumeEvidence(resume: ResumeData): ResumeEvidence[] {
  const evidence: ResumeEvidence[] = [];

  const addEvidence = (item: Omit<ResumeEvidence, "keywords">) => {
    const text = item.text.trim();

    if (!text) return;

    evidence.push({
      ...item,
      text,
      keywords: extractKeywords(text),
    });
  };

  // Professional summary
  addEvidence({
    id: "summary",
    source: "summary",
    title: "Professional Summary",
    text: resume.summary,
  });

  // Technical skills
  const skillGroups = [
    { title: "Programming Languages", text: resume.skills.languages },
    { title: "Technologies", text: resume.skills.technologies },
    { title: "Databases", text: resume.skills.databases },
  ];

  skillGroups.forEach((skill, index) => {
    addEvidence({
      id: `skill-${index}`,
      source: "skill",
      title: skill.title,
      text: skill.text,
    });
  });

  // Work experience
  resume.experience.forEach((experience) => {
    addEvidence({
      id: `experience-${experience.id}-role`,
      source: "experience",
      title: experience.role || experience.company || "Work Experience",
      text: [experience.role, experience.company, experience.description]
        .filter(Boolean)
        .join(". "),
    });
  });

  // Projects
  resume.projects.forEach((project) => {
    addEvidence({
      id: `project-${project.id}`,
      source: "project",
      title: project.title || "Project",
      text: [project.title, project.description].filter(Boolean).join(". "),
    });
  });

  // Certifications
  resume.certifications.forEach((certification) => {
    addEvidence({
      id: `certification-${certification.id}`,
      source: "certification",
      title: certification.name || "Certification",
      text: [certification.name, certification.issuer]
        .filter(Boolean)
        .join(". "),
    });
  });

  return evidence;
}

/**
 * Extracts normalized keywords for basic text matching.
 * This is not semantic analysis.
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "by",
    "for",
    "from",
    "in",
    "into",
    "is",
    "it",
    "of",
    "on",
    "or",
    "the",
    "to",
    "using",
    "used",
    "with",
  ]);

  const words = text.toLowerCase().match(/[a-z0-9+#.]+/g) ?? [];

  return [
    ...new Set(words.filter((word) => word.length > 1 && !stopWords.has(word))),
  ];
}
