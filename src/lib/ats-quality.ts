import { ACTION_VERBS } from "./ats-data";
import { normalizeTerm, SKILL_ALIASES } from "./ats-skills";
import { hasText, resumeBullets, resumeText, skillItems } from "./ats-text";
import { withWeights } from "./ats-scoring";
import { isValidCheck, type AtsCheck, type AtsStatus } from "./ats-types";
import type { ResumeData } from "./resume-schema";

const MAX_EXAMPLES = 3;

const WEAK_PHRASES =
  /\b(responsible for|duties (included|include)|worked on|helped (to |with )?|assisted (with|in)|involved in|participated in|tasked with|contributed to|various|etc\.?|and more)\b/i;

const CLICHES =
  /\b(hard[- ]?working|team player|results[- ]driven|detail[- ]oriented|self[- ]motivated|go[- ]getter|fast learner|quick learner|passionate about|synergy|think outside the box|excellent communication skills|strong work ethic|highly motivated)\b/i;

const PLACEHOLDER_PATTERN =
  /\[[^\]]*(?:add|insert|replace|your|metric|number|percent(?:age)?|result|query|todo|tbd|example|company|role|date|describe|achievement|name|title|link|url|skill)[^\]]*\]|\b(?:lorem ipsum|add a measurable result|one real sql query|your (?:name|title|role|company) here)\b|\b(?:by|of|to)\s+(?:X|XX)\s?%|\bX{2,}\s?%|_{4,}/gi;

const EXPLICIT_PLACEHOLDER = /\b(?:TODO|TBD|FIXME)\b/g;

// A credible metric is a result with a unit: a percentage, money, a multiple,
// a large count, or a number of people/requests/time. A bare "5 apps" or
// "team of 10" is scope, not impact, so it does not count.
const METRIC =
  /(\d+(\.\d+)?\s?%|[$£€₦]\s?\d|\b\d+(\.\d+)?\s?[kKmMbB]\b|\b\d+x\b|\b\d{1,3}(,\d{3})+\b|\b\d+\+?\s?(?:users?|customers?|clients?|visitors?|requests?|orders?|transactions?|records?|sessions?|downloads?|views?|ms|s|secs?|milliseconds?|seconds?|minutes?|mins?|hrs?|hours?|days?|weeks?|bugs?|defects?|tickets?|incidents?|errors?|leads?|sales|sign-?ups?|subscribers?)\b)/i;

// Words that describe a result, not just an activity.
const OUTCOME =
  /\b(?:reduc\w*|improv\w*|increas\w*|decreas\w*|cut|saved?|saving|boost\w*|faster|speed\w*|eliminat\w*|prevent\w*|catch\w*|caught|resolv\w*|rais\w*|grew|growth|lower\w*|accelerat\w*|streamlin\w*|achiev\w*|generat\w*|drove|won|launched|shipped|released|adopted)\b/i;

// An outcome stated in words: "…so reviewers could approve faster".
const RESULT_CLAUSE =
  /\b(?:resulting in|which (?:allowed|enabled|helped|let|made|reduced|improved|saved|cut)|so (?:that )?\w+ (?:could|can|would)|enabling|allowing|leading to|ensuring|making (?:it )?(?:easier|faster|simpler|safer)|for (?:faster|easier|better|safer))\b/i;

// Big claims with nothing behind them: they describe the writer, not the work.
const UNSUPPORTED_CLAIM =
  /\b(?:expert in|world[- ]class|best[- ]in[- ]class|top performer|extensive experience|proven track record|outstanding|exceptional|unmatched|second to none|guru|ninja|rockstar)\b/i;

const EVIDENCE_TERMS =
  /\b(?:api|apis|endpoint|endpoints|database|databases|schema|service|services|microservices?|architecture|pipeline|pipelines|ci\/cd|deployment|deployments|docker|kubernetes|aws|azure|gcp|cloud|server|servers|backend|frontend|react|next\.?js|typescript|javascript|python|node\.?js|sql|postgres(?:ql)?|mysql|mongodb|redis|graphql|rest|grpc|webhook|webhooks|queue|queues|cache|caching|authentication|oauth|authorization|security|encryption|tests?|testing|unit tests?|integration tests?|code review|refactor|refactoring|migration|migrations|performance|latency|throughput|accessibility|responsive|component|components|library|libraries|design system|feature|features|integration|integrations|automation|automated|script|scripts|framework|frameworks|process|workflow|workflows|campaign|campaigns|curriculum|patients?|students?|clients?|customers?|invoices?|compliance|audit|audits|budget|budgets|forecast|forecasting|contract|contracts|supply chain|inventory|logistics|policy|policies|training|program|programs|event|events|reports?|analysis|research|stakeholders?|vendors?|operations|revenue|cost|costs|sales|marketing)\b/i;

const PASSIVE =
  /\b(?:was|were|is|are|been|being|be)\s+(?:\w+ly\s+)?(?:\w+(?:ed|en)|built|written|made|done|run|led|held|sent|kept|found|given|taken|seen|shown|deployed|managed|used)\b/i;

