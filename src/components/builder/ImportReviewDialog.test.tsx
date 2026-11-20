import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ImportReviewDialog, { hasReviewItems, type ImportReview } from "./ImportReviewDialog";
import { parseResumeText } from "@/lib/resume-import";

afterEach(cleanup);

const review = (text: string): ImportReview => {
  const { rejected, unassigned, incomplete, confidence } = parseResumeText(text);
  return { rejected, unassigned, incomplete, confidence };
};

const CV = [
  "Sam Ndungu",
  "Software Engineer",
  "sam@example.com | +254 700 123 456 | Nairobi, Kenya",
  "EXPERIENCE",
  "Software Engineer | Acme Ltd | Jan 2022 – Jan 2020",
  "• Built the checkout flow used by 20,000 customers.",
  "Interests",
  "Chess and long-distance running",
].join("\n");

describe("import review", () => {
  it("shows text that could not be placed, with a copy button", () => {
    const writeText = vi.fn(async () => {});
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ImportReviewDialog open review={review(CV)} onClose={() => {}} />);
    expect(screen.getByText(/Not imported/i)).toBeTruthy();
    expect(screen.getByText("Chess and long-distance running")).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "Copy" })[0]);
    expect(writeText).toHaveBeenCalledWith("Chess and long-distance running");
  });

  it("lists date problems so they are not buried", () => {
    render(<ImportReviewDialog open review={review(CV)} onClose={() => {}} />);
    expect(screen.getByText(/end date is before the start date/i)).toBeTruthy();
  });

  it("has nothing to show for a clean import", () => {
    const clean = review(
      [
        "Ada Lovelace",
        "Software Engineer",
        "ada@example.com | +44 20 7946 0958 | London, UK",
        "EXPERIENCE",
        "Software Engineer | Acme | Jan 2020 – Dec 2022",
        "• Built the billing system for the finance team.",
        "EDUCATION",
        "BSc Mathematics | University of London | 2015 – 2018",
      ].join("\n"),
    );
    expect(hasReviewItems(clean)).toBe(false);
  });
});
