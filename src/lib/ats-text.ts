import type { ResumeData } from "./resume-schema";

export const hasText = (value: string) => value.trim().length > 0;

/** Splits comma/enter separated skill text into clean items. */
export function skillItems(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Flattens the resume into plain text, the same text an ATS would read. */
export function resumeText(data: ResumeData): string {
  const { personal, skills } = data;
  const parts: string[] = [
    personal.name,
    personal.title,
    personal.phone,
    personal.email,
    personal.location,
    personal.linkedIn,
    personal.github,
    personal.portfolio,
    data.summary,
  ];

  for (const entry of data.experience) {
    parts.push(
      entry.company,
      entry.role,
      entry.startDate,
      entry.endDate,
      entry.current ? "Present" : "",
      entry.description,
    );
  }
  for (const entry of data.projects) {
    parts.push(entry.title, entry.link, entry.description);
  }
  for (const entry of data.education) {
    parts.push(entry.college, entry.degree, entry.startDate, entry.endDate);
  }
  for (const entry of data.certifications) {
    parts.push(entry.name, entry.issuer, entry.date, entry.link);
  }
  parts.push(skills.languages, skills.technologies, skills.databases, skills.spoken);

  return parts.filter(hasText).join("\n");
}

/** Achievement bullets exactly as they appear in the document. */
export function resumeBullets(data: ResumeData): string[] {
  return [...data.experience, ...data.projects]
    .flatMap((entry) => entry.description.split("\n"))
    .map((line) => line.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean);
}
