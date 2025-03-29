import React from "react";
import { useState } from "react";
import Button from "@mui/material/Button";
import AddBox from "@mui/icons-material/AddBox";

const Personal = ({ formData, handleChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handlePersonalChange = (e) => {
    handleChange("personal", e.target.name, e.target.value);
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
          backgroundColor: "var(--color-bg-primary)",
          color: "var(--color-text-primary)", // Default background
          "&:hover": { backgroundColor: "gray.100" }, // Hover effect
          "&.dark": {
            backgroundColor: "var(--color-bg-secondary)", // Dark mode background
            "&:hover": { backgroundColor: "gray.700" }, // Dark mode hover
          },
          borderRadius: "8px", // Rounded corners
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        Personal
      </Button>

      {isOpen && (
        <form className="w-full space-y-4">
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handlePersonalChange}
            placeholder="Enter Name"
            className="w-full px-3 py-2 border border-gray-300  bg-white  text-gray-900  rounded-md focus:outline-none shadow-lg shadow-gray-400 "
          />
          <input
            type="tel"
            name="phone"
            placeholder="Enter number"
            value={formData.phone}
            onChange={handlePersonalChange}
            className="w-full px-3 py-2 border border-gray-300  bg-white  text-gray-900  rounded-md focus:outline-none shadow-lg shadow-gray-400 "
          />
          <input
            type="email"
            name="email"
            placeholder="Enter email"
            value={formData.email}
            onChange={handlePersonalChange}
            className="w-full px-3 py-2 border border-gray-300  bg-white  text-gray-900  rounded-md focus:outline-none shadow-lg shadow-gray-400 "
          />
        </form>
      )}
    </div>
  );
};

export default Personal;
