import type { ResumeData } from "./resume-schema";

export interface ResumeValidity {
  valid: boolean;
  missing: string[];
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hasText = (value: string) => value.trim().length > 0;

/**
 * Content required before a resume is worth saving or exporting. Keeps the Save
 * and PDF buttons from producing empty documents while still allowing drafts to
 * be typed freely.
 */
export function checkResumeValidity(data: ResumeData): ResumeValidity {
  const missing: string[] = [];

  if (!hasText(data.personal.name)) missing.push("your full name");
  if (!hasText(data.personal.email)) {
    missing.push("your email address");
  } else if (!EMAIL_PATTERN.test(data.personal.email.trim())) {
    missing.push("a valid email address");
  }

  const hasExperience = data.experience.some(
    (entry) =>
      hasText(entry.company) || hasText(entry.role) || hasText(entry.description),
  );
  const hasEducation = data.education.some(
    (entry) => hasText(entry.college) || hasText(entry.degree),
  );
  const hasProjects = data.projects.some(
    (entry) => hasText(entry.title) || hasText(entry.description),
  );
  const hasSkills = Object.values(data.skills).some(hasText);

  if (!hasExperience && !hasEducation && !hasProjects && !hasSkills) {
    missing.push("at least one experience, education, project, or skills section");
  }

  return { valid: missing.length === 0, missing };
}

export function isValidResume(data: ResumeData): boolean {
  return checkResumeValidity(data).valid;
}
