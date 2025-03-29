import React from "react";
import { useState } from "react";
import Button from "@mui/material/Button"; // Note: Capital 'B' in Button
import AddBox from "@mui/icons-material/AddBox";

const Experience = ({ formData, handleChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleExperienceChange = (e) => {
    handleChange("experience", e.target.name, e.target.value);
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
          border: "1px solid grey",
          color: "var(--color-text-primary)",
          backgroundColor: "var(--color-bg-primary)",
          // Default background
          "&:hover": { backgroundColor: "gray.100" }, // Hover effect
          "&.dark": {
            backgroundColor: "var(--color-bg-secondary)", // Dark mode background
            "&:hover": { backgroundColor: "gray.700" }, // Dark mode hover
          },
          borderRadius: "8px", // Rounded corners
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        Experience
      </Button>

      {isOpen && (
        <form className="space-y-4 w-full">
          <input
            type="text"
            name="company"
            value={formData.company || ""}
            onChange={handleExperienceChange}
            placeholder="Company Name"
            className="w-full px-3 py-2 border border-gray-300  bg-white  text-gray-900  rounded-md focus:outline-none shadow-lg shadow-gray-400 "
          />
          <input
            type="text"
            name="role"
            value={formData.role || ""}
            onChange={handleExperienceChange}
            placeholder="Enter Role"
            className="w-full px-3 py-2 border border-gray-300  bg-white  text-gray-900  rounded-md focus:outline-none shadow-lg shadow-gray-400 "
          />
          <input
            type="text"
            name="description"
            value={formData.description || ""}
            onChange={handleExperienceChange}
            placeholder="Enter Description"
            className="w-full px-3 py-2 border border-gray-300  bg-white  text-gray-900  rounded-md focus:outline-none shadow-lg shadow-gray-400 "
          />
          <input
            type="date"
            name="startDate"
            value={formData.startDate || ""}
            onChange={handleExperienceChange}
            placeholder="Enter Start Date"
            className="w-full px-3 py-2 border border-gray-300  bg-white  text-gray-900  rounded-md focus:outline-none shadow-lg shadow-gray-400 "
          />
          <input
            type="date"
            name="endDate"
            value={formData.endDate || ""}
            onChange={handleExperienceChange}
            placeholder="Enter End Date"
            className="w-full px-3 py-2 border border-gray-300  bg-white  text-gray-900  rounded-md focus:outline-none shadow-lg shadow-gray-400 "
          />
        </form>
      )}
    </div>
  );
};

export default Experience;
