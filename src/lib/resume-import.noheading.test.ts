import { describe, expect, it } from "vitest";
import { joinPdfPages, parseResumeText } from "./resume-import";

// A real CV: a company footer on every page, a summary paragraph with no
// heading, "Company, City, Country." lines that end in a full stop, a degree
// with a school on the next line, and certifications as a plain bullet list.
const TEXT = [
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

describe("a CV with no summary heading, a page footer and 'Company, City, Country.' lines", () => {
  const { data } = parseResumeText(TEXT);

  it("finds the name, title and contact details despite the footer", () => {
    expect(data.personal.name).toBe("Kelvin Muthomi");
    expect(data.personal.title).toBe("Software Engineer");
    expect(data.personal.email).toBe("kelvomuth@gmail.com");
    expect(data.personal.location).toBe("Nairobi, Kenya");
  });

  it("uses the paragraph under the header as the summary", () => {
    expect(data.summary.startsWith("I am a skilled results-driven software engineer")).toBe(true);
    expect(data.summary.endsWith("cloud-based solutions.")).toBe(true);
    expect(data.personal.title).not.toContain("I am");
  });

  it("keeps every role with its company, including the first", () => {
    expect(data.experience.map((entry) => entry.company)).toEqual([
      "Safaricom PLC",
      "Compulynx",
      "Adanian Labs",
      "OktiqDevelopers",
    ]);
    expect(data.experience[0].role).toBe("Software Engineer (Site Reliability Engineer)");
    expect(data.experience[0].current).toBe(true);
    expect(data.experience[0].startDate).toBe("2022-02");
  });

  it("does not glue the next company onto the last bullet", () => {
    for (const entry of data.experience) {
      expect(entry.description).not.toMatch(/Nairobi, Kenya\.?$/m);
    }
    expect(data.experience[1].description).toContain(
      "collection of revenue.",
    );
    expect(data.experience[2].description).toContain("rekod)");
  });

  it("reads the degree and the school from two lines", () => {
    expect(data.education).toHaveLength(1);
    expect(data.education[0].degree).toBe("Bachelor of Science in Computer Science");
    expect(data.education[0].college).toBe("Multimedia university of Kenya");
    expect(data.education[0].endDate).toBe("2020-01");
  });

  it("reads each bullet under Certifications as its own entry", () => {
    expect(data.certifications.map((item) => item.name)).toEqual([
      "AWS Cloud Practitioner",
      "ITIL 4 Foundation",
      "Gremlin Certified Enterprise Chaos Engineering Certification - GECEC",
      "DevOps Foundations: Site Reliability Engineering",
      "Linux System Engineer: Bash Shell Scripting for Automation",
    ]);
  });

  it("joins wrapped skill lines and drops trailing full stops", () => {
    const all = Object.values(data.skills).join(", ");
    expect(all).toContain("AWS Code Pipeline");
    expect(all).not.toMatch(/\.(,|$)/);
    expect(all).not.toContain("analytical &,");
  });
});

describe("joinPdfPages", () => {
  it("removes a footer repeated on several pages", () => {
    const text = joinPdfPages([
      "C2 - Safaricom Internal\nKelvin Muthomi\nWORK EXPERIENCE",
      "C2 - Safaricom Internal\nSoftware Engineer 01/2021 - 07/2021",
      "C2 - Safaricom Internal",
    ]);
    expect(text).not.toContain("C2 - Safaricom Internal");
    expect(text).toContain("Kelvin Muthomi");
  });

  it("keeps a running name on the first page only", () => {
    const text = joinPdfPages(["Kelvin Muthomi\nSUMMARY", "Kelvin Muthomi\nEXPERIENCE"]);
    expect(text.match(/Kelvin Muthomi/g)).toHaveLength(1);
  });

  it("leaves a single page untouched", () => {
    expect(joinPdfPages(["A\nB"])).toBe("A\nB");
  });
});
