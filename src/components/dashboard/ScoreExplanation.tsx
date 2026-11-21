import Link from "next/link";
import type { AtsReport, AtsStatus } from "@/lib/ats-types";

const points = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

const STATUS_STYLE: Record<AtsStatus, string> = {
  pass: "bg-emerald-50 text-emerald-700",
  warn: "bg-amber-50 text-amber-700",
  fail: "bg-red-50 text-red-700",
  info: "bg-slate-100 text-slate-600",
};

const STATUS_LABEL: Record<AtsStatus, string> = {
  pass: "Pass",
  warn: "Improve",
  fail: "Fix",
  info: "Note",
};

function tone(score: number | null) {
  if (score === null) return "text-slate-500";
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

/**
 * The three assessments, side by side and never averaged: how good the resume
 * is, whether the file reads reliably, and (on its own page) how well it fits
 * one job.
 */
export function AssessmentCards({ report }: { report: AtsReport }) {
  return (
    <section
      aria-label="Three separate assessments"
      className="grid gap-3 md:grid-cols-3"
    >
      <article className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          General quality
        </p>
        <p className={`mt-1 text-3xl font-bold ${tone(report.quality.score)}`}>
          {report.quality.score}
          <span className="text-base font-semibold text-slate-500">/100</span>
        </p>
        <p className="text-sm font-medium text-slate-800">
          {report.quality.verdict}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Structure, completeness, clarity and achievements.
        </p>
      </article>

      <article className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Document compatibility
        </p>
        <p className={`mt-1 text-3xl font-bold ${tone(report.document.score)}`}>
          {report.document.score === null ? "–" : report.document.score}
          {report.document.score !== null && (
            <span className="text-base font-semibold text-slate-500">/100</span>
          )}
        </p>
        <p className="text-sm font-medium text-slate-800">
          {report.document.verdict}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Whether the exported file can be read reliably by a parser. Scored
          separately from quality.
        </p>
      </article>

      <article className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Job compatibility
        </p>
        <p className="mt-1 text-3xl font-bold text-slate-400">–</p>
        <p className="text-sm font-medium text-slate-800">
          Needs a job description
        </p>
        <p className="mt-1 text-xs text-slate-500">
          How well this resume matches one posting.{" "}
          <Link
            href="/dashboard/job-match"
            className="font-semibold text-slate-700 underline"
          >
            Match to a job
          </Link>
        </p>
      </article>
    </section>
  );
}

/** Which checks raised or lowered the quality score, and by how much. */
export function ScoreExplanation({ report }: { report: AtsReport }) {
  const losses = report.breakdown.filter((item) => item.lost > 0).slice(0, 8);
  const earnedTotal = report.breakdown.reduce(
    (sum, item) => sum + item.earned,
    0,
  );
  const possibleTotal = report.breakdown.reduce(
    (sum, item) => sum + item.possible,
    0,
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-900">
        How your score was made
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        {points(earnedTotal)} of {points(possibleTotal)} points earned
        {report.rawScore !== report.score
          ? `, then held at ${report.score} by the limit below`
          : ""}
        . Optional details, such as phone, location and profile links, never
        change it.
      </p>

      {report.capDetails.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {report.capDetails.map((cap) => (
            <li key={cap.id}>
              <strong>Limit of {cap.max}:</strong> {cap.reason}
            </li>
          ))}
        </ul>
      )}

      {losses.length === 0 ? (
        <p className="mt-3 text-sm text-emerald-700">
          No points were lost on any check.
        </p>
      ) : (
        <>
          <h3 className="mt-4 text-sm font-semibold text-slate-800">
            What cost the most
          </h3>
          <ul className="mt-2 divide-y divide-slate-100">
            {losses.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[item.status]}`}
                  >
                    {STATUS_LABEL[item.status]}
                  </span>
                  <span className="truncate text-slate-800">{item.label}</span>
                </span>
                <span className="shrink-0 tabular-nums text-slate-600">
                  −{points(item.lost)} of {points(item.possible)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
