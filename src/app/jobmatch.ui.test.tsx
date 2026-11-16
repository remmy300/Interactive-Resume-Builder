// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmptyResume } from "@/lib/resume-schema";

const record = (() => {
  const data = createEmptyResume();
  data.personal.name = "Ada";
  data.skills.technologies = "React, Node.js";
  data.experience[0].company = "Acme";
  data.experience[0].role = "Developer";
  data.experience[0].description = "Built dashboards with React used by 40 teams.";
  return { id: "r1", title: "Ada CV", isPublic: false, publicSlug: null, createdAt: "", updatedAt: "", data };
})();

vi.mock("next/link", () => ({ default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock("@/hooks/useResumeLibrary", () => ({
  useResumeLibrary: () => ({
    items: [record], selectedId: "r1", setSelectedId: () => {}, record, setRecord: () => {},
    isLoading: false, isLoadingRecord: false, error: null, setError: () => {}, reload: async () => {},
  }),
}));

import { JobMatchClient } from "@/app/(app)/dashboard/job-match/JobMatchClient";

afterEach(cleanup);

describe("job match page", () => {
  it("reacts to a pasted job description", async () => {
    render(<JobMatchClient />);
    const box = screen.getByLabelText(/job description/i);
    fireEvent.change(box, {
      target: { value: "Frontend Developer. Requirements: React, TypeScript, Next.js, Docker and PostgreSQL experience." },
    });
    await waitFor(() => expect(screen.getByText(/Weighted requirement match/i)).toBeTruthy());
    expect(screen.getByText(/Missing skills/i)).toBeTruthy();
  });
});
