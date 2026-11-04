"use client";

import TextField from "@mui/material/TextField";
import type { ResumeData } from "@/lib/resume-schema";
import SectionCard from "./SectionCard";
import TagInput from "./TagInput";
import type { SectionProps } from "./EditorShared";

export function PersonalSection({ data, dispatch }: SectionProps) {
  const field = (key: keyof ResumeData["personal"]) => ({
    value: data.personal[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      dispatch({ type: "personal", field: key, value: event.target.value }),
  });

  return (
    <SectionCard
      id="personal"
      title="Personal details"
      hint="Name, role, and how recruiters reach you"
      defaultExpanded
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Full name" required {...field("name")} slotProps={{ htmlInput: { maxLength: 120 } }} />
        <TextField
          label="Professional title"
          placeholder="Frontend Developer"
          {...field("title")}
          slotProps={{ htmlInput: { maxLength: 120 } }}
        />
        <TextField label="Email" type="email" {...field("email")} slotProps={{ htmlInput: { maxLength: 254 } }} />
        <TextField label="Phone" type="tel" {...field("phone")} slotProps={{ htmlInput: { maxLength: 50 } }} />
        <TextField label="Location" placeholder="City, Country" {...field("location")} slotProps={{ htmlInput: { maxLength: 120 } }} />
        <TextField label="LinkedIn" placeholder="linkedin.com/in/you" {...field("linkedIn")} slotProps={{ htmlInput: { maxLength: 500 } }} />
        <TextField label="GitHub" placeholder="github.com/you" {...field("github")} slotProps={{ htmlInput: { maxLength: 500 } }} />
        <TextField label="Portfolio" placeholder="you.dev" {...field("portfolio")} slotProps={{ htmlInput: { maxLength: 500 } }} />
      </div>
    </SectionCard>
  );
}

export function SummarySection({ data, dispatch }: SectionProps) {
  return (
    <SectionCard id="summary" title="Summary" hint="Two or three sentences about your focus">
      <TextField
        label="Professional summary"
        value={data.summary}
        onChange={(event) => dispatch({ type: "summary", value: event.target.value })}
        placeholder="Frontend developer with 4 years of experience building accessible React applications…"
        multiline
        minRows={4}
        fullWidth
        helperText={`${data.summary.length}/2000 characters`}
        slotProps={{ htmlInput: { maxLength: 2000 } }}
      />
    </SectionCard>
  );
}


export function SkillsSection({ data, dispatch }: SectionProps) {
  return (
    <SectionCard id="skills" title="Skills" hint="Tags render as chips in the resume">
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

