import { describe, expect, it } from "vitest";
import {
  A4_HEIGHT_PX,
  countPages,
  describePages,
  getPreviewMetrics,
  lastPageFill,
  metricsFromStarts,
  paginate,
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

describe("paginate", () => {
  const block = (top: number, bottom: number, keepWithNext = false) => ({ top, bottom, keepWithNext });

  it("keeps everything on one page when it fits", () => {
    expect(paginate([block(0, 100), block(110, 300)], 500)).toEqual([0]);
  });

  it("starts the next page at the first block that does not fit", () => {
    const starts = paginate([block(0, 200), block(210, 480), block(490, 560)], 500);
    expect(starts).toEqual([0, 490]);
  });

  it("never lets a block straddle the end of a page", () => {
    const blocks = [block(0, 300), block(310, 490), block(500, 540)];
    const starts = paginate(blocks, 520);
    // The last block would end at 540 > 520, so it moves to the next page whole.
    expect(starts).toEqual([0, 500]);
  });

  it("moves a stranded heading to the next page with its content", () => {
    const blocks = [block(0, 400), block(420, 450, true), block(455, 520)];
    // The heading fits, but its first line does not, so both start the next page.
    expect(paginate(blocks, 500)).toEqual([0, 420]);
  });

  it("measures later pages from where the previous one ended", () => {
    const blocks = [block(0, 480), block(500, 900), block(910, 1400)];
    expect(paginate(blocks, 500)).toEqual([0, 500, 910]);
  });

  it("lets a block taller than a page overflow instead of looping", () => {
    expect(paginate([block(0, 2000)], 500)).toEqual([0]);
  });
});

describe("metricsFromStarts", () => {
  it("reports the page count and the fill of the last page", () => {
    const metrics = metricsFromStarts([0, 500], 750, 500);
    expect(metrics.pages).toBe(2);
    expect(metrics.lastPageFill).toBeCloseTo(0.5);
  });
});
