import { chromium } from "playwright";
import fs from "fs";
import path from "path";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #1e293b; line-height: 1.5; font-size: 13px; }
    h1 { margin: 0; font-size: 26px; color: #0f172a; }
    .subtitle { color: #2563eb; font-weight: 600; font-size: 14px; margin-top: 4px; }
    .contact { color: #64748b; font-size: 12px; margin-top: 6px; margin-bottom: 24px; }
    h2 { font-size: 15px; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px; margin-top: 20px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #334155; }
    .job { margin-bottom: 14px; }
    .job-header { display: flex; justify-content: space-between; font-weight: 600; color: #0f172a; }
    .job-title { color: #475569; font-style: italic; margin-bottom: 6px; }
    ul { margin: 0; padding-left: 20px; }
    li { margin-bottom: 4px; color: #334155; }
    .skills-grid { display: grid; grid-template-columns: 120px 1fr; row-gap: 6px; }
    .skill-cat { font-weight: 600; color: #475569; }
  </style>
</head>
<body>
  <h1>Aditya Pathak</h1>
  <div class="subtitle">Lead Full-Stack Software Engineer</div>
  <div class="contact">aditya@example.com • +1 (555) 234-5678 • San Francisco, CA • linkedin.com/in/adityapathak</div>

  <h2>Professional Summary</h2>
  <p>Results-driven Full-Stack Engineer with 7+ years of experience engineering high-scale web platforms and distributed cloud systems using React, TypeScript, Node.js, and Google Cloud Platform.</p>

  <h2>Work Experience</h2>
  <div class="job">
    <div class="job-header">
      <span>TechCorp Global — Senior Software Engineer</span>
      <span>2022 – Present</span>
    </div>
    <div class="job-title">Core Platform & Architecture</div>
    <ul>
      <li>Architected distributed microservices platform processing $40M+ in daily transaction volume with 99.99% service availability.</li>
      <li>Spearheaded React and TypeScript design system adoption across 12 squad teams, slashing frontend development cycles by 35%.</li>
      <li>Implemented end-to-end CI/CD pipelines with Docker and Kubernetes, reducing deployment rollout failure rates by 48%.</li>
    </ul>
  </div>

  <div class="job">
    <div class="job-header">
      <span>NextGen Solutions — Software Engineer</span>
      <span>2019 – 2022</span>
    </div>
    <div class="job-title">Full-Stack Application Development</div>
    <ul>
      <li>Engineered customer-facing analytics dashboards handling 2.5M daily active users with sub-100ms p95 response latencies.</li>
      <li>Optimized PostgreSQL database queries and indexes, cutting server compute expenditures by $60,000 annually.</li>
      <li>Mentored 6 junior engineers on unit testing, TypeScript best practices, and clean architecture standards.</li>
    </ul>
  </div>

  <h2>Technical Skills</h2>
  <div class="skills-grid">
    <div class="skill-cat">Languages:</div>
    <div>TypeScript, JavaScript, Python, Go, SQL</div>
    <div class="skill-cat">Frontend:</div>
    <div>React 19, Next.js, React Router, Tailwind CSS, Redux, Zustand</div>
    <div class="skill-cat">Backend:</div>
    <div>Node.js, Express, PostgreSQL, Redis, GraphQL, REST APIs</div>
    <div class="skill-cat">Cloud & DevOps:</div>
    <div>Docker, Kubernetes, AWS, Google Cloud, CI/CD, Git</div>
  </div>
</body>
</html>`;

  await page.setContent(html);
  if (!fs.existsSync("temp")) {
    fs.mkdirSync("temp", { recursive: true });
  }
  const pdfPath = path.resolve("temp/aditya_pathak_resume.pdf");
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" }
  });

  console.log("PDF created successfully at:", pdfPath);
  await browser.close();
}

main().catch(console.error);
