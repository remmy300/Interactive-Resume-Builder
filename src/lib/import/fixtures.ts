/**
 * A small, representative set of CV texts as PDF and DOCX extraction produce
 * them, each with the values a person would expect to see after import. They
 * drive the regression tests and the accuracy report. Add a CV here whenever a
 * real one imports badly: it becomes a permanent test.
 */

export interface ExpectedRole {
  company?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
}

export interface Expected {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
  summaryStart?: string;
  experience?: ExpectedRole[];
  education?: Array<{ college?: string; degree?: string }>;
  /** Every item must appear somewhere in the skills. */
  skills?: string[];
  certifications?: string[];
  projects?: string[];
  spoken?: string[];
}

export interface ImportFixture {
  id: string;
  description: string;
  /** Text as a PDF extractor returns it. */
  text: string;
  /** The same CV as a different extractor returns it; must import identically. */
  variants?: Record<string, string>;
  expected: Expected;
}

const standard = [
  "Alex Morgan",
  "Frontend Developer",
  "alex@example.com | +1 415 555 0134 | San Francisco, CA | linkedin.com/in/alex",
  "SUMMARY",
  "Frontend developer focused on accessible React applications.",
  "EXPERIENCE",
  "Frontend Developer | Northwind Labs | Jan 2021 – Present",
  "• Built the billing dashboard in React, used by 40 teams.",
  "• Cut page load time by 38% by splitting bundles.",
  "Junior Developer | Bright Apps | Jun 2018 – Dec 2020",
  "• Maintained customer portals in JavaScript for retail clients.",
  "EDUCATION",
  "BSc Computer Science | University of Leeds | 2014 – 2018",
  "SKILLS",
  "Languages: JavaScript, TypeScript",
  "Frameworks: React, Next.js",
  "Databases: PostgreSQL",
  "CERTIFICATIONS",
  "• AWS Cloud Practitioner",
];

// Word exports one paragraph per line with a blank line between them and no
// bullet characters.
const standardDocx = [
  "Alex Morgan",
  "Frontend Developer",
  "alex@example.com | +1 415 555 0134 | San Francisco, CA | linkedin.com/in/alex",
  "SUMMARY",
  "Frontend developer focused on accessible React applications.",
  "EXPERIENCE",
  "Frontend Developer | Northwind Labs | Jan 2021 – Present",
  "Built the billing dashboard in React, used by 40 teams.",
  "Cut page load time by 38% by splitting bundles.",
  "Junior Developer | Bright Apps | Jun 2018 – Dec 2020",
  "Maintained customer portals in JavaScript for retail clients.",
  "EDUCATION",
  "BSc Computer Science | University of Leeds | 2014 – 2018",
  "SKILLS",
  "Languages: JavaScript, TypeScript",
  "Frameworks: React, Next.js",
  "Databases: PostgreSQL",
  "CERTIFICATIONS",
  "AWS Cloud Practitioner",
]
  .join("\n\n");

const SAFARICOM = [
  "C2 - Safaricom Internal",
  "Kelvin Muthomi",
  "Software Engineer • Nairobi, Kenya • +254706783609",
  "kelvomuth@gmail.com • LinkedIn",
  "I am a skilled results-driven software engineer with over 4 years of experience in software",
  "development and design. I have a bachelor's degree in computer science and a proven",
  "track record of collaborating on large-scale technical projects. I have demonstrated ability",
  "to collaborate across global teams, solve complex problems, and develop secure, scalable",
  "cloud-based solutions.",
  "WORK EXPERIENCE",
  "Safaricom PLC, Nairobi, Kenya.",
  "Software Engineer (Site Reliability Engineer) 02/2022 - Present",
  "• Effectively ensuring a 99.99% SLA availability for the company's digital channels,",
  "• Collaborated with cross-functional teams to design and implement robust and",
  "scalable spring boot microservices.",
  "• Participated in testing and code reviews and provided constructive feedback to",
  "enhance code quality.",
  "Compulynx, Nairobi, Kenya.",
  "Software Engineer 07/2021 - 02/2022",
  "• Developed RESTful APIs and backend services for revenue collection system",
  "contributing to a 45% reduction in API response times and improving overall user",
  "experience.",
  "• Developed a revenue collection system mobile application using flutter that is used",
  "by county governments to facilitate collection of revenue.",
  "C2 - Safaricom Internal",
  "Adanian Labs, Nairobi, Kenya.",
  "Software Engineer 01/2021 - 07/2021",
  "• Responsible for creating a cross-platform flagship mobile application which runs on",
  "both iOS and Android.",
  "• Increased app download by 80% redesigning AfyaRekod, a digital health data",
  "platform that focuses on the patient and allows health facilities to store and have",
  "access to patient’s health",
  "data.(https://play.google.com/store/apps/details?id=app.afya.rekod)",
  "OktiqDevelopers, Nairobi, Kenya.",
  "Software Engineer 11/2018 - 01/2021",
  "• Founded a start-up targeting online shops and developing ecommerce websites to",
  "make it easier for their customers to orders products and services.",
  "EDUCATION",
  "Bachelor of Science in Computer Science, Graduation Year (2020)",
  "Multimedia university of Kenya.",
  "SKILLS",
  "• Programming Languages: Java, Python, JavaScript, C/C++, Dart",
  "• Problem Solving: Collaborative, problem-solving, Data Structures, analytical &",
  "troubleshooting skills.",
  "• Databases: MySQL, PostgreSQL, MongoDB, Oracle, Redis, Spanner, MSSQL, NoSQL.",
  "• DevOps & CI/CD: Jenkins, Maven, GitLab, Veracode, SonarQube, AWS Code",
  "Pipeline",
  "CERTIFICATIONS",
  "• AWS Cloud Practitioner",
  "• ITIL 4 Foundation",
  "• Gremlin Certified Enterprise Chaos Engineering Certification - GECEC",
  "• DevOps Foundations: Site Reliability Engineering",
  "• Linux System Engineer: Bash Shell Scripting for Automation",
  "C2 - Safaricom Internal",
].join("\n");

