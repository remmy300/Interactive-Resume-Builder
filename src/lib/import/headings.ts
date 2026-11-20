/**
 * Section heading recognition for CV import. A heading may be wrapped in
 * punctuation ("EXPERIENCE:", "— Education —", "1. Skills"), written in spaced
 * capitals ("E D U C A T I O N"), or run straight into its content
 * ("Skills: Java, Python").
 */

export type SectionKey =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications";

/** Sections the app has no field for. Their text is reported, never dropped silently. */
export type ExtraKey = "languages" | "contact" | "other";

export type HeadingKey = SectionKey | ExtraKey;

export interface HeadingMatch {
  key: HeadingKey;
  /** The heading as written, cleaned up. */
  label: string;
}

const PATTERNS: Array<[HeadingKey, RegExp]> = [
  [
    "summary",
    /^((professional|career|executive|personal)\s+)?(summary|profile|objective|overview|statement)(\s+of\s+qualifications)?$|^(about me|about|summary of qualifications|personal statement|career objective)$/i,
  ],
  [
    "experience",
    /^(((work|professional|relevant|industry|internship)\s+)?experience(\s*(&|and)\s*internships?)?|(work|employment|career)\s+history|professional background|employment|internships?)$/i,
  ],
  [
    "education",
    /^(education|academic background|academic history|academic qualifications|qualifications)(\s*(&|and)\s*[a-z ]{3,40})?$/i,
  ],
  [
    "skills",
    /^((technical|core|key|professional|relevant)\s+)?(skills|competencies|expertise|technologies|proficiencies)(\s*(&|and)\s*(tools|technologies|frameworks|libraries|languages|platforms|expertise))?$|^(tech stack|tools\s*(&|and)\s*technologies|areas of expertise|skills summary)$/i,
  ],
  [
    "projects",
    /^((personal|selected|key|side|academic|notable|open[- ]source)\s+)?projects$/i,
  ],
  [
    "certifications",
    /^((licen[cs]es|certifications?|certificates?)(\s*(&|and)\s*(licen[cs]es|certifications?|certificates?|awards?|training))?|awards?|honou?rs\s*(&|and)\s*awards?)$/i,
  ],
  ["languages", /^(spoken |human )?languages?$|^language skills$/i],
  [
    "contact",
    /^(contact|contact (details|information|me)|personal (details|information|data)|details|links)$/i,
  ],
  [
    "other",
    /^(interests?|hobbies|hobbies\s*(&|and)\s*interests|interests\s*(&|and)\s*hobbies|references?|referees?|volunteer(ing)?( experience| work)?|publications?|achievements?|accomplishments?|extra-?curricular( activities)?|activities|additional (information|details)|declaration|memberships?|leadership)$/i,
  ],
];

/** Heading phrases, keyed by their letters alone, to recognise spaced capitals. */
const PHRASES_BY_LETTERS = new Map(
  [
    "summary",
    "professional summary",
    "profile",
    "objective",
    "experience",
    "work experience",
    "professional experience",
    "employment history",
    "work history",
    "education",
    "skills",
    "technical skills",
    "projects",
    "certifications",
    "languages",
    "interests",
    "references",
    "contact",
  ].map((phrase) => [phrase.replace(/\s+/g, ""), phrase] as const),
);

/**
 * "1. Education", "• SKILLS", "— Experience —", "## Projects", "EXPERIENCE :" all
 * reduce to the plain heading text.
 */
export function cleanHeadingText(line: string): string {
  let value = line.trim();
  value = value.replace(/^[\s#>*_=~\-–—•·▪◦●■□▶►]+/, "");
  value = value.replace(/^\(?\d{1,2}[.)]\s+/, "");
  value = value.replace(/[\s:•|.\-–—_=*#~]+$/, "");
  value = value.replace(/\s+/g, " ").trim();

  // "W O R K  E X P E R I E N C E": one letter per token.
  const tokens = value.split(" ");
  if (tokens.length >= 4 && tokens.every((token) => token.length === 1)) {
    const phrase = PHRASES_BY_LETTERS.get(tokens.join("").toLowerCase());
    if (phrase) return phrase;
  }
  return value;
}

/** The section a standalone heading line starts, or null. */
export function matchHeading(line: string): HeadingMatch | null {
  const label = cleanHeadingText(line);
  if (!label || label.length > 48) return null;

  for (const [key, pattern] of PATTERNS) {
    if (pattern.test(label)) return { key, label };
  }
  return null;
}

const INLINE_KEYS = new Set<HeadingKey>(["summary", "skills", "languages", "other"]);

/**
 * "Skills: Java, Python" or "Summary – Frontend developer…": a heading followed
 * by its content on the same line. Only for sections that are written this way;
 * "Experience: 5 years" is a sentence, not a heading.
 */
export function matchInlineHeading(
  line: string,
): (HeadingMatch & { rest: string }) | null {
  const parts = line.match(/^([A-Za-z][A-Za-z &/]{2,40}?)\s*[:–—]\s*(\S.*)$/);
  if (!parts) return null;
  const match = matchHeading(parts[1]);
  if (!match || !INLINE_KEYS.has(match.key)) return null;
  const rest = parts[2].trim();
  // "Profile: https://…" and "Skills: see below" are labels, not sections.
  if (/^(?:https?:\/\/|www\.)|@/i.test(rest)) return null;
  // "Technologies: React, Node.js" under a project is a stack list. Only a plain
  // "Skills" label starts a skills section when written on one line.
  if (match.key === "skills" && !/skills|competenc|expertise|proficienc/i.test(match.label)) {
    return null;
  }
  return { ...match, rest };
}
