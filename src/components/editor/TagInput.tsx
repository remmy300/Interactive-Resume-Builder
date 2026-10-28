"use client";

import { useState } from "react";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";

interface TagInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function parse(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function join(tags: string[]): string {
  return tags.join(", ");
}

export function TagInput({ label, value, onChange, placeholder }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const tags = parse(value);

  const addTags = (raw: string) => {
    const additions = parse(raw);
    if (additions.length === 0) {
      setDraft("");
      return;
    }
    const next = [...tags];
    for (const tag of additions) {
      if (!next.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
        next.push(tag);
      }
    }
    onChange(join(next));
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <TextField
        label={label}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            addTags(draft);
          }
          if (event.key === "Backspace" && draft === "" && tags.length > 0) {
            onChange(join(tags.slice(0, -1)));
          }
        }}
        onBlur={() => addTags(draft)}
        placeholder={placeholder ?? "Type and press Enter"}
        fullWidth
        helperText="Press Enter after each item. Use commas to paste a list."
      />
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              onDelete={() =>
                onChange(join(tags.filter((item) => item !== tag)))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TagInput;
