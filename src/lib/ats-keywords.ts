import { JOB_STOPWORDS } from "./ats-data";
import { resumeText, skillItems } from "./ats-text";
import type { ResumeData, Skills } from "./resume-schema";

export interface JobKeyword {
  /** Normalised lowercase term used for matching. */
  term: string;
  /** Human readable label, preserving the casing found in the posting. */
  display: string;
  count: number;
}

export interface KeywordMatch {
  matched: string[];
  missing: string[];
  score: number;
}

/** Lowercase and strip punctuation so phrases compare predictably. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const isKeywordWord = (word: string) =>
  word.length >= 2 && !JOB_STOPWORDS.has(word) && !/^\d+$/.test(word);

/**
 * Pulls the most useful terms out of a job description. Unigrams are ranked by
 * frequency; two-word phrases (e.g. "react native") are ranked higher because
 * they are more specific.
 */
export function extractKeywords(jobDescription: string, limit = 24): JobKeyword[] {
  const pattern = /[A-Za-z][A-Za-z0-9+#.]*/g;
  const tokens: Array<{
    raw: string;
    term: string;
    start: number;
    end: number;
  }> = [];

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(jobDescription)) !== null) {
    const raw = match[0].replace(/^[.]+|[.]+$/g, "");
    const term = normalize(raw);
    if (!term) continue;
    tokens.push({
      raw,
      term,
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  const counts = new Map<string, { display: string; count: number }>();

  const bump = (term: string, display: string, weight: number) => {
    const existing = counts.get(term);
    if (existing) {
      existing.count += weight;
    } else {
      counts.set(term, { display, count: weight });
    }
  };

  for (const token of tokens) {
    if (isKeywordWord(token.term)) bump(token.term, token.raw, 1);
  }

  for (let index = 0; index < tokens.length - 1; index += 1) {
    const first = tokens[index];
    const second = tokens[index + 1];
    if (!isKeywordWord(first.term) || !isKeywordWord(second.term)) continue;
    // Only join words that are genuinely adjacent ("React Native"), never
    // items in a comma-separated list ("React, TypeScript").
    if (!/^\s+$/.test(jobDescription.slice(first.end, second.start))) continue;
    bump(`${first.term} ${second.term}`, `${first.raw} ${second.raw}`, 2);
  }

  return [...counts.entries()]
    .map(([term, value]) => ({ term, display: value.display, count: value.count }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        b.term.length - a.term.length ||
        a.term.localeCompare(b.term),
    )
    .slice(0, limit);
}

/** Compares the resume text with the job keywords, ignoring case. */
export function matchKeywords(
  data: ResumeData,
  keywords: JobKeyword[],
): KeywordMatch {
  const haystack = ` ${normalize(resumeText(data))} `;
  const matched: string[] = [];
  const missing: string[] = [];

  for (const keyword of keywords) {
    if (haystack.includes(` ${keyword.term} `)) {
      matched.push(keyword.display);
    } else {
      missing.push(keyword.display);
    }
  }

  return {
    matched,
    missing,
    score: keywords.length ? Math.round((matched.length / keywords.length) * 100) : 0,
  };
}

/** Appends new skills without duplicating existing ones (case-insensitive). */
export function mergeSkillList(existing: string, additions: string[]): string {
  const items = skillItems(existing);
  const seen = new Set(items.map((item) => item.toLowerCase()));

  for (const addition of additions) {
    const trimmed = addition.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
    items.push(trimmed);
    seen.add(trimmed.toLowerCase());
  }

  return items.join(", ");
}

/** Chooses the skills field that best fits a matched keyword. */
export function suggestSkillsField(term: string): keyof Skills {
  const value = term.toLowerCase();
  if (
    /(sql|postgres|mysql|mongo|redis|database|dynamo|sqlite|oracle|snowflake)/.test(value)
  ) {
    return "databases";
  }
  if (
    /(english|spanish|french|german|portuguese|mandarin|japanese|arabic|hindi)/.test(value)
  ) {
    return "spoken";
  }
  if (
    /^(javascript|typescript|python|java|kotlin|swift|ruby|php|go|golang|rust|scala|c\+\+|c#|c|elixir|haskell|perl|dart|bash)$/.test(
      value,
    )
  ) {
    return "languages";
  }
  return "technologies";
}
