// Temporary print check (deleted after running).
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { encode } from "@auth/core/jwt";
import puppeteer from "puppeteer-core";
import { PDFParse } from "pdf-parse";

const prisma = new PrismaClient();
const base = "http://localhost:3001";
const email = `print-${Date.now()}@example.com`;

const data = {
  template: "classic",
  summary: "Frontend developer focused on accessibility and performance.",
  personal: {
    name: "Alex Morgan",
    title: "Frontend Developer",
    phone: "+1 (415) 555-0134",
    email: "alex.morgan@example.com",
    location: "San Francisco, CA",
    linkedIn: "",
    github: "",
    portfolio: "",
  },
  education: [],
  experience: [
    {
      id: "exp-1",
      company: "Northwind Labs",
      role: "Frontend Developer",
      description: "Cut first load by 38%.\nRaised accessibility scores to 98.",
      startDate: "2023-03",
      endDate: "",
      current: true,
    },
  ],
  projects: [],
  certifications: [],
  skills: { languages: "TypeScript", technologies: "React", databases: "", spoken: "" },
};

const user = await prisma.user.create({ data: { email, name: "Alex Morgan" } });
await prisma.resume.create({ data: { userId: user.id, title: "Alex Morgan — Resume", data } });
const token = await encode({
  token: { id: user.id, sub: user.id, email, name: user.name },
  secret: process.env.AUTH_SECRET,
  salt: "authjs.session-token",
});

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});

try {
  const page = await browser.newPage();
  await page.setCookie({
    name: "authjs.session-token",
    value: token,
    domain: "localhost",
    path: "/",
    httpOnly: true,
    secure: false,
  });
  await page.goto(`${base}/`, { waitUntil: "networkidle2", timeout: 120_000 });
  await page.waitForFunction(
    () => document.body.textContent?.includes("Northwind Labs"),
    { timeout: 120_000 },
  );
  await new Promise((resolve) => setTimeout(resolve, 1200));

  await page.pdf({
    path: "docs/sample-resume.pdf",
    preferCSSPageSize: true,
    printBackground: true,
  });

  const buffer = await readFile("docs/sample-resume.pdf");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const parsed = await parser.getText();
  console.log("pages:", parsed.total);
  console.log("has name:", parsed.text.includes("Alex Morgan"));
  console.log("has work:", parsed.text.includes("Northwind Labs"));
  console.log("has present:", parsed.text.includes("Present"));
  console.log("has app chrome:", parsed.text.includes("Live preview"));
  console.log("text preview:", JSON.stringify(parsed.text.slice(0, 220)));
  await parser.destroy();
} finally {
  await browser.close();
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
}