const RESPONSIBILITY_START =
  /^(?:responsible for|in charge of|accountable for|duties (?:included|include)|worked on|worked with|helped (?:to|with)?|assisted (?:with|in)|involved in|participated in|tasked with|contributed to)\b/i;

const VAGUE_WORDS =
  /\b(?:various|etc\.?|and more|stuff|things|tasks|responsibilities|duties|day[- ]to[- ]day|a variety of|a range of|miscellaneous|assorted|as needed|general (?:support|duties|tasks))\b/i;

const IRREGULAR_VERBS = new Set([
  "built",
  "led",
  "wrote",
  "ran",
  "made",
  "found",
  "grew",
  "drove",
  "cut",
  "set",
  "won",
  "began",
  "brought",
  "caught",
  "chose",
  "came",
  "did",
  "drew",
  "fell",
  "felt",
  "fought",
  "got",
  "gave",
  "held",
  "kept",
  "knew",
  "left",
  "lost",
  "met",
  "paid",
  "put",
  "read",
  "rose",
  "said",
  "saw",
  "sold",
  "sent",
  "showed",
  "shut",
  "sang",
  "sat",
  "slept",
  "spoke",
  "spent",
  "stood",
  "stole",
  "took",
  "taught",
  "told",
  "thought",
  "threw",
  "understood",
  "wore",
  "went",
  "broke",
  "rebuilt",
  "oversaw",
  "undertook",
  "rewrote",
  "shot",
  "sought",
  "bought",
]);

const GERUND_VERBS = new Set([
  "analyzing",
  "automating",
  "building",
  "coaching",
  "coordinating",
  "creating",
  "delivering",
  "deploying",
  "designing",
  "developing",
  "documenting",
  "driving",
  "editing",
  "fixing",
  "improving",
  "implementing",
  "increasing",
  "integrating",
  "launching",
  "leading",
  "maintaining",
  "managing",
  "mentoring",
  "migrating",
  "monitoring",
  "optimizing",
  "organizing",
  "owning",
  "planning",
  "presenting",
  "reducing",
  "refactoring",
  "researching",
  "resolving",
  "reviewing",
  "scaling",
  "securing",
  "shipping",
  "simplifying",
  "standardizing",
  "streamlining",
  "supporting",
  "testing",
  "training",
  "transforming",
  "troubleshooting",
  "writing",
]);

const NON_VERB_ED = new Set([
  "bed",
  "breed",
  "creed",
  "deed",
  "exceed",
  "feed",
  "freed",
  "greed",
  "hundred",
  "indeed",
  "need",
  "proceed",
  "red",
  "reed",
  "seed",
  "shed",
  "speed",
  "succeed",
  "steed",
  "weed",
]);

const trim = (line: string, max = 110) =>
  line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;

const stripBullet = (line: string) =>
  line.replace(/^\s*(?:[-•*▪◦●]|\d+[.)])\s*/, "").trim();

const wordsOf = (line: string) => line.split(/\s+/).filter(Boolean);

const countBulletLines = (text: string) =>
  text.split("\n").map(stripBullet).filter(Boolean).length;

export const isQuantified = (line: string) => METRIC.test(line);

export function leadingWord(line: string): string {
  return (line.replace(/^[^A-Za-z]+/, "").split(/\s+/)[0] ?? "").toLowerCase();
}

function isActionWord(word: string): boolean {
  const base = word.replace(/[^a-z]/g, "");
  if (!base) return false;
  if (
    ACTION_VERBS.has(base) ||
    IRREGULAR_VERBS.has(base) ||
    GERUND_VERBS.has(base)
  ) {
    return true;
  }
  if (base.endsWith("ed") && base.length >= 4 && !NON_VERB_ED.has(base)) {
    return true;
  }
  return false;
}

function hasEvidence(line: string): boolean {
  return EVIDENCE_TERMS.test(line);
}

export type BulletAction = "strong" | "passive" | "responsibility" | "vague";

export interface BulletAnalysis {
  text: string;
  action: BulletAction;
  /** 0–3. Metrics and technical evidence can raise a bullet without being required. */
  strength: number;
  metric: boolean;
  evidence: boolean;
  /** Describes a result (reduced, improved, caught, launched…), not only an activity. */
  outcome: boolean;
  /** False for fragments such as "Built dashboard" or a bare noun list. */
  complete: boolean;
  /** A boast with no number, tool or result behind it ("expert in", "world-class"). */
  claim: boolean;
}

const ENDS_WITH_CONNECTOR =
  /\b(?:and|or|but|with|without|to|for|in|on|at|by|from|using|including|such as|via|across|through|into|over|under|about|of|the|a|an)$/i;

