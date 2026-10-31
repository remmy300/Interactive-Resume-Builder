"use client";

import { useEffect, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  type ApplicationRecord,
  type ApplicationStatus,
} from "@/lib/career";
import { apiFetch, JSON_HEADERS } from "@/lib/client-api";
import ConfirmDialog from "@/components/builder/ConfirmDialog";
import PageHeader from "@/components/dashboard/PageHeader";

interface ListResponse {
  items: ApplicationRecord[];
}

interface FormState {
  company: string;
  role: string;
  status: ApplicationStatus;
  url: string;
  notes: string;
  appliedAt: string;
}

const EMPTY_FORM: FormState = {
  company: "",
  role: "",
  status: "saved",
  url: "",
  notes: "",
  appliedAt: "",
};

const STATUS_BADGES: Record<ApplicationStatus, string> = {
  saved: "bg-slate-100 text-slate-700",
  applied: "bg-slate-200 text-slate-800",
  interview: "bg-amber-100 text-amber-800",
  offer: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
};

export function ApplicationsClient() {
  const [items, setItems] = useState<ApplicationRecord[]>([]);
  const [filter, setFilter] = useState<ApplicationStatus | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{ severity: "success" | "error" | "info"; message: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState<ApplicationRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<ListResponse>("/api/applications")
      .then((result) => {
        if (!cancelled) setItems(result.items);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setNotice({
          severity: "error",
          message:
            error instanceof Error ? error.message : "Could not load applications.",
        });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (application: ApplicationRecord) => {
    setEditingId(application.id);
    setForm({
      company: application.company,
      role: application.role,
      status: application.status,
      url: application.url,
      notes: application.notes,
      appliedAt: application.appliedAt ? application.appliedAt.slice(0, 10) : "",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.company.trim() || !form.role.trim()) {
      setNotice({ severity: "info", message: "Company and role are required." });
      return;
    }
    setIsSaving(true);
    try {
      const body = JSON.stringify(form);
      const saved = editingId
        ? await apiFetch<ApplicationRecord>(`/api/applications/${editingId}`, {
            method: "PATCH",
            headers: JSON_HEADERS,
            body,
          })
        : await apiFetch<ApplicationRecord>("/api/applications", {
            method: "POST",
            headers: JSON_HEADERS,
            body,
          });
      setItems((current) => [
        saved,
        ...current.filter((item) => item.id !== saved.id),
      ]);
      setDialogOpen(false);
      setNotice({ severity: "success", message: "Application saved." });
    } catch (error) {
      setNotice({
        severity: "error",
        message: error instanceof Error ? error.message : "Could not save the application.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const changeStatus = async (application: ApplicationRecord, status: ApplicationStatus) => {
    const previous = application.status;
    setItems((current) =>
      current.map((item) => (item.id === application.id ? { ...item, status } : item)),
    );
    try {
      const saved = await apiFetch<ApplicationRecord>(`/api/applications/${application.id}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ status }),
      });
      setItems((current) =>
        current.map((item) => (item.id === saved.id ? saved : item)),
      );
    } catch (error) {
      setItems((current) =>
        current.map((item) =>
          item.id === application.id ? { ...item, status: previous } : item,
        ),
      );
      setNotice({
        severity: "error",
        message: error instanceof Error ? error.message : "Could not update the status.",
      });
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    setIsSaving(true);
    try {
      await apiFetch<void>(`/api/applications/${pendingDelete.id}`, {
        method: "DELETE",
      });
      setItems((current) => current.filter((item) => item.id !== pendingDelete.id));
      setNotice({ severity: "success", message: "Application deleted." });
    } catch (error) {
      setNotice({
        severity: "error",
        message: error instanceof Error ? error.message : "Could not delete the application.",
      });
    } finally {
      setIsSaving(false);
      setPendingDelete(null);
    }
  };

  const counts = APPLICATION_STATUSES.reduce<Record<string, number>>(
    (result, status) => {
      result[status] = items.filter((item) => item.status === status).length;
      return result;
    },
    {},
  );
  const visible =
    filter === "all" ? items : items.filter((item) => item.status === filter);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader
        title="Applications"
        description="Track every role you apply to and move it through the pipeline."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
            Add application
          </Button>
        }
      />

      {notice && (
        <Alert severity={notice.severity} className="mb-4" onClose={() => setNotice(null)}>
          {notice.message}
        </Alert>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {APPLICATION_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(filter === status ? "all" : status)}
            className={`rounded-xl border p-3 text-left transition ${
              filter === status
                ? "border-slate-900 bg-white"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {APPLICATION_STATUS_LABELS[status]}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{counts[status] ?? 0}</p>
          </button>
        ))}
      </section>

      {filter !== "all" && (
        <p className="mt-3 text-sm text-slate-600">
          Showing {APPLICATION_STATUS_LABELS[filter]} only.{" "}
          <button
            type="button"
            className="font-semibold text-slate-900 underline"
            onClick={() => setFilter("all")}
          >
            Clear filter
          </button>
        </p>
      )}

      <section className="mt-4 rounded-xl border border-slate-200 bg-white">
        {isLoading ? (
          <div className="p-4">
            <LinearProgress />
          </div>
        ) : visible.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No applications here yet. Add your first one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Company</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Applied</th>
                  <th className="px-4 py-3 font-semibold">Link</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((application) => (
                  <tr key={application.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{application.role}</p>
                      {application.notes && (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {application.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{application.company}</td>
                    <td className="px-4 py-3">
                      <Select
                        size="small"
                        value={application.status}
                        onChange={(event) =>
                          void changeStatus(
                            application,
                            event.target.value as ApplicationStatus,
                          )
                        }
                        variant="outlined"
                        sx={{ fontSize: 13, minWidth: 120 }}
                        inputProps={{ "aria-label": `Status for ${application.role}` }}
                      >
                        {APPLICATION_STATUSES.map((status) => (
                          <MenuItem key={status} value={status}>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS_BADGES[status]}`}
                            >
                              {APPLICATION_STATUS_LABELS[status]}
                            </span>
                          </MenuItem>
                        ))}
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {application.appliedAt
                        ? new Date(application.appliedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {application.url ? (
                        <a
                          href={application.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-700 underline"
                        >
                          Posting
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <IconButton
                          size="small"
                          aria-label={`Edit ${application.role}`}
                          onClick={() => openEdit(application)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          aria-label={`Delete ${application.role}`}
                          onClick={() => setPendingDelete(application)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? "Edit application" : "Add application"}</DialogTitle>
        <DialogContent>
          <div className="mt-1 grid gap-3 sm:grid-cols-2">
            <TextField
              label="Company"
              value={form.company}
              onChange={(event) =>
                setForm((current) => ({ ...current, company: event.target.value }))
              }
              inputProps={{ maxLength: 160 }}
              required
            />
            <TextField
              label="Role"
              value={form.role}
              onChange={(event) =>
                setForm((current) => ({ ...current, role: event.target.value }))
              }
              inputProps={{ maxLength: 160 }}
              required
            />
            <TextField
              select
              label="Status"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as ApplicationStatus,
                }))
              }
            >
              {APPLICATION_STATUSES.map((status) => (
                <MenuItem key={status} value={status}>
                  {APPLICATION_STATUS_LABELS[status]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Applied on"
              type="date"
              value={form.appliedAt}
              onChange={(event) =>
                setForm((current) => ({ ...current, appliedAt: event.target.value }))
              }
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Job posting URL"
              value={form.url}
              onChange={(event) =>
                setForm((current) => ({ ...current, url: event.target.value }))
              }
              inputProps={{ maxLength: 500 }}
              className="sm:col-span-2"
            />
            <TextField
              label="Notes"
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              multiline
              minRows={3}
              inputProps={{ maxLength: 5000 }}
              className="sm:col-span-2"
            />
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void save()} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this application?"
        description={
          pendingDelete
            ? `${pendingDelete.role} at ${pendingDelete.company} will be removed from your tracker.`
            : ""
        }
        confirmLabel="Delete"
        confirmColor="error"
        busy={isSaving}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void remove()}
      />
    </div>
  );
}

export default ApplicationsClient;
