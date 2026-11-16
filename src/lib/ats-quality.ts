import { ACTION_VERBS } from "./ats-data";
import { normalizeTerm, SKILL_ALIASES } from "./ats-skills";
import { hasText, resumeBullets, resumeText, skillItems } from "./ats-text";
import type { AtsCheck, AtsStatus } from "./ats";
import type { ResumeData } from "./resume-schema";

/**
 * Content-quality checks. These look at what the resume actually says, not only
 * whether a section exists. The emphasis is on evidence: a concrete contribution
 * can be valuable without a percentage, and technical work counts as impact.
 */

const MAX_EXAMPLES = 3;

const WEAK_PHRASES =
  /\b(responsible for|duties (included|include)|worked on|helped (to |with )?|assisted (with|in)|involved in|participated in|tasked with|contributed to|various|etc\.?|and more)\b/i;

const CLICHES =
  /\b(hard[- ]?working|team player|results[- ]driven|detail[- ]oriented|self[- ]motivated|go[- ]getter|fast learner|quick learner|passionate about|dynamic|synergy|think outside the box|excellent communication skills|strong work ethic|highly motivated)\b/i;

/**
 * Placeholder or instruction text that should never be sent to an employer.
 * The builder and job-match tool use bracketed prompt text; users sometimes
 * leave it in the document.
 */
const PLACEHOLDER_PATTERN =
  /\[[^\]]*(?:add|insert|replace|your|metric|result|query|todo|tbd|example|company|role|date)[^\]]*\]|\b(?:lorem ipsum|add a measurable result|one real sql query)\b/gi;

// Keep TODO/TBD/FIXME case-sensitive so a legitimate "Todo app" project does
// not fail the check.
const EXPLICIT_PLACEHOLDER = /\b(?:TODO|TBD|FIXME)\b/g;

// A figure that says something about scale or impact. A bare year such as
// "2023" is a date, not a result.
const METRIC =
  /(\d+(\.\d+)?\s?%|[$£€₦]\s?\d|\b\d+(\.\d+)?\s?[kKmMbB]\b|\b\d+x\b|\b\d{1,3}(,\d{3})+\b|\b(?!(19|20)\d{2}\b)\d+\+?\b)/;

/**
 * Concrete technical or operational evidence. These terms count as impact even
 * when the bullet has no percentage: implementing a feature, integrating a
 * service, fixing a bottleneck and adding tests are all meaningful outcomes.
 */
const EVIDENCE_TERMS =
  /\b(?:api|apis|endpoint|endpoints|database|databases|schema|service|services|microservices?|architecture|pipeline|pipelines|ci\/cd|deployment|deployments|docker|kubernetes|aws|azure|gcp|cloud|server|servers|backend|frontend|react|next\.?js|typescript|javascript|python|node\.?js|sql|postgres(?:ql)?|mysql|mongodb|redis|graphql|rest|grpc|webhook|webhooks|queue|queues|cache|caching|authentication|oauth|authorization|security|encryption|tests?|testing|unit tests?|integration tests?|code review|refactor|refactoring|migration|migrations|performance|latency|throughput|accessibility|responsive|component|components|library|libraries|design system|feature|features|integration|integrations|automation|automated|script|scripts|framework|frameworks|process|workflow|workflows|campaign|campaigns|curriculum|patients?|students?|clients?|customers?|invoices?|compliance|audit|audits|budget|budgets|forecast|forecasting|contract|contracts|supply chain|inventory|logistics|policy|policies|training|program|programs|event|events|reports?|analysis|research|stakeholders?|vendors?|operations|revenue|cost|costs|sales|marketing)\b/i;

const PASSIVE =
  /\b(?:was|were|is|are|been|being|be)\s+(?:\w+ly\s+)?(?:\w+(?:ed|en)|built|written|made|done|run|led|held|sent|kept|found|given|taken|seen|shown|deployed|managed|used)\b/i;

const RESPONSIBILITY_START =
  /^(?:responsible for|duties (?:included|include)|worked on|helped (?:to|with)?|assisted (?:with|in)|involved in|participated in|tasked with|contributed to)\b/i;

