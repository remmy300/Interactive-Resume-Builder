import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SpeedIcon from "@mui/icons-material/Speed";
import TipsAndUpdatesOutlinedIcon from "@mui/icons-material/TipsAndUpdatesOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import type { AtsReport } from "@/lib/ats-types";
import { ScoreCaps, SCORE_NOTE } from "./CheckExamples";

function tone(score: number) {
  if (score >= 80) return { stroke: "#059669", text: "text-emerald-600" };
  if (score >= 60) return { stroke: "#d97706", text: "text-amber-600" };
  return { stroke: "#dc2626", text: "text-red-600" };
}

function ScoreRing({ score, verdict }: { score: number; verdict: string }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const colors = tone(score);
  const clamped = Math.min(Math.max(score, 0), 100);
  return (
    <div className="relative mx-auto h-44 w-44">
      <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="90" cy="90" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="14" />
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        role="img"
        aria-label={`Resume quality score ${score} out of 100, ${verdict}`}
      >
        <p className="text-4xl font-bold text-slate-900">
          {score}
          <span className="text-lg font-semibold text-slate-500">/100</span>
        </p>
        <p className={`mt-0.5 text-sm font-semibold ${colors.text}`}>{verdict}</p>
      </div>
    </div>
  );
}

/** Score ring plus passing / needs-attention chips, in the style of a job-match card. */
export default function ScoreOverview({
  report,
  resumeTitle,
  jobTitle,
  improvements,
}: {
  report: AtsReport;
  resumeTitle: string;
  jobTitle: string;
  improvements: number;
}) {
  const passing = report.checks.filter((check) => check.status === "pass");
  const toImprove = report.checks.filter(
    (check) => check.status === "fail" || check.status === "warn",
  );
  const subtitle = [resumeTitle, jobTitle.split("|")[0]?.trim()]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600">
          <SpeedIcon fontSize="small" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">Resume quality score</h2>
          {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-[15rem_1fr]">
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <ScoreRing score={report.score} verdict={report.verdict} />
          <p className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
            <span className="font-semibold text-emerald-600">{report.passed} passing</span>
            <span className="font-semibold text-amber-600">{report.warnings} to improve</span>
            <span className="font-semibold text-red-600">{report.failed} to fix</span>
          </p>
          {improvements > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-600">
              <TrendingUpIcon className="text-emerald-600" fontSize="small" />
              <span>
                <strong className="text-emerald-700">{improvements} improvements</strong>{" "}
                available, biggest first
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 p-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <CheckCircleIcon className="text-emerald-600" fontSize="small" />
                Passing checks
              </h3>
              <span className="text-xs font-semibold text-emerald-700">
                {passing.length} found
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {passing.length === 0 ? (
                <p className="text-xs text-slate-500">Nothing passing yet.</p>
              ) : (
                passing.map((check) => (
                  <span
                    key={check.id}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800"
                  >
                    {check.label}
                    <CheckCircleIcon sx={{ fontSize: 14 }} />
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <WarningAmberIcon className="text-amber-600" fontSize="small" />
                Needs attention
              </h3>
              <span className="text-xs font-semibold text-amber-700">
                {toImprove.length} to improve
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {toImprove.length === 0 ? (
                <p className="text-xs text-emerald-700">Nothing to fix.</p>
              ) : (
                toImprove.map((check) => (
                  <span
                    key={check.id}
                    className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800"
                  >
                    {check.label}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <ScoreCaps report={report} />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
        <p className="flex items-start gap-2 text-xs text-slate-600">
          <TipsAndUpdatesOutlinedIcon className="text-amber-500" fontSize="small" />
          <span>Tip: fix the top items first. {SCORE_NOTE}</span>
        </p>
        <a
          href="#improvements"
          className="rounded-md border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
        >
          View recommendations
        </a>
      </div>
    </section>
  );
}
