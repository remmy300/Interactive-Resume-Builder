"use client";

import { useState } from "react";
import Link from "next/link";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import { analyzeResume, type AtsStatus } from "@/lib/ats";
import { apiFetch, JSON_HEADERS } from "@/lib/client-api";
import type { ResumeData } from "@/lib/resume-schema";
import { useResumeLibrary, type LibraryRecord } from "@/hooks/useResumeLibrary";
import CheckFixes from "@/components/dashboard/CheckFixes";
import { CheckExamples } from "@/components/dashboard/CheckExamples";
import ScoreOverview from "@/components/dashboard/ScoreOverview";
import PageHeader from "@/components/dashboard/PageHeader";
import ResumeSelect from "@/components/dashboard/ResumeSelect";

const STATUS = {
  pass: { icon: CheckCircleIcon, className: "text-emerald-600", label: "Pass" },
  warn: {
    icon: WarningAmberIcon,
    className: "text-amber-600",
    label: "Improve",
  },
  fail: { icon: CancelIcon, className: "text-red-600", label: "Fix" },
  info: { icon: InfoOutlinedIcon, className: "text-slate-500", label: "Note" },
} satisfies Record<
  AtsStatus,
  { icon: typeof CheckCircleIcon; className: string; label: string }
>;

const formatPoints = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

export function CvCheckClient() {
  const library = useResumeLibrary();
  const report = library.record ? analyzeResume(library.record.data) : null;
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{
    severity: "success" | "error";
    message: string;
  } | null>(null);

  const applyFix = async (next: ResumeData, message: string) => {
    const record = library.record;
    if (!record) return;
    setIsSaving(true);
    try {
      const updated = await apiFetch<LibraryRecord>(
        `/api/resumes/${record.id}`,
        {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify({
            title: record.title,
            data: next,
            updatedAt: record.updatedAt,
          }),
        },
      );
      library.setRecord(updated);
      setNotice({
        severity: "success",
        message: `${message} The check below is updated.`,
      });
    } catch (error) {
      setNotice({
        severity: "error",
        message:
          error instanceof Error ? error.message : "Could not save the change.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Biggest score impact first, so the list is a to-do order, not a dump.
  const impact = (check: { status: AtsStatus; weight: number }) =>
    check.weight *
    (check.status === "fail" ? 1 : check.status === "warn" ? 0.5 : 0);
  const actionable = (
    report?.checks.filter(
      (check) => check.status === "fail" || check.status === "warn",
    ) ?? []
  ).sort((a, b) => impact(b) - impact(a));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader
        title="CV check"
        description="An internal resume-quality assessment: structure, evidence, clarity, and compatibility. It is not an ATS pass prediction."
        actions={
          <Link
            href="/dashboard/resume"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Open builder
          </Link>
        }
      />

      {notice && (
        <Alert
          severity={notice.severity}
          className="mb-4"
          onClose={() => setNotice(null)}
        >
          {notice.message}
        </Alert>
      )}

      {library.error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {library.error}
        </p>
      )}

      {library.isLoading ? (
        <LinearProgress sx={{ borderRadius: 1 }} />
      ) : library.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="text-base font-semibold text-slate-900">
            No resume yet
          </h2>
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

          {library.isLoadingRecord && (
            <LinearProgress sx={{ borderRadius: 1 }} />
          )}

          {report && (
            <>
              <ScoreOverview
                report={report}
                resumeTitle={library.record?.title ?? ""}
                jobTitle={library.record?.data.personal.title ?? ""}
                improvements={actionable.length}
              />

              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-base font-semibold text-slate-900">
                  Assessment breakdown
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Checks that do not apply to this resume are excluded from the
                  category totals.
                </p>
                <ul className="mt-4 space-y-3">
                  {report.categories.map((category) => (
                    <li key={category.id}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-slate-800">
                          {category.label}
                        </span>
                        <span className="tabular-nums text-slate-600">
                          {category.total > 0
                            ? `${formatPoints(category.earned)}/${formatPoints(category.total)}`
                            : "Not assessed"}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-slate-800"
                          style={{ width: `${category.percent}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section
                id="improvements"
                className="scroll-mt-4 rounded-xl border border-slate-200 bg-white p-5"
              >
                <h2 className="text-base font-semibold text-slate-900">
                  Highest-priority improvements
                </h2>
                {actionable.length === 0 ? (
                  <p className="mt-2 text-sm text-emerald-700">
                    Everything checks out. Tailor the resume to a job
                    description next.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-slate-100">
                    {actionable.slice(0, 10).map((check) => {
                      const meta = STATUS[check.status];
                      const Icon = meta.icon;
                      return (
                        <li key={check.id} className="flex gap-3 py-3">
                          <Icon
                            className={`mt-0.5 shrink-0 ${meta.className}`}
                            fontSize="small"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2">
                              <p className="text-sm font-semibold text-slate-900">
                                {check.label}
                              </p>
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                {meta.label}
                              </span>
                            </div>
                            <p className="mt-0.5 text-sm text-slate-600">
                              {check.detail}
                            </p>
                            <CheckExamples examples={check.examples} />
                            {library.record && (
                              <CheckFixes
                                checkId={check.id}
                                data={library.record.data}
                                saving={isSaving}
                                onApply={(next, message) =>
                                  void applyFix(next, message)
                                }
                              />
                            )}
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

              {report.categories.map((category) => {
                const checks = report.checks.filter(
                  (check) => check.category === category.id,
                );
                if (checks.length === 0) return null;
                return (
                  <section
                    key={category.id}
                    className="rounded-xl border border-slate-200 bg-white p-5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="text-base font-semibold text-slate-900">
                        {category.label}
                      </h2>
                      <span className="text-xs font-medium text-slate-500">
                        {category.total > 0
                          ? `${formatPoints(category.earned)}/${formatPoints(category.total)}`
                          : "Not assessed"}
                      </span>
                    </div>
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
                              <div className="flex flex-wrap items-center gap-x-2">
                                <p className="text-sm font-medium text-slate-900">
                                  {check.label}
                                </p>
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                  {meta.label}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600">
                                {check.detail}
                              </p>
                              <CheckExamples examples={check.examples} />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </>
          )}

          {!library.record && !library.isLoadingRecord && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              Select a resume to check.
              <div className="mt-3">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => void library.reload()}
                >
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
