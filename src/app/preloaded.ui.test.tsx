// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmptyResume } from "@/lib/resume-schema";

const record = (() => {
  const data = createEmptyResume();
  data.personal.name = "Ada";
  return {
    id: "r1",
    title: "Ada CV",
    isPublic: false,
    publicSlug: null,
    createdAt: "",
    updatedAt: "",
    data,
  };
})();

vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock("@/hooks/useResumeLibrary", () => ({
  useResumeLibrary: () => ({
    items: [record],
    selectedId: "r1",
    setSelectedId: () => {},
    record,
    setRecord: () => {},
    isLoading: false,
    isLoadingRecord: false,
    error: null,
    setError: () => {},
    reload: async () => {},
  }),
}));

import { ApplicationsClient } from "@/app/(app)/dashboard/applications/ApplicationsClient";
import { CoverLettersClient } from "@/app/(app)/dashboard/cover-letters/CoverLettersClient";
import { InterviewClient } from "@/app/(app)/dashboard/interview/InterviewClient";
import { ResumesClient } from "@/app/(app)/dashboard/resumes/ResumesClient";

const stamp = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

function stubFetch() {
  const fetchMock = vi.fn(async () => new Response("{}", { status: 500 }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("career pages that arrive with their list", () => {
  it("shows applications straight away and asks for nothing", () => {
    const fetchMock = stubFetch();
    render(
      <ApplicationsClient
        initialItems={[
          {
            id: "a1",
            company: "Globex Corp",
            role: "Platform Engineer",
            status: "applied",
            url: "",
            notes: "",
            appliedAt: null,
            ...stamp,
          },
        ]}
      />,
    );
    expect(screen.getByText(/Globex Corp/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows saved cover letters straight away and asks for nothing", () => {
    const fetchMock = stubFetch();
    render(
      <CoverLettersClient
        initialLetters={[
          {
            id: "c1",
            title: "Letter for Initech",
            company: "Initech",
            role: "Dev",
            content: "Dear team",
            ...stamp,
          },
        ]}
      />,
    );
    expect(screen.getAllByText(/Initech/).length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows saved interview notes straight away and asks for nothing", () => {
    const fetchMock = stubFetch();
    render(
      <InterviewClient
        initialNotes={[
          {
            id: "n1",
            question: "Describe a hard migration you led.",
            answer: "",
            category: "behavioral",
            ...stamp,
          },
        ]}
      />,
    );
    expect(screen.getByText(/Describe a hard migration you led/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the resume list straight away and asks for nothing", () => {
    const fetchMock = stubFetch();
    render(
      <ResumesClient
        initial={{
          total: 1,
          items: [
            {
              id: "r1",
              title: "Senior Engineer CV",
              isPublic: false,
              publicSlug: null,
              ...stamp,
            },
          ],
        }}
      />,
    );
    expect(screen.getByText(/Senior Engineer CV/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still fetches when nothing was preloaded", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<ApplicationsClient />);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe(
      "/api/applications",
    );
  });
});
