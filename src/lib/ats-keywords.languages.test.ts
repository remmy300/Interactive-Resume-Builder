import { describe, expect, it } from "vitest";
import { extractKeywords, matchKeywords } from "./ats";
import { looksNonEnglish } from "./ats-keywords";
import { createEmptyResume } from "./resume-schema";

const GERMAN_POSTING = `NotarPartner baut die digitale Arbeitsumgebung für das deutsche Notariat – von Notaren für Notare. Über 140 Kanzleien arbeiten bereits mit uns, dazu kommen digitale Akten & KI-Assistent.

Du bist einer der ersten festen Engineers in diesem Team – mit echtem Einfluss auf Architektur, Produkt und Tempo.

Aufgaben

- Du entwickelst Features end-to-end: von der Idee über das React/Next.js-Frontend bis zu den Node.js-Services und dem Datenmodell in PostgreSQL.

- Du baust KI-Funktionen ins Produkt ein – Urkundengenerierung, Dokumentenanalyse, agentische Workflows.

- Du prägst unsere Engineering-Standards mit: Code Reviews, Architekturentscheidungen und der Aufbau eines Teams.

Qualifikation

- Keine förmliche Berufserfahrung notwendig, stattdessen zeige uns spannende Projekte, die du als Fullstack Engineer eigenverantwortlich umgesetzt hast.

- Sehr sicher in React, Next.js, TypeScript und Node.js; solide Kenntnisse in PostgreSQL (Supabase) und/oder NoSQL-Datenbanken.

- Deutsch auf muttersprachlichem Niveau (C2). Wohnsitz in Deutschland und Bereitschaft zu gelegentlichen Teamtreffen.

Benefits

- Gehalt: 50.000 – 65.000 € Fixum inkl. VSOP

- Modernste KI-Tools als fester Bestandteil des Workflows.

- Starkes Team (3 leidenschaftliche Engineers, Product-Owner, Notar, Sales-Team) und regelmäßige Teamtreffen in Hamburg, Berlin.`;

describe("postings in another language", () => {
  const terms = extractKeywords(GERMAN_POSTING).map((keyword) => keyword.display);

  it("is recognised as non-English, and English is not", () => {
    expect(looksNonEnglish(GERMAN_POSTING)).toBe(true);
    expect(
      looksNonEnglish(
        "We are looking for a developer to join our team. You will build web applications with React and have experience with the web, and you are keen to learn.",
      ),
    ).toBe(false);
  });

  it("keeps the real technologies, including the German word for AI", () => {
    for (const skill of ["React", "Next.js", "Node.js", "PostgreSQL", "TypeScript", "Supabase", "NoSQL", "AI", "Code Review", "Full Stack"]) {
      expect(terms).toContain(skill);
    }
  });

  it("does not turn ordinary words, names or levels into skills", () => {
    for (const fake of ["bereits", "C2", "NotarPartner", "XNP", "Microsoft Teams", "Kanzleien"]) {
      expect(terms).not.toContain(fake);
    }
  });

  it("matches an English resume against a German posting", () => {
    const data = createEmptyResume();
    data.skills.technologies = "React, Next.js, Node.js, AI-assisted development";
    data.skills.databases = "PostgreSQL";
    const result = matchKeywords(data, extractKeywords(GERMAN_POSTING));
    expect(result.matched).toEqual(expect.arrayContaining(["React", "Next.js", "PostgreSQL"]));
    expect(result.missing).toContain("Supabase");
  });
});

describe("English postings keep their behaviour", () => {
  it("still reads Teams as Microsoft Teams in English", () => {
    const terms = extractKeywords(
      "We are looking for an analyst. Requirements: Excel, SQL and Teams. You will work with the finance team and have good experience with reporting.",
    ).map((keyword) => keyword.display);
    expect(terms).toContain("Microsoft Teams");
  });
});

describe("codes that look like technologies", () => {
  it("does not read a visa type as a skill", () => {
    const terms = extractKeywords(
      "Requirements: Ruby, Rails and TypeScript. We welcome and sponsor students under J1 visas. Candidates on H-1B or F1 status are welcome.",
    ).map((keyword) => keyword.display);
    expect(terms).toEqual(expect.arrayContaining(["Ruby", "TypeScript"]));
    for (const fake of ["J1", "H-1B", "H1B", "F1"]) expect(terms).not.toContain(fake);
  });

  it("counts a Software Developer role as software development", () => {
    const data = createEmptyResume();
    data.experience[0].role = "Software Developer";
    data.experience[0].company = "Acme";
    const result = matchKeywords(
      data,
      extractKeywords("Required: software development experience and Ruby."),
    );
    expect(result.matched).toContain("Software Development");
    expect(result.missing).toContain("Ruby");
  });
});
