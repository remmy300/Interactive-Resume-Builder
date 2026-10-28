"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import AtsDialog from "@/components/builder/AtsDialog";
import ConfirmDialog from "@/components/builder/ConfirmDialog";
import EditorPanel from "@/components/builder/EditorPanel";
import PreviewDialog from "@/components/builder/PreviewDialog";
import PreviewPanel from "@/components/builder/PreviewPanel";
import TopBar from "@/components/builder/TopBar";
import { ResumePreview } from "@/components/preview/ResumePreview";
import { useResumeEditor } from "@/hooks/useResumeEditor";
import { analyzeResume } from "@/lib/ats";
import { safeFileName } from "@/utils/Form";

interface BuilderProps {
  user: {
    email: string;
    name?: string | null;
  };
}

type PendingNavigation = { kind: "open"; id: string } | { kind: "new" };

interface Notice {
  message: string;
  severity: "success" | "info" | "warning";
}

export default function Builder({ user }: BuilderProps) {
  const editor = useResumeEditor();
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [atsOpen, setAtsOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(
    null,
  );
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [undoId, setUndoId] = useState<string | null>(null);

  const { save, isDirty, resumeId, items, data, title, currentItem } = editor;
  const atsScore = useMemo(() => analyzeResume(data).score, [data]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [save]);

  const handlePrint = () => {
    const previousTitle = document.title;
    document.title = safeFileName(
      data.personal.name || title || "resume",
      "resume",
    );
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
    window.setTimeout(restore, 15_000);
  };

  const proceedWithPending = () => {
    const pending = pendingNavigation;
    setPendingNavigation(null);
    if (!pending) return;
    if (pending.kind === "open") {
      void editor.openResume(pending.id);
    } else {
      editor.newResume();
    }
  };

  const requestNewResume = () => {
    if (isDirty) {
      setPendingNavigation({ kind: "new" });
      return;
    }
    editor.newResume();
  };

  const requestSelectResume = (id: string) => {
    if (!id) {
      requestNewResume();
      return;
    }
    if (id === resumeId) return;
    if (isDirty) {
      setPendingNavigation({ kind: "open", id });
      return;
    }
    void editor.openResume(id);
  };

  const saveAndContinue = async () => {
    setIsBusy(true);
    const saved = await editor.save();
    setIsBusy(false);
    if (saved) proceedWithPending();
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setIsBusy(true);
    const target = pendingDelete;
    const remaining = items.filter((item) => item.id !== target.id);
    const wasCurrent = resumeId === target.id;
    const removed = await editor.removeResume(target.id);
    setIsBusy(false);
    setPendingDelete(null);
    if (!removed) return;

    if (wasCurrent) {
      if (remaining[0]) {
        void editor.openResume(remaining[0].id);
      } else {
        editor.newResume();
      }
    }

    setUndoId(target.id);
    setNotice({ message: `"${target.title}" deleted.`, severity: "info" });
  };

  const handleUndo = async () => {
    if (!undoId) return;
    const restored = await editor.restoreResume(undoId);
    setUndoId(null);
    if (restored) {
      setNotice({ message: "Resume restored.", severity: "success" });
    }
  };

  const handleToggleShare = async (enabled: boolean) => {
    if (!currentItem) return;
    const result = await editor.toggleShare(currentItem.id, enabled);
    if (!result) return;
    setNotice({
      message:
        result.isPublic && result.publicSlug
          ? `Public link created: /r/${result.publicSlug}`
          : "Public link turned off.",
      severity: "success",
    });
  };

  const handleCopyShare = async () => {
    const slug = currentItem?.publicSlug;
    if (!slug) return;
    const url = `${window.location.origin}/r/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice({ message: "Share link copied to clipboard.", severity: "success" });
    } catch {
      setNotice({
        message: `Could not copy automatically. The link is ${url}`,
        severity: "warning",
      });
    }
  };

  const handleExport = () => {
    window.location.assign("/api/account/export");
  };

  const handleDeleteAccount = async () => {
    setIsBusy(true);
    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Could not delete your account.");
      }
      await signOut({ redirectTo: "/login" });
    } catch (deleteError) {
      setIsBusy(false);
      setAccountDialogOpen(false);
      setNotice({
        message:
          deleteError instanceof Error
            ? deleteError.message
            : "Could not delete your account.",
        severity: "warning",
      });
    }
  };

  return (
    <>
      <a
        href="#editor"
        className="sr-only rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50"
      >
        Skip to editor
      </a>

      <main className="screen-only min-h-screen bg-slate-100">
        <TopBar
          email={user.email}
          name={user.name}
          isDirty={isDirty}
          isSaving={editor.isSaving}
          isLoading={editor.isLoading}
          saveState={editor.saveState}
          hasResume={Boolean(resumeId)}
          atsScore={atsScore}
          onSave={() => void editor.save()}
          onPreview={() => setPreviewOpen(true)}
          onOpenAts={() => setAtsOpen(true)}
          onPrint={handlePrint}
          onExport={handleExport}
          onDeleteAccount={() => setAccountDialogOpen(true)}
          onSignOut={() => void signOut({ redirectTo: "/login" })}
        />

        <div className="border-b border-slate-200 bg-white lg:hidden">
          <Tabs
            value={mobileView}
            onChange={(_event, value: "edit" | "preview") => setMobileView(value)}
            variant="fullWidth"
            aria-label="Editor and preview"
          >
            <Tab value="edit" label="Edit" />
            <Tab value="preview" label="Preview" />
          </Tabs>
        </div>

        <div className="mx-auto grid max-w-[1600px] gap-5 px-4 pb-12 pt-4 lg:grid-cols-[minmax(360px,440px)_minmax(0,1fr)]">
          <EditorPanel
            editor={editor}
            className={`${mobileView === "preview" ? "hidden lg:block" : ""} lg:sticky lg:top-[70px] lg:max-h-[calc(100vh-90px)] lg:overflow-y-auto lg:pr-1`}
            onSelectResume={requestSelectResume}
            onNewResume={requestNewResume}
            onDeleteResume={() => {
              if (!currentItem) return;
              setPendingDelete({ id: currentItem.id, title: currentItem.title });
            }}
            onSave={() => void editor.save()}
          />

          <PreviewPanel
            data={editor.data}
            className={mobileView === "edit" ? "hidden lg:block" : ""}
            currentItem={currentItem}
            onToggleShare={(enabled) => void handleToggleShare(enabled)}
            onCopyShare={() => void handleCopyShare()}
            onOpenPreview={() => setPreviewOpen(true)}
          />
        </div>

        <PreviewDialog
          open={previewOpen}
          data={editor.data}
          onClose={() => setPreviewOpen(false)}
          onPrint={handlePrint}
        />

        <AtsDialog
          open={atsOpen}
          data={editor.data}
          dispatch={editor.dispatch}
          onClose={() => setAtsOpen(false)}
        />

        <ConfirmDialog
          open={Boolean(pendingNavigation)}
          title="You have unsaved changes"
          description="Save your latest edits before switching, or discard them and continue."
          confirmLabel="Discard changes"
          confirmColor="error"
          busy={isBusy}
          onCancel={() => setPendingNavigation(null)}
          onConfirm={proceedWithPending}
          secondaryAction={{
            label: "Save & continue",
            onClick: () => void saveAndContinue(),
          }}
        />

        <ConfirmDialog
          open={Boolean(pendingDelete)}
          title="Delete this resume?"
          description={
            <>
              <strong>{pendingDelete?.title}</strong> will be removed from your
              account. You can undo this from the notification for a few seconds.
            </>
          }
          confirmLabel="Delete"
          confirmColor="error"
          busy={isBusy}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void confirmDelete()}
        />

        <ConfirmDialog
          open={accountDialogOpen}
          title="Delete your account?"
          description="This permanently deletes your account and every saved resume. This cannot be undone."
          confirmLabel="Delete account"
          confirmColor="error"
          busy={isBusy}
          onCancel={() => setAccountDialogOpen(false)}
          onConfirm={() => void handleDeleteAccount()}
        />

        <Snackbar
          open={Boolean(notice)}
          autoHideDuration={6000}
          onClose={() => {
            setNotice(null);
            setUndoId(null);
          }}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            severity={notice?.severity ?? "success"}
            variant="filled"
            onClose={() => {
              setNotice(null);
              setUndoId(null);
            }}
            action={
              undoId ? (
                <Button color="inherit" size="small" onClick={() => void handleUndo()}>
                  Undo
                </Button>
              ) : undefined
            }
          >
            {notice?.message}
          </Alert>
        </Snackbar>

        <Snackbar
          open={Boolean(editor.error)}
          autoHideDuration={8000}
          onClose={editor.clearError}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert severity="error" variant="filled" onClose={editor.clearError}>
            {editor.error}
          </Alert>
        </Snackbar>
      </main>

      {/* Printed instead of the app: real text, clickable links, ATS readable. */}
      <div className="print-only" aria-hidden="true">
        <ResumePreview data={editor.data} isPrint />
      </div>
    </>
  );
}
