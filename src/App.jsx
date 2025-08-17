import Personal from "./components/Personal";
import Education from "./components/Education";
import Experience from "./components/Experience";
import Projects from "./components/Projects";
import Skills from "./components/Skills";
import LiveUpdate from "./components/LiveUpdate";
import { useState, useRef, useEffect } from "react";
import ThemeToggle from "./components/ToggleTheme";
import Header from "./components/Header";
import html2pdf from "html2pdf.js";

const App = () => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });

  const [previewUrl, setPreviewUrl] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [formData, setFormData] = useState({
    personal: {
      name: "",
      phone: "",
      email: "",
    },
    education: [
      {
        college: "",
        degree: "",
        startDate: "",
        endDate: "",
      },
    ],
    experience: [
      {
        company: "",
        role: "",
        description: "",
        startDate: "",
        endDate: "",
      },
    ],
    projects: [
      {
        title: "",
        description: "",
        link: "",
      },
    ],
    skills: {
      languages: "",
      technologies: "",
      databases: "",
    },
  });

  const cvRef = useRef(null);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const handleDownload = async (action = "download") => {
    setIsGeneratingPdf(true);
    try {
      const element = cvRef.current;

      if (!element) {
        console.error("CV element not found!");
        return;
      }

      const elementsWithOklch = element.querySelectorAll("*");
      elementsWithOklch.forEach((el) => {
        const styles = window.getComputedStyle(el);

        if (styles.color.includes("oklch")) {
          el.style.color = "#5a67d8";
        }
        if (styles.backgroundColor.includes("oklch")) {
          el.style.backgroundColor = "#f7fafc";
        }
      });
      const clonedElement = element.cloneNode(true);
      clonedElement.style.width = "210mm";
      clonedElement.style.height = "297mm";
      clonedElement.style.padding = "20px";
      document.body.appendChild(clonedElement);

      const options = {
        margin: 10,
        filename: `${formData.personal.name || "My_CV"}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          logging: false,
          useCORS: true,
          scrollX: 0,
          scrollY: 0,
          windowWidth: clonedElement.scrollWidth,
          windowHeight: clonedElement.scrollHeight,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      try {
        if (action === "preview") {
          const pdf = await html2pdf()
            .set(options)
            .from(clonedElement)
            .toPdf()
            .outputPdf();
          const blob = new Blob([pdf], { type: "application/pdf" });
          const blobUrl = URL.createObjectURL(blob);
          setPreviewUrl(blobUrl);
          setIsModalOpen(true);
        } else {
          await html2pdf().set(options).from(clonedElement).save();
        }
      } catch (error) {
        console.error("Error generating PDF:", error);
      } finally {
        document.body.removeChild(clonedElement);
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleInputChange = (section, field, value, index = 0) => {
    setFormData((prev) => {
      if (Array.isArray(prev[section])) {
        if (field === "new") {
          return {
            ...prev,
            [section]: [...prev[section], value],
          };
        }

        return {
          ...prev,
          [section]: prev[section].map((item, i) =>
            i === index ? { ...item, [field]: value } : item
          ),
        };
      } else {
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [field]: value,
          },
        };
      }
    });
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return (
    <div
      className={`min-h-screen flex flex-col justify-center ${
        theme === "dark"
          ? "bg-[var(--color-bg-primary)]"
          : "bg-[var(--color-bg-primary)]"
      }`}
    >
      <div className="flex justify-between items-center mb-5 p-6 w-full shadow-lg shadow-gray-200">
        <Header />

        <div className="flex gap-3">
          <button
            onClick={() => handleDownload("preview")}
            disabled={isGeneratingPdf}
            className={`px-3 py-1 rounded-md text-white text-sm shadow-md ${
              isGeneratingPdf
                ? "bg-gray-400"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {isGeneratingPdf ? "Generating..." : "Preview"}
          </button>

          <button
            onClick={() => handleDownload("download")}
            disabled={isGeneratingPdf}
            className={`px-3 py-1 rounded-md text-white text-sm shadow-md ${
              isGeneratingPdf ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isGeneratingPdf ? "Generating..." : "⬇️ Download"}
          </button>

          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>
      </div>

      {/* Preview Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-11/12 md:w-3/4 lg:w-2/3 h-5/6 flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                CV Preview
              </h3>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-500 font-bold text-xl"
              >
                ✕
              </button>
            </div>

            {/* PDF Preview */}
            <iframe
              src={previewUrl}
              className="flex-1 w-full rounded-b-lg"
              title="CV Preview"
            ></iframe>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex flex-col md:flex-row w-full md:w-3/4 lg:w-full px-8 gap-6">
        {/* Left Section: Forms */}
        <div
          className={`w-full md:1/3 lg:w-1/3 flex flex-col justify-center items-center shadow-lg shadow-gray-300 p-6 rounded-lg space-y-4 ${
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
            education={formData.education}
            handleChange={handleInputChange}
          />
          <Experience
            experience={formData.experience}
            handleChange={handleInputChange}
          />
          <Projects
            projects={formData.projects}
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
          <LiveUpdate ref={cvRef} formData={formData} />
        </div>
      </div>
    </div>
  );
};

export default App;
