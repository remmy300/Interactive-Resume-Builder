"use client";

import TextField from "@mui/material/TextField";
import BulletEditor from "./BulletEditor";
import EntryActions from "./EntryActions";
import SectionCard from "./SectionCard";
import { AddEntryButton, DateRangeFields, EmptyList, EntryHeading, MAX_ENTRIES, type SectionProps } from "./EditorShared";

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


