import { createEmptyResume, type ResumeData } from "./resume-schema";
import type { LinkRef } from "./import-links";
import { prepareText } from "./import/clean-text";
import { readContact } from "./import/contact";
import { readIdentity, reportMissingContact } from "./import/header";
import { assignLinksToLines, normalizeLinkRefs } from "./import/link-lines";
import { restoreIndentedBullets } from "./import/lines";
import {
  INVISIBLE_CHARS,
  NO_BREAK_SPACE,
  cleanLine,
  hasText,
} from "./import/patterns";
import { readEducation, readExperience, readProjects } from "./import/read-entries";
import { readCertifications, readExtraSections, readSkills } from "./import/read-extras";
import { buildReportWarnings, createCollector, type ImportResult } from "./import/report";
import { splitSections } from "./import/sections";

export { joinPdfPages } from "./import/clean-text";
export type {
  ConfidenceLevel,
  FieldConfidence,
  ImportResult,
  IncompleteEntry,
  RejectedBlock,
  UnassignedText,
} from "./import/report";

/** A resume with nothing filled in, not even the builder's placeholder entries. */
function blankResume(): ResumeData {
  const resume = createEmptyResume();
  resume.education = [];
  resume.experience = [];
  resume.projects = [];
  resume.certifications = [];
  resume.skills = { languages: "", technologies: "", databases: "", spoken: "" };
  resume.summary = "";
  resume.personal = {
    name: "",
    title: "",
    phone: "",
    email: "",
    location: "",
    linkedIn: "",
    github: "",
    portfolio: "",
  };
  return resume;
}

const countSkills = (resume: ResumeData) =>
  Object.values(resume.skills).reduce(
    (count, value) => count + (value ? value.split(",").length : 0),
    0,
  );

/**
 * Best-effort conversion of extracted CV text into the app's structured resume
 * format. Imported data is always shown to the user for review before it is
 * saved as a new resume.
 *
 * The work is split across `./import/*`: cleaning the text, sorting lines into
 * sections, reading the header and each section, then reporting what could not
 * be placed.
 */
export function parseResumeText(
  rawText: string,
  extraLinks: Array<string | LinkRef> = [],
): ImportResult {
  // Bullet glyphs from symbol fonts arrive as invisible private-use characters.
  const text = prepareText(
    rawText
      .replace(INVISIBLE_CHARS, "")
      .replace(NO_BREAK_SPACE, " ")
      .replace(/\r\n?/g, "\n"),
  );
  const resume = blankResume();
  const collector = createCollector();
  const warnings: string[] = [];

  const rawLines = restoreIndentedBullets(text).split("\n").map(cleanLine);
  const linkRefs = normalizeLinkRefs(extraLinks);
  const urlsByLine = assignLinksToLines(rawLines, linkRefs);
  const { headerEnd, sections, extras, projectLineIndexes } = splitSections(rawLines);

  // Header: contact details, then name, headline and location.
  const headerRows = rawLines.slice(0, headerEnd).filter(hasText).slice(0, 24);
  const contactRows = extras
    .filter((item) => item.key === "contact")
    .flatMap((item) => item.lines)
    .filter(hasText);
  readContact(
    {
      personal: resume.personal,
      contactArea: [...headerRows, ...contactRows].join("\n"),
      text,
      headerEnd,
      urlsByLine,
      linkRefs,
    },
    collector,
  );
  const { looseSummary } = readIdentity(
    { personal: resume.personal, headerRows, contactRows },
    collector,
  );

  // Summary: under its heading, or a paragraph under the contact details.
  if (sections.summary.some(hasText)) {
    resume.summary = sections.summary.filter(hasText).join(" ").slice(0, 2000);
    collector.rate("summary", "high", "Found under a summary heading.");
  } else if (looseSummary) {
    resume.summary = looseSummary.slice(0, 2000);
    collector.rate("summary", "medium", "A paragraph under the contact details, with no heading.");
  }

  readExperience(sections.experience, resume, collector);
  readEducation(sections.education, resume, collector);
  readProjects(
    { lines: sections.projects, lineIndexes: projectLineIndexes, urlsByLine },
    resume,
    collector,
  );
  readCertifications(sections.certifications, resume, collector);
  readSkills(sections.skills, resume, collector);
  readExtraSections(extras, resume, collector);
  reportMissingContact(resume.personal, collector);

  // Sections the CV does not have.
  if (!sections.experience.some(hasText)) {
    warnings.push("No work experience section was detected. Add roles manually.");
  }
  if (!sections.education.some(hasText)) {
    warnings.push("No education section was detected.");
  }
  if (!sections.skills.some(hasText)) {
    warnings.push("No skills section was detected. Add your key tools and languages.");
  }
  if (!hasText(resume.summary)) {
    warnings.push("No professional summary was detected.");
  }

  // If the document had no recognisable headings, keep the text so the user can
  // copy it into the right sections rather than losing the upload entirely.
  const hasStructure = [
    sections.summary,
    sections.experience,
    sections.education,
    sections.skills,
  ].some((lines) => lines.some(hasText));
  if (!hasStructure) {
    resume.summary = text.trim().slice(0, 2000);
    collector.rate("summary", "low", "No headings were found, so all the text was kept here.");
    warnings.push(
      "We could not recognise section headings. The text was placed in the summary for you to reorganise.",
    );
  }

  const { rejected, unassigned, incomplete, confidence } = collector;
  warnings.push(...buildReportWarnings({ rejected, unassigned, incomplete, confidence }));

  return {
    data: resume,
    warnings,
    stats: {
      characters: text.length,
      experience: resume.experience.length,
      education: resume.education.length,
      projects: resume.projects.length,
      skills: countSkills(resume),
    },
    rejected,
    unassigned,
    incomplete,
    confidence,
  };
}
