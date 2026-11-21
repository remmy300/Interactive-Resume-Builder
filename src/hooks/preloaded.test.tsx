// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PreloadedLibrary } from "@/lib/resume-preload";
import { createEmptyResume } from "@/lib/resume-schema";
import { useResumeEditor } from "./useResumeEditor";
import { useResumeLibrary } from "./useResumeLibrary";

function preloaded(): PreloadedLibrary {
  const data = createEmptyResume();
  data.personal.name = "Ada Lovelace";
  data.personal.email = "ada@example.com";
  const summary = {
    isPublic: false,
    publicSlug: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  };
  return {
    items: [
      { id: "r1", title: "Ada CV", ...summary },
      { id: "r2", title: "Older CV", ...summary },
    ],
    record: { id: "r1", title: "Ada CV", ...summary, data },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("pages that arrive with their data", () => {
  it("opens the library complete and makes no request", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useResumeLibrary(preloaded()));

    // Complete on the very first render: no loading state, no waterfall.
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isLoadingRecord).toBe(false);
    expect(result.current.items).toHaveLength(2);
    expect(result.current.selectedId).toBe("r1");
    expect(result.current.record?.data.personal.name).toBe("Ada Lovelace");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still loads the record when the user picks another resume", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ ...preloaded().items[1], data: createEmptyResume() }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(() => useResumeLibrary(preloaded()));
    result.current.setSelectedId("r2");
    rerender();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe("/api/resumes/r2");
  });

  it("falls back to fetching when nothing was preloaded", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ items: [], total: 0, nextSkip: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useResumeLibrary());
    expect(result.current.isLoading).toBe(true);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it("opens the editor on the preloaded resume without a request or a loading flash", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useResumeEditor(null, { initial: preloaded() }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.resumeId).toBe("r1");
    expect(result.current.title).toBe("Ada CV");
    expect(result.current.data.personal.name).toBe("Ada Lovelace");
    expect(result.current.items).toHaveLength(2);
    // Opening it is not an edit.
    expect(result.current.isDirty).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("opens an empty editor when the user has no resume", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useResumeEditor("new", { initial: { items: [], record: null } }),
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.resumeId).toBeNull();
    expect(result.current.isDirty).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
