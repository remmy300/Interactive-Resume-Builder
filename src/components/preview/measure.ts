import { paginate, type LayoutBlock } from "@/lib/preview";

// The smallest pieces of a resume that must never be cut in half.
const BLOCKS = [
  ".cv-header",
  ".cv-bullets li",
  ".cv-section__title",
  ".cv-entry__row",
  ".cv-entry__sub",
  ".cv-project-line",
  ".cv-section > p",
  ".cv-skill-flat",
  ".cv-skill-row",
  ".cv-tags",
].join(",");

// Headings and title rows stay with the content they introduce.
const KEEP_WITH_NEXT =
  ".cv-header, .cv-section__title, .cv-entry__row, .cv-entry__sub, .cv-project-line";

export const sameStarts = (a: number[], b: number[]) =>
  a.length === b.length && a.every((value, index) => Math.abs(value - b[index]) < 0.5);

/**
 * Measures a rendered resume and returns where each page starts (in the
 * resume's own, unscaled pixels). `scale` is the CSS scale applied by an
 * ancestor, so rectangles can be converted back.
 */
export function measurePageStarts(
  content: HTMLElement,
  scale: number,
  windowHeight: number,
): number[] {
  const origin = content.getBoundingClientRect().top;
  const blocks: LayoutBlock[] = Array.from(
    content.querySelectorAll<HTMLElement>(BLOCKS),
  ).map((element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: (rect.top - origin) / scale,
      bottom: (rect.bottom - origin) / scale,
      keepWithNext: element.matches(KEEP_WITH_NEXT),
    };
  });
  return paginate(blocks, windowHeight);
}
