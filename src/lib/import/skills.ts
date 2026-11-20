/** Reads the Skills section, including labelled groups such as "Databases: …". */
import { suggestSkillsField } from "../ats";
import { type Skills } from "../resume-schema";
import { stripBullet } from "./patterns";

export const SKILL_LABEL =
  /^(programming |spoken |human )?languages?$|^(frameworks?|libraries|tools|technologies|tech stack|platforms|cloud|devops|databases?|data|other|soft skills|skills)(\s*(&|and|\/)\s*[a-z ]+)?$/i;

/** Which skills field a group label such as "FRAMEWORKS & TOOLS" refers to. */
export function fieldForLabel(label: string): keyof Skills | "languages-or-spoken" {
  const value = label.toLowerCase();
  if (/database|data store/.test(value)) return "databases";
  if (/spoken|human/.test(value)) return "spoken";
  if (/^(programming )?languages?$/.test(value)) return "languages-or-spoken";
  return "technologies";
}

export function parseSkills(lines: string[], dropped: string[] = []): Skills {
  const skills: Skills = {
    languages: "",
    technologies: "",
    databases: "",
    spoken: "",
  };
  const seen = new Set<string>();
  let group: ReturnType<typeof fieldForLabel> | null = null;

  const add = (raw: string) => {
    const value = raw.trim().replace(/\.$/, "");
    if (value.length >= 60) {
      dropped.push(value);
      return;
    }
    if (!value || seen.has(value.toLowerCase())) return;
    seen.add(value.toLowerCase());
    let field: keyof Skills;
    if (group === "languages-or-spoken") {
      // "Languages" is ambiguous: English/Swahili are spoken, TypeScript is not.
      field = suggestSkillsField(value) === "spoken" ? "spoken" : "languages";
    } else {
      field = group ?? suggestSkillsField(value);
    }
    skills[field] = skills[field] ? `${skills[field]}, ${value}` : value;
  };

  for (const line of lines) {
    let text = stripBullet(line);
    const labelled = text.match(/^([A-Za-z][A-Za-z &/]{2,40}):\s*(.+)$/);
    if (labelled && SKILL_LABEL.test(labelled[1].trim())) {
      group = fieldForLabel(labelled[1].trim());
      text = labelled[2];
    } else if (SKILL_LABEL.test(text.replace(/:$/, "").trim())) {
      group = fieldForLabel(text.replace(/:$/, "").trim());
      continue;
    } else if (/^[A-Za-z /&]+:\s*\S/.test(text)) {
      // An unrecognised label ("Styling & UI: …"): drop it and fall back to
      // classifying each skill, instead of keeping the previous group.
      group = null;
      text = text.replace(/^[A-Za-z /&]+:\s*/, "");
    }
    // A slash only separates skills when spaced out; "CI/CD" and "shadcn/ui" stay whole.
    for (const item of text.split(/[;|•]|,(?![^()]*\))|\s{3,}|\s\/\s/))
      add(item);
  }
  return skills;
}
