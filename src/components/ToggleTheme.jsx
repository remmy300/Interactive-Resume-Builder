import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";

const ThemeToggle = ({ theme, toggleTheme }) => {
  return (
    <button
      onClick={toggleTheme}
      className="p-2 bg-gray-200 dark:bg-gray-700 text-black dark:text-white rounded-md"
    >
      {theme === "dark" ? <DarkModeIcon /> : <LightModeIcon />}
    </button>
  );
};

export default ThemeToggle;
