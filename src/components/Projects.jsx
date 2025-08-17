import React, { useState } from "react";
import Button from "@mui/material/Button";
import AddBox from "@mui/icons-material/AddBox";
import DeleteIcon from "@mui/icons-material/Delete";

const Projects = ({ projects, handleChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const addNewProject = () => {
    handleChange(
      "projects",
      "new",
      { title: "", link: "", description: "" },
      projects.length
    );
  };

  const removeProject = (index) => {
    if (projects.length > 1) {
      const updatedProjects = projects.filter((_, i) => i !== index);
      handleChange("projects", updatedProjects);
    }
  };

  return (
    <div className="w-64 md:w-76 lg:w-96 flex flex-col items-center justify-center gap-6 p-4 bg-[var(--color-bg-secondary)] dark:bg-[var(--color-bg-primary)] rounded-lg shadow-md">
      <Button
        variant="outlined"
        endIcon={<AddBox />}
        sx={{
          width: "100%",
          minWidth: "100%",
          fontSize: "1rem",
          fontWeight: "bold",
          color: "var(--color-text-primary)",
          border: "1px solid grey",
          backgroundColor: "var(--color-bg-primary)",
          "&:hover": { backgroundColor: "gray.200" },
          "&.dark": {
            backgroundColor: "var(--color-bg-secondary)",
            "&:hover": { backgroundColor: "gray.700" },
          },
          borderRadius: "8px",
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        Projects
      </Button>

      {isOpen && (
        <div className="w-full space-y-6">
          {projects.map((project, index) => (
            <div
              key={index}
              className="space-y-4 p-4 bg-white dark:bg-gray-700 rounded-lg shadow"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">Project #{index + 1}</h3>
                {projects.length > 1 && (
                  <button
                    onClick={() => removeProject(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <DeleteIcon />
                  </button>
                )}
              </div>

              <input
                type="text"
                name="title"
                value={project.title}
                onChange={(e) =>
                  handleChange("projects", "title", e.target.value, index)
                }
                placeholder="Project Name"
                className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none"
              />

              <input
                type="url"
                name="link"
                value={project.link}
                onChange={(e) =>
                  handleChange("projects", "link", e.target.value, index)
                }
                placeholder="Project URL (https://example.com)"
                className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none"
              />

              <textarea
                name="description"
                value={project.description}
                onChange={(e) =>
                  handleChange("projects", "description", e.target.value, index)
                }
                placeholder="Project description (use bullet points)"
                className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none min-h-[100px]"
                rows={3}
              />
            </div>
          ))}

          <Button
            variant="contained"
            startIcon={<AddBox />}
            onClick={addNewProject}
            sx={{
              width: "100%",
              backgroundColor: "#3f51b5",
              "&:hover": { backgroundColor: "#303f9f" },
            }}
          >
            Add Another Project
          </Button>
        </div>
      )}
    </div>
  );
};

export default Projects;
