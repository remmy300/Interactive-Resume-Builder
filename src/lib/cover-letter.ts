import { extractKeywords, matchKeywords, skillItems } from "./ats";
import { formatLink, normalizeLinkUrl } from "./letter-links";
import type { ResumeData } from "./resume-schema";

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

/*                                   helpers                                  */

const IRREGULAR_PAST = new Set([
  "built",
  "led",
  "wrote",
  "ran",
  "made",
  "drove",
  "took",
  "set",
  "cut",
  "grew",
  "won",
  "taught",
  "gave",
  "began",
  "chose",
  "oversaw",
  "undertook",
  "rebuilt",
  "rewrote",
  "sped",
  "spearheaded",
  "became",
  "brought",
  "kept",
  "found",
  "held",
  "sent",
  "shipped",
]);

/**  anything that is not a past-tense action is rejected. */
function asFirstPerson(bullet: string): string | null {
  const text = bullet
    .replace(/^\s*[-•*]\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.;:]+$/, "");
  const first =
    text
      .split(" ")[0]
      ?.toLowerCase()
      .replace(/[^a-z]/g, "") ?? "";
  if (!first || text.split(" ").length < 4) return null;
  if (!(first.endsWith("ed") || IRREGULAR_PAST.has(first))) return null;
  // "Used to", "Needed" and similar are not accomplishments worth quoting.
  if (/^(responsible|tasked|assisted|helped)$/.test(first)) return null;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function shorten(text: string, max = 200): string {
  if (text.length <= max) return text;
  const head = text.slice(0, max);
  const cut = Math.max(head.lastIndexOf(", "), head.lastIndexOf(" and "));
  return cut > 60 ? head.slice(0, cut) : head.replace(/\s+\S*$/, "");
}

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** "AI-Native Developer Intern | JavaScript & Full-Stack" -> "AI-Native Developer Intern". */
function shortTitle(title: string): string {
  return title.split(/\s*[|·•–—/,]\s*/)[0]?.trim() ?? "";
}

function bulletLines(description: string): string[] {
  return description
    .split("\n")
    .map((line) => line.replace(/^\s*[-•*]\s*/, "").trim())
    .filter((line) => line && !/^tech(?:nology)?\s+stacks?\s*:/i.test(line));
}

interface Evidence {
  /** First-person text, without the leading "I". */
  text: string;
  role: string;
  company: string;
  entry: number;
  score: number;
}

function scoreBullet(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  const hits = keywords.filter((keyword) =>
    lower.includes(keyword.toLowerCase()),
  ).length;
  return hits * 3 + (/\d/.test(text) ? 2 : 0) + (text.length >= 40 ? 1 : 0);
}

function collectEvidence(resume: ResumeData, keywords: string[]): Evidence[] {
  const found: Evidence[] = [];
  resume.experience.forEach((entry, index) => {
    for (const line of bulletLines(entry.description)) {
      const text = asFirstPerson(line);
      if (!text) continue;
      found.push({
        text: shorten(text),
        role: entry.role.trim(),
        company: entry.company.trim(),
        entry: index,
        score: scoreBullet(text, keywords) - index * 0.5,
      });
    }
  });
  return found.sort((a, b) => b.score - a.score);
}

function pickEvidence(evidence: Evidence[], count: number): Evidence[] {
  if (evidence.length === 0) return [];
  // Lead with the most recent role (best bullet in it), then add one more.
  const latest = Math.min(...evidence.map((item) => item.entry));
  const first = evidence.find((item) => item.entry === latest) ?? evidence[0];
  if (count < 2) return [first];
  const other =
    evidence.find((item) => item.entry !== first.entry) ??
    evidence.find((item) => item !== first);
  return other ? [first, other] : [first];
}

function workingAs(item: Evidence): string {
  const role = item.role ? `${article(item.role)} ${item.role}` : "";
  if (role && item.company) return `As ${role} at ${item.company}`;
  if (role) return `As ${role}`;
  if (item.company) return `At ${item.company}`;
  return "In my previous work";
}

