import React, { useState } from "react";
import Button from "@mui/material/Button";
import AddBox from "@mui/icons-material/AddBox";
import DeleteIcon from "@mui/icons-material/Delete";

const Experience = ({ experience, handleChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const addNewExperience = () => {
    handleChange("experience", "new", {
      company: "",
      role: "",
      description: "",
      startDate: "",
      endDate: "",
    }),
      experience.length;
  };

  const removeExperience = (index) => {
    if (experience.length > 1) {
      const updatedExperience = experience.filter((_, i) => i !== index);
      handleChange("experience", updatedExperience);
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
          border: "1px solid grey",
          color: "var(--color-text-primary)",
          backgroundColor: "var(--color-bg-primary)",
          "&:hover": { backgroundColor: "gray.100" },
          "&.dark": {
            backgroundColor: "var(--color-bg-secondary)",
            "&:hover": { backgroundColor: "gray.700" },
          },
          borderRadius: "8px",
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        Experience
      </Button>

      {isOpen && (
        <div className="space-y-4 w-full">
          {experience.map((exp, index) => (
            <div
              key={index}
              className="space-y-4 p-4 bg-white dark:bg-gray-700 rounded-lg shadow"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">
                  Experience #{index + 1}
                </h3>
                {experience.length > 1 && (
                  <button
                    onClick={() => removeExperience(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <DeleteIcon />
                  </button>
                )}
              </div>

              <input
                type="text"
                name="company"
                value={exp.company || ""}
                onChange={(e) =>
                  handleChange("experience", "company", e.target.value, index)
                }
                placeholder="Company Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
              />

              <input
                type="text"
                name="role"
                value={exp.role || ""}
                onChange={(e) =>
                  handleChange("experience", "role", e.target.value, index)
                }
                placeholder="Enter Role"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
              />

              <input
                type="text"
                name="description"
                value={exp.description || ""}
                onChange={(e) =>
                  handleChange(
                    "experience",
                    "description",
                    e.target.value,
                    index
                  )
                }
                placeholder="Enter Description"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
              />

              <input
                type="date"
                name="startDate"
                value={exp.startDate || ""}
                onChange={(e) =>
                  handleChange("experience", "startDate", e.target.value, index)
                }
                placeholder="Enter Start Date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
              />

              <input
                type="date"
                name="endDate"
                value={exp.endDate || ""}
                onChange={(e) =>
                  handleChange("experience", "endDate", e.target.value, index)
                }
                placeholder="Enter End Date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
              />
            </div>
          ))}

          <Button
            variant="contained"
            startIcon={<AddBox />}
            onClick={addNewExperience}
            sx={{
              width: "100%",
              backgroundColor: "#3f51b5",
              "&:hover": { backgroundColor: "#303f9f" },
            }}
          >
            Add Another Experience
          </Button>
        </div>
      )}
    </div>
  );
};

export default Experience;
