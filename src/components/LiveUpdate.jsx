import { forwardRef } from "react";

const LiveUpdate = forwardRef(({ formData }, ref) => {
  return (
    <div
      ref={ref}
      className="mr-10 p-8 bg-white text-gray-800 max-w-3xl mx-auto"
    >
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

      {/* Horizontal divider with proper margins */}
      <hr className="my-6 border-t-2 border-gray-200" />

      {/* Education Section - supports multiple entries */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">EDUCATION</h2>
        <hr className="border-t border-gray-300 mb-4" />
        {formData.education.map((edu, index) => (
          <div key={index} className="mb-6">
            <div className="flex justify-between">
              <div>
                <h3 className="text-xl font-semibold">
                  {edu.college || "College Name"}
                </h3>
                <p className="text-lg italic">{edu.degree || "Degree"}</p>
              </div>
              <p className="text-gray-600">
                {edu.startDate || "Start Date"} - {edu.endDate || "End Date"}
              </p>
            </div>
            {index < formData.education.length - 1 && (
              <hr className="my-4 border-t border-gray-100" />
            )}
          </div>
        ))}
      </div>

      {/* Horizontal divider */}
      <hr className="my-6 border-t-2 border-gray-200" />

      {/* Experience Section - supports multiple entries */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">EXPERIENCE</h2>
        <hr className="border-t border-gray-300 mb-4" />
        {formData.experience.map((exp, index) => (
          <div key={index} className="mb-6">
            <div className="flex justify-between mb-2">
              <h3 className="text-xl font-semibold">
                {exp.company || "Company Name"}
              </h3>
              <p className="text-gray-600">
                {exp.startDate || "Start Date"} - {exp.endDate || "End Date"}
              </p>
            </div>
            <p className="text-lg font-medium italic mb-2">
              {exp.role || "Role"}
            </p>
            <ul className="list-disc pl-6 space-y-1">
              {exp.description.split("\n").map(
                (point, i) =>
                  point.trim() && (
                    <li key={i} className="text-gray-700">
                      {point}
                    </li>
                  )
              )}
            </ul>
            {index < formData.experience.length - 1 && (
              <hr className="my-4 border-t border-gray-100" />
            )}
          </div>
        ))}
      </div>

      {/* Horizontal divider */}
      <hr className="my-6 border-t-2 border-gray-200" />

      {/* Projects Section - supports multiple entries */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">PROJECTS</h2>
        <hr className="border-t border-gray-300 mb-4" />
        {formData.projects.map((project, index) => (
          <div key={index} className="mb-6">
            <h3 className="text-xl font-semibold">
              {project.title || "Project Title"}
              {project.link && (
                <a
                  href={
                    project.link.startsWith("http")
                      ? project.link
                      : `https://${project.link}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-600 hover:underline text-lg font-normal"
                >
                  (View Project)
                </a>
              )}
            </h3>
            <ul className="list-disc pl-6 mt-2">
              {project.description.split("\n").map(
                (point, i) =>
                  point.trim() && (
                    <li key={i} className="text-gray-700">
                      {point}
                    </li>
                  )
              )}
            </ul>
            {index < formData.projects.length - 1 && (
              <hr className="my-4 border-t border-gray-100" />
            )}
          </div>
        ))}
      </div>

      {/* Horizontal divider */}
      <hr className="my-6 border-t-2 border-gray-200" />

      {/* Skills Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">SKILLS</h2>
        <hr className="border-t border-gray-300 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="font-semibold text-lg">Languages</h4>
            <p className="text-gray-700">
              {formData.skills.languages || "Not specified"}
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-lg">Technologies</h4>
            <p className="text-gray-700">
              {formData.skills.technologies || "Not specified"}
            </p>
          </div>
          <div>
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
