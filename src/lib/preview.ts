// A4 at 96dpi. Used only for on-screen scaling, never for print output.
export const A4_WIDTH_PX = 793.7;
export const A4_HEIGHT_PX = 1122.5;

// 297mm renders as 1122.52px, so ignore up to 2px of rounding when deciding
// whether content has actually overflowed onto another page.
const PAGE_TOLERANCE_PX = 2;

/** Number of A4 pages needed for a rendered document at 96dpi. */
export function countPages(
  contentHeight: number,
  pageHeight = A4_HEIGHT_PX,
): number {
  if (!Number.isFinite(contentHeight) || contentHeight <= 0) return 1;
  return Math.max(1, Math.ceil((contentHeight - PAGE_TOLERANCE_PX) / pageHeight));
}

/**
 * How full the last page is (0–1). Useful for warning when content ends just
 * past a page boundary and could look clipped in a PDF viewer.
 */
export function lastPageFill(
  contentHeight: number,
  pageHeight = A4_HEIGHT_PX,
): number {
  if (!Number.isFinite(contentHeight) || contentHeight <= 0) return 0;
  const remainder = contentHeight % pageHeight;
  if (remainder === 0) return 1;
  if (remainder <= PAGE_TOLERANCE_PX) return 0;
  return remainder / pageHeight;
}

export function describePages(count: number): string {
  if (count <= 1) return "1 page";
  return `${count} pages`;
}

export interface PreviewMetrics {
  pages: number;
  lastPageFill: number;
  contentHeight: number;
}

export function getPreviewMetrics(contentHeight: number): PreviewMetrics {
  return {
    pages: countPages(contentHeight),
    lastPageFill: lastPageFill(contentHeight),
    contentHeight,
  };
}

/* -------------------------------------------------------------------------- */
/*                              Pages with margins                            */
/* -------------------------------------------------------------------------- */

export type PageSizeId = "a4" | "letter";

/** Page sizes at 96dpi, plus the CSS values used for printing. */
export const PAGE_SIZES: Record<
  PageSizeId,
  { label: string; widthPx: number; heightPx: number; width: string; height: string }
> = {
  a4: { label: "A4", widthPx: 793.7, heightPx: 1122.5, width: "210mm", height: "297mm" },
  letter: {
    label: "US Letter",
    widthPx: 816,
    heightPx: 1056,
    width: "215.9mm",
    height: "279.4mm",
  },
};

/** Top and bottom margin on every page. Keep in sync with `@page` in globals.css. */
export const PAGE_MARGIN_MM = 14;
export const PAGE_MARGIN_PX = (PAGE_MARGIN_MM / 25.4) * 96;

/** A piece of the document that must not be split across two pages. */
export interface LayoutBlock {
  top: number;
  bottom: number;
  /** A heading or title row: it must not be left alone at the bottom of a page. */
  keepWithNext?: boolean;
}

const EPSILON = 0.5;

/**
 * Decides where each page starts so that no line, bullet or heading is cut in
 * half. Blocks are placed in order; when one does not fit in the space left on
 * the page, the page ends before it. A heading that would be stranded at the
 * bottom moves to the next page together with the block it introduces.
 */
export function paginate(blocks: LayoutBlock[], windowHeight: number): number[] {
  const sorted = [...blocks].sort((a, b) => a.top - b.top || a.bottom - b.bottom);
  const starts = [0];
  let start = 0;

  for (let index = 0; index < sorted.length; index += 1) {
    const block = sorted[index];
    if (block.bottom - start <= windowHeight + EPSILON) continue;
    // Taller than a whole page: nothing sensible to do but let it overflow.
    if (block.top <= start + EPSILON) continue;

    let breakAt = block.top;
    for (
      let above = index - 1;
      above >= 0 &&
      sorted[above].keepWithNext &&
      sorted[above].top > start + EPSILON &&
      sorted[above].bottom <= breakAt + EPSILON;
      above -= 1
    ) {
      breakAt = sorted[above].top;
    }

    start = breakAt;
    starts.push(start);
  }

  return starts;
}

/** Page count and how full the last page is, for a paginated document. */
export function metricsFromStarts(
  starts: number[],
  contentHeight: number,
  windowHeight: number,
): PreviewMetrics {
  const last = starts[starts.length - 1] ?? 0;
  const fill = windowHeight > 0 ? (contentHeight - last) / windowHeight : 0;
  return {
    pages: Math.max(1, starts.length),
    lastPageFill: Math.min(1, Math.max(0, fill)),
    contentHeight,
  };
}