const VAGUE_WORDS =
  /\b(?:various|etc\.?|and more|stuff|things|tasks|responsibilities|duties)\b/i;

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
  text
    .split("\n")
    .map(stripBullet)
    .filter(Boolean).length;

export const isQuantified = (line: string) => METRIC.test(line);

export function leadingWord(line: string): string {
  return (line.replace(/^[^A-Za-z]+/, "").split(/\s+/)[0] ?? "").toLowerCase();
}

function isActionWord(word: string): boolean {
  const base = word.replace(/[^a-z]/g, "");
  if (!base) return false;
  if (ACTION_VERBS.has(base) || IRREGULAR_VERBS.has(base) || GERUND_VERBS.has(base)) {
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
  /** False for fragments such as "Built dashboard" or a bare noun list. */
  complete: boolean;
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
): number {
  const concrete = tokens.length >= 6 || metric || (evidence && tokens.length >= 4);

  if (action === "strong") {
    if (metric || evidence) return 3;
    if (concrete) return 2;
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
  const rawStrength = strengthFor(action, tokens, metric, evidence);

  return {
    text: clean,
    action,
    // A fragment should not earn full impact credit, even if it contains a
    // metric or a technical term.
    strength: complete ? rawStrength : Math.min(rawStrength, 1.5),
    metric,
    evidence,
    complete,
  };
}

export function analyzeBullets(data: ResumeData): BulletAnalysis[] {
  return resumeBullets(data).map(analyzeBullet);
}

/* ------------------------------- dates ----------------------------------- */

function monthIndex(value: string): number | null {
  const match = value.trim().match(/^(\d{4})(?:-(\d{1,2}))?/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) : 1;
  if (!Number.isInteger(year) || month < 1 || month > 12) return null;
  return year * 12 + month - 1;
}

function nowIndex(now: Date): number {
  return now.getFullYear() * 12 + now.getMonth();
}

interface Span {
  label: string;
  start: number | null;
  end: number | null;
}

function experienceSpans(data: ResumeData, now: Date): Span[] {
  return data.experience
    .filter((entry) => hasText(entry.company) || hasText(entry.role))
    .map((entry) => ({
      label: entry.company.trim() || entry.role.trim(),
      start: monthIndex(entry.startDate),
      end: entry.current ? nowIndex(now) : monthIndex(entry.endDate),
    }));
}

/** Total months of experience, with overlapping roles counted once. */
export function experienceYears(data: ResumeData, now = new Date()): number {
  const spans = experienceSpans(data, now)
    .filter(
      (span): span is Span & { start: number; end: number } =>
        span.start !== null && span.end !== null && span.end >= span.start,
    )
    .sort((a, b) => a.start - b.start);

  let months = 0;
  let cursor = -Infinity;
  for (const span of spans) {
    const from = Math.max(span.start, cursor);
    if (span.end + 1 > from) months += span.end + 1 - from;
    cursor = Math.max(cursor, span.end + 1);
  }
  return months / 12;
}

function dateCheck(data: ResumeData, now: Date): AtsCheck {
  const spans = experienceSpans(data, now);
  if (spans.length === 0) {
    return {
      id: "dates",
      label: "Dates and career timeline",
      status: "info",
      detail: "No dated roles to assess yet. Add start and end dates when you add experience.",
      weight: 5,
      category: "structure",
    };
  }

  const failures: string[] = [];
  const warnings: string[] = [];
  const current = nowIndex(now);

  for (const span of spans) {
    if (span.start === null) {
      warnings.push(`${span.label}: add a start date.`);
    } else if (span.start > current + 1) {
      warnings.push(`${span.label}: the start date is in the future.`);
    }
    if (span.start !== null && span.end === null) {
      warnings.push(`${span.label}: add an end date or mark the role as current.`);
    }
    if (span.start !== null && span.end !== null && span.end < span.start) {
      failures.push(`${span.label}: the end date is before the start date.`);
    }
  }

  const dated = spans
    .filter(
      (span): span is Span & { start: number; end: number } =>
        span.start !== null && span.end !== null && span.end >= span.start,
    )
    .sort((a, b) => a.start - b.start);

  // Track the furthest end seen so overlapping roles do not create false gaps.
  let maxEnd = -Infinity;
  for (const span of dated) {
    if (maxEnd >= 0) {
      const gap = span.start - maxEnd - 1;
      if (gap > 6) {
        warnings.push(
          `${gap}-month gap before ${span.label}. Recruiters notice this, so mention what you did (study, freelance, caregiving).`,
        );
      }
    }
    maxEnd = Math.max(maxEnd, span.end);
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
          : "Some dates are missing or the timeline has a gap. Complete them or explain the gap.",
    weight: 5,
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
      weight: 8,
      category: "experience",
      examples: emptyRoles.slice(0, MAX_EXAMPLES),
    };
  }

  const total = analyses.length;
  const average = analyses.reduce((sum, item) => sum + item.strength, 0) / total;
  // A concrete contribution counts even without a metric; technical evidence
  // raises a bullet further but is not required.
  const strong = analyses.filter((item) => item.strength >= 2).length;
  const withMetrics = analyses.filter((item) => item.metric).length;
  const withEvidence = analyses.filter((item) => item.evidence).length;
  const weak = analyses.filter((item) => item.strength < 1.5);

  const baseStatus: AtsStatus =
    average >= 1.8 && strong / total >= 0.6
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
          ? `${strong} of ${total} bullets state a concrete contribution. The rest are general or responsibility-only. Add what you built, changed, or improved. Metrics help but are optional.`
          : `Few bullets describe a specific contribution. State what you did, what changed, or what you implemented. Technical evidence and outcomes count even without percentages.`;

  return {
    id: "outcomes",
    label: "Specific contributions and outcomes",
    status,
    detail,
    weight: 8,
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
      weight: 3,
      category: "experience",
      examples: emptyRoles.slice(0, MAX_EXAMPLES),
    };
  }

  const total = analyses.length;
  const strong = analyses.filter((item) => item.action === "strong").length;
  const passive = analyses.filter((item) => item.action === "passive");
  const responsibility = analyses.filter((item) => item.action === "responsibility");
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
    weight: 3,
    category: "experience",
    examples: status === "pass" ? undefined : examples,
  };
}

