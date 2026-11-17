// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmptyResume } from "@/lib/resume-schema";

const record = (() => {
  const data = createEmptyResume();
  data.personal = { ...data.personal, name: "Ada", email: "ada@example.com", title: "Developer", phone: "1" };
  data.summary = "Developer building web applications with React and TypeScript for several teams.";
  data.experience[0] = {
    ...data.experience[0],
    company: "Acme",
    role: "Developer",
    startDate: "2022-01",
    current: true,
    description: [
      "Built login pages in React and TypeScript for the customer portal.",
      "Built a profile page with Redux Toolkit and loading states.",
      "Built a billing dashboard that shows invoices and payment history.",
    ].join("\n"),
  };
  data.skills = { languages: "TypeScript, Python", technologies: "React, Django, Rust, Go, Ruby", databases: "PostgreSQL", spoken: "" };
  return { id: "r1", title: "Ada CV", isPublic: false, publicSlug: null, createdAt: "", updatedAt: "2026-01-01T00:00:00.000Z", data };
})();

const setRecord = vi.fn();
vi.mock("next/link", () => ({ default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock("@/hooks/useResumeLibrary", () => ({
  useResumeLibrary: () => ({
    items: [record], selectedId: "r1", setSelectedId: () => {}, record, setRecord,
    isLoading: false, isLoadingRecord: false, error: null, setError: () => {}, reload: async () => {},
  }),
}));

import { CvCheckClient } from "@/app/(app)/dashboard/cv-check/CvCheckClient";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  setRecord.mockClear();
});

describe("CV check one-click fixes", () => {
  it("removes the skills you untick nothing for, and saves the resume", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ ...record, data: body.data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CvCheckClient />);
    fireEvent.click(await screen.findByRole("button", { name: /skills to remove/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^Remove \d+$/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/resumes/r1");
    expect(init.method).toBe("PATCH");
    const sent = JSON.parse(String(init.body));
    expect(sent.updatedAt).toBe(record.updatedAt);
    expect(sent.data.skills.languages).toBe("TypeScript");
    expect(sent.data.skills.technologies).toBe("React");
    await waitFor(() => expect(setRecord).toHaveBeenCalled());
    expect(await screen.findByText(/skills removed/i)).toBeTruthy();
  });

  it("lets you edit a reworded opening before it is applied", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ ...record, data: body.data }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CvCheckClient />);
    fireEvent.click(await screen.findByRole("button", { name: /reworded opening/i }));
    const field = await screen.findByLabelText("Reworded bullet");
    fireEvent.change(field, { target: { value: "Delivered a billing dashboard that shows invoices and payment history." } });
    fireEvent.click(screen.getByRole("button", { name: /^Apply 1$/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const sent = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(sent.data.experience[0].description).toContain("Delivered a billing dashboard");
    expect(sent.data.experience[0].description).toContain("Built login pages");
  });
});
