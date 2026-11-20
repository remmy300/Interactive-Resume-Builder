import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmptyResume } from "@/lib/resume-schema";

const record = (() => {
  const data = createEmptyResume();
  data.personal.name = "Ada";
  data.skills.technologies = "React, Redux";
  data.experience[0].company = "Acme";
  data.experience[0].role = "Frontend Developer";
  data.experience[0].description = "Built login flows in React with Redux thunks.";
  return { id: "r1", title: "Ada CV", isPublic: false, publicSlug: null, createdAt: "", updatedAt: "", data };
})();

vi.mock("@/hooks/useResumeLibrary", () => ({
  useResumeLibrary: () => ({
    items: [record], selectedId: "r1", setSelectedId: () => {}, record, setRecord: () => {},
    isLoading: false, isLoadingRecord: false, error: null, setError: () => {}, reload: async () => {},
  }),
}));

import { InterviewClient } from "@/app/(app)/dashboard/interview/InterviewClient";

const note = {
  id: "n1",
  question: "Tell me about a time you fixed a hard bug.",
  answer: "",
  category: "behavioral",
  createdAt: "",
  updatedAt: "",
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("interview prep answer review", () => {
  it("scores a written answer and flags it when it is edited afterwards", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ items: [note] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    render(<InterviewClient />);
    const box = await screen.findByPlaceholderText(/real example/i);
    const review = screen.getByRole("button", { name: /review answer/i });
    expect((review as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(box, {
      target: {
        value:
          "Our login failed after refresh, so I traced it to the token and fixed it with Redux thunks in React. Afterwards users stayed signed in and support tickets dropped.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /review answer/i }));

    await waitFor(() => expect(screen.getByLabelText(/answer review/i)).toBeTruthy());
    expect(screen.getByText(/Backed up by your resume/i)).toBeTruthy();
    expect(screen.queryByText(/changed the answer after this review/i)).toBeNull();

    fireEvent.change(box, { target: { value: "A different answer." } });
    expect(screen.getByText(/changed the answer after this review/i)).toBeTruthy();
  });
});
