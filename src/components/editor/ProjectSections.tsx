"use client";

import TextField from "@mui/material/TextField";
import BulletEditor from "./BulletEditor";
import EntryActions from "./EntryActions";
import SectionCard from "./SectionCard";
import { AddEntryButton, EmptyList, EntryHeading, MAX_ENTRIES, MonthField, type SectionProps } from "./EditorShared";

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


