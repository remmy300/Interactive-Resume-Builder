"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import TextField from "@mui/material/TextField";
import ConfirmDialog from "@/components/builder/ConfirmDialog";
import PageHeader from "@/components/dashboard/PageHeader";
import { apiFetch, JSON_HEADERS } from "@/lib/client-api";
import type { ResumeData } from "@/lib/resume-schema";

interface ResumeItem {
  id: string;
  title: string;
  isPublic: boolean;
  publicSlug: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  items: ResumeItem[];
  total: number;
}

interface Notice {
  severity: "success" | "error" | "info";
  message: string;
  undoId?: string;
}

const LIST_LIMIT = 100;

function formatUpdated(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Every saved resume in one place: open, duplicate, or delete (with undo). */
export function ResumesClient() {
  const [items, setItems] = useState<ResumeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ResumeItem | null>(null);

  const load = useCallback(async (search: string) => {
    const params = new URLSearchParams({ take: String(LIST_LIMIT) });
    if (search.trim()) params.set("q", search.trim());
    try {
      const result = await apiFetch<ListResponse>(`/api/resumes?${params}`);
      setItems(result.items);
      setTotal(result.total);
    } catch (error) {
      setNotice({
        severity: "error",
        message: error instanceof Error ? error.message : "Could not load your resumes.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search; also the initial load.
  useEffect(() => {
    const timer = setTimeout(() => void load(query), query ? 250 : 0);
    return () => clearTimeout(timer);
  }, [query, load]);

  const duplicate = async (item: ResumeItem) => {
    setBusyId(item.id);
    try {
      const source = await apiFetch<ResumeItem & { data: ResumeData }>(
        `/api/resumes/${item.id}`,
      );
      const copy = await apiFetch<ResumeItem>("/api/resumes", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          title: `${item.title} (copy)`.slice(0, 100),
          data: source.data,
        }),
      });
      setItems((current) => [copy, ...current]);
      setTotal((current) => current + 1);
      setNotice({ severity: "success", message: `Duplicated "${item.title}".` });
    } catch (error) {
      setNotice({
        severity: "error",
        message: error instanceof Error ? error.message : "Could not duplicate it.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setBusyId(target.id);
    try {
      await apiFetch<void>(`/api/resumes/${target.id}`, { method: "DELETE" });
      setItems((current) => current.filter((item) => item.id !== target.id));
      setTotal((current) => Math.max(0, current - 1));
      setNotice({
        severity: "info",
        message: `Deleted "${target.title}".`,
        undoId: target.id,
      });
    } catch (error) {
      setNotice({
        severity: "error",
        message: error instanceof Error ? error.message : "Could not delete it.",
      });
    } finally {
      setBusyId(null);
      setPendingDelete(null);
    }
  };

  const undo = async (id: string) => {
    try {
      const restored = await apiFetch<ResumeItem>(`/api/resumes/${id}/restore`, {
        method: "POST",
      });
      setItems((current) => [restored, ...current.filter((item) => item.id !== id)]);
      setTotal((current) => current + 1);
      setNotice({ severity: "success", message: "Resume restored." });
    } catch (error) {
      setNotice({
        severity: "error",
        message: error instanceof Error ? error.message : "Could not restore it.",
      });
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader
        title="My resumes"
        description="Every resume you have saved. Importing a CV adds a new one here and never replaces the others."
        actions={
          <Button
            component={Link}
            href="/dashboard/resume?resume=new"
            variant="contained"
            startIcon={<AddIcon />}
          >
            New resume
          </Button>
        }
      />

      {notice && (
        <Alert
          severity={notice.severity}
          className="mb-4"
          onClose={() => setNotice(null)}
          action={
            notice.undoId ? (
              <Button
                color="inherit"
                size="small"
                onClick={() => void undo(notice.undoId as string)}
              >
                Undo
              </Button>
            ) : undefined
          }
        >
          {notice.message}
        </Alert>
      )}

      <div className="mb-4 max-w-sm">
        <TextField
          label="Search by title"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          fullWidth
        />
      </div>

      {isLoading ? (
        <LinearProgress sx={{ borderRadius: 1 }} />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="text-base font-semibold text-slate-900">
            {query ? "No resumes match that search" : "No saved resumes yet"}
          </h2>
          {!query && (
            <p className="mt-1 text-sm text-slate-600">
              Open the builder to write one, or import an existing CV.
            </p>
          )}
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs text-slate-500">
            {total} saved resume{total === 1 ? "" : "s"}
          </p>
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {item.title}
                    {item.isPublic && (
                      <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Public
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    Updated {formatUpdated(item.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    component={Link}
                    href={`/dashboard/resume?resume=${item.id}`}
                    size="small"
                    variant="contained"
                  >
                    Open
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ContentCopyIcon />}
                    onClick={() => void duplicate(item)}
                    disabled={busyId === item.id}
                  >
                    Duplicate
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={() => setPendingDelete(item)}
                    disabled={busyId === item.id}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this resume?"
        description={
          <>
            <strong>{pendingDelete?.title}</strong> will be removed. You can undo this
            right after.
          </>
        }
        confirmLabel="Delete"
        confirmColor="error"
        busy={busyId !== null}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void remove()}
      />
    </div>
  );
}

export default ResumesClient;