const NOUN_LIST =
  /^(?:[A-Za-z0-9+#./&-]+\s*(?:,\s*|\s+and\s+)){1,}[A-Za-z0-9+#./&-]+$/i;

const VERB_NOUN_LIST =
  /^[A-Za-z]+\s+[A-Za-z0-9+#./&-]+(?:\s*,\s*(?:and\s+)?[A-Za-z0-9+#./&-]+)+$/i;

const HAS_STRUCTURE =
  /\b(?:a|an|the|this|that|these|those|our|my|their|his|her|its|one|two|three|four|five|six|seven|eight|nine|ten|several|multiple|many|some|all|each|every|for|with|using|across|through|by|from|in|on|to|into|over|under|about|of|and|or)\b/i;

// "Team of 10 developers: 4 frontend, 6 backend" is useful context, but it is
// not a contribution or outcome.
const CONTEXT_ONLY =
  /^(?:team of|team size|worked (?:in|with) a team|part of a team|collaborated with a team)\b/i;

// "Built a dashboard, integrated APIs, and wrote tests" is a list of clauses
// rather than one complete contribution statement.
const IRREGULAR_VERB_PATTERN = [...IRREGULAR_VERBS].join("|");
const CLAUSE_LIST = new RegExp(
  `(?:,\\s*(?:and\\s+)?(?:[A-Za-z]{2,}(?:ed|ing)|${IRREGULAR_VERB_PATTERN})\\b[^,]*){2,}`,
  "i",
);

function isIncompleteStatement(
  text: string,
  tokens: string[],
  action: BulletAction,
  metric: boolean,
  evidence: boolean,
): boolean {
  const clean = text.trim();
  const hasAction = tokens.some(isActionWord);

  if (CONTEXT_ONLY.test(clean)) return true;
  if (tokens.length < 4) return true;
  // A short "verb + nouns" fragment such as "Built REST API integration" is
  // missing the context that makes a contribution readable.
  if (tokens.length < 6 && !HAS_STRUCTURE.test(clean) && !metric) return true;
  if (ENDS_WITH_CONNECTOR.test(clean)) return true;
  if (/[,;:]$/.test(clean)) return true;
  if (NOUN_LIST.test(clean)) return true;
  if (VERB_NOUN_LIST.test(clean)) return true;
  if (CLAUSE_LIST.test(clean)) return true;
  if (!hasAction && !metric && !evidence) return true;
  if (action === "vague" && tokens.length < 5 && !evidence) return true;
  return false;
}

function classifyAction(
  lower: string,
  tokens: string[],
  metric: boolean,
  evidence: boolean,
): BulletAction {
  if (RESPONSIBILITY_START.test(lower)) return "responsibility";
  if (PASSIVE.test(lower)) return "passive";

  const firstFive = tokens.slice(0, 5);
  if (isActionWord(tokens[0] ?? "") || firstFive.some(isActionWord)) {
    // "Managed various tasks" opens with a verb but says nothing specific.
    if (VAGUE_WORDS.test(lower) && !metric && !evidence) return "vague";
    return "strong";
  }

  if (VAGUE_WORDS.test(lower)) return "vague";
  if (tokens.length < 5 && !metric && !evidence) return "vague";
  return "vague";
}

function strengthFor(
  action: BulletAction,
  tokens: string[],
  metric: boolean,
  evidence: boolean,
  outcome: boolean,
  techHeavy = false,
  claim = false,
): number {
  const concrete =
    tokens.length >= 6 || metric || (evidence && tokens.length >= 4);

  // A bullet that is mostly tool names says what was used, not what was done.
  if (techHeavy && !metric && !outcome) return Math.min(1.5, action === "strong" ? 1.5 : 1);
  // A boast with no number or result behind it earns little.
  if (claim && !metric && !outcome) return 1;

  if (action === "strong") {
    // Full credit needs a result (a metric or an outcome word). Technical
    // detail alone shows what you did, which is good, but not what changed.
    if (metric || outcome) return 3;
    if (evidence || concrete) return 2;
    return 1.5;
  }
  if (action === "responsibility") return metric ? 2 : 1;
  if (action === "passive") return metric || evidence ? 1.5 : 1;
  return metric || (evidence && concrete) ? 1.5 : 0;
}

export function analyzeBullet(text: string): BulletAnalysis {
  const clean = stripBullet(text);
  const lower = clean.toLowerCase();
  const tokens = wordsOf(lower);
  const metric = isQuantified(clean);
  const evidence = hasEvidence(lower);
  const action = classifyAction(lower, tokens, metric, evidence);
  const complete = !isIncompleteStatement(
    clean,
    tokens,
    action,
    metric,
    evidence,
  );
  const outcome = OUTCOME.test(lower) || RESULT_CLAUSE.test(lower);
  const claim = UNSUPPORTED_CLAIM.test(lower);
  const evidenceTerms = lower.match(new RegExp(EVIDENCE_TERMS.source, "gi")) ?? [];
  const techHeavy =
    evidenceTerms.length >= 4 && evidenceTerms.length / Math.max(tokens.length, 1) > 0.4;
  const rawStrength = strengthFor(
    action,
    tokens,
    metric,
    evidence,
    outcome,
    techHeavy,
    claim,
  );

  return {
    text: clean,
    action,
    // A fragment should not earn full impact credit, even if it contains a
    // metric or a technical term.
    strength: complete ? rawStrength : Math.min(rawStrength, 1.5),
    metric,
    evidence,
    outcome,
    complete,
    claim,
  };
}

export function analyzeBullets(data: ResumeData): BulletAnalysis[] {
  return resumeBullets(data).map(analyzeBullet);
}

/* ------------------------------- dates ----------------------------------- */

const MONTH_NAMES = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

const PRESENT_WORDS = /^(?:present|current|now|ongoing|today|to date)$/i;
const EARLIEST_YEAR = 1950;

type ReadDate =
  | { state: "empty" }
  | { state: "invalid" }
  | { state: "ok"; index: number; precise: boolean };

/**
 * Reads "2022-03", "03/2022", "Mar 2022", "March 2022" and a bare "2022".
 * Anything else is "invalid", which is different from "empty": a date the
 * reader could not understand is not the same as a date that was never given.
 */
export function readDate(value: string, now: Date): ReadDate {
  const text = value.trim();
  if (!text) return { state: "empty" };
  if (PRESENT_WORDS.test(text)) {
    return { state: "ok", index: nowIndex(now), precise: true };
  }

  let year: number | null = null;
  let month: number | null = null;
  let match = text.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/);
  if (match) {
    year = Number(match[1]);
    month = Number(match[2]);
  } else if ((match = text.match(/^(\d{1,2})[/.-](\d{4})$/))) {
    month = Number(match[1]);
    year = Number(match[2]);
  } else if ((match = text.match(/^([A-Za-z]{3,9})\.?,?\s+(\d{4})$/))) {
    const found = MONTH_NAMES.indexOf(match[1].slice(0, 3).toLowerCase());
    if (found < 0) return { state: "invalid" };
    month = found + 1;
    year = Number(match[2]);
  } else if ((match = text.match(/^(\d{4})$/))) {
    year = Number(match[1]);
  } else {
    return { state: "invalid" };
  }

  if (year === null || year < EARLIEST_YEAR || year > 2200) {
    return { state: "invalid" };
  }
  if (month !== null && (month < 1 || month > 12)) return { state: "invalid" };
  return {
    state: "ok",
    index: year * 12 + (month ?? 1) - 1,
    precise: month !== null,
  };
}

function nowIndex(now: Date): number {
  return now.getFullYear() * 12 + now.getMonth();
}

interface Span {
  label: string;
  company: string;
  /** Part-time, freelance, contract… roles can legitimately overlap. */
  concurrent: boolean;
  start: ReadDate;
  end: ReadDate;
}

const CONCURRENT_WORK =
  /\b(?:part[- ]time|freelanc\w*|contract\w*|consult\w*|volunteer\w*|intern(?:ship)?|self[- ]employed|temporary|seasonal|casual|side project)\b/i;

const normalizeName = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function experienceSpans(data: ResumeData, now: Date): Span[] {
  return data.experience
    .filter((entry) => hasText(entry.company) || hasText(entry.role))
    .map((entry) => ({
      label: entry.company.trim() || entry.role.trim(),
      company: normalizeName(entry.company),
      concurrent: CONCURRENT_WORK.test(`${entry.role} ${entry.company}`),
      start: readDate(entry.startDate, now),
      end: entry.current
        ? ({ state: "ok", index: nowIndex(now), precise: true } as const)
        : readDate(entry.endDate, now),
    }));
}

interface Range extends Span {
  from: number;
  to: number;
}

function validRanges(spans: Span[]): Range[] {
  return spans
    .filter(
      (span): span is Span & {
        start: { state: "ok"; index: number; precise: boolean };
        end: { state: "ok"; index: number; precise: boolean };
      } =>
        span.start.state === "ok" &&
        span.end.state === "ok" &&
        span.end.index >= span.start.index,
    )
    .map((span) => ({ ...span, from: span.start.index, to: span.end.index }))
    .sort((a, b) => a.from - b.from);
}

/** Total years of experience, with overlapping roles counted once. */
export function experienceYears(data: ResumeData, now = new Date()): number {
  let months = 0;
  let cursor = -Infinity;
  for (const range of validRanges(experienceSpans(data, now))) {
    const from = Math.max(range.from, cursor);
    if (range.to + 1 > from) months += range.to + 1 - from;
    cursor = Math.max(cursor, range.to + 1);
  }
  return months / 12;
}

const MAX_OVERLAP_NOTES = 2;
// Two jobs sharing a month or two is a normal handover, not an error.
const TOLERATED_OVERLAP_MONTHS = 3;
const GAP_MONTHS = 6;

/**
 * Null when no role has any date to assess, so the check does not appear at
 * all rather than reporting "nothing to check".
 */
function dateCheck(data: ResumeData, now: Date): AtsCheck | null {
  const spans = experienceSpans(data, now);
  const anyDate = spans.some(
    (span) => span.start.state !== "empty" || span.end.state !== "empty",
  );
  if (spans.length === 0 || !anyDate) return null;

  const failures: string[] = [];
  const warnings: string[] = [];
  const current = nowIndex(now);

  for (const span of spans) {
    if (span.start.state === "empty") {
      warnings.push(`${span.label}: add a start date.`);
    } else if (span.start.state === "invalid") {
      warnings.push(
        `${span.label}: the start date could not be read. Use a month and year, such as Mar 2022.`,
      );
    } else if (span.start.index > current + 1) {
      warnings.push(`${span.label}: the start date is in the future.`);
    }

    if (span.start.state !== "empty" && span.end.state === "empty") {
      warnings.push(
        `${span.label}: add an end date or mark the role as current.`,
      );
    } else if (span.end.state === "invalid") {
      warnings.push(
        `${span.label}: the end date could not be read. Use a month and year, or mark the role as current.`,
      );
    } else if (span.end.state === "ok" && span.end.index > current + 1) {
      warnings.push(
        `${span.label}: the end date is in the future. Mark the role as current if it is ongoing.`,
      );
    }

    if (
      span.start.state === "ok" &&
      span.end.state === "ok" &&
      span.end.index < span.start.index
    ) {
      failures.push(`${span.label}: the end date is before the start date.`);
    }
  }

  const ranges = validRanges(spans);

  // Overlaps: only between different employers, and only when neither role is
  // the kind that is normally held alongside another job.
  const overlaps: string[] = [];
  for (let i = 0; i < ranges.length; i += 1) {
    for (let j = i + 1; j < ranges.length; j += 1) {
      const first = ranges[i];
      const second = ranges[j];
      if (second.from > first.to) continue;
      if (first.company && first.company === second.company) continue;
      if (first.concurrent || second.concurrent) continue;
      const months = Math.min(first.to, second.to) - second.from + 1;
      if (months > TOLERATED_OVERLAP_MONTHS) {
        overlaps.push(
          `${first.label} and ${second.label} overlap by ${months} months. If you held both jobs, say so (for example “part-time”); otherwise correct the dates.`,
        );
      }
    }
  }
  warnings.push(...overlaps.slice(0, MAX_OVERLAP_NOTES));

  // Track the furthest end seen so overlapping roles do not create false gaps.
  let maxEnd = -Infinity;
  for (const range of ranges) {
    if (maxEnd >= 0) {
      const gap = range.from - maxEnd - 1;
      if (gap > GAP_MONTHS) {
        warnings.push(
          `${gap}-month gap before ${range.label}. Recruiters notice this, so mention what you did (study, freelance, caregiving).`,
        );
      }
    }
    maxEnd = Math.max(maxEnd, range.to);
  }

  const status: AtsStatus = failures.length
    ? "fail"
    : warnings.length
      ? "warn"
      : "pass";

  return {
    id: "dates",
    label: "Dates and career timeline",
    status,
    detail:
      status === "pass"
        ? "Dates are complete and consistent, with no unexplained gaps."
        : status === "fail"
          ? "One or more roles have impossible dates. Fix the order before applying."
          : "Some dates are missing or unclear, roles overlap, or the timeline has a gap. Complete them or explain the gap.",
    weight: 0,
    category: "structure",
    examples: [...failures, ...warnings].slice(0, MAX_EXAMPLES + 1),
  };
}

/* ------------------------------ bullet checks ----------------------------- */

function outcomesCheck(
  analyses: BulletAnalysis[],
  roleCount: number,
  emptyRoles: string[],
): AtsCheck {
  if (analyses.length === 0) {
    return {
      id: "outcomes",
      label: "Specific contributions and outcomes",
      status: "fail",
      detail:
        roleCount > 0
          ? "Your roles have no achievement bullets. Add what you built, changed, or improved under each role."
          : "There are no achievement bullets. Add contributions under your roles or projects so outcomes can be assessed.",
      weight: 0,
      category: "experience",
      examples: emptyRoles.slice(0, MAX_EXAMPLES),
    };
  }

  const total = analyses.length;
  const average =
    analyses.reduce((sum, item) => sum + item.strength, 0) / total;
  // A concrete contribution counts even without a metric; technical evidence
  // raises a bullet further but is not required.
  const strong = analyses.filter((item) => item.strength >= 2).length;
  const withMetrics = analyses.filter((item) => item.metric).length;
  const withEvidence = analyses.filter((item) => item.evidence).length;
  const weak = analyses.filter((item) => item.strength < 1.5);

  const withResults = analyses.filter((item) => item.metric || item.outcome).length;
  // Passing needs real results: at least a third of bullets say what changed.
  const baseStatus: AtsStatus =
    average >= 2.2 && strong / total >= 0.6 && withResults / total >= 0.3
      ? "pass"
      : average >= 1.3
        ? "warn"
        : "fail";
  // A project-heavy resume can otherwise hide an empty work role. Any role
  // with no achievement bullets is a real gap in "experience and achievements".
  const status: AtsStatus = emptyRoles.length > 0 ? "fail" : baseStatus;

  const detail =
    emptyRoles.length > 0
      ? `${emptyRoles.length} role${emptyRoles.length === 1 ? "" : "s"} have no achievement bullets. Add what you built, changed, or improved under each role. ${strong} of ${total} bullets outside those roles state a concrete contribution.`
      : baseStatus === "pass"
        ? `${strong} of ${total} bullets state a concrete contribution; ${withMetrics} include a credible metric and ${withEvidence} show technical or operational evidence.`
        : baseStatus === "warn"
          ? `${strong} of ${total} bullets state what you did, but only ${withResults} say what changed as a result. Recruiters look for impact: add the outcome (faster, fewer bugs, more users, time saved) with a real number where you have one.`
          : `Few bullets describe a specific contribution. State what you did, what changed, or what you implemented. Technical evidence and outcomes count even without percentages.`;

  return {
    id: "outcomes",
    label: "Specific contributions and outcomes",
    status,
    detail,
    weight: 0,
    category: "experience",
    examples:
      status === "pass"
        ? undefined
        : [
            ...emptyRoles.map((role) => `${role}: no achievement bullets.`),
            ...weak.map((item) => trim(item.text)),
          ].slice(0, MAX_EXAMPLES),
  };
}

function actionCheck(
  analyses: BulletAnalysis[],
  roleCount: number,
  emptyRoles: string[],
): AtsCheck {
  if (analyses.length === 0) {
    return {
      id: "action",
      label: "Action and ownership",
      status: "fail",
      detail:
        roleCount > 0
          ? "Your roles have no bullets, so there is no action or ownership to assess. Add achievement statements."
          : "There are no bullets to assess for action and ownership.",
      weight: 0,
      category: "experience",
      examples: emptyRoles.slice(0, MAX_EXAMPLES),
    };
  }

  const total = analyses.length;
  const strong = analyses.filter((item) => item.action === "strong").length;
  const passive = analyses.filter((item) => item.action === "passive");
  const responsibility = analyses.filter(
    (item) => item.action === "responsibility",
  );
  const vague = analyses.filter((item) => item.action === "vague");
  const strongRatio = strong / total;

  const baseStatus: AtsStatus =
    strongRatio >= 0.6 ? "pass" : strongRatio >= 0.3 ? "warn" : "fail";
  const status: AtsStatus = emptyRoles.length > 0 ? "fail" : baseStatus;

  const examples = [
    ...emptyRoles.map((role) => `${role}: no achievement bullets.`),
    ...passive.slice(0, 1).map((item) => `Passive: “${trim(item.text)}”`),
    ...responsibility
      .slice(0, 1)
      .map((item) => `Responsibility: “${trim(item.text)}”`),
    ...vague.slice(0, 1).map((item) => `Vague: “${trim(item.text)}”`),
  ].slice(0, MAX_EXAMPLES);

  return {
    id: "action",
    label: "Action and ownership",
    status,
    detail:
      emptyRoles.length > 0
        ? `${emptyRoles.length} role${emptyRoles.length === 1 ? "" : "s"} have no achievement bullets. ${strong} of ${total} bullets outside those roles read as strong action statements.`
        : baseStatus === "pass"
          ? `${strong} of ${total} bullets read as strong action statements.`
          : `${strong} strong action statements, ${passive.length} passive descriptions, ${responsibility.length} responsibilities without outcomes, and ${vague.length} vague bullets. Lead with what you did, or use a clear subject-plus-action sentence.`,
    weight: 0,
    category: "experience",
    examples: status === "pass" ? undefined : examples,
  };
}

function metricsCheck(analyses: BulletAnalysis[]): AtsCheck | null {
  if (analyses.length === 0) return null;

  const withMetrics = analyses.filter((item) => item.metric).length;
  const without = analyses.filter((item) => !item.metric);
  // Short resumes only need one real number; longer ones need two.
  const needed = analyses.length <= 4 ? 1 : 2;

  return {
    id: "metrics",
    label: "Credible metrics",
    status: withMetrics >= needed ? "pass" : "warn",
    detail:
      withMetrics >= needed
        ? `${withMetrics} of ${analyses.length} bullets include a credible metric.`
        : withMetrics === 1
          ? `Only 1 of ${analyses.length} bullets has a measurable result. Aim for at least two or three real numbers (percentages, time saved, users, requests). Counts like “5 apps” or “team of 10” describe scope, not impact.`
          : `None of your ${analyses.length} bullets has a measurable result. Add real numbers where you have them: load time, bugs fixed, users, requests, time saved. Counts like “5 apps” or “team of 10” describe scope, not impact. Do not invent figures.`,
    weight: 0,
    category: "experience",
    examples: withMetrics >= needed ? undefined : without.slice(0, MAX_EXAMPLES).map((item) => trim(item.text)),
  };
}

function bulletQualityChecks(analyses: BulletAnalysis[]): AtsCheck[] {
  if (analyses.length === 0) return [];

  const bullets = analyses.map((item) => item.text);
  const weak = analyses.filter(
    (item) => WEAK_PHRASES.test(item.text) || item.claim,
  );
  const weakRatio = weak.length / analyses.length;

  const wordCount = (line: string) => wordsOf(line).length;
  const tooShort = bullets.filter((line) => wordCount(line) < 6);
  const tooLong = bullets.filter((line) => wordCount(line) > 35);

  const counts = new Map<string, number>();
  for (const line of bullets) {
    const word = leadingWord(line);
    if (word) counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  const repeated = [...counts.entries()]
    .filter(
      ([, count]) =>
        count >= 3 && (count >= 4 || count / analyses.length >= 0.4),
    )
    .sort((a, b) => b[1] - a[1]);

  const incomplete = analyses.filter((item) => !item.complete);
  const incompleteRatio = incomplete.length / analyses.length;

  return [
    {
      id: "weak-phrases",
      label: "Specific, confident wording",
      status: weak.length === 0 ? "pass" : weakRatio >= 0.3 ? "fail" : "warn",
      detail:
        weak.length === 0
          ? "Bullets avoid vague phrases like “responsible for” and “worked on”."
          : `${weak.length} of ${analyses.length} bullets use vague phrases such as “responsible for”, “worked on” or “helped”, or boast without evidence. State what you did and what changed instead.`,
      weight: 0,
      category: "content",
      examples: weak.slice(0, MAX_EXAMPLES).map((item) => trim(item.text)),
    },
    {
      id: "bullet-length",
      label: "Bullet length",
      status: tooShort.length + tooLong.length === 0 ? "pass" : "warn",
      detail:
        tooShort.length + tooLong.length === 0
          ? "Bullets are a readable length (about one or two lines)."
          : `${tooShort.length} bullets are very short (under 6 words) and ${tooLong.length} are long (over 35 words). Aim for one or two lines each.`,
      weight: 0,
      category: "content",
      examples: [...tooShort, ...tooLong]
        .slice(0, MAX_EXAMPLES)
        .map((line) => trim(line)),
    },
    {
      id: "sentence-completeness",
      label: "Complete, readable statements",
      status:
        incomplete.length === 0
          ? "pass"
          : incompleteRatio >= 0.3
            ? "fail"
            : "warn",
      detail:
        incomplete.length === 0
          ? "Bullets read as complete contribution statements rather than fragments."
          : `${incomplete.length} of ${analyses.length} bullets look like fragments: they are very short, end on a connector, or are only a noun list. Rewrite them as complete statements, for example “Built a payments dashboard that cut manual reconciliation work.” Add a number only if you know the real one.`,
      weight: 0,
      category: "content",
      examples: incomplete
        .slice(0, MAX_EXAMPLES)
        .map((item) => trim(item.text)),
    },
    {
      id: "verb-variety",
      label: "Varied opening words",
      status: repeated.length === 0 ? "pass" : "warn",
      detail:
        repeated.length === 0
          ? "Bullets open with a good mix of words."
          : "Several bullets open with the same word, which reads as repetitive.",
      weight: 0,
      category: "content",
      examples: repeated
        .slice(0, MAX_EXAMPLES)
        .map(([word, count]) => `“${word}” starts ${count} bullets`),
    },
  ];
}

function roleBulletCheck(data: ResumeData): AtsCheck | null {
  const roles = data.experience.filter(
    (entry) => hasText(entry.company) || hasText(entry.role),
  );
  if (roles.length === 0) return null;

  const empty = roles.filter(
    (entry) => countBulletLines(entry.description) === 0,
  );
  const thin = roles.filter((entry) => {
    const count = countBulletLines(entry.description);
    return count > 0 && count < 2;
  });
  const heavy = roles.filter(
    (entry) => countBulletLines(entry.description) > 8,
  );

  const examples = [
    ...empty.map(
      (entry) => `${entry.company || entry.role}: no achievements listed.`,
    ),
    ...thin.map(
      (entry) =>
        `${entry.company || entry.role}: only one bullet. Add at least two or three.`,
    ),
    ...heavy.map(
      (entry) =>
        `${entry.company || entry.role}: more than 8 bullets. Keep the strongest 4–6.`,
    ),
  ];
  const status: AtsStatus = empty.length
    ? "fail"
    : examples.length
      ? "warn"
      : "pass";

  return {
    id: "role-bullets",
    label: "Achievements under each role",
    status,
    detail:
      status === "pass"
        ? "Each role has a focused set of achievements."
        : empty.length > 0
          ? `${empty.length} role${empty.length === 1 ? "" : "s"} have no achievement bullets. Add at least two or three contributions under each role.`
          : "Some roles have too many or too few achievements.",
    weight: 0,
    category: "experience",
    examples: examples.slice(0, MAX_EXAMPLES),
  };
}

function clicheCheck(data: ResumeData): AtsCheck {
  const sources = [data.summary, ...resumeBullets(data)];
  const hits = sources
    .map((text) => text.match(CLICHES)?.[0])
    .filter((hit): hit is string => Boolean(hit));
  const unique = [...new Set(hits.map((hit) => hit.toLowerCase()))];
  return {
    id: "cliches",
    label: "No empty buzzwords",
    status: unique.length === 0 ? "pass" : "warn",
    detail:
      unique.length === 0
        ? "No overused buzzwords. Claims are backed by specifics."
        : "Buzzwords like these say nothing a recruiter can verify. Replace them with a result, a tool, or a fact.",
    weight: 0,
    category: "content",
    examples: unique.slice(0, MAX_EXAMPLES).map((word) => `“${word}”`),
  };
}

function placeholderCheck(data: ResumeData): AtsCheck {
  const text = resumeText(data);
  const matches = [
    ...text.matchAll(new RegExp(PLACEHOLDER_PATTERN.source, "gi")),
    ...text.matchAll(new RegExp(EXPLICIT_PLACEHOLDER.source, "g")),
  ].map((match) => match[0].trim());
  const unique = [...new Set(matches)];

  return {
    id: "unresolved-placeholders",
    label: "No unresolved placeholder text",
    status: unique.length === 0 ? "pass" : "fail",
    detail:
      unique.length === 0
        ? "No bracketed instructions, TODOs, or sample text remain."
        : `${unique.length} placeholder${unique.length === 1 ? "" : "s"} remain in the resume. Replace bracketed prompts and TODO text with real content before sending it.`,
    weight: 0,
    category: "content",
    examples: unique.slice(0, MAX_EXAMPLES),
  };
}

/**
 * Which listed skills the resume actually shows in its summary, roles,
 * projects or certifications. The CV check uses it for its verdict, and the
 * "remove unevidenced skills" fix uses the same list.
 */
export function skillEvidence(data: ResumeData): {
  skills: string[];
  supported: string[];
  unsupported: string[];
} {
  const skills = [
    ...skillItems(data.skills.languages),
    ...skillItems(data.skills.technologies),
    ...skillItems(data.skills.databases),
  ];
  if (skills.length === 0) return { skills, supported: [], unsupported: [] };

  const corpus = normalizeTerm(
    [
      ...data.experience.flatMap((entry) => [entry.role, entry.description]),
      ...data.projects.flatMap((entry) => [entry.title, entry.description]),
      ...data.certifications.flatMap((entry) => [entry.name, entry.issuer]),
    ].join("\n"),
  );

  const escape = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const supported = skills.filter((skill) => {
    const term = normalizeTerm(skill);
    const aliases = SKILL_ALIASES.get(term) ?? [term];
    return aliases.some((alias) => {
      if (!alias) return false;
      if (alias.length <= 3) {
        return new RegExp(
          `(^|[^a-z0-9+#])${escape(alias)}($|[^a-z0-9+#])`,
        ).test(corpus);
      }
      return corpus.includes(alias);
    });
  });
  return {
    skills,
    supported,
    unsupported: skills.filter((skill) => !supported.includes(skill)),
  };
}

function skillsEvidenceCheck(data: ResumeData): AtsCheck | null {
  const { skills, supported, unsupported } = skillEvidence(data);
  if (skills.length === 0) return null;

  const ratio = supported.length / skills.length;

  const status: AtsStatus =
    supported.length === 0 ? "fail" : ratio >= 0.8 ? "pass" : "warn";

  return {
    id: "skills-evidence",
    label: "Skills backed by experience and projects",
    status,
    detail:
      status === "pass"
        ? `${supported.length} of ${skills.length} listed skills appear in your experience or projects.`
        : `${supported.length} of ${skills.length} listed skills appear in your experience or projects. Show where you used the others, or remove skills you cannot evidence.`,
    weight: 0,
    category: "skills",
    examples: status === "pass" ? undefined : unsupported.slice(0, 6),
  };
}

/**
 * All content-quality checks that apply to this resume. A check that has nothing
 * to assess returns null and is left out, and anything that does not satisfy
 * the shared `AtsCheck` contract is dropped rather than reaching the score.
 */
export function qualityChecks(data: ResumeData, now = new Date()): AtsCheck[] {
  const analyses = analyzeBullets(data);
  const roles = data.experience.filter(
    (entry) => hasText(entry.company) || hasText(entry.role),
  );
  const emptyRoles = roles
    .filter((entry) => countBulletLines(entry.description) === 0)
    .map((entry) => entry.company.trim() || entry.role.trim());

  const candidates: Array<AtsCheck | null> = [
    outcomesCheck(analyses, roles.length, emptyRoles),
    actionCheck(analyses, roles.length, emptyRoles),
    metricsCheck(analyses),
    ...bulletQualityChecks(analyses),
    roleBulletCheck(data),
    dateCheck(data, now),
    clicheCheck(data),
    placeholderCheck(data),
    skillsEvidenceCheck(data),
  ];

  return withWeights(
    candidates.filter(
      (check): check is AtsCheck => check !== null && isValidCheck(check),
    ),
  );
}
