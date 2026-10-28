"use client";

import type { Dispatch } from "react";
import AddIcon from "@mui/icons-material/Add";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";
import type { EditorAction } from "@/lib/resume-reducer";
import type { ResumeData } from "@/lib/resume-schema";
import BulletEditor from "./BulletEditor";
import EntryActions from "./EntryActions";
import SectionCard from "./SectionCard";
import TagInput from "./TagInput";

interface SectionProps {
  data: ResumeData;
  dispatch: Dispatch<EditorAction>;
}

const MAX_ENTRIES = 30;

function MonthField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const normalized = /^\d{4}-\d{2}/.test(value) ? value.slice(0, 7) : "";
  return (
    <TextField
      type="month"
      label={label}
      value={normalized}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      fullWidth
      slotProps={{ inputLabel: { shrink: true } }}
    />
  );
}

function DateRangeFields({
  startDate,
  endDate,
  current,
  currentLabel,
  onStartChange,
  onEndChange,
  onCurrentChange,
}: {
  startDate: string;
  endDate: string;
  current: boolean;
  currentLabel: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onCurrentChange: (value: boolean) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-2 gap-3">
        <MonthField label="Start" value={startDate} onChange={onStartChange} />
        <MonthField
          label="End"
          value={current ? "" : endDate}
          onChange={onEndChange}
          disabled={current}
        />
      </div>
      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={current}
            onChange={(event) => onCurrentChange(event.target.checked)}
          />
        }
        label={<span className="text-sm text-slate-600">{currentLabel}</span>}
      />
    </div>
  );
}

function AddEntryButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outlined"
      startIcon={<AddIcon />}
      fullWidth
      onClick={onClick}
      disabled={disabled}
      sx={{ mt: 1 }}
    >
      {label}
    </Button>
  );
}

function EmptyList({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-300 bg-white/60 p-4 text-center text-sm text-slate-500">
      {text}
    </p>
  );
}

function EntryHeading({ index, title }: { index: number; title: string }) {
  return <h3 className="text-sm font-semibold text-slate-800">{title} #{index + 1}</h3>;
}

