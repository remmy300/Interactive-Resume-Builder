import { forwardRef } from "react";
import { formatDate } from "../utils/Date";

const LiveUpdate = forwardRef(({ formData }, ref) => {
  return (
    <div ref={ref} className="cv-container text-gray-800 mx-auto pdf-optimized">
      {/* Personal Section */}
      <div className="flex flex-col items-center mb-8 gap-1">
        <h1 className="text-3xl font-bold text-gray-900">
          {formData.personal.name || "Your Name"}
        </h1>
        <p className="text-lg text-gray-600">
          {formData.personal.phone || "123-456-7890"} |{" "}
          {formData.personal.email || "your@email.com"}
        </p>
      </div>

      {/* Education Section */}
      <div className="mb-8 cv-section">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">EDUCATION</h2>
        <hr className="border-t border-gray-300 mb-4" />
        {formData.education.map((edu, index) => (
          <div key={index} className="mb-6 education-item">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-xl font-semibold">
                  {edu.college || "College Name"}
                </h3>
                <p className="text-lg italic">{edu.degree || "Degree"}</p>
              </div>
              <p className="text-gray-600 date-range whitespace-nowrap ml-4">
                {formatDate(edu.startDate) || "Start Date"} -{" "}
                {formatDate(edu.endDate) || "End Date"}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Experience Section */}
      <div className="mb-8 cv-section">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">EXPERIENCE</h2>
        <hr className="border-t border-gray-300 mb-4" />
        {formData.experience.map((exp, index) => (
          <div key={index} className="mb-6 experience-item">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-semibold">
                {exp.company || "Company Name"}
              </h3>
              <p className="text-gray-600 date-range whitespace-nowrap ml-4">
                {formatDate(exp.startDate) || "Start Date"} -{" "}
                {formatDate(exp.endDate) || "End Date"}
              </p>
            </div>
            <p className="text-lg font-medium italic mb-2">
              {exp.role || "Role"}
            </p>
            <ul className="pdf-list pl-6">
              {exp.description.split("\n").map(
                (point, i) =>
                  point.trim() && (
                    <li key={i} className="text-gray-700 pdf-list-item">
                      {point}
                    </li>
                  )
              )}
            </ul>
          </div>
        ))}
      </div>

      {/* Projects Section */}
      <div className="mb-8 cv-section">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">PROJECTS</h2>
        <hr className="border-t border-gray-300 mb-4" />
        {formData.projects.map((project, index) => (
          <div key={index} className="mb-6 project-item">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-semibold">
                {project.title || "Project Title"}
              </h3>
              {project.link && (
                <a
                  href={
                    project.link.startsWith("http")
                      ? project.link
                      : `https://${project.link}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-4 text-blue-600 text-lg font-normal whitespace-nowrap"
                >
                  (View Project)
                </a>
              )}
            </div>
            <ul className="pdf-list pl-6">
              {project.description.split("\n").map(
                (point, i) =>
                  point.trim() && (
                    <li key={i} className="text-gray-700 pdf-list-item">
                      {point}
                    </li>
                  )
              )}
            </ul>
          </div>
        ))}
      </div>

      {/* Skills Section */}
      <div className="mb-8 cv-section">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">SKILLS</h2>
        <hr className="border-t border-gray-300 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pdf-skills">
          <div className="pdf-skill-category">
            <h4 className="font-semibold text-lg">Languages</h4>
            <p className="text-gray-700">
              {formData.skills.languages || "Not specified"}
            </p>
          </div>
          <div className="pdf-skill-category">
            <h4 className="font-semibold text-lg">Technologies</h4>
            <p className="text-gray-700">
              {formData.skills.technologies || "Not specified"}
            </p>
          </div>
          <div className="pdf-skill-category">
            <h4 className="font-semibold text-lg">Databases</h4>
            <p className="text-gray-700">
              {formData.skills.databases || "Not specified"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

export default LiveUpdate;
