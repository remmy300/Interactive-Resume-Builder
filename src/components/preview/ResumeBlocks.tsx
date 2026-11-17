import type { ReactNode } from "react";
import type {
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  ProjectEntry,
  ResumeData,
} from "@/lib/resume-schema";
import { formatMonth, formatRange } from "@/utils/Date";
import { normalizeLink } from "@/utils/Form";




export const hasText = (value: string) => value.trim().length > 0;

export function Bullets({ text }: { text: string }) {
  const lines = text
    .split("\n")
    .map((line) => line.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean);

  if (lines.length === 0) return null;

  return (
    <ul className="cv-bullets">
      {lines.map((line, index) => (
        <li key={`${index}-${line.slice(0, 12)}`}>{line}</li>
      ))}
    </ul>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="cv-section">
      <h2 className="cv-section__title">{title}</h2>
      {children}
    </section>
  );
}

export function ExperienceList({
  entries,
  isPrint,
  roleFirst = false,
}: {
  entries: ExperienceEntry[];
  isPrint: boolean;
  /** Job title in bold with the dates, company underneath. */
  roleFirst?: boolean;
}) {
  return (
    <>
      {entries.map((entry) => {
        const company = hasText(entry.company) ? (
          entry.company
        ) : (
          <span className="cv-placeholder">Company name</span>
        );
        const role = hasText(entry.role) ? (
          entry.role
        ) : (
          <span className="cv-placeholder">Your role</span>
        );
        return (
        <article className="cv-entry" key={entry.id}>
          <div className="cv-entry__row">
            <h3 className="cv-entry__title">{roleFirst ? role : company}</h3>
            <span className="cv-entry__meta">
              {hasText(entry.startDate) || hasText(entry.endDate) || entry.current
                ? formatRange(entry.startDate, entry.endDate, entry.current)
                : !isPrint && <span className="cv-placeholder">2023 – Present</span>}
            </span>
          </div>
          <p className="cv-entry__sub">{roleFirst ? company : role}</p>
          {hasText(entry.description) ? (
            <Bullets text={entry.description} />
          ) : (
            !isPrint && (
              <ul className="cv-bullets cv-placeholder">
                <li>Describe an achievement with a measurable result.</li>
              </ul>
            )
          )}
        </article>
        );
      })}
    </>
  );
}

export function EducationList({
  entries,
  isPrint,
}: {
  entries: EducationEntry[];
  isPrint: boolean;
}) {
  return (
    <>
      {entries.map((entry) => (
        <article className="cv-entry" key={entry.id}>
          <div className="cv-entry__row">
            <h3 className="cv-entry__title">
              {hasText(entry.college) ? (
                entry.college
              ) : (
                <span className="cv-placeholder">School or college</span>
              )}
            </h3>
            <span className="cv-entry__meta">
              {hasText(entry.startDate) || hasText(entry.endDate) || entry.current
                ? formatRange(entry.startDate, entry.endDate, entry.current)
                : !isPrint && <span className="cv-placeholder">2019 – 2023</span>}
            </span>
          </div>
          <p className="cv-entry__sub">
            {hasText(entry.degree) ? (
              entry.degree
            ) : (
              <span className="cv-placeholder">Degree and field of study</span>
            )}
          </p>
        </article>
      ))}
    </>
  );
}

/** Splits a leading "Tech stack: …" line off a project's bullets. */
function splitStack(description: string): { stack: string; rest: string } {
  const lines = description.split("\n");
  const first = (lines[0] ?? "").replace(/^\s*[-•*]\s*/, "");
  const match = first.match(/^tech(?:nology)? stack\s*:\s*(.+)$/i);
  if (!match) return { stack: "", rest: description };
  return { stack: match[1].trim(), rest: lines.slice(1).join("\n") };
}

