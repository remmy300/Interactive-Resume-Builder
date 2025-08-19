📄 React CV Builder

A simple React-based CV/Resume Builder with live preview and PDF export (download & preview).
Built with React, TailwindCSS, and html2pdf.js.

✨ Features

📝 Dynamic Form Inputs → Add and edit personal info, experience, projects, skills, etc.

👀 Live CV Preview → Real-time rendering of your CV as you type.

📤 Export to PDF → Download your CV as a styled A4 PDF.

🔍 Preview in Modal → See your CV in a modal before downloading.

🎨 TailwindCSS Styling → Clean modern design with responsive layout.

🛠️ Tech Stack

React 18+ (hooks & functional components)

TailwindCSS (modern styling, responsive classes)

html2pdf.js (for PDF export, using html2canvas + jsPDF)

Material UI / Icons (optional buttons & icons)

⚡ Installation & Setup

Clone the repo and install dependencies:

git clone https://github.com/remmy300/Interactive-Resume-Builder.git
cd cv-app
npm install

Run the app in dev mode:

npm run dev

Build for production:

npm run build

🚀 Usage

Fill in your personal info, experience, education, and projects.

The CV Preview updates in real-time.

Click Preview to open your CV in a modal.

Click Download to save as a PDF.

Tailwind v3+ uses oklch() color functions, but html2canvas does not support them.
Without a fix, you’ll get this error:

Error: Attempting to parse an unsupported color function "oklch"

✅ Fix Implemented

We now clone the CV element before export and replace any oklch() colors with safe hex fallback colors:

clonedElement.querySelectorAll("\*").forEach((el) => {
const style = window.getComputedStyle(el);
if (style.color.includes("oklch")) el.style.color = "#2d3748";
if (style.backgroundColor.includes("oklch")) el.style.backgroundColor = "#ffffff";
if (style.borderColor.includes("oklch")) el.style.borderColor = "#e2e8f0";
});

This ensures Preview and Download work reliably.

🛑 Troubleshooting

PDF export fails with oklch error → Make sure you’re on the latest code with the fallback fix.

Fonts look blurry in PDF → Increase html2canvas.scale to 2 or 3.

Large CVs cut off in PDF → Adjust margin and windowHeight in html2pdf options.

📌 Roadmap

Add templates (modern, minimalist, creative styles).

Support dark mode preview.

Export to DOCX in addition to PDF.

User authentication + save multiple CVs.

🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to fork the project and submit a PR.

📜 License

MIT License © 2025 Jentah Rehema
