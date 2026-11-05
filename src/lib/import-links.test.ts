import { describe, expect, it } from "vitest";
import {
  classifyProjectLinks,
  linksFromHtml,
  linksFromMarkdown,
} from "./import-links";
import { parseResumeText } from "./resume-import";

describe("classifyProjectLinks", () => {
  it("separates the live demo from the repository", () => {
    expect(
      classifyProjectLinks([
        "https://github.com/ada/shop.git",
        "https://shop.vercel.app/",
      ]),
    ).toEqual({ link: "https://shop.vercel.app/", github: "https://github.com/ada/shop.git" });
  });

  it("ignores profile links and keeps the first of each kind", () => {
    expect(
      classifyProjectLinks([
        "https://www.linkedin.com/in/ada",
        "https://a.dev",
        "https://b.dev",
      ]),
    ).toEqual({ link: "https://a.dev", github: "" });
  });
});

describe("link extraction helpers", () => {
  it("reads links from Word's HTML", () => {
    const html = '<p><a href="https://a.dev/?x=1&amp;y=2">Live <b>Demo</b></a> | <a href="mailto:a@b.c">Mail</a></p>';
    expect(linksFromHtml(html)).toEqual([{ url: "https://a.dev/?x=1&y=2", label: "Live Demo" }]);
  });

  it("turns Markdown links into plain text and addresses", () => {
    const result = linksFromMarkdown("See [Live Demo](https://a.dev) and [Code](https://github.com/a/b).");
    expect(result.text).toBe("See Live Demo and Code.");
    expect(result.links.map((link) => link.url)).toEqual(["https://a.dev", "https://github.com/a/b"]);
  });
});

const CV = [
  "Alex Morgan",
  "Frontend Engineer",
  "alex@example.com",
  "LinkedIn | GitHub",
  "PROJECTS",
  "Coffee Platform — MERN Stack",
  "\uF0B7 Integrated PayPal gateways, enabling seamless payments.",
  "\uF0B7 Optimized queries and improved response times for every request",
  "Live Demo | Github",
  "Recipe App — MERN Stack",
  "\uF0B7 Developed a recipe-sharing platform with CRUD functionality.",
  "Live Demo | Github",
  "Relational Database System — SQL",
  "\uF0B7 Designed normalized schemas and complex SQL queries.",
  "Github",
  "EDUCATION",
  "High School",
].join("\n");

describe("project links", () => {
  const links = [
    { url: "https://www.linkedin.com/in/alex", label: "LinkedIn | GitHub", lineKey: "1:700" },
    { url: "https://github.com/alex", label: "LinkedIn | GitHub", lineKey: "1:700" },
    { url: "https://coffee.vercel.app/", label: "Live Demo | Github", lineKey: "1:500" },
    { url: "https://github.com/alex/coffee.git", label: "Live Demo | Github", lineKey: "1:500" },
    { url: "https://recipe.vercel.app/", label: "Live Demo | Github", lineKey: "1:400" },
    { url: "https://github.com/alex/recipe.git", label: "Live Demo | Github", lineKey: "1:400" },
    { url: "https://github.com/alex/rdms.git", label: "Github", lineKey: "1:300" },
  ];
  const { data } = parseResumeText(CV, links);

  it("gives each project its own live demo and GitHub link", () => {
    expect(data.projects.map((project) => [project.link, project.github])).toEqual([
      ["https://coffee.vercel.app/", "https://github.com/alex/coffee.git"],
      ["https://recipe.vercel.app/", "https://github.com/alex/recipe.git"],
      ["", "https://github.com/alex/rdms.git"],
    ]);
  });

  it("does not split a project at a last bullet without a full stop", () => {
    expect(data.projects).toHaveLength(3);
    expect(data.projects[0].description).toContain("every request");
  });

  it("keeps project repositories out of the personal GitHub field", () => {
    expect(data.personal.github).toBe("https://github.com/alex");
    expect(data.personal.linkedIn).toBe("https://www.linkedin.com/in/alex");
  });
});
