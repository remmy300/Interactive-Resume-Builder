import { forwardRef } from "react";
import { formatDate } from "../utils/Date";
import { normalizeLink } from "../utils/Form";

const LiveUpdate = forwardRef(({ formData }, ref) => {
  return (
    <div ref={ref} className="cv-container text-gray-800 mx-auto ">
      {/* Personal Section */}
      <div className="flex flex-col items-center mb-8 gap-1">
        <h1 className="text-3xl font-bold text-gray-900">
          {formData.personal.name || "Your Name"}
        </h1>

        <div className="text-lg flex gap-1 font-semibold ">
          {formData.personal.title || "eg: Software Developer"} |
          {formData.personal.phone || "123-456-7890"} |{" "}
          {formData.personal.email && (
            <p>{normalizeLink("email", formData.personal.email)} </p>
          )}
        </div>
        <div className="flex gap-2 text-lg font-semibold ">
          {formData.personal.linkedIn && (
            <p className=" underline hover:bg-blue-200">
              <a
                href={
                  formData.personal.linkedIn.startsWith("http")
                    ? formData.personal.linkedin
                    : `https://${formData.personal.linkedIn}`
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </a>
            </p>
          )}

          {formData.personal.portfolio && (
            <p className=" underline hover:bg-blue-200">
              <a
                href={formData.personal.portfolio}
                target="_blank"
                rel="noopener noreferrer"
              >
                Portfolio
              </a>
            </p>
          )}

          {formData.personal.github && (
            <p className=" underline hover:bg-blue-100">
              <a
                href={formData.personal.github}
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </p>
          )}
        </div>
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
                <p className="text-lg ">{edu.degree || "Degree"}</p>
              </div>
              <p className="text-gray-600 text-lg font-semibold date-range whitespace-nowrap ml-4">
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
              <p className="text-gray-600 text-lg font-semibold date-range whitespace-nowrap ml-4">
                {formatDate(exp.startDate) || "Start Date"} -{" "}
                {formatDate(exp.endDate) || "End Date"}
              </p>
            </div>
            <p className="text-lg italic  mb-2">{exp.role || "Role"}</p>
            <ul className="pdf-list ">
              {exp.description.split("\n").map(
                (point, i) =>
                  point.trim() && (
                    <li key={i} className="text-gray-700 pdf-list-item text-lg">
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
                  className="ml-4 text-purple-800 text-lg font-normal whitespace-nowrap"
                >
                  (View Project)
                </a>
              )}
            </div>
            <ul className="pdf-list ">
              {project.description.split("\n").map(
                (point, i) =>
                  point.trim() && (
                    <li key={i} className="text-gray-700 pdf-list-item text-lg">
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
        <ul className=" pdf-list">
          <li className="pdf-list-item text-gray-700 text-lg">
            Languages: {formData.skills.languages || "Not specified"}
          </li>

          <li className="text-gray-700 pdf-list-item text-lg">
            Technologies: {formData.skills.technologies || "Not specified"}
          </li>

          <li className="text-gray-700 pdf-list-item text-lg">
            Databases: {formData.skills.databases || "Not specified"}
          </li>
        </ul>
      </div>
    </div>
  );
});

export default LiveUpdate;
