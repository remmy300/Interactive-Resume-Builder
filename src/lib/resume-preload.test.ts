import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyResume } from "./resume-schema";

const { findMany, findFirst } = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { resume: { findMany, findFirst } },
}));

import { preloadResumeLibrary } from "./resume-preload";

const row = (id: string, title = id) => ({
  id,
  title,
  isPublic: false,
  publicSlug: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-02T00:00:00Z"),
  data: createEmptyResume(),
});

beforeEach(() => {
  findMany.mockReset();
  findFirst.mockReset();
});

describe("preloadResumeLibrary", () => {
  it("returns the list and the latest resume, as plain serialisable values", async () => {
    findMany.mockResolvedValue([row("a"), row("b")]);
    findFirst.mockResolvedValue(row("a"));

    const result = await preloadResumeLibrary("u1");

    expect(result.items.map((item) => item.id)).toEqual(["a", "b"]);
    expect(result.record?.id).toBe("a");
    // Dates cross the server/client boundary as strings.
    expect(result.items[0].updatedAt).toBe("2026-01-02T00:00:00.000Z");
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it("only reads the signed-in user's live resumes", async () => {
    findMany.mockResolvedValue([]);
    findFirst.mockResolvedValue(null);
    await preloadResumeLibrary("u1");

    const where = findMany.mock.calls[0][0].where;
    expect(where).toEqual({ userId: "u1", deletedAt: null });
    expect(findFirst.mock.calls[0][0].where).toEqual({ userId: "u1", deletedAt: null });
  });

  it("opens the requested resume when it exists, otherwise the latest", async () => {
    findMany.mockResolvedValue([row("a"), row("b")]);
    findFirst.mockImplementation(async (args: { where: { id?: string } }) =>
      args.where.id === "b" ? row("b") : args.where.id ? null : row("a"),
    );

    expect((await preloadResumeLibrary("u1", "b")).record?.id).toBe("b");
    expect((await preloadResumeLibrary("u1", "someone-elses")).record?.id).toBe("a");
  });

  it("opens no resume when a new one is requested", async () => {
    findMany.mockResolvedValue([row("a")]);
    const result = await preloadResumeLibrary("u1", "new");
    expect(result.record).toBeNull();
    expect(result.items).toHaveLength(1);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("starts every query before waiting for any of them", async () => {
    const order: string[] = [];
    findMany.mockImplementation(async () => {
      order.push("list-start");
      await Promise.resolve();
      order.push("list-end");
      return [];
    });
    findFirst.mockImplementation(async () => {
      order.push("record-start");
      await Promise.resolve();
      order.push("record-end");
      return null;
    });
    await preloadResumeLibrary("u1");
    expect(order.slice(0, 2)).toEqual(["list-start", "record-start"]);
  });
});
