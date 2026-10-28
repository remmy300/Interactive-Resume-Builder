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

interface ResumePreviewProps {
  data: ResumeData;
  /** Print copies never render placeholder copy. */
  isPrint?: boolean;
}

const hasText = (value: string) => value.trim().length > 0;

function Bullets({ text }: { text: string }) {
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="cv-section">
      <h2 className="cv-section__title">{title}</h2>
      {children}
    </section>
  );
}

function ExperienceList({
  entries,
  isPrint,
}: {
  entries: ExperienceEntry[];
  isPrint: boolean;
}) {
  return (
    <>
      {entries.map((entry) => (
        <article className="cv-entry" key={entry.id}>
          <div className="cv-entry__row">
            <h3 className="cv-entry__title">
              {hasText(entry.company) ? (
                entry.company
              ) : (
                <span className="cv-placeholder">Company name</span>
              )}
            </h3>
            <span className="cv-entry__meta">
              {hasText(entry.startDate) || hasText(entry.endDate) || entry.current
                ? formatRange(entry.startDate, entry.endDate, entry.current)
                : !isPrint && <span className="cv-placeholder">2023 – Present</span>}
            </span>
          </div>
          <p className="cv-entry__sub">
            {hasText(entry.role) ? (
              entry.role
            ) : (
              <span className="cv-placeholder">Your role</span>
            )}
          </p>
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
      ))}
    </>
  );
}

function EducationList({
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

function ProjectList({
  entries,
  isPrint,
}: {
  entries: ProjectEntry[];
  isPrint: boolean;
}) {
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
            {hasText(entry.link) && (
              <a
                className="cv-entry__meta cv-link"
                href={normalizeLink("url", entry.link)}
                target="_blank"
                rel="noopener noreferrer"
              >
                View project
              </a>
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

function CertificationList({
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

function SkillsBlock({ data, compact }: { data: ResumeData; compact: boolean }) {
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

function ContactLine({ data, isPrint }: { data: ResumeData; isPrint: boolean }) {
  const { personal } = data;
  const items: Array<{ key: string; label: string; href?: string }> = [];

  if (hasText(personal.phone)) {
    items.push({
      key: "phone",
      label: personal.phone,
      href: `tel:${personal.phone.replace(/\s+/g, "")}`,
    });
  }
  if (hasText(personal.email)) {
    items.push({ key: "email", label: personal.email, href: `mailto:${personal.email}` });
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

function HeaderBlock({
  data,
  isPrint,
  center,
}: {
  data: ResumeData;
  isPrint: boolean;
  center: boolean;
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
      {center && <ContactLine data={data} isPrint={isPrint} />}
    </header>
  );
}

export function ResumePreview({ data, isPrint = false }: ResumePreviewProps) {
  const experience = data.experience.filter(
    (entry) =>
      hasText(entry.company) ||
      hasText(entry.role) ||
      hasText(entry.description) ||
      hasText(entry.startDate) ||
      hasText(entry.endDate) ||
      entry.current,
  );
  const education = data.education.filter(
    (entry) =>
      hasText(entry.college) ||
      hasText(entry.degree) ||
      hasText(entry.startDate) ||
      hasText(entry.endDate) ||
      entry.current,
  );
  const projects = data.projects.filter(
    (entry) => hasText(entry.title) || hasText(entry.description) || hasText(entry.link),
  );
  const certifications = data.certifications.filter(
    (entry) =>
      hasText(entry.name) ||
      hasText(entry.issuer) ||
      hasText(entry.date) ||
      hasText(entry.link),
  );

  const hasSkills =
    hasText(data.skills.languages) ||
    hasText(data.skills.technologies) ||
    hasText(data.skills.databases) ||
    hasText(data.skills.spoken);

  // On screen an untouched section falls back to the first (empty) entry so
  // the preview still shows helpful placeholder copy.
  const experienceForDisplay = isPrint
    ? experience
    : experience.length
      ? experience
      : data.experience.slice(0, 1);
  const educationForDisplay = isPrint
    ? education
    : education.length
      ? education
      : data.education.slice(0, 1);
  const projectsForDisplay = isPrint
    ? projects
    : projects.length
      ? projects
      : data.projects.slice(0, 1);

  const showSummary = hasText(data.summary);
  const isTwoColumn = data.template === "two-column";

  const sections = {
    summary: showSummary ? (
      <Section title="Summary">
        <p>{data.summary}</p>
      </Section>
    ) : null,
    experience: experienceForDisplay.length ? (
      <Section title="Experience">
        <ExperienceList entries={experienceForDisplay} isPrint={isPrint} />
      </Section>
    ) : null,
    projects: projectsForDisplay.length ? (
      <Section title="Projects">
        <ProjectList entries={projectsForDisplay} isPrint={isPrint} />
      </Section>
    ) : null,
    education: educationForDisplay.length ? (
      <Section title="Education">
        <EducationList entries={educationForDisplay} isPrint={isPrint} />
      </Section>
    ) : null,
    certifications: certifications.length ? (
      <Section title="Certifications">
        <CertificationList entries={certifications} isPrint={isPrint} />
      </Section>
    ) : null,
    skills:
      hasSkills || (!isPrint && data.template !== "two-column") ? (
        <Section title="Skills">
          {hasSkills ? (
            <SkillsBlock data={data} compact={data.template === "two-column"} />
          ) : (
            <p className="cv-placeholder">
              Languages · frameworks · databases · spoken languages
            </p>
          )}
        </Section>
      ) : null,
  };

  return (
    <div className={`cv cv--${data.template}`}>
      <div className="cv-page">
        <HeaderBlock data={data} isPrint={isPrint} center={!isTwoColumn} />

        {isTwoColumn ? (
          <div className="cv-columns">
            <aside className="cv-sidebar">
              <Section title="Contact">
                <ContactLine data={data} isPrint={isPrint} />
              </Section>
              {sections.skills}
              {sections.certifications}
            </aside>
            <div className="cv-main">
              {sections.summary}
              {sections.experience}
              {sections.projects}
              {sections.education}
            </div>
          </div>
        ) : (
          <>
            {sections.summary}
            {sections.experience}
            {sections.projects}
            {sections.education}
            {sections.certifications}
            {sections.skills}
          </>
        )}
      </div>
    </div>
  );
}

export default ResumePreview;
