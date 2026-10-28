"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { ResumePreview } from "@/components/preview/ResumePreview";
import PreviewFrame from "@/components/preview/PreviewFrame";
import type { ResumeSummary } from "@/hooks/useResumeEditor";
import { TEMPLATES, type ResumeData } from "@/lib/resume-schema";

interface PreviewPanelProps {
  data: ResumeData;
  className?: string;
  currentItem: ResumeSummary | null;
  onToggleShare: (enabled: boolean) => void;
  onCopyShare: () => void;
  onOpenPreview: () => void;
}

export function PreviewPanel({
  data,
  className = "",
  currentItem,
  onToggleShare,
  onCopyShare,
  onOpenPreview,
}: PreviewPanelProps) {
  const templateName =
    TEMPLATES.find((template) => template.id === data.template)?.name ?? "Classic";
  const shareUrl =
    currentItem?.isPublic && currentItem.publicSlug
      ? `/r/${currentItem.publicSlug}`
      : null;

  return (
    <section className={className} aria-label="Resume preview">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Live preview</h2>
          <p className="text-xs text-slate-500">
            A4 · {templateName} · updates as you type
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentItem ? (
            <>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={currentItem.isPublic}
                    onChange={(event) => onToggleShare(event.target.checked)}
                  />
                }
                label={<span className="text-sm text-slate-600">Public link</span>}
              />
              {shareUrl && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={onCopyShare}
                >
                  Copy link
                </Button>
              )}
            </>
          ) : (
            <span className="text-xs text-slate-500">
              Save the resume to share a read-only link.
            </span>
          )}
          <Button size="small" onClick={onOpenPreview}>
            Full preview
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-200/60 p-3 sm:p-5">
        <PreviewFrame>
          <ResumePreview data={data} />
        </PreviewFrame>
      </div>
    </section>
  );
}

export default PreviewPanel;