function metricsCheck(analyses: BulletAnalysis[]): AtsCheck {
  if (analyses.length === 0) {
    return {
      id: "metrics",
      label: "Credible metrics",
      status: "info",
      detail: "Metrics are optional. Add bullets first; numbers can come later.",
      weight: 2,
      category: "experience",
    };
  }

  const withMetrics = analyses.filter((item) => item.metric).length;
  const withEvidence = analyses.filter((item) => item.evidence).length;

  return {
    id: "metrics",
    label: "Credible metrics",
    status: withMetrics > 0 ? "pass" : withEvidence > 0 ? "info" : "warn",
    detail:
      withMetrics > 0
        ? `${withMetrics} of ${analyses.length} bullets include a credible metric.`
        : withEvidence > 0
          ? "No numbers found, but your bullets already show technical or operational evidence. Metrics are optional; add them when they are real."
          : "No numbers found. That is not a failure: implemented features, integrations, performance improvements, tests, and other technical evidence also demonstrate impact. Add metrics only when they are real.",
    weight: 2,
    category: "experience",
  };
}

function bulletQualityChecks(analyses: BulletAnalysis[]): AtsCheck[] {
  if (analyses.length === 0) {
    return [
      {
        id: "weak-phrases",
        label: "Specific, confident wording",
        status: "info",
        detail: "Add bullets before wording can be assessed.",
        weight: 3,
        category: "content",
      },
      {
        id: "bullet-length",
        label: "Bullet length",
        status: "info",
        detail: "Add bullets before length can be assessed.",
        weight: 2,
        category: "content",
      },
      {
        id: "sentence-completeness",
        label: "Complete, readable statements",
        status: "info",
        detail: "Add bullets before sentence completeness can be assessed.",
        weight: 5,
        category: "content",
      },
      {
        id: "verb-variety",
        label: "Varied opening words",
        status: "info",
        detail: "Add bullets before variety can be assessed.",
        weight: 1,
        category: "content",
      },
    ];
  }

  const bullets = analyses.map((item) => item.text);
  const weak = analyses.filter((item) => WEAK_PHRASES.test(item.text));
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
    .filter(([, count]) => count >= 3)
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
          : `${weak.length} of ${analyses.length} bullets use vague phrases such as “responsible for”, “worked on” or “helped”. State what you did and what changed instead.`,
      weight: 3,
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
      weight: 2,
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
          : `${incomplete.length} of ${analyses.length} bullets look like fragments: they are very short, end on a connector, or are only a noun list. Rewrite them as complete statements, for example “Built a payments dashboard that reduced manual reconciliation by 30%.”`,
      weight: 5,
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
      weight: 1,
      category: "content",
      examples: repeated
        .slice(0, MAX_EXAMPLES)
        .map(([word, count]) => `“${word}” starts ${count} bullets`),
    },
  ];
}

