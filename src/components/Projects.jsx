import React from "react";
import { useState } from "react";
import Button from "@mui/material/Button";
import AddBox from "@mui/icons-material/AddBox";

const Projects = ({ formData, handleChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleProjectChange = (e) => {
    handleChange("projects", e.target.name, e.target.value);
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
          color: "var(--color-text-primary)", // Default text color
          border: "1px solid grey",
          backgroundColor: "var(--color-bg-primary)", // Default background
          "&:hover": { backgroundColor: "gray.200" }, // Hover effect
          "&.dark": {
            backgroundColor: "var(--color-bg-secondary)", // Dark mode background
            "&:hover": { backgroundColor: "gray.700" }, // Dark mode hover
          },
          borderRadius: "8px", // Rounded corners
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        Projects
      </Button>

      {isOpen && (
        <form className="w-full space-y-4">
          <input
            type="text"
            aria-label=""
            name="title"
            value={formData.title}
            onChange={handleProjectChange}
            placeholder="Project Name"
            className="w-full px-3 py-2 border border-gray-300  bg-white  text-gray-900  rounded-md focus:outline-none shadow-lg shadow-gray-400 "
          />
          <input
            type="text"
            name="link"
            value={formData.link}
            onChange={handleProjectChange}
            placeholder="Project Link"
            className="w-full px-3 py-2 border border-gray-300  bg-white  text-gray-900  rounded-md focus:outline-none shadow-lg shadow-gray-400 "
          />
          <input
            type="text-area"
            name="description"
            value={formData.description}
            onChange={handleProjectChange}
            placeholder="Project Description"
            className="w-full px-3 py-2 border border-gray-300  bg-white  text-gray-900  rounded-md focus:outline-none shadow-lg shadow-gray-400 "
          />
        </form>
      )}
    </div>
  );
};

export default Projects;
