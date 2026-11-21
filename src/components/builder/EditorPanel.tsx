"use client";

import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import TextField from "@mui/material/TextField";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DesignControls from "@/components/editor/DesignControls";
import TemplatePicker from "@/components/editor/TemplatePicker";
import {
  CertificationsSection,
  EducationSection,
  ExperienceSection,
  PersonalSection,
  ProjectsSection,
  SkillsSection,
  SummarySection,
} from "@/components/editor/EditorSections";
import ResumeSwitcher from "@/components/builder/ResumeSwitcher";
import type { useResumeEditor } from "@/hooks/useResumeEditor";
import { checkResumeValidity } from "@/lib/resume-validity";

interface EditorPanelProps {
  editor: ReturnType<typeof useResumeEditor>;
  className?: string;
  onSelectResume: (id: string) => void;
  onNewResume: () => void;
  onDeleteResume: () => void;
  onImport: () => void;
  /** Hides the saved-resume list: a visitor has none. */
  guest?: boolean;
}

export function EditorPanel({
  editor,
  className = "",
  onSelectResume,
  onNewResume,
  onDeleteResume,
  onImport,
  guest = false,
}: EditorPanelProps) {
  const validity = checkResumeValidity(editor.data);

  return (
    <aside id="editor" className={className} aria-label="Resume editor">
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {editor.isLoading && <LinearProgress sx={{ borderRadius: 1 }} />}

        {!guest && (
          <ResumeSwitcher
            items={editor.items}
            currentId={editor.resumeId}
            isLoading={editor.isLoading}
            onSelect={onSelectResume}
            onNew={onNewResume}
            onDelete={onDeleteResume}
          />
        )}

        <TextField
          label="Resume title"
          value={editor.title}
          onChange={(event) => editor.setTitle(event.target.value)}
          disabled={editor.isLoading}
          fullWidth
          helperText={guest ? "Used as the PDF file name." : "Used in your saved list and as the PDF file name."}
          slotProps={{ htmlInput: { maxLength: 100 } }}
        />

        <div className="flex gap-2">
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={onImport}
            disabled={editor.isLoading}
          >
            Import CV
          </Button>
        </div>
        {!validity.valid && (
          <p className="text-xs text-slate-500">
            Add {validity.missing.join(", ")} to enable saving and PDF export.
          </p>
        )}

        <TemplatePicker
          value={editor.data.template}
          onChange={(value) => editor.dispatch({ type: "template", value })}
        />

        <DesignControls value={editor.data.style} dispatch={editor.dispatch} />
      </div>

      <fieldset
        disabled={editor.isLoading}
        className="m-0 min-w-0 border-0 p-0 disabled:opacity-60"
      >
        <div className="mt-3 space-y-2">
          <PersonalSection data={editor.data} dispatch={editor.dispatch} />
          <SummarySection data={editor.data} dispatch={editor.dispatch} />
          <ExperienceSection data={editor.data} dispatch={editor.dispatch} />
          <ProjectsSection data={editor.data} dispatch={editor.dispatch} />
          <EducationSection data={editor.data} dispatch={editor.dispatch} />
          <SkillsSection data={editor.data} dispatch={editor.dispatch} />
          <CertificationsSection
            data={editor.data}
            dispatch={editor.dispatch}
          />
        </div>
      </fieldset>
    </aside>
  );
}

export default EditorPanel;