export function PersonalSection({ data, dispatch }: SectionProps) {
  const field = (key: keyof ResumeData["personal"]) => ({
    value: data.personal[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      dispatch({ type: "personal", field: key, value: event.target.value }),
  });

  return (
    <SectionCard
      title="Personal details"
      hint="Name, role, and how recruiters reach you"
      defaultExpanded
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Full name" required {...field("name")} inputProps={{ maxLength: 120 }} />
        <TextField
          label="Professional title"
          placeholder="Frontend Developer"
          {...field("title")}
          inputProps={{ maxLength: 120 }}
        />
        <TextField label="Email" type="email" {...field("email")} inputProps={{ maxLength: 254 }} />
        <TextField label="Phone" type="tel" {...field("phone")} inputProps={{ maxLength: 50 }} />
        <TextField label="Location" placeholder="City, Country" {...field("location")} inputProps={{ maxLength: 120 }} />
        <TextField label="LinkedIn" placeholder="linkedin.com/in/you" {...field("linkedIn")} inputProps={{ maxLength: 500 }} />
        <TextField label="GitHub" placeholder="github.com/you" {...field("github")} inputProps={{ maxLength: 500 }} />
        <TextField label="Portfolio" placeholder="you.dev" {...field("portfolio")} inputProps={{ maxLength: 500 }} />
      </div>
    </SectionCard>
  );
}

export function SummarySection({ data, dispatch }: SectionProps) {
  return (
    <SectionCard title="Summary" hint="Two or three sentences about your focus">
      <TextField
        label="Professional summary"
        value={data.summary}
        onChange={(event) => dispatch({ type: "summary", value: event.target.value })}
        placeholder="Frontend developer with 4 years of experience building accessible React applications…"
        multiline
        minRows={4}
        fullWidth
        helperText={`${data.summary.length}/2000 characters`}
        inputProps={{ maxLength: 2000 }}
      />
    </SectionCard>
  );
}

export function EducationSection({ data, dispatch }: SectionProps) {
  const list = data.education;

  return (
    <SectionCard title="Education" count={list.length}>
      <div className="space-y-3">
        {list.length === 0 && <EmptyList text="No education yet. Add a degree or course." />}
        {list.map((entry, index) => (
          <div
            key={entry.id}
            className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <EntryHeading index={index} title="Education" />
              <EntryActions
                label="education entry"
                canMoveUp={index > 0}
                canMoveDown={index < list.length - 1}
                onMoveUp={() =>
                  dispatch({ type: "entry-move", section: "education", id: entry.id, direction: -1 })
                }
                onMoveDown={() =>
                  dispatch({ type: "entry-move", section: "education", id: entry.id, direction: 1 })
                }
                onRemove={() =>
                  dispatch({ type: "entry-remove", section: "education", id: entry.id })
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="School or college"
                value={entry.college}
                onChange={(event) =>
                  dispatch({
                    type: "entry-update",
                    section: "education",
                    id: entry.id,
                    patch: { college: event.target.value },
                  })
                }
                inputProps={{ maxLength: 200 }}
              />
              <TextField
                label="Degree"
                value={entry.degree}
                onChange={(event) =>
                  dispatch({
                    type: "entry-update",
                    section: "education",
                    id: entry.id,
                    patch: { degree: event.target.value },
                  })
                }
                inputProps={{ maxLength: 200 }}
              />
            </div>
            <DateRangeFields
              startDate={entry.startDate}
              endDate={entry.endDate}
              current={entry.current}
              currentLabel="I currently study here"
              onStartChange={(value) =>
                dispatch({
                  type: "entry-update",
                  section: "education",
                  id: entry.id,
                  patch: { startDate: value },
                })
              }
              onEndChange={(value) =>
                dispatch({
                  type: "entry-update",
                  section: "education",
                  id: entry.id,
                  patch: { endDate: value },
                })
              }
              onCurrentChange={(value) =>
                dispatch({
                  type: "entry-update",
                  section: "education",
                  id: entry.id,
                  patch: { current: value, ...(value ? { endDate: "" } : {}) },
                })
              }
            />
          </div>
        ))}

        <AddEntryButton
          label="Add education"
          disabled={list.length >= MAX_ENTRIES}
          onClick={() => dispatch({ type: "entry-add", section: "education" })}
        />
      </div>
    </SectionCard>
  );
}

export function ExperienceSection({ data, dispatch }: SectionProps) {
  const list = data.experience;

  return (
    <SectionCard title="Experience" count={list.length} hint="Most recent role first">
      <div className="space-y-3">
        {list.length === 0 && <EmptyList text="No experience yet. Add a role or internship." />}
        {list.map((entry, index) => (
          <div
            key={entry.id}
            className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <EntryHeading index={index} title="Experience" />
              <EntryActions
                label="experience entry"
                canMoveUp={index > 0}
                canMoveDown={index < list.length - 1}
                onMoveUp={() =>
                  dispatch({ type: "entry-move", section: "experience", id: entry.id, direction: -1 })
                }
                onMoveDown={() =>
                  dispatch({ type: "entry-move", section: "experience", id: entry.id, direction: 1 })
                }
                onRemove={() =>
                  dispatch({ type: "entry-remove", section: "experience", id: entry.id })
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Company"
                value={entry.company}
                onChange={(event) =>
                  dispatch({
                    type: "entry-update",
                    section: "experience",
                    id: entry.id,
                    patch: { company: event.target.value },
                  })
                }
                inputProps={{ maxLength: 200 }}
              />
              <TextField
                label="Role"
                value={entry.role}
                onChange={(event) =>
                  dispatch({
                    type: "entry-update",
                    section: "experience",
                    id: entry.id,
                    patch: { role: event.target.value },
                  })
                }
                inputProps={{ maxLength: 200 }}
              />
            </div>
            <DateRangeFields
              startDate={entry.startDate}
              endDate={entry.endDate}
              current={entry.current}
              currentLabel="I currently work here"
              onStartChange={(value) =>
                dispatch({
                  type: "entry-update",
                  section: "experience",
                  id: entry.id,
                  patch: { startDate: value },
                })
              }
              onEndChange={(value) =>
                dispatch({
                  type: "entry-update",
                  section: "experience",
                  id: entry.id,
                  patch: { endDate: value },
                })
              }
              onCurrentChange={(value) =>
                dispatch({
                  type: "entry-update",
                  section: "experience",
                  id: entry.id,
                  patch: { current: value, ...(value ? { endDate: "" } : {}) },
                })
              }
            />
            <BulletEditor
              label="Achievements"
              value={entry.description}
              onChange={(value) =>
                dispatch({
                  type: "entry-update",
                  section: "experience",
                  id: entry.id,
                  patch: { description: value },
                })
              }
            />
          </div>
        ))}

        <AddEntryButton
          label="Add experience"
          disabled={list.length >= MAX_ENTRIES}
          onClick={() => dispatch({ type: "entry-add", section: "experience" })}
        />
      </div>
    </SectionCard>
  );
}

export function ProjectsSection({ data, dispatch }: SectionProps) {
  const list = data.projects;

  return (
    <SectionCard title="Projects" count={list.length} hint="Show what you have shipped">
      <div className="space-y-3">
        {list.length === 0 && <EmptyList text="No projects yet. Add one you are proud of." />}
        {list.map((entry, index) => (
          <div
            key={entry.id}
            className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <EntryHeading index={index} title="Project" />
              <EntryActions
                label="project entry"
                canMoveUp={index > 0}
                canMoveDown={index < list.length - 1}
                onMoveUp={() =>
                  dispatch({ type: "entry-move", section: "projects", id: entry.id, direction: -1 })
                }
                onMoveDown={() =>
                  dispatch({ type: "entry-move", section: "projects", id: entry.id, direction: 1 })
                }
                onRemove={() =>
                  dispatch({ type: "entry-remove", section: "projects", id: entry.id })
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Project name"
                value={entry.title}
                onChange={(event) =>
                  dispatch({
                    type: "entry-update",
                    section: "projects",
                    id: entry.id,
                    patch: { title: event.target.value },
                  })
                }
                inputProps={{ maxLength: 200 }}
              />
              <TextField
                label="Project URL"
                type="url"
                placeholder="https://…"
                value={entry.link}
                onChange={(event) =>
                  dispatch({
                    type: "entry-update",
                    section: "projects",
                    id: entry.id,
                    patch: { link: event.target.value },
                  })
                }
                inputProps={{ maxLength: 500 }}
              />
            </div>
            <BulletEditor
              label="Highlights"
              value={entry.description}
              onChange={(value) =>
                dispatch({
                  type: "entry-update",
                  section: "projects",
                  id: entry.id,
                  patch: { description: value },
                })
              }
              placeholder="Built a real-time dashboard used by 200+ students"
            />
          </div>
        ))}

        <AddEntryButton
          label="Add project"
          disabled={list.length >= MAX_ENTRIES}
          onClick={() => dispatch({ type: "entry-add", section: "projects" })}
        />
      </div>
    </SectionCard>
  );
}

export function CertificationsSection({ data, dispatch }: SectionProps) {
  const list = data.certifications;

  return (
    <SectionCard title="Certifications" count={list.length} hint="Optional credentials and awards">
      <div className="space-y-3">
        {list.length === 0 && <EmptyList text="No certifications yet." />}
        {list.map((entry, index) => (
          <div
            key={entry.id}
            className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <EntryHeading index={index} title="Certification" />
              <EntryActions
                label="certification entry"
                canMoveUp={index > 0}
                canMoveDown={index < list.length - 1}
                onMoveUp={() =>
                  dispatch({
                    type: "entry-move",
                    section: "certifications",
                    id: entry.id,
                    direction: -1,
                  })
                }
                onMoveDown={() =>
                  dispatch({
                    type: "entry-move",
                    section: "certifications",
                    id: entry.id,
                    direction: 1,
                  })
                }
                onRemove={() =>
                  dispatch({ type: "entry-remove", section: "certifications", id: entry.id })
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Certification name"
                value={entry.name}
                onChange={(event) =>
                  dispatch({
                    type: "entry-update",
                    section: "certifications",
                    id: entry.id,
                    patch: { name: event.target.value },
                  })
                }
                inputProps={{ maxLength: 200 }}
              />
              <TextField
                label="Issuer"
                value={entry.issuer}
                onChange={(event) =>
                  dispatch({
                    type: "entry-update",
                    section: "certifications",
                    id: entry.id,
                    patch: { issuer: event.target.value },
                  })
                }
                inputProps={{ maxLength: 200 }}
              />
              <MonthField
                label="Issued"
                value={entry.date}
                onChange={(value) =>
                  dispatch({
                    type: "entry-update",
                    section: "certifications",
                    id: entry.id,
                    patch: { date: value },
                  })
                }
              />
              <TextField
                label="Credential URL"
                type="url"
                placeholder="https://…"
                value={entry.link}
                onChange={(event) =>
                  dispatch({
                    type: "entry-update",
                    section: "certifications",
                    id: entry.id,
                    patch: { link: event.target.value },
                  })
                }
                inputProps={{ maxLength: 500 }}
              />
            </div>
          </div>
        ))}

        <AddEntryButton
          label="Add certification"
          disabled={list.length >= MAX_ENTRIES}
          onClick={() => dispatch({ type: "entry-add", section: "certifications" })}
        />
      </div>
    </SectionCard>
  );
}

export function SkillsSection({ data, dispatch }: SectionProps) {
  return (
    <SectionCard title="Skills" hint="Tags render as chips in the resume">
      <div className="space-y-4">
        <TagInput
          label="Programming languages"
          placeholder="TypeScript, Python"
          value={data.skills.languages}
          onChange={(value) => dispatch({ type: "skills", field: "languages", value })}
        />
        <TagInput
          label="Frameworks and tools"
          placeholder="React, Next.js, Docker"
          value={data.skills.technologies}
          onChange={(value) => dispatch({ type: "skills", field: "technologies", value })}
        />
        <TagInput
          label="Databases"
          placeholder="PostgreSQL, Redis"
          value={data.skills.databases}
          onChange={(value) => dispatch({ type: "skills", field: "databases", value })}
        />
        <TagInput
          label="Spoken languages"
          placeholder="English (fluent), Spanish"
          value={data.skills.spoken}
          onChange={(value) => dispatch({ type: "skills", field: "spoken", value })}
        />
      </div>
    </SectionCard>
  );
}