function roleBulletCheck(data: ResumeData): AtsCheck {
  const roles = data.experience.filter(
    (entry) => hasText(entry.company) || hasText(entry.role),
  );
  if (roles.length === 0) {
    return {
      id: "role-bullets",
      label: "Achievements under each role",
      status: "info",
      detail: "No work roles to assess yet.",
      weight: 2,
      category: "experience",
    };
  }

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
    ...empty.map((entry) => `${entry.company || entry.role}: no achievements listed.`),
    ...thin.map(
      (entry) => `${entry.company || entry.role}: only one bullet. Add at least two or three.`,
    ),
    ...heavy.map(
      (entry) => `${entry.company || entry.role}: more than 8 bullets. Keep the strongest 4–6.`,
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
    weight: 3,
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
    status: unique.length === 0 ? "pass" : unique.length >= 3 ? "fail" : "warn",
    detail:
      unique.length === 0
        ? "No overused buzzwords. Claims are backed by specifics."
        : "Buzzwords like these say nothing a recruiter can verify. Replace them with a result, a tool, or a fact.",
    weight: 1,
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
    weight: 5,
    category: "content",
    examples: unique.slice(0, MAX_EXAMPLES),
  };
}

function skillsEvidenceCheck(data: ResumeData): AtsCheck {
  const skills = [
    ...skillItems(data.skills.languages),
    ...skillItems(data.skills.technologies),
    ...skillItems(data.skills.databases),
  ];
  if (skills.length === 0) {
    return {
      id: "skills-evidence",
      label: "Skills backed by experience and projects",
      status: "info",
      detail: "Add skills to assess whether they are demonstrated in your work.",
      weight: 11,
      category: "skills",
    };
  }

  const corpus = normalizeTerm(
    [
      data.summary,
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
  const unsupported = skills.filter((skill) => !supported.includes(skill));
  const ratio = supported.length / skills.length;

  const status: AtsStatus =
    supported.length === 0 ? "fail" : ratio >= 0.6 ? "pass" : "warn";

  return {
    id: "skills-evidence",
    label: "Skills backed by experience and projects",
    status,
    detail:
      status === "pass"
        ? `${supported.length} of ${skills.length} listed skills appear in your experience or projects.`
        : `${supported.length} of ${skills.length} listed skills appear in your experience or projects. Show where you used the others, or remove skills you cannot evidence.`,
    weight: 11,
    category: "skills",
    examples: status === "pass" ? undefined : unsupported.slice(0, 6),
  };
}

/** All content-quality checks that apply to this resume. */
export function qualityChecks(data: ResumeData, now = new Date()): AtsCheck[] {
  const analyses = analyzeBullets(data);
  const roles = data.experience.filter(
    (entry) => hasText(entry.company) || hasText(entry.role),
  );
  const emptyRoles = roles
    .filter((entry) => countBulletLines(entry.description) === 0)
    .map((entry) => entry.company.trim() || entry.role.trim());

  return [
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
}