function ProjectLinks({ entry }: { entry: ProjectEntry }) {
  return (
    <>
      {hasText(entry.link) && (
        <a
          className="cv-link"
          href={normalizeLink("url", entry.link)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Live demo
        </a>
      )}
      {hasText(entry.link) && hasText(entry.github) && " · "}
      {hasText(entry.github) && (
        <a
          className="cv-link"
          href={normalizeLink("url", entry.github)}
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      )}
    </>
  );
}

export function ProjectList({
  entries,
  isPrint,
  inline = false,
}: {
  entries: ProjectEntry[];
  isPrint: boolean;
  /** Title, italic stack and links on one line: "Name | Next.js, React | Live demo". */
  inline?: boolean;
}) {
  if (inline) {
    return (
      <>
        {entries.map((entry) => {
          const { stack, rest } = splitStack(entry.description);
          const hasLinks = hasText(entry.link) || hasText(entry.github);
          return (
            <article className="cv-entry" key={entry.id}>
              <p className="cv-project-line">
                <strong className="cv-entry__title">
                  {hasText(entry.title) ? (
                    entry.title
                  ) : (
                    <span className="cv-placeholder">Project name</span>
                  )}
                </strong>
                {stack && (
                  <>
                    <span className="cv-project-line__sep"> | </span>
                    <em className="cv-project-line__stack">{stack}</em>
                  </>
                )}
                {hasLinks && (
                  <>
                    <span className="cv-project-line__sep"> | </span>
                    <ProjectLinks entry={entry} />
                  </>
                )}
              </p>
              {hasText(rest) ? (
                <Bullets text={rest} />
              ) : (
                !isPrint &&
                !stack && (
                  <ul className="cv-bullets cv-placeholder">
                    <li>What it does, the stack, and the impact.</li>
                  </ul>
                )
              )}
            </article>
          );
        })}
      </>
    );
  }

  return (
    <>
      {entries.map((entry) => (
        <article className="cv-entry" key={entry.id}>
          <div className="cv-entry__row">
            <h3 className="cv-entry__title">
              {hasText(entry.title) ? (
                entry.title
              ) : (
                <span className="cv-placeholder">Project name</span>
              )}
            </h3>
            {(hasText(entry.link) || hasText(entry.github)) && (
              <span className="cv-entry__meta">
                {hasText(entry.link) && (
                  <a
                    className="cv-link"
                    href={normalizeLink("url", entry.link)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Live demo
                  </a>
                )}
                {hasText(entry.link) && hasText(entry.github) && " · "}
                {hasText(entry.github) && (
                  <a
                    className="cv-link"
                    href={normalizeLink("url", entry.github)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub
                  </a>
                )}
              </span>
            )}
          </div>
          {hasText(entry.description) ? (
            <Bullets text={entry.description} />
          ) : (
            !isPrint && (
              <ul className="cv-bullets cv-placeholder">
                <li>What it does, the stack, and the impact.</li>
              </ul>
            )
          )}
        </article>
      ))}
    </>
  );
}

export function CertificationList({
  entries,
  isPrint,
}: {
  entries: CertificationEntry[];
  isPrint: boolean;
}) {
  return (
    <>
      {entries.map((entry) => (
        <article className="cv-entry" key={entry.id}>
          <div className="cv-entry__row">
            <h3 className="cv-entry__title">
              {hasText(entry.name) ? (
                entry.name
              ) : (
                <span className="cv-placeholder">Certification</span>
              )}
            </h3>
            {hasText(entry.date) && (
              <span className="cv-entry__meta">{formatMonth(entry.date)}</span>
            )}
          </div>
          <p className="cv-entry__sub">
            {hasText(entry.issuer) ? (
              entry.issuer
            ) : (
              !isPrint && <span className="cv-placeholder">Issuing organisation</span>
            )}
            {hasText(entry.link) && (
              <>
                {" · "}
                <a
                  className="cv-link"
                  href={normalizeLink("url", entry.link)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Credential
                </a>
              </>
            )}
          </p>
        </article>
      ))}
    </>
  );
}

export function SkillsBlock({
  data,
  compact,
  flat = false,
}: {
  data: ResumeData;
  compact: boolean;
  /** One line of skills separated by bars, without group labels. */
  flat?: boolean;
}) {
  if (flat) {
    const all = [
      data.skills.languages,
      data.skills.technologies,
      data.skills.databases,
      data.skills.spoken,
    ]
      .flatMap((value) => value.split(","))
      .map((item) => item.trim())
      .filter(Boolean);
    if (all.length === 0) return null;
    return <p className="cv-skill-flat">{all.join(" | ")}</p>;
  }

  const rows = [
    { label: "Languages", value: data.skills.languages },
    { label: "Frameworks & tools", value: data.skills.technologies },
    { label: "Databases", value: data.skills.databases },
    { label: "Spoken languages", value: data.skills.spoken },
  ].filter((row) => hasText(row.value));

  if (rows.length === 0) return null;

  return (
    <>
      {rows.map((row) => {
        const tags = row.value
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);

        return (
          <div className="cv-skill-row" key={row.label}>
            <p className="cv-skill-label">{row.label}</p>
            {compact ? (
              <div className="cv-tags">
                {tags.map((tag) => (
                  <span className="cv-tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="cv-skill-values">{tags.join(", ")}</p>
            )}
          </div>
        );
      })}
    </>
  );
}

export function ContactLine({
  data,
  isPrint,
  emailFirst = false,
}: {
  data: ResumeData;
  isPrint: boolean;
  emailFirst?: boolean;
}) {
  const { personal } = data;
  const items: Array<{ key: string; label: string; href?: string }> = [];

  const phone = hasText(personal.phone)
    ? {
        key: "phone",
        label: personal.phone,
        href: `tel:${personal.phone.replace(/\s+/g, "")}`,
      }
    : null;
  const email = hasText(personal.email)
    ? { key: "email", label: personal.email, href: `mailto:${personal.email}` }
    : null;
  for (const item of emailFirst ? [email, phone] : [phone, email]) {
    if (item) items.push(item);
  }
  if (hasText(personal.location)) {
    items.push({ key: "location", label: personal.location });
  }
  if (hasText(personal.linkedIn)) {
    items.push({
      key: "linkedin",
      label: "LinkedIn",
      href: normalizeLink("url", personal.linkedIn),
    });
  }
  if (hasText(personal.github)) {
    items.push({
      key: "github",
      label: "GitHub",
      href: normalizeLink("url", personal.github),
    });
  }
  if (hasText(personal.portfolio)) {
    items.push({
      key: "portfolio",
      label: "Portfolio",
      href: normalizeLink("url", personal.portfolio),
    });
  }

  if (items.length === 0) {
    return isPrint ? null : (
      <p className="cv-contact cv-placeholder">
        email · phone · city · LinkedIn · GitHub
      </p>
    );
  }

  return (
    <p className="cv-contact">
      {items.map((item, index) => (
        <span key={item.key}>
          {index > 0 && (
            <span aria-hidden className="cv-contact__sep">
              {" · "}
            </span>
          )}
          {item.href ? <a href={item.href}>{item.label}</a> : item.label}
        </span>
      ))}
    </p>
  );
}

export function HeaderBlock({
  data,
  isPrint,
  center,
  showContact = center,
  emailFirst = false,
}: {
  data: ResumeData;
  isPrint: boolean;
  center: boolean;
  /** Contact line under the headline (off for the two-column sidebar layout). */
  showContact?: boolean;
  emailFirst?: boolean;
}) {
  return (
    <header className={`cv-header${center ? " cv-header--center" : ""}`}>
      <h1 className="cv-name">
        {hasText(data.personal.name) ? (
          data.personal.name
        ) : (
          !isPrint && <span className="cv-placeholder">Your name</span>
        )}
      </h1>
      {(hasText(data.personal.title) || !isPrint) && (
        <p className="cv-role">
          {hasText(data.personal.title) ? (
            data.personal.title
          ) : (
            <span className="cv-placeholder">Your professional title</span>
          )}
        </p>
      )}
      {showContact && (
        <ContactLine data={data} isPrint={isPrint} emailFirst={emailFirst} />
      )}
    </header>
  );
}
