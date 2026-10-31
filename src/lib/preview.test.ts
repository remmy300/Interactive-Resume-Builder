import { describe, expect, it } from "vitest";
import {
  A4_HEIGHT_PX,
  countPages,
  describePages,
  getPreviewMetrics,
  lastPageFill,
} from "./preview";

describe("countPages", () => {
  it("treats empty and single-page content as one page", () => {
    expect(countPages(0)).toBe(1);
    expect(countPages(500)).toBe(1);
    expect(countPages(A4_HEIGHT_PX)).toBe(1);
  });

  it("counts overflow onto additional pages", () => {
    expect(countPages(A4_HEIGHT_PX + 1)).toBe(1);
    expect(countPages(A4_HEIGHT_PX + 10)).toBe(2);
    expect(countPages(A4_HEIGHT_PX * 2)).toBe(2);
    expect(countPages(A4_HEIGHT_PX * 2 + 10)).toBe(3);
  });
});

describe("lastPageFill", () => {
  it("reports how full the last page is", () => {
    expect(lastPageFill(A4_HEIGHT_PX / 2)).toBeCloseTo(0.5);
    expect(lastPageFill(A4_HEIGHT_PX)).toBe(1);
    expect(lastPageFill(A4_HEIGHT_PX * 1.25)).toBeCloseTo(0.25);
  });
});

describe("getPreviewMetrics", () => {
  it("combines the page count and fill", () => {
    const metrics = getPreviewMetrics(A4_HEIGHT_PX * 1.5);
    expect(metrics.pages).toBe(2);
    expect(metrics.lastPageFill).toBeCloseTo(0.5);
    expect(metrics.contentHeight).toBe(A4_HEIGHT_PX * 1.5);
  });

  it("formats page labels", () => {
    expect(describePages(1)).toBe("1 page");
    expect(describePages(3)).toBe("3 pages");
  });
});
