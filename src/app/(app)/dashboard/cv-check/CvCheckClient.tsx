"use client";

import Link from "next/link";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import { analyzeResume, type AtsStatus } from "@/lib/ats";
import { useResumeLibrary } from "@/hooks/useResumeLibrary";
import PageHeader from "@/components/dashboard/PageHeader";
import ResumeSelect from "@/components/dashboard/ResumeSelect";

const STATUS = {
  pass: { icon: CheckCircleIcon, className: "text-emerald-600", label: "Pass" },
  warn: { icon: WarningAmberIcon, className: "text-amber-600", label: "Improve" },
  fail: { icon: CancelIcon, className: "text-red-600", label: "Fix" },
} satisfies Record<
  AtsStatus,
  { icon: typeof CheckCircleIcon; className: string; label: string }
>;

const GROUP_TITLES = {
  contact: "Contact and identity",
  content: "Content recruiters look for",
  format: "Layout and readability",
} as const;

export function CvCheckClient() {
  const library = useResumeLibrary();
  const report = library.record ? analyzeResume(library.record.data) : null;
  const actionable =
    report?.checks.filter((check) => check.status !== "pass") ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader
        title="CV check"
        description="Find missing information and get specific, actionable improvements before you apply."
        actions={
          <Link
            href="/dashboard/resume"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Open builder
          </Link>
        }
      />

      {library.error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {library.error}
        </p>
      )}

      {library.isLoading ? (
        <LinearProgress sx={{ borderRadius: 1 }} />
      ) : library.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="text-base font-semibold text-slate-900">No resume yet</h2>
          <p className="mt-1 text-sm text-slate-600">
            Create a resume or import an existing CV, then run the check.
          </p>
          <Link
            href="/dashboard/resume"
            className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Go to the builder
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="max-w-sm">
              <ResumeSelect
                items={library.items}
                value={library.selectedId}
                onChange={library.setSelectedId}
                disabled={library.isLoadingRecord}
              />
            </div>
          </div>

          {library.isLoadingRecord && <LinearProgress sx={{ borderRadius: 1 }} />}

          {report && (
            <>
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      CV quality score
                    </p>
                    <p className="mt-1 text-4xl font-bold text-slate-900">
                      {report.score}
                      <span className="text-lg font-semibold text-slate-500">/100</span>
                    </p>
                  </div>
                  <p className="text-sm text-slate-600">
                    {report.failed} must fix · {report.warnings} to improve ·{" "}
                    {report.passed} passing
                  </p>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-slate-900"
                    style={{ width: `${report.score}%` }}
                  />
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-base font-semibold text-slate-900">
                  Fix these first
                </h2>
                {actionable.length === 0 ? (
                  <p className="mt-2 text-sm text-emerald-700">
                    Everything checks out. Tailor the resume to a job description next.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-slate-100">
                    {actionable.map((check) => {
                      const meta = STATUS[check.status];
                      const Icon = meta.icon;
                      return (
                        <li key={check.id} className="flex gap-3 py-3">
                          <Icon className={`mt-0.5 shrink-0 ${meta.className}`} fontSize="small" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2">
                              <p className="text-sm font-semibold text-slate-900">
                                {check.label}
                              </p>
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                {meta.label}
                              </span>
                            </div>
                            <p className="mt-0.5 text-sm text-slate-600">{check.detail}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/dashboard/resume"
                    className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Fix in builder
                  </Link>
                  <Link
                    href="/dashboard/job-match"
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Match to a job
                  </Link>
                </div>
              </section>

              {(Object.keys(GROUP_TITLES) as Array<keyof typeof GROUP_TITLES>).map(
                (group) => {
                  const checks = report.checks.filter((check) => check.group === group);
                  return (
                    <section
                      key={group}
                      className="rounded-xl border border-slate-200 bg-white p-5"
                    >
                      <h2 className="text-base font-semibold text-slate-900">
                        {GROUP_TITLES[group]}
                      </h2>
                      <ul className="mt-2 divide-y divide-slate-100">
                        {checks.map((check) => {
                          const meta = STATUS[check.status];
                          const Icon = meta.icon;
                          return (
                            <li key={check.id} className="flex gap-3 py-2.5">
                              <Icon
                                className={`mt-0.5 shrink-0 ${meta.className}`}
                                fontSize="small"
                              />
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {check.label}
                                </p>
                                <p className="text-sm text-slate-600">{check.detail}</p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                },
              )}
            </>
          )}

          {!library.record && !library.isLoadingRecord && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              Select a resume to check.
              <div className="mt-3">
                <Button size="small" variant="outlined" onClick={() => void library.reload()}>
                  Reload
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CvCheckClient;
