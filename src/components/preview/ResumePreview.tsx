import type { CSSProperties } from "react";
import { PAGE_SIZES } from "@/lib/preview";
import { FONT_CHOICES, type ResumeData } from "@/lib/resume-schema";
import {
  CertificationList,
  ContactLine,
  EducationList,
  ExperienceList,
  HeaderBlock,
  ProjectList,
  Section,
  SkillsBlock,
  hasText,
} from "./ResumeBlocks";

interface ResumePreviewProps {
  data: ResumeData;
  /** Print copies never render placeholder copy. */
  isPrint?: boolean;
}

// How much the "spacing" setting stretches gaps and line height.
const SPACE = { tight: 0.72, normal: 1, relaxed: 1.3 } as const;
const LINE = { tight: 0.93, normal: 1, relaxed: 1.1 } as const;

/** Design settings as CSS variables, read by the .cv styles in globals.css. */
function styleVariables(data: ResumeData): CSSProperties {
  const { font, fontScale, spacing, pageSize, accent } = data.style;
  const stack = FONT_CHOICES.find((choice) => choice.id === font)?.stack;
  return {
    "--cv-scale": fontScale,
    "--cv-space": SPACE[spacing],
    "--cv-line": LINE[spacing],
    "--cv-page-w": PAGE_SIZES[pageSize].width,
    ...(stack ? { "--cv-font": stack } : {}),
    ...(accent ? { "--cv-accent": accent } : {}),
  } as CSSProperties;
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
    (entry) =>
      hasText(entry.title) ||
      hasText(entry.description) ||
      hasText(entry.link) ||
      hasText(entry.github),
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
  const isProfessional = data.template === "professional";

  const sections = {
    summary: showSummary ? (
      <Section title={isProfessional ? "Professional Summary" : "Summary"}>
        <p>{data.summary}</p>
      </Section>
    ) : null,
    experience: experienceForDisplay.length ? (
      <Section title={isProfessional ? "Work Experience" : "Experience"}>
        <ExperienceList
          entries={experienceForDisplay}
          isPrint={isPrint}
          roleFirst={isProfessional}
        />
      </Section>
    ) : null,
    projects: projectsForDisplay.length ? (
      <Section title="Projects">
        <ProjectList
          entries={projectsForDisplay}
          isPrint={isPrint}
          inline={isProfessional}
        />
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
        <Section title={isProfessional ? "Technical Skills & Tools" : "Skills"}>
          {hasSkills ? (
            <SkillsBlock
              data={data}
              compact={data.template === "two-column"}
              flat={isProfessional}
            />
          ) : (
            <p className="cv-placeholder">
              Languages · frameworks · databases · spoken languages
            </p>
          )}
        </Section>
      ) : null,
  };

  return (
    <div
      className={`cv cv--${data.template}`}
      style={styleVariables(data)}
      data-accent={data.style.accent ? "on" : undefined}
      data-align={data.style.align}
      data-header-align={data.style.headerAlign}
    >
      {/* Paper size. Page margins are drawn by PrintPages, so none are set here and the browser adds no header or footer. */}
      <style>{`@page { size: ${data.style.pageSize === "letter" ? "letter" : "A4"}; margin: 0; }`}</style>
      <div className="cv-page">
        <HeaderBlock
          data={data}
          isPrint={isPrint}
          center={!isTwoColumn && !isProfessional}
          showContact={!isTwoColumn}
          emailFirst={isProfessional}
        />

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
        ) : isProfessional ? (
          <>
            {sections.summary}
            {sections.experience}
            {sections.education}
            {sections.skills}
            {sections.projects}
            {sections.certifications}
          </>
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
