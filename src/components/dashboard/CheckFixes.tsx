"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import { skillEvidence } from "@/lib/ats-quality";
import { applyBulletChanges } from "@/lib/career";
import {
  completeEducation,
  incompleteEducation,
  removeSkills,
  setLocation,
  suggestOpeningVariety,
} from "@/lib/cv-fixes";
import type { ResumeData } from "@/lib/resume-schema";

interface CheckFixesProps {
  checkId: string;
  data: ResumeData;
  saving: boolean;

  onApply: (next: ResumeData, message: string) => void;
}

const toggle = (list: string[], value: string) =>
  list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];

/* ------------------------------ skills to remove --------------------------- */

function SkillsDialog({
  skills,
  saving,
  onCancel,
  onConfirm,
}: {
  skills: string[];
  saving: boolean;
  onCancel: () => void;
  onConfirm: (selected: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(skills);
  return (
    <Dialog
      open
      onClose={saving ? undefined : onCancel}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle>Remove skills you do not show?</DialogTitle>
      <DialogContent>
        <p className="text-sm text-slate-600">
          These skills are listed but never appear in your summary, roles or
          projects. Untick any you can back up. Better still, add a bullet that
          shows where you used it, then keep it.
        </p>
        <ul className="mt-2">
          {skills.map((skill) => (
            <li key={skill} className="flex items-center gap-1">
              <Checkbox
                size="small"
                checked={selected.includes(skill)}
                onChange={() =>
                  setSelected((current) => toggle(current, skill))
                }
                slotProps={{ input: { "aria-label": `Remove ${skill}` } }}
              />
              <span className="text-sm text-slate-800">{skill}</span>
            </li>
          ))}
        </ul>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={saving || selected.length === 0}
          onClick={() => onConfirm(selected)}
        >
          {saving ? "Saving…" : `Remove ${selected.length}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ----------------------------- opening-word rewording ---------------------- */

function VarietyDialog({
  data,
  saving,
  onCancel,
  onConfirm,
}: {
  data: ResumeData;
  saving: boolean;
  onCancel: () => void;
  onConfirm: (next: ResumeData, count: number) => void;
}) {
  const fixes = suggestOpeningVariety(data);
  const [selected, setSelected] = useState<string[]>(
    fixes.map((fix) => fix.id),
  );
  const [edits, setEdits] = useState<Record<string, string>>({});

  const apply = () => {
    const changes = fixes
      .filter((fix) => selected.includes(fix.id))
      .map((fix) => ({
        entryId: fix.entryId,
        original: fix.original,
        suggested: (edits[fix.id] ?? fix.suggested).trim(),
      }))
      .filter(
        (change) => change.suggested && change.suggested !== change.original,
      );
    onConfirm(applyBulletChanges(data, changes), changes.length);
  };

  return (
    <Dialog
      open
      onClose={saving ? undefined : onCancel}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Vary repeated opening words</DialogTitle>
      <DialogContent>
        <p className="text-sm text-slate-600">
          Only the first word changes, and only on the third repeat. Edit any
          line before applying it.
        </p>
        <div className="mt-3 space-y-3">
          {fixes.map((fix) => (
            <div
              key={fix.id}
              className="rounded-lg border border-slate-200 p-3"
            >
              <div className="flex items-start gap-2">
                <Checkbox
                  size="small"
                  checked={selected.includes(fix.id)}
                  onChange={() =>
                    setSelected((current) => toggle(current, fix.id))
                  }
                  slotProps={{
                    input: { "aria-label": `Apply for ${fix.entryLabel}` },
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {fix.entryLabel}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 line-through">
                    {fix.original}
                  </p>
                  <TextField
                    value={edits[fix.id] ?? fix.suggested}
                    onChange={(event) =>
                      setEdits((current) => ({
                        ...current,
                        [fix.id]: event.target.value,
                      }))
                    }
                    multiline
                    minRows={2}
                    fullWidth
                    size="small"
                    sx={{ mt: 1 }}
                    slotProps={{
                      htmlInput: {
                        maxLength: 500,
                        "aria-label": "Reworded bullet",
                      },
                    }}
                  />
                  <p className="mt-1 text-xs text-slate-600">{fix.reason}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={saving || selected.length === 0}
          onClick={apply}
        >
          {saving ? "Saving…" : `Apply ${selected.length}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ---------------------------------- panel ---------------------------------- */

function LocationFix({
  data,
  saving,
  onApply,
}: Omit<CheckFixesProps, "checkId">) {
  const [value, setValue] = useState("");
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <TextField
        size="small"
        label="City, Country"
        placeholder="Nairobi, Kenya"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        slotProps={{ htmlInput: { maxLength: 120 } }}
      />
      <Button
        size="small"
        variant="contained"
        disabled={saving || !value.trim()}
        onClick={() => onApply(setLocation(data, value), "Location added.")}
      >
        Add to resume
      </Button>
    </div>
  );
}

function EducationFix({
  data,
  saving,
  onApply,
}: Omit<CheckFixesProps, "checkId">) {
  const found = incompleteEducation(data);
  const [institution, setInstitution] = useState(found?.institution ?? "");
  const [qualification, setQualification] = useState(
    found?.qualification ?? "",
  );
  if (!found) return null;
  return (
    <div className="mt-2 grid max-w-md gap-2 sm:grid-cols-2">
      <TextField
        size="small"
        label="School or institution"
        value={institution}
        onChange={(event) => setInstitution(event.target.value)}
        slotProps={{ htmlInput: { maxLength: 200 } }}
      />
      <TextField
        size="small"
        label="Qualification"
        value={qualification}
        onChange={(event) => setQualification(event.target.value)}
        slotProps={{ htmlInput: { maxLength: 200 } }}
      />
      <div className="sm:col-span-2">
        <Button
          size="small"
          variant="contained"
          disabled={saving || !institution.trim() || !qualification.trim()}
          onClick={() =>
            onApply(
              completeEducation(
                data,
                found.entry.id,
                institution,
                qualification,
              ),
              "Education updated.",
            )
          }
        >
          Update education
        </Button>
      </div>
    </div>
  );
}

/**
 * The one-click fix for a finding, when one can be made without inventing
 * anything. Findings that need your own facts (a result, a client, a reason) have
 * no button: the wording stays yours.
 */
export function CheckFixes({
  checkId,
  data,
  saving,
  onApply,
}: CheckFixesProps) {
  const [dialog, setDialog] = useState<"skills" | "variety" | null>(null);

  if (checkId === "skills-evidence") {
    const { unsupported } = skillEvidence(data);
    if (unsupported.length === 0) return null;
    return (
      <>
        <Button
          size="small"
          variant="outlined"
          sx={{ mt: 1.5 }}
          onClick={() => setDialog("skills")}
        >
          Review {unsupported.length} skills to remove
        </Button>
        {dialog === "skills" && (
          <SkillsDialog
            skills={unsupported}
            saving={saving}
            onCancel={() => setDialog(null)}
            onConfirm={(selected) => {
              onApply(
                removeSkills(data, selected),
                `${selected.length} skill${selected.length === 1 ? "" : "s"} removed.`,
              );
              setDialog(null);
            }}
          />
        )}
      </>
    );
  }

  if (checkId === "verb-variety") {
    const count = suggestOpeningVariety(data).length;
    if (count === 0) return null;
    return (
      <>
        <Button
          size="small"
          variant="outlined"
          sx={{ mt: 1.5 }}
          onClick={() => setDialog("variety")}
        >
          Review {count} reworded opening{count === 1 ? "" : "s"}
        </Button>
        {dialog === "variety" && (
          <VarietyDialog
            data={data}
            saving={saving}
            onCancel={() => setDialog(null)}
            onConfirm={(next, changed) => {
              onApply(
                next,
                `${changed} bullet${changed === 1 ? "" : "s"} reworded.`,
              );
              setDialog(null);
            }}
          />
        )}
      </>
    );
  }

  if (checkId === "location") {
    return <LocationFix data={data} saving={saving} onApply={onApply} />;
  }

  if (checkId === "education") {
    return <EducationFix data={data} saving={saving} onApply={onApply} />;
  }

  return null;
}

export default CheckFixes;
