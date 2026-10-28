import { describe, expect, it } from "vitest";
import { resumeReducer } from "./resume-reducer";
import { createEmptyResume } from "./resume-schema";

describe("resumeReducer", () => {
  it("adds and removes list entries", () => {
    const initial = createEmptyResume();
    const added = resumeReducer(initial, { type: "entry-add", section: "education" });
    expect(added.education).toHaveLength(initial.education.length + 1);

    const removedId = added.education[0].id;
    const removed = resumeReducer(added, {
      type: "entry-remove",
      section: "education",
      id: removedId,
    });
    expect(removed.education).toHaveLength(added.education.length - 1);
    expect(removed.education.some((entry) => entry.id === removedId)).toBe(false);
  });

  it("moves entries and ignores out-of-bounds moves", () => {
    const initial = createEmptyResume();
    const added = resumeReducer(initial, { type: "entry-add", section: "projects" });
    const first = added.projects[0].id;
    const second = added.projects[1].id;

    const moved = resumeReducer(added, {
      type: "entry-move",
      section: "projects",
      id: second,
      direction: -1,
    });
    expect(moved.projects[0].id).toBe(second);

    const unchanged = resumeReducer(moved, {
      type: "entry-move",
      section: "projects",
      id: second,
      direction: -1,
    });
    expect(unchanged).toBe(moved);
    expect(unchanged.projects[1].id).toBe(first);
  });

  it("clears the end date when marking an entry current", () => {
    const initial = createEmptyResume();
    const id = initial.experience[0].id;
    const updated = resumeReducer(initial, {
      type: "entry-update",
      section: "experience",
      id,
      patch: { current: true, endDate: "" },
    });
    expect(updated.experience[0].current).toBe(true);
    expect(updated.experience[0].endDate).toBe("");
  });

  it("updates the template and personal fields", () => {
    const initial = createEmptyResume();
    const templated = resumeReducer(initial, { type: "template", value: "compact" });
    expect(templated.template).toBe("compact");

    const named = resumeReducer(templated, {
      type: "personal",
      field: "name",
      value: "Grace Hopper",
    });
    expect(named.personal.name).toBe("Grace Hopper");
  });
});
