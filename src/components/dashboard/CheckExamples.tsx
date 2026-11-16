import type { AtsReport } from "@/lib/ats";

/** The exact resume lines or items that caused a check to flag. */
export function CheckExamples({ examples }: { examples?: string[] }) {
  if (!examples || examples.length === 0) return null;
  return (
    <ul className="mt-1.5 space-y-1">
      {examples.map((example) => (
        <li
          key={example}
          className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-700"
        >
          {example}
        </li>
      ))}
    </ul>
  );
}

/** Explains genuine blockers that hold the score below the weighted result. */
export function ScoreCaps({ report }: { report: AtsReport }) {
  if (report.caps.length === 0) return null;
  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <p className="font-semibold">
        Critical blocker: score held at {report.score}
        {report.rawScore !== report.score
          ? ` (weighted checks alone would give ${report.rawScore})`
          : ""}
      </p>
      <ul className="mt-1 list-disc pl-4">
        {report.caps.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </div>
  );
}

export const SCORE_NOTE =
  "This is an internal resume-quality assessment, not an ATS pass prediction. No ATS publishes a score. It reviews structure, evidence, clarity, and document compatibility. Metrics are a bonus, not a requirement: implemented features, integrations, performance improvements, and other technical evidence count as impact.";
