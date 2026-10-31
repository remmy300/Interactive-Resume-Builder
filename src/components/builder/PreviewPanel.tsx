"use client";

import { useState } from "react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { ResumePreview } from "@/components/preview/ResumePreview";
import PreviewFrame from "@/components/preview/PreviewFrame";
import type { ResumeSummary } from "@/hooks/useResumeEditor";
import { TEMPLATES, type ResumeData } from "@/lib/resume-schema";
import { describePages, type PreviewMetrics } from "@/lib/preview";

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
  const [metrics, setMetrics] = useState<PreviewMetrics | null>(null);

  const pageNote = metrics
    ? metrics.pages > 1
      ? metrics.lastPageFill < 0.12
        ? `Only a few lines spill onto page ${metrics.pages}. Tighten the spacing or trim a bullet to keep it shorter.`
        : `Content continues onto page ${metrics.pages}. Print / PDF keeps every page with selectable text and links.`
      : metrics.lastPageFill > 0.96
        ? "Page 1 is nearly full. Adding more content will start a second page."
        : null
    : null;

  return (
    <section className={className} aria-label="Resume preview">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Live preview</h2>
          <p className="text-xs text-slate-500">
            A4 · {templateName} · {metrics ? describePages(metrics.pages) : "1 page"} ·
            updates as you type
          </p>
          {pageNote && (
            <p className="mt-1 max-w-md text-xs font-medium text-amber-700">{pageNote}</p>
          )}
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
        <PreviewFrame onMetrics={setMetrics}>
          <ResumePreview data={data} />
        </PreviewFrame>
      </div>
    </section>
  );
}

export default PreviewPanel;
