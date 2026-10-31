import type { ResumeData } from "@/lib/resume-schema";
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
