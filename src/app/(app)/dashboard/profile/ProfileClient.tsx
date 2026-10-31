"use client";

import Link from "next/link";
import { useState } from "react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Switch from "@mui/material/Switch";
import { apiFetch, JSON_HEADERS } from "@/lib/client-api";
import PageHeader from "@/components/dashboard/PageHeader";
import ResumeSelect from "@/components/dashboard/ResumeSelect";
import { useResumeLibrary } from "@/hooks/useResumeLibrary";

export function ProfileClient() {
  const library = useResumeLibrary();
  const [notice, setNotice] = useState<{ severity: "success" | "warning" | "error"; message: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const profile = library.record?.data;

  const toggleShare = async (id: string, enabled: boolean) => {
    setBusyId(id);
    try {
      const result = await apiFetch<{ isPublic: boolean; publicSlug: string | null }>(
        `/api/resumes/${id}/share`,
        {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ enabled }),
        },
      );
      await library.reload();
      setNotice({
        severity: "success",
        message: result.isPublic
          ? "Public link enabled. Anyone with the link can view this resume."
          : "Public link turned off.",
      });
    } catch (error) {
      setNotice({
        severity: "error",
        message: error instanceof Error ? error.message : "Could not update sharing.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const copyLink = async (slug: string) => {
    const url = `${window.location.origin}/r/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice({ severity: "success", message: "Share link copied to the clipboard." });
    } catch {
      setNotice({
        severity: "warning",
        message: `Could not copy automatically. The link is ${url}`,
      });
    }
  };

  const initials = (profile?.personal.name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader
        title="Profile & sharing"
        description="Share a read-only professional profile with recruiters, and control which resumes are public."
      />

      {notice && (
        <Alert severity={notice.severity} className="mb-4" onClose={() => setNotice(null)}>
          {notice.message}
        </Alert>
      )}

      {library.error && (
        <Alert severity="error" className="mb-4">
          {library.error}
        </Alert>
      )}

      {library.isLoading ? (
        <LinearProgress />
      ) : library.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="text-base font-semibold text-slate-900">No profile yet</h2>
          <p className="mt-1 text-sm text-slate-600">
            Create a resume first, then share it as a public profile.
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
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="max-w-sm">
              <ResumeSelect
                items={library.items}
                value={library.selectedId}
                onChange={library.setSelectedId}
                disabled={library.isLoadingRecord}
                label="Profile preview"
              />
            </div>

            {library.isLoadingRecord && <LinearProgress sx={{ mt: 3 }} />}

            {profile && (
              <div className="mt-5 flex flex-wrap items-start gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-900 text-xl font-bold text-white">
                  {initials || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold text-slate-900">
                    {profile.personal.name || "Your name"}
                  </h2>
                  <p className="text-sm font-medium text-slate-600">
                    {profile.personal.title || "Professional title"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {[profile.personal.location, profile.personal.email]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-700">
                    {profile.personal.linkedIn && (
                      <a
                        href={normalizeUrl(profile.personal.linkedIn)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        LinkedIn
                      </a>
                    )}
                    {profile.personal.github && (
                      <a
                        href={normalizeUrl(profile.personal.github)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        GitHub
                      </a>
                    )}
                    {profile.personal.portfolio && (
                      <a
                        href={normalizeUrl(profile.personal.portfolio)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        Portfolio
                      </a>
                    )}
                  </div>
                  {profile.summary && (
                    <p className="mt-3 max-w-2xl text-sm text-slate-600">
                      {profile.summary}
                    </p>
                  )}
                </div>
                {library.record?.isPublic && library.record.publicSlug && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<OpenInNewIcon />}
                    href={`/r/${library.record.publicSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View public profile
                  </Button>
                )}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold text-slate-900">Shareable resumes</h2>
            <p className="mt-1 text-sm text-slate-600">
              Public links are read-only and exclude your account details. Turn one off at
              any time.
            </p>

            <ul className="mt-3 divide-y divide-slate-100">
              {library.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      Updated {new Date(item.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-600">
                      {item.isPublic ? "Public" : "Private"}
                    </span>
                    <Switch
                      size="small"
                      checked={item.isPublic}
                      disabled={busyId === item.id}
                      onChange={(event) =>
                        void toggleShare(item.id, event.target.checked)
                      }
                      inputProps={{ "aria-label": `Public link for ${item.title}` }}
                    />
                    {item.isPublic && item.publicSlug && (
                      <>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ContentCopyIcon />}
                          onClick={() => void copyLink(item.publicSlug!)}
                        >
                          Copy link
                        </Button>
                        <Button
                          size="small"
                          href={`/r/${item.publicSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export default ProfileClient;
