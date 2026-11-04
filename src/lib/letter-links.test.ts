import { describe, expect, it } from "vitest";
import {
  cleanLinkTitle,
  insertLink,
  normalizeLinkUrl,
  parseLetter,
  toHtml,
  toPlainText,
} from "./letter-links";

describe("normalizeLinkUrl", () => {
  it("adds https to a bare domain", () => {
    expect(normalizeLinkUrl("github.com/ada")).toBe("https://github.com/ada");
  });

  it("keeps http and https links", () => {
    expect(normalizeLinkUrl("http://ada.dev")).toBe("http://ada.dev/");
  });

  it("rejects other schemes, spaces, and non-domains", () => {
    expect(normalizeLinkUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeLinkUrl("mailto:a@b.com")).toBeNull();
    expect(normalizeLinkUrl("not a link")).toBeNull();
    expect(normalizeLinkUrl("localhost")).toBeNull();
    expect(normalizeLinkUrl("")).toBeNull();
  });

  it("escapes brackets so the link syntax cannot break", () => {
    expect(normalizeLinkUrl("https://a.com/x(1)")).toBe("https://a.com/x%281%29");
  });
});

describe("letter links", () => {
  it("cleans titles", () => {
    expect(cleanLinkTitle("  My [site]\nhere ")).toBe("My site here");
  });

  it("inserts at the cursor and replaces a selection", () => {
    const inserted = insertLink("See my work", 7, 11, "Portfolio", "https://a.com/");
    expect(inserted.content).toBe("See my [Portfolio](https://a.com/)");
    expect(inserted.cursor).toBe(inserted.content.length);
  });

  it("shows the title instead of the address", () => {
    const content = "Visit [My portfolio](https://ada.dev/) today.";
    expect(parseLetter(content)).toEqual([
      { type: "text", text: "Visit " },
      { type: "link", text: "My portfolio", href: "https://ada.dev/" },
      { type: "text", text: " today." },
    ]);
    expect(toPlainText(content)).toBe("Visit My portfolio (https://ada.dev/) today.");
    expect(toHtml(content)).toContain('<a href="https://ada.dev/">My portfolio</a>');
  });

  it("leaves unrelated brackets alone", () => {
    expect(parseLetter("[add a result] later")).toEqual([
      { type: "text", text: "[add a result] later" },
    ]);
  });
});
