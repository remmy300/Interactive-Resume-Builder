import { useState } from "react";
import Button from "@mui/material/Button";
import AddBox from "@mui/icons-material/AddBox";

const Education = ({ education, handleChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const addNewEducation = () => {
    handleChange(
      "education",
      "new",
      { college: "", degree: "", startDate: "", endDate: "" },
      education.length
    );
  };

  const removeEducation = (index) => {
    if (education.length > 1) {
      const updatedEducation = education.filter((_, i) => i !== index);
      handleChange("education", updatedEducation);
    }
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
          backgroundColor: "var(--color-bg-primary)",
          "&:hover": { backgroundColor: "gray.100" },
          "&.dark": {
            backgroundColor: "var(--color-bg-primary)",
            "&:hover": { backgroundColor: "gray.700" },
          },
          borderRadius: "8px",
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        Education ({education.length})
      </Button>

      {isOpen && (
        <div className="w-full space-y-4">
          {education.map((edu, index) => (
            <div
              key={index}
              className="space-y-4 p-4 bg-white dark:bg-gray-700 rounded-lg shadow"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">
                  Education #{index + 1}
                </h3>
                {education.length > 1 && (
                  <button
                    onClick={() => removeEducation(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <DeleteIcon />
                  </button>
                )}
              </div>
              <input
                type="text"
                aria-label=""
                name="college"
                onChange={(e) =>
                  handleChange("education", "college", e.target.value, index)
                }
                value={edu.college}
                placeholder="Enter College"
                className="w-full px-3 py-2 border border-gray-300  bg-white  text-gray-900  rounded-md focus:outline-none shadow-lg shadow-gray-400 "
              />
              <input
                type="text"
                name="degree"
                placeholder="Enter Degree"
                onChange={(e) =>
                  handleChange("education", "degree", e.target.value, index)
                }
                value={edu.degree}
                className="w-full px-3 py-2 border border-gray-300  bg-white  text-gray-900  rounded-md focus:outline-none shadow-lg shadow-gray-400 "
              />
              <input
                type="date"
                name="startDate"
                onChange={(e) =>
                  handleChange("education", "startDate", e.target.value, index)
                }
                value={edu.startDate}
                placeholder="Enter Start Date"
                className="w-full px-3 py-2 border border-gray-300  bg-white  text-gray-900  rounded-md focus:outline-none shadow-lg shadow-gray-400 "
              />
              <input
                type="date"
                name="endDate"
                onChange={(e) =>
                  handleChange("education", "endDate", e.target.value, index)
                }
                value={edu.endDate}
                placeholder="Enter End Date"
                className="w-full px-3 py-2 border border-gray-300  bg-white  text-gray-900  rounded-md focus:outline-none shadow-lg shadow-gray-400 "
              />
            </div>
          ))}
          <Button
            variant="contained"
            startIcon={<AddBox />}
            onClick={addNewEducation}
            sx={{
              width: "100%",
              backgroundColor: "#3f51b5",
              "&:hover": { backgroundColor: "#303f9f" },
            }}
          >
            Add Another Education
          </Button>
        </div>
      )}
    </div>
  );
};

export default Education;
