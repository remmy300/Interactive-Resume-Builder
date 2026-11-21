import { beforeEach, describe, expect, it, vi } from "vitest";

const { application, coverLetter, interviewNote, resume } = vi.hoisted(() => ({
  application: { findMany: vi.fn() },
  coverLetter: { findMany: vi.fn() },
  interviewNote: { findMany: vi.fn() },
  resume: { findMany: vi.fn(), count: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { application, coverLetter, interviewNote, resume },
}));

import {
  preloadApplications,
  preloadCoverLetters,
  preloadInterviewNotes,
  preloadResumeList,
} from "./career-preload";

const created = new Date("2026-01-01T00:00:00Z");
const updated = new Date("2026-01-02T00:00:00Z");

beforeEach(() => {
  for (const model of [application, coverLetter, interviewNote, resume]) {
    for (const fn of Object.values(model)) fn.mockReset();
  }
});

describe("career page preloads", () => {
  it("returns applications as plain values, newest first, for this user only", async () => {
    application.findMany.mockResolvedValue([
      {
        id: "a1",
        userId: "u1",
        company: "Acme",
        role: "Developer",
        status: "applied",
        url: "",
        notes: "",
        appliedAt: created,
        createdAt: created,
        updatedAt: updated,
      },
    ]);
    const items = await preloadApplications("u1");

    expect(items[0]).toEqual({
      id: "a1",
      company: "Acme",
      role: "Developer",
      status: "applied",
      url: "",
      notes: "",
      appliedAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    // Nothing the page does not need crosses to the browser.
    expect(items[0]).not.toHaveProperty("userId");
    const args = application.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ userId: "u1" });
    expect(args.take).toBe(200);
    expect(JSON.parse(JSON.stringify(items))).toEqual(items);
  });

  it("keeps a missing application date as null", async () => {
    application.findMany.mockResolvedValue([
      {
        id: "a1",
        company: "A",
        role: "R",
        status: "saved",
        url: "",
        notes: "",
        appliedAt: null,
        createdAt: created,
        updatedAt: updated,
      },
    ]);
    expect((await preloadApplications("u1"))[0].appliedAt).toBeNull();
  });

  it("returns cover letters and interview notes the same way", async () => {
    coverLetter.findMany.mockResolvedValue([
      {
        id: "c1",
        userId: "u1",
        title: "T",
        company: "Acme",
        role: "Dev",
        content: "Dear team",
        createdAt: created,
        updatedAt: updated,
      },
    ]);
    interviewNote.findMany.mockResolvedValue([
      {
        id: "n1",
        userId: "u1",
        question: "Why?",
        answer: "Because",
        category: "behavioral",
        createdAt: created,
        updatedAt: updated,
      },
    ]);

    const [letters, notes] = await Promise.all([
      preloadCoverLetters("u1"),
      preloadInterviewNotes("u1"),
    ]);
    expect(letters[0]).toMatchObject({
      id: "c1",
      content: "Dear team",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    expect(letters[0]).not.toHaveProperty("userId");
    expect(notes[0]).toMatchObject({
      id: "n1",
      category: "behavioral",
      answer: "Because",
    });
    expect(coverLetter.findMany.mock.calls[0][0].take).toBe(100);
    expect(interviewNote.findMany.mock.calls[0][0].where).toEqual({
      userId: "u1",
    });
  });

  it("returns the first page of live resumes with the total, never deleted ones", async () => {
    resume.findMany.mockResolvedValue([
      {
        id: "r1",
        title: "CV",
        isPublic: true,
        publicSlug: "ada",
        createdAt: created,
        updatedAt: updated,
      },
    ]);
    resume.count.mockResolvedValue(7);

    const result = await preloadResumeList("u1");
    expect(result.total).toBe(7);
    expect(result.items[0]).toEqual({
      id: "r1",
      title: "CV",
      isPublic: true,
      publicSlug: "ada",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    expect(resume.findMany.mock.calls[0][0].where).toEqual({
      userId: "u1",
      deletedAt: null,
    });
    expect(resume.count.mock.calls[0][0].where).toEqual({
      userId: "u1",
      deletedAt: null,
    });
  });
});
