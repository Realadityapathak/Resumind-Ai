import { chromium } from "playwright";
import path from "path";

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  await context.route("**/js.puter.com/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "// Puter mock active",
    });
  });

  const artifactDir = "C:\\Users\\ADITYA PATHAK\\.gemini\\antigravity\\brain\\449355ba-47a5-4efe-ac92-8d9115671dd5";

  await context.addInitScript(() => {
    const resumeRecord = {
      id: "demo-aditya-pathak",
      companyName: "Google",
      jobTitle: "Lead Full-Stack Engineer",
      jobDescription: "Seeking a Lead Full-Stack Engineer experienced with React 19, TypeScript, distributed systems, and PostgreSQL.",
      fileName: "aditya_pathak_resume.pdf",
      fileSize: 48200,
      pageCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      feedback: {
        overallScore: 88,
        ATS: {
          score: 90,
          tips: [
            { type: "good", tip: "Clean single-column layout with standard section headers." },
            { type: "good", tip: "Consistent reverse-chronological work experience formatting." },
            { type: "improve", tip: "Incorporate targeted keywords like GraphQL into technical skills." }
          ]
        },
        toneAndStyle: {
          score: 87,
          tips: [
            { type: "good", tip: "Strong active verbs used throughout ('Architected', 'Spearheaded').", explanation: "Commands authority and technical seniority." },
            { type: "good", tip: "Concise bullet structure without pronoun fluff.", explanation: "Maintains high recruiter readability." }
          ]
        },
        content: {
          score: 89,
          tips: [
            { type: "good", tip: "Excellent quantified business metrics ($40M+ volume, 35% speedup, 99.99% uptime).", explanation: "Shows clear return on engineering investment." },
            { type: "improve", tip: "Add mention of system observability tools like OpenTelemetry or Datadog.", explanation: "Reinforces production operational maturity." }
          ]
        },
        structure: {
          score: 92,
          tips: [
            { type: "good", tip: "Clear, logical visual hierarchy from summary to experience and skills.", explanation: "Effortlessly parsed by both ATS and human recruiters." }
          ]
        },
        skills: {
          score: 85,
          tips: [
            { type: "good", tip: "Modern, relevant stack with React 19, TypeScript, PostgreSQL, and Kubernetes.", explanation: "Directly matches modern Tier-1 engineering requirements." },
            { type: "improve", tip: "Highlight cloud-native infrastructure automation like Terraform.", explanation: "Rounds out DevOps leadership profile." }
          ]
        }
      },
      keywordAnalysis: {
        matchRate: 85,
        totalJobKeywords: 16,
        matchedCount: 13,
        missingCount: 3,
        matchedKeywords: [
          { keyword: "React", category: "technical", frequencyInJob: 5, frequencyInResume: 4, importance: "critical" },
          { keyword: "TypeScript", category: "technical", frequencyInJob: 4, frequencyInResume: 3, importance: "critical" },
          { keyword: "PostgreSQL", category: "technical", frequencyInJob: 3, frequencyInResume: 2, importance: "recommended" },
          { keyword: "Distributed Systems", category: "domain", frequencyInJob: 3, frequencyInResume: 2, importance: "critical" },
          { keyword: "Docker", category: "tools", frequencyInJob: 2, frequencyInResume: 2, importance: "recommended" },
          { keyword: "Kubernetes", category: "tools", frequencyInJob: 2, frequencyInResume: 2, importance: "recommended" }
        ],
        missingKeywords: [
          { keyword: "GraphQL", category: "technical", frequencyInJob: 3, frequencyInResume: 0, importance: "recommended", contextOrSuggestion: "Mention GraphQL API schemas in your backend section." },
          { keyword: "Redis Caching", category: "tools", frequencyInJob: 2, frequencyInResume: 0, importance: "recommended", contextOrSuggestion: "Highlight high-throughput caching strategies." },
          { keyword: "Terraform", category: "tools", frequencyInJob: 2, frequencyInResume: 0, importance: "optional", contextOrSuggestion: "Add infrastructure-as-code automation." }
        ],
        topRecommendations: [
          "Highlight distributed systems design patterns in your lead engineer bullet.",
          "Integrate GraphQL and Redis caching into your technical skills section."
        ]
      },
      savedStarRewrites: [
        {
          id: "variant-1",
          originalBullet: "Architected distributed microservices platform processing $40M+ in daily transaction volume.",
          critique: "Strong metrics; variants provide focused leadership and performance depth.",
          variants: [
            {
              id: "v-1",
              type: "action-oriented",
              fullBullet: "Spearheaded distributed microservices re-architecture processing $40M+ daily transactions, slashing p99 latency by 32% across 14 global services.",
              starBreakdown: {
                situation: "Legacy payment platform had latency bottlenecks under peak loads.",
                task: "Re-architect transaction settlement for high throughput.",
                action: "Designed asynchronous event queues with Redis buffering and connection pooling.",
                result: "Processed $40M daily and reduced p99 latency by 32%.",
                metrics: ["$40M daily", "32% latency reduction"]
              },
              explanation: "Emphasizes action verbs and quantifies speed improvements."
            }
          ],
          createdAt: new Date().toISOString()
        }
      ]
    };

    const store = new Map();
    store.set("resume:demo-aditya-pathak", resumeRecord);

    window.puter = {
      auth: {
        getUser: async () => ({ uuid: "user-aditya", username: "Realadityapathak" }),
        isSignedIn: async () => true,
        signIn: async () => {},
        signOut: async () => {},
      },
      fs: {
        read: async () => new Blob(["mock bytes"], { type: "application/pdf" }),
        write: async () => {},
        upload: async () => ({ id: "1", path: "resumes/resume.pdf" }),
        delete: async () => {},
        readdir: async () => [],
      },
      kv: {
        get: async (k) => store.get(k) || null,
        set: async (k, v) => { store.set(k, v); return true; },
        delete: async (k) => { store.delete(k); return true; },
        list: async () => [{ key: "resume:demo-aditya-pathak", value: resumeRecord }],
      },
      ai: {
        chat: async () => ({ message: { content: "{}" } }),
        feedback: async () => ({ message: { content: "{}" } }),
        img2txt: async () => "",
      }
    };
  });

  const page = await context.newPage();

  console.log("Capturing Overview Tab...");
  await page.goto("http://localhost:5173/resume/demo-aditya-pathak?tab=overview");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, "demo_workspace_overview.png") });

  console.log("Capturing Keyword Gap Tab...");
  await page.goto("http://localhost:5173/resume/demo-aditya-pathak?tab=keywords");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(artifactDir, "demo_workspace_keywords.png") });

  console.log("Capturing STAR Rewriter Tab...");
  await page.goto("http://localhost:5173/resume/demo-aditya-pathak?tab=star");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(artifactDir, "demo_workspace_star.png") });

  console.log("Capturing Dashboard View...");
  await page.goto("http://localhost:5173/dashboard");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(artifactDir, "demo_dashboard_view.png") });

  console.log("All demo frames captured successfully!");
  await browser.close();
}

main().catch(console.error);
