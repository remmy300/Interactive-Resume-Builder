import React from "react";
import { useState } from "react";
import Button from "@mui/material/Button";
import AddBox from "@mui/icons-material/AddBox";

const Education = ({ formData, handleChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleEducationChange = (e) => {
    handleChange("education", e.target.name, e.target.value);
  };

  return (
    <div className="w-64 md:w-76 lg:w-96  flex flex-col items-center justify-center gap-6 p-4 bg-[var(--color-bg-secondary)] dark:bg-[var(--color-bg-primary)] rounded-lg shadow-lg ">
      <Button
        variant="outlined"
        endIcon={<AddBox />}
        sx={{
          width: "100%",
          fontSize: "1rem",
          fontWeight: "bold",
          border: "1px solid grey",
          color: "var(--color-text-primary)",
          backgroundColor: "var(--color-bg-primary)", // Default background
          "&:hover": { backgroundColor: "gray.100" }, // Hover effect
          "&.dark": {
            backgroundColor: "var(--color-bg-primary)", // Dark mode background
            "&:hover": { backgroundColor: "gray.700" }, // Dark mode hover
          },
          borderRadius: "8px", // Rounded corners
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        Education
      </Button>

      {isOpen && (
        <form className="w-full space-y-4">
          <input
            type="text"
            aria-label=""
            name="college"
            onChange={handleEducationChange}
            value={formData.college}
            placeholder="Enter College"
            className="w-full px-3 py-2 border border-gray-300  bg-white  text-gray-900  rounded-md focus:outline-none shadow-lg shadow-gray-400 "
          />
          <input
            type="text"
            name="degree"
            placeholder="Enter Degree"
            onChange={handleEducationChange}
            value={formData.degree}
            className="w-full px-3 py-2 border border-gray-300  bg-white  text-gray-900  rounded-md focus:outline-none shadow-lg shadow-gray-400 "
          />
          <input
            type="date"
            name="startDate"
            onChange={handleEducationChange}
            value={formData.startDate}
            placeholder="Enter Start Date"
            className="w-full px-3 py-2 border border-gray-300  bg-white  text-gray-900  rounded-md focus:outline-none shadow-lg shadow-gray-400 "
          />
          <input
            type="date"
            name="endDate"
            onChange={handleEducationChange}
            value={formData.endDate}
            placeholder="Enter End Date"
            className="w-full px-3 py-2 border border-gray-300  bg-white  text-gray-900  rounded-md focus:outline-none shadow-lg shadow-gray-400 "
          />
        </form>
      )}
    </div>
  );
};

export default Education;
