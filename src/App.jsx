import Personal from "./components/Personal";
import Education from "./components/Education";
import Experience from "./components/Experience";
import Projects from "./components/Projects";
import Skills from "./components/Skills";
import LiveUpdate from "./components/LiveUpdate";

import { useState } from "react";
import ThemeToggle from "./components/ToggleTheme";
import Header from "./components/Header";

const App = () => {
  // State to manage theme (light/dark)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });

  const [formData, setFormData] = useState({
    personal: {
      name: "",
      phone: "",
      email: "",
    },
    education: {
      college: "",
      degree: "",
      startDate: "",
      endDate: "",
    },
    experience: {
      company: "",
      role: "",
      description: "",
      startDate: "",
      endDate: "",
    },
    projects: {
      title: "",
      description: "",
      link: "",
    },
    skills: {
      languages: "",
      technologies: "",
      databases: "",
    },
  });
  // Function to handle input changes in the form

  const handleInputChange = (section, field, value) => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      [section]: {
        ...prevFormData[section],
        [field]: value,
      },
    }));
  };
  // Function to toggle between light and dark themes

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <div
      className={`min-h-screen flex    flex-col justify-center ${
        theme === "dark"
          ? "bg-[var(--color-bg-primary)]"
          : "bg-[var(--color-bg-primary)]"
      }`}
    >
      {/* Top section with Header and ThemeToggle */}
      <div className="flex justify-between items-center mb-5 p-6  w-full shadow-lg  shadow-gray-200">
        <Header />

        {/* Theme Toggle */}
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </div>

      {/* Main Layout (Left: Forms, Right: CV Preview) */}
      <div className="flex flex-col  md:flex-row     w-full md:w-3/4 lg:w-full  px-8 gap-6">
        {/* Left Section: Forms */}
        <div
          className={`w-full md:1/3  lg:w-1/3  flex flex-col justify-center items-center shadow-lg shadow-gray.300 p-6 rounded-lg  space-y-4 ${
            theme === "dark"
              ? "dark:bg-gray-800 shadow-gray-500 text-gray-100"
              : "bg-gray-200 shadow-gray-500 text-gray-900"
          }`}
        >
          <h2
            className={`text-2xl md:text-center font-semibold mb-4 ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}
          >
            Fill in your details
          </h2>

          <Personal
            formData={formData.personal}
            handleChange={handleInputChange}
          />
          <Education
            formData={formData.education}
            handleChange={handleInputChange}
          />
          <Experience
            formData={formData.experience}
            handleChange={handleInputChange}
          />
          <Projects
            formData={formData.projects}
            handleChange={handleInputChange}
          />
          <Skills formData={formData.skills} handleChange={handleInputChange} />
        </div>

        {/* Right Section: Live CV Preview */}
        <div
          className={`w-full md:w-3/4 lg:w-2/3 p-6 rounded-lg shadow-lg ${
            theme === "dark"
              ? "dark:bg-gray-800 text-gray-100 shadow-gray-500"
              : "bg-gray-200 text-gray-900 shadow-gray-500"
          }`}
        >
          <LiveUpdate formData={formData} />
        </div>
      </div>
    </div>
  );
};

export default App;