function projectSentence(resume: ResumeData, keywords: string[]): string {
  let best: { title: string; text: string; score: number } | null = null;
  for (const project of resume.projects) {
    const title = project.title
      .replace(/\s*\([^)]*\)\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!title) continue;
    for (const line of bulletLines(project.description)) {
      const text = asFirstPerson(line);
      if (!text) continue;
      const score = scoreBullet(`${title} ${text}`, keywords);
      if (!best || score > best.score)
        best = { title, text: shorten(text, 170), score };
    }
  }
  return best
    ? `Outside of my day-to-day work I built ${best.title}, where I ${best.text}.`
    : "";
}

/*                                   letter                                   */
/* 

/**
 * Builds an editable cover-letter draft in the candidate's own voice.
 *
 * The CV summary is deliberately NOT copied: it is written in the third person
 * and already sits on the CV. Instead the letter picks the experience bullets
 * that best match the job, turns them into first-person sentences, and ties
 * them to the job's keywords. Only things found in the CV are claimed.
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

  const matched = jobDescription
    ? matchKeywords(resume, extractKeywords(jobDescription)).matched
    : [];

  const cvSkills = [
    ...skillItems(resume.skills.technologies),
    ...skillItems(resume.skills.languages),
  ];
  const lowerCv = new Set(cvSkills.map((skill) => skill.toLowerCase()));
  const skills = [
    ...new Set([
      ...matched.filter((term) => lowerCv.has(term.toLowerCase())),
      ...cvSkills,
    ]),
  ].slice(0, 4);

  const greeting = manager?.trim()
    ? `Dear ${manager.trim()},`
    : "Dear Hiring Manager,";

  const opening =
    tone === "enthusiastic"
      ? `I was excited to see the ${targetRole} opening at ${targetCompany}, and I would love to bring my experience to your team.`
      : tone === "concise"
        ? `I am applying for the ${targetRole} role at ${targetCompany}.`
        : `I am writing to apply for the ${targetRole} position at ${targetCompany}.`;

  const title = shortTitle(resume.personal.title);
  const sameAsRole = title.toLowerCase() === role.trim().toLowerCase();
  const focus = skills.length ? `working mainly with ${joinList(skills)}` : "";
  const background =
    title && !sameAsRole
      ? `I am ${article(title)} ${title}${focus ? ` ${focus}` : ""}.`
      : focus
        ? `My day-to-day work is ${focus}.`
        : "";

  const evidence = pickEvidence(
    collectEvidence(resume, matched),
    tone === "concise" ? 1 : 2,
  );
  let proof = "";
  if (evidence[0]) {
    proof = `${workingAs(evidence[0])}, I ${evidence[0].text}.`;
    if (evidence[1]) {
      const sameJob = evidence[1].entry === evidence[0].entry;
      proof += sameJob
        ? ` I also ${evidence[1].text}.`
        : ` Previously, ${workingAs(evidence[1]).replace(/^As /, "as ").replace(/^At /, "at ")}, I ${evidence[1].text}.`;
    }
  }

  const project = tone === "concise" ? "" : projectSentence(resume, matched);

  const fitTerms = matched.slice(0, 3);
  const fit = fitTerms.length
    ? `What draws me to ${targetCompany} is the focus on ${joinList(fitTerms)}, which is the kind of work I do best, and I would be glad to go into more detail about how I can contribute.`
    : `I would welcome the opportunity to discuss how my background can support ${targetCompany}.`;

  const closing =
    tone === "concise"
      ? "Thank you for your consideration. I look forward to hearing from you."
      : "Thank you for your time and consideration. I look forward to the chance to talk with you.";

  const titledLink = (label: string, value: string) => {
    const href = normalizeLinkUrl(value);
    return href ? formatLink(label, href) : "";
  };
  const contact = [
    resume.personal.email.trim(),
    resume.personal.phone.trim(),
    titledLink("LinkedIn", resume.personal.linkedIn),
    titledLink("Portfolio", resume.personal.portfolio),
  ]
    .filter(Boolean)
    .join(" · ");

  return [
    greeting,
    [opening, background].filter(Boolean).join(" "),
    [proof, project].filter(Boolean).join(" "),
    fit,
    closing,
    `Sincerely,\n${name}${contact ? `\n${contact}` : ""}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
