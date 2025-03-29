const LiveUpdate = ({ formData }) => {
  return (
    <div className=" mr-10 ">
      {/* Personal Section */}
      <div className="flex flex-col items-center mb-10 gap-3">
        <h1 className="text-3xl font-bold">
          {formData.personal.name || "Your Name"}
        </h1>
        <p className="text-2xl">
          {formData.personal.phone || "123-456-7890"} |{" "}
          {formData.personal.email || "your@email.com"}
        </p>
      </div>

      {/* Education Section */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold">Education</h2>
        <hr />
        <div className="flex justify-between text-lg">
          <ul className="list-disc pl-6 space-y-2">
            <li> {formData.education.college || "College Name"}</li>
            <li>{formData.education.degree || "Degree"}</li>
          </ul>

          <p>
            {formData.education.startDate || "Start Date"} -{" "}
            {formData.education.endDate || "End Date"}
          </p>
        </div>
      </div>

      {/* Experience Section */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold">Experience</h2>
        <hr />

        <div className="flex justify-between text-lg">
          {/* Left Column: Unordered List for Company Name, Role, and Description */}
          <ul className="list-disc pl-6 space-y-2">
            <li className="font-semibold">
              {formData.experience.company || "Company Name"}
            </li>
            <li className="italic">{formData.experience.role || "Role"}</li>
            <li>{formData.experience.description || "Description"}</li>
          </ul>

          {/* Right Column: Dates aligned to the right */}
          <p className="text-right">
            {formData.experience.startDate || "Start Date"} -{" "}
            {formData.experience.endDate || "End Date"}
          </p>
        </div>
      </div>

      {/* Project */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold">Projects</h2>
        <hr />
        <ul className="list-disc pl-6 space-y-2">
          <li className="font-semibold">
            {formData.projects.title || "Project Title"} (
            <a
              href={formData.projects.link || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline hover:text-blue-700"
            >
              {formData.projects.link || "Project Link"}
            </a>
            )
          </li>
          <li className="italic font-semibold">
            {formData.projects.description || "Description"}
          </li>
        </ul>
      </div>

      {/* Skills */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold">Skills</h2>
        <hr />
        <p className="text-lg">
          {formData.skills.languages || "Languages"} |{" "}
          {formData.skills.technologies || "Technologies"} |{" "}
          {formData.skills.databases || "Databases"}
        </p>
      </div>
    </div>
  );
};

export default LiveUpdate;
