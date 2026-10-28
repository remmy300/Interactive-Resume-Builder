// Temporary screenshot capture (deleted after running).
import { mkdirSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { encode } from "@auth/core/jwt";
import puppeteer from "puppeteer-core";

const prisma = new PrismaClient();
const base = "http://localhost:3001";
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const email = `shot-${Date.now()}@example.com`;

const data = {
  template: "classic",
  summary:
    "Frontend developer with four years of experience building accessible, high-performance React applications. Focused on design systems, TypeScript, and measurable product outcomes.",
  personal: {
    name: "Alex Morgan",
    title: "Frontend Developer",
    phone: "+1 (415) 555-0134",
    email: "alex.morgan@example.com",
    location: "San Francisco, CA",
    linkedIn: "linkedin.com/in/alexmorgan",
    github: "github.com/alexmorgan",
    portfolio: "alexmorgan.dev",
  },
  education: [
    {
      id: "edu-1",
      college: "University of California, Berkeley",
      degree: "BSc Computer Science",
      startDate: "2017-08",
      endDate: "2021-05",
      current: false,
    },
  ],
  experience: [
    {
      id: "exp-1",
      company: "Northwind Labs",
      role: "Frontend Developer",
      description:
        "Led the migration of a 40-page dashboard to Next.js App Router, cutting first load by 38%.\nBuilt a typed design-system package used by four product teams.\nRaised Lighthouse accessibility scores from 74 to 98 across the app.",
      startDate: "2023-03",
      endDate: "",
      current: true,
    },
    {
      id: "exp-2",
      company: "Pineapple Studio",
      role: "Junior Developer",
      description:
        "Shipped a booking flow that increased completed reservations by 22%.\nIntroduced Storybook and visual regression tests for the component library.",
      startDate: "2021-06",
      endDate: "2023-02",
      current: false,
    },
  ],
  projects: [
    {
      id: "prj-1",
      title: "Resume Studio",
      description:
        "Full-stack resume builder with Google sign-in, autosave, and ATS-friendly PDF export.\nBuilt with Next.js, Prisma, PostgreSQL, and NextAuth.",
      link: "https://github.com/alexmorgan/resume-studio",
    },
    {
      id: "prj-2",
      title: "Trailhead",
      description:
        "Offline-first hiking companion with route sync and a custom map renderer.\nServes 3,000 monthly active users.",
      link: "https://trailhead.example.com",
    },
  ],
  certifications: [
    {
      id: "cert-1",
      name: "AWS Certified Cloud Practitioner",
      issuer: "Amazon Web Services",
      date: "2024-02",
      link: "",
    },
  ],
  skills: {
    languages: "TypeScript, JavaScript, SQL, Python",
    technologies: "React, Next.js, Tailwind CSS, Node.js, Playwright",
    databases: "PostgreSQL, Redis",
    spoken: "English (native), Spanish (conversational)",
  },
};

mkdirSync("docs/screenshots", { recursive: true });
const slug = `demo-${Date.now().toString(36)}`;
const user = await prisma.user.create({ data: { email, name: "Alex Morgan" } });
await prisma.resume.create({
  data: {
    userId: user.id,
    title: "Frontend Engineer · 2026",
    data,
    isPublic: true,
    publicSlug: slug,
  },
});

const secret = process.env.AUTH_SECRET;
const token = await encode({
  token: { id: user.id, sub: user.id, email, name: user.name },
  secret,
  salt: "authjs.session-token",
});

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--no-sandbox", "--hide-scrollbars"],
});

const errors = [];
try {
  const page = await browser.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
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
    () => document.body.textContent?.includes("Alex Morgan"),
    { timeout: 120_000 },
  );
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await page.screenshot({ path: "docs/screenshots/editor.png" });

  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll("button")).find(
      (item) => item.textContent?.trim() === "Preview",
    );
    button?.click();
  });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  await page.screenshot({ path: "docs/screenshots/preview.png" });

  const mobile = await browser.newPage();
  mobile.on("pageerror", (error) => errors.push(String(error)));
  await mobile.setViewport({ width: 390, height: 844, isMobile: true });
  await mobile.setCookie({
    name: "authjs.session-token",
    value: token,
    domain: "localhost",
    path: "/",
    httpOnly: true,
    secure: false,
  });
  await mobile.goto(`${base}/`, { waitUntil: "networkidle2", timeout: 120_000 });
  await mobile.waitForFunction(
    () => document.body.textContent?.includes("Alex Morgan"),
    { timeout: 120_000 },
  );
  await mobile.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('[role="tab"]')).find(
      (item) => item.textContent?.trim() === "Preview",
    );
    tab?.click();
  });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  await mobile.screenshot({ path: "docs/screenshots/mobile-preview.png" });

  const publicPage = await browser.newPage();
  publicPage.on("pageerror", (error) => errors.push(String(error)));
  await publicPage.setViewport({ width: 1280, height: 1000 });
  const response = await publicPage.goto(`${base}/r/${slug}`, {
    waitUntil: "networkidle2",
    timeout: 120_000,
  });
  await new Promise((resolve) => setTimeout(resolve, 800));
  await publicPage.screenshot({ path: "docs/screenshots/public-resume.png" });
  console.log("public status", response?.status());
} finally {
  await browser.close();
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
}

console.log(errors.length ? `BROWSER ERRORS:\n${errors.join("\n")}` : "NO BROWSER ERRORS");
