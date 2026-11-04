// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeResumeData } from "@/lib/resume-schema";
import { useResumeEditor } from "./useResumeEditor";

/** Minimal in-memory stand-in for the resumes API, including jsonb key reordering. */
function fakeServer() {
  let record: Record<string, unknown> | null = null;
  const calls: string[] = [];
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  const handler = async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push(`${method} ${url}`);
    if (url.startsWith("/api/resumes?")) {
      return respond({ items: [], total: 0, nextSkip: null });
    }
    if (method === "POST" || method === "PATCH") {
      const body = JSON.parse(String(init?.body));
      // Postgres jsonb stores keys sorted, so the echo has a different key order.
      const sorted = JSON.parse(
        JSON.stringify(body.data, (_k, v) =>
          v && typeof v === "object" && !Array.isArray(v)
            ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
            : v,
        ),
      );
      record = {
        id: "r1",
        title: body.title,
        data: normalizeResumeData(sorted),
        isPublic: false,
        publicSlug: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date(Date.now() + calls.length).toISOString(),
      };
      return respond(record, method === "POST" ? 201 : 200);
    }
    return respond({ error: "unexpected" }, 500);
  };
  return { handler, calls };
}

describe("useResumeEditor saving", () => {
  let server: ReturnType<typeof fakeServer>;

  beforeEach(() => {
    server = fakeServer();
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => server.handler(url, init)),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  async function fillValidResume(result: { current: ReturnType<typeof useResumeEditor> }) {
    act(() => {
      result.current.dispatch({ type: "personal", field: "name", value: "Ada Lovelace" });
      result.current.dispatch({ type: "personal", field: "email", value: "ada@example.com" });
      result.current.dispatch({ type: "skills", field: "technologies", value: "React" });
    });
  }

  it("saves a new resume once and settles", async () => {
    const { result } = renderHook(() => useResumeEditor());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await fillValidResume(result);

    let ok = false;
    await act(async () => {
      ok = await result.current.save();
    });
    expect(ok).toBe(true);

    // Give any runaway autosave time to fire (delay is 1.2s).
    await new Promise((resolve) => setTimeout(resolve, 2500));

    expect(result.current.isSaving).toBe(false);
    expect(result.current.isDirty).toBe(false);
    expect(server.calls.filter((c) => c.startsWith("POST") || c.startsWith("PATCH"))).toHaveLength(1);
  }, 10000);

  it("does not keep saving a title with trailing whitespace", async () => {
    const { result } = renderHook(() => useResumeEditor());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await fillValidResume(result);
    act(() => result.current.setTitle("My CV  "));

    await act(async () => {
      await result.current.save();
    });
    await new Promise((resolve) => setTimeout(resolve, 3500));

    expect(result.current.isDirty).toBe(false);
    expect(server.calls.filter((c) => c.startsWith("POST") || c.startsWith("PATCH"))).toHaveLength(1);
  }, 10000);

  it("waits for an in-flight save instead of ignoring the click", async () => {
    const { result } = renderHook(() => useResumeEditor());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await fillValidResume(result);

    let first: Promise<boolean>;
    let second: Promise<boolean>;
    await act(async () => {
      first = result.current.save();
      second = result.current.save();
      await Promise.all([first, second]);
    });
    expect(await second!).toBe(true);
    expect(result.current.isSaving).toBe(false);
  });
});