export const FIXTURES: ImportFixture[] = [
  {
    id: "no-summary-heading",
    description: "A page footer on every page, a summary with no heading, and bulleted certifications",
    text: SAFARICOM,
    expected: {
      name: "Kelvin Muthomi",
      title: "Software Engineer",
      email: "kelvomuth@gmail.com",
      location: "Nairobi, Kenya",
      summaryStart: "I am a skilled results-driven software engineer",
      experience: [
        { company: "Safaricom PLC", role: "Software Engineer (Site Reliability Engineer)", startDate: "2022-02", current: true },
        { company: "Compulynx", role: "Software Engineer", startDate: "2021-07", endDate: "2022-02" },
        { company: "Adanian Labs", role: "Software Engineer", startDate: "2021-01", endDate: "2021-07" },
        { company: "OktiqDevelopers", role: "Software Engineer", startDate: "2018-11", endDate: "2021-01" },
      ],
      education: [{ college: "Multimedia university of Kenya", degree: "Bachelor of Science in Computer Science" }],
      certifications: ["AWS Cloud Practitioner", "ITIL 4 Foundation", "DevOps Foundations: Site Reliability Engineering"],
      skills: ["Java", "Python", "PostgreSQL", "AWS Code Pipeline"],
    },
  },
  {
    id: "standard",
    description: "A plain one-column CV with ordinary headings",
    text: standard.join("\n"),
    variants: { docx: standardDocx },
    expected: {
      name: "Alex Morgan",
      title: "Frontend Developer",
      email: "alex@example.com",
      phone: "+1 415 555 0134",
      location: "San Francisco, CA",
      summaryStart: "Frontend developer focused",
      experience: [
        { company: "Northwind Labs", role: "Frontend Developer", startDate: "2021-01", current: true },
        { company: "Bright Apps", role: "Junior Developer", startDate: "2018-06", endDate: "2020-12" },
      ],
      education: [{ college: "University of Leeds", degree: "BSc Computer Science" }],
      skills: ["JavaScript", "TypeScript", "React", "Next.js", "PostgreSQL"],
      certifications: ["AWS Cloud Practitioner"],
    },
  },
  {
    id: "punctuated-headings",
    description: "Headings wrapped in colons, dashes, numbers and rules",
    text: [
      "Grace Wanjiku",
      "Backend Engineer",
      "grace.wanjiku@example.com • +254 722 000 111 • Nairobi, Kenya",
      "________________________________",
      "1. PROFILE",
      "Backend engineer who builds reliable APIs for payment platforms and reviews code carefully.",
      "— EXPERIENCE —",
      "Backend Engineer, PesaPay Ltd (Mar 2020 - Present)",
      "• Designed REST APIs handling 20,000 requests a day.",
      "SKILLS:",
      "Go, Python, PostgreSQL, Redis",
      "EDUCATION :",
      "BSc Information Technology, Strathmore University, 2019",
    ].join("\n"),
    expected: {
      name: "Grace Wanjiku",
      title: "Backend Engineer",
      email: "grace.wanjiku@example.com",
      phone: "+254 722 000 111",
      location: "Nairobi, Kenya",
      summaryStart: "Backend engineer who builds",
      experience: [{ role: "Backend Engineer", startDate: "2020-03", current: true }],
      skills: ["Go", "Python", "PostgreSQL", "Redis"],
    },
  },
  {
    id: "inline-headings",
    description: "Sections that run straight into their text",
    text: [
      "Omar Hassan",
      "omar@example.com | +44 7700 900123 | Leeds, UK",
      "Summary: Data analyst with four years of experience turning messy data into clear reports for finance teams.",
      "Skills: SQL, Python, Power BI, Excel",
      "EXPERIENCE",
      "Data Analyst | Halifax Group | 2019 – 2023",
      "• Built weekly finance dashboards in Power BI.",
      "Languages: English, Arabic",
    ].join("\n"),
    expected: {
      name: "Omar Hassan",
      email: "omar@example.com",
      phone: "+44 7700 900123",
      location: "Leeds, UK",
      summaryStart: "Data analyst with four years",
      experience: [{ role: "Data Analyst", company: "Halifax Group", startDate: "2019-01", endDate: "2023-01" }],
      skills: ["SQL", "Python", "Power BI", "Excel"],
      spoken: ["English", "Arabic"],
    },
  },
  {
    id: "spaced-capitals",
    description: "Headings written with a space between every letter",
    text: [
      "Priya Nair",
      "Product Designer",
      "priya@example.com | +91 98765 43210 | Bengaluru, India",
      "E X P E R I E N C E",
      "Product Designer | Figma Studio | Feb 2020 – Present",
      "• Led the redesign of the onboarding flow used by 12,000 customers.",
      "E D U C A T I O N",
      "BA Design | Srishti Institute | 2015 – 2019",
      "S K I L L S",
      "Figma, Prototyping, User Research",
    ].join("\n"),
    expected: {
      name: "Priya Nair",
      title: "Product Designer",
      email: "priya@example.com",
      experience: [{ role: "Product Designer", company: "Figma Studio", startDate: "2020-02", current: true }],
      education: [{ college: "Srishti Institute", degree: "BA Design" }],
      skills: ["Figma", "Prototyping", "User Research"],
    },
  },
  {
    id: "header-separators",
    description: "Contact details split by slashes, dashes and semicolons",
    text: [
      "Tomás Silva",
      "Full-Stack Developer",
      "Lisbon, Portugal / +351 912 345 678 / tomas@example.com – github.com/tomas",
      "EXPERIENCE",
      "Full-Stack Developer | Lisbon Labs | 2021 – Present",
      "• Shipped a booking platform used by 300 restaurants.",
    ].join("\n"),
    expected: {
      name: "Tomás Silva",
      title: "Full-Stack Developer",
      email: "tomas@example.com",
      phone: "+351 912 345 678",
      location: "Lisbon, Portugal",
      experience: [{ role: "Full-Stack Developer", company: "Lisbon Labs", current: true }],
    },
  },
  {
    id: "date-formats",
    description: "Month names, numbers, ISO dates and open-ended ranges",
    text: [
      "Dana Cole",
      "Operations Manager",
      "dana@example.com | +1 212 555 0100 | New York, NY",
      "EXPERIENCE",
      "Operations Manager | Harbor Logistics | Jan '21 – Present",
      "• Cut delivery delays by 22% across four depots.",
      "Operations Analyst | Harbor Logistics | 03/2019 – 12/2020",
      "• Built the weekly stock report used by every depot.",
      "Coordinator | Metro Freight | 2017 to 2019",
      "• Scheduled daily routes for a fleet of 30 vans.",
      "Assistant | City Couriers | Sept 2015 – Aug 2016",
      "• Handled customer calls and daily deliveries.",
      "Intern | Port Authority | 2014-06 - 2015-02",
      "• Entered shipping records into the tracking system.",
    ].join("\n"),
    expected: {
      name: "Dana Cole",
      experience: [
        { role: "Operations Manager", startDate: "2021-01", current: true },
        { role: "Operations Analyst", startDate: "2019-03", endDate: "2020-12" },
        { role: "Coordinator", startDate: "2017-01", endDate: "2019-01" },
        { role: "Assistant", startDate: "2015-09", endDate: "2016-08" },
        { role: "Intern", startDate: "2014-06", endDate: "2015-02" },
      ],
    },
  },
  {
    id: "extra-sections",
    description: "Skills first, a Contact block, Languages and Interests sections",
    text: [
      "Lena Fischer",
      "Software Developer",
      "SKILLS",
      "Java, Kotlin, Docker",
      "EXPERIENCE",
      "Software Developer | Berlin Apps | 2020 – Present",
      "• Built Android features used by 80,000 people.",
      "CONTACT",
      "lena@example.com",
      "+49 151 2345 6789",
      "LANGUAGES",
      "German, English",
      "INTERESTS",
      "Climbing and open-source",
    ].join("\n"),
    expected: {
      name: "Lena Fischer",
      title: "Software Developer",
      skills: ["Java", "Kotlin", "Docker"],
      experience: [{ role: "Software Developer", company: "Berlin Apps", startDate: "2020-01" }],
      spoken: ["German", "English"],
    },
  },
  {
    id: "graduate",
    description: "No work experience: education and projects lead",
    text: [
      "Kevin Otieno",
      "Junior Software Developer",
      "kevin@example.com | +254 711 222 333 | Mombasa, Kenya",
      "EDUCATION",
      "BSc Computer Science | Technical University of Mombasa | 2020 – 2024",
      "PROJECTS",
      "Shop Tracker | React, Node.js, PostgreSQL | Live demo · GitHub",
      "• Built an inventory app used by three local shops.",
      "SKILLS",
      "JavaScript, React, Node.js, PostgreSQL",
    ].join("\n"),
    expected: {
      name: "Kevin Otieno",
      title: "Junior Software Developer",
      email: "kevin@example.com",
      location: "Mombasa, Kenya",
      education: [{ college: "Technical University of Mombasa", degree: "BSc Computer Science" }],
      projects: ["Shop Tracker"],
      skills: ["JavaScript", "React", "Node.js", "PostgreSQL"],
    },
  },
];
