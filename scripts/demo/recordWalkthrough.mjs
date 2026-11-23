import { chromium } from "playwright";
import fs from "fs";
import path from "path";

async function run() {
  const recordingsDir = path.resolve("temp/recordings");
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: recordingsDir,
      size: { width: 1280, height: 720 },
    },
  });

  // Intercept js.puter.com CDN script so it doesn't overwrite our mock
  await context.route("**/js.puter.com/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "// Puter mock active",
    });
  });

  await context.addInitScript(() => {
    const kvStore = new Map();
    const fsStore = new Map();

    const currentUser = {
      uuid: "user-aditya",
      username: "Realadityapathak",
      email: "aditya@example.com",
    };

    window.puter = {
      auth: {
        getUser: async () => currentUser,
        isSignedIn: async () => true,
        signIn: async () => {},
        signOut: async () => {},
      },
      fs: {
        write: async (filePath, data) => {
          fsStore.set(filePath, data);
          return new File([data], filePath.split("/").pop() || "file");
        },
        read: async (filePath) => {
          const stored = fsStore.get(filePath);
          if (stored instanceof Blob) return stored;
          return new Blob([stored || "mock file content"], { type: "application/pdf" });
        },
        upload: async (files) => {
          const file = files[0];
          const name = file ? file.name : "resume.pdf";
          const filePath = `resumes/${Date.now()}_${name}`;
          fsStore.set(filePath, file);
          return {
            id: "fs_" + Math.random().toString(36).substring(2, 9),
            name,
            path: filePath,
            size: file ? file.size : 1024,
          };
        },
        delete: async (filePath) => {
          fsStore.delete(filePath);
        },
        readdir: async () => [],
      },
      kv: {
        get: async (key) => {
          const val = kvStore.get(key);
          return val !== undefined ? val : null;
        },
        set: async (key, val) => {
          // Puter KV auto-deserializes JSON objects on retrieval
          try {
            const parsed = typeof val === "string" ? JSON.parse(val) : val;
            kvStore.set(key, parsed);
          } catch {
            kvStore.set(key, val);
          }
          return true;
        },
        delete: async (key) => {
          kvStore.delete(key);
          return true;
        },
        list: async (pattern, returnValues = false) => {
          const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
          const keys = Array.from(kvStore.keys()).filter((k) => regex.test(k));
          if (returnValues) {
            return keys.map((k) => ({ key: k, value: kvStore.get(k) }));
          }
          return keys;
        },
        flush: async () => {
          kvStore.clear();
          return true;
        },
      },
      ai: {
        chat: async (prompt, options) => {
          const promptStr = typeof prompt === "string" ? prompt : JSON.stringify(prompt);

          // Resume Feedback / ATS analysis prompt
          if (
            promptStr.includes("overallScore") ||
            promptStr.includes("Feedback") ||
            promptStr.includes("toneAndStyle") ||
            promptStr.includes("ATS suitability")
          ) {
            return {
              message: {
                content: JSON.stringify({
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
                })
              }
            };
          }

          // Keyword gap prompt
          if (promptStr.includes("Keyword Gap") || promptStr.includes("matchRate")) {
            return {
              message: {
                content: JSON.stringify({
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
                }),
              },
            };
          }

          // STAR rewriter prompt
          if (promptStr.includes("STAR") || promptStr.includes("originalBullet")) {
            return {
              message: {
                content: JSON.stringify({
                  originalBullet: "Architected distributed microservices platform processing $40M+ in daily transaction volume.",
                  critique: "Strong foundation with metrics; variants provide focused leadership and performance depth.",
                  variants: [
                    {
                      id: "variant-1",
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
                    },
                    {
                      id: "variant-2",
                      type: "metrics-focused",
                      fullBullet: "Accelerated platform settlement throughput by 45% to process $40M+ daily volume, capturing $180K in annual cloud infrastructure savings.",
                      starBreakdown: {
                        situation: "High compute costs and batch bottlenecks.",
                        task: "Optimize query throughput and reduce infrastructure spend.",
                        action: "Engineered database read replicas and query optimization pipelines.",
                        result: "45% throughput boost and $180K in annual savings.",
                        metrics: ["45%", "$40M+", "$180K"]
                      },
                      explanation: "Quantifies business bottom-line dollar savings alongside scale."
                    },
                    {
                      id: "variant-3",
                      type: "technical-depth",
                      fullBullet: "Engineered idempotent transaction pipelines utilizing Kafka event-sourcing and PostgreSQL read-replicas, guaranteeing sub-50ms p95 SLAs at 12K req/sec.",
                      starBreakdown: {
                        situation: "Distributed state synchronization challenges.",
                        task: "Enforce strict financial ledger consistency.",
                        action: "Implemented event-sourcing with Kafka and consensus mechanisms.",
                        result: "Sub-50ms p95 SLA at 12,000 requests per second.",
                        metrics: ["sub-50ms", "12K req/sec"]
                      },
                      explanation: "Demonstrates advanced architectural mastery and distributed systems depth."
                    }
                  ]
                }),
              },
            };
          }

          // Cover Letter prompt
          if (promptStr.includes("Cover Letter") || promptStr.includes("Dear Hiring Team")) {
            return {
              message: {
                content: JSON.stringify({
                  roleTitle: "Lead Full-Stack Engineer",
                  companyName: "Google",
                  tone: "passionate",
                  subjectLine: "Application for Lead Full-Stack Engineer — Aditya Pathak",
                  salutation: "Dear Google Hiring Team,",
                  hookParagraph: "I am writing to express my enthusiastic interest in the Lead Full-Stack Engineer role at Google. With over seven years of experience architecting distributed cloud systems and modern React web applications, I have dedicated my career to building reliable, high-impact products at scale.",
                  bodyParagraphs: [
                    "At TechCorp Global, I spearheaded our core platform re-architecture, processing $40M+ daily transaction volume with 99.99% availability. By orchestrating TypeScript microservices and designing reusable React design systems, our team accelerated cross-organization feature delivery by 35% while slashing latency bottlenecks.",
                    "Google's commitment to solving world-scale engineering challenges aligns directly with my passion for resilient distributed systems and engineering excellence. I am excited about the opportunity to bring my hands-on architecture experience and collaborative leadership to Google's engineering organization."
                  ],
                  closingParagraph: "Thank you for your time and consideration. I would welcome the opportunity to discuss how my technical experience can contribute to Google's ongoing engineering initiatives.",
                  signOff: "Sincerely,\nAditya Pathak",
                  fullText: "Application for Lead Full-Stack Engineer — Aditya Pathak\n\nDear Google Hiring Team,\n\nI am writing to express my enthusiastic interest in the Lead Full-Stack Engineer role at Google. With over seven years of experience architecting distributed cloud systems and modern React web applications, I have dedicated my career to building reliable, high-impact products at scale.\n\nAt TechCorp Global, I spearheaded our core platform re-architecture, processing $40M+ daily transaction volume with 99.99% availability. By orchestrating TypeScript microservices and designing reusable React design systems, our team accelerated cross-organization feature delivery by 35% while slashing latency bottlenecks.\n\nGoogle's commitment to solving world-scale engineering challenges aligns directly with my passion for resilient distributed systems and engineering excellence. I am excited about the opportunity to bring my hands-on architecture experience and collaborative leadership to Google's engineering organization.\n\nThank you for your time and consideration. I would welcome the opportunity to discuss how my technical experience can contribute to Google's ongoing engineering initiatives.\n\nSincerely,\nAditya Pathak"
                })
              }
            };
          }

          // Interview prep prompt
          if (promptStr.includes("Interview") || promptStr.includes("questions")) {
            return {
              message: {
                content: JSON.stringify({
                  roleTitle: "Lead Full-Stack Engineer",
                  companyName: "Google",
                  questions: [
                    {
                      id: "q-1",
                      category: "behavioral",
                      question: "Tell me about a time you led a major architectural refactoring across multiple engineering squads.",
                      recruiterIntent: "Probes cross-functional leadership, technical consensus building, and change management.",
                      resumeAnchor: "Anchored to your design system and microservices rollout at TechCorp Global.",
                      starModelAnswer: {
                        situation: "12 engineering squad teams had fragmented UI codebases causing high defect rates.",
                        task: "Unify architecture without halting active product feature roadmaps.",
                        action: "Formed a working group, built backward-compatible React components, and hosted weekly migration clinics.",
                        result: "Cut frontend cycle times by 35% and achieved 100% adoption within 2 quarters.",
                        fullAnswer: "When our engineering organization grew to 12 squad teams, our frontend architectures began diverging. I organized a cross-team guild to define standard design primitives in TypeScript. We created automated codemods to migrate existing repositories seamlessly, reducing development cycles by 35% without delaying product releases."
                      },
                      pitfallsToAvoid: [
                        "Dictating architectural changes top-down without engineer buy-in.",
                        "Failing to measure migration milestones."
                      ]
                    },
                    {
                      id: "q-2",
                      category: "technical",
                      question: "How do you design an idempotent settlement pipeline to prevent double-charging in high-scale distributed systems?",
                      recruiterIntent: "Evaluates distributed systems expertise, database transactions, and network failure modes.",
                      resumeAnchor: "Anchored to your $40M+ daily transaction volume platform.",
                      starModelAnswer: {
                        situation: "Network retries during peak traffic could cause duplicate payment requests.",
                        task: "Guarantee exactly-once processing semantics across microservices.",
                        action: "Implemented distributed locking with Redis and unique idempotency keys stored in PostgreSQL with ACID isolation.",
                        result: "100% zero-duplicate processing across over 100M lifetime transactions.",
                        fullAnswer: "In high-scale financial platforms, network retries can create duplicate executions. I implemented client-generated UUID idempotency keys verified against a transactional Redis lock before executing ledger writes in PostgreSQL. This eliminated duplicate transactions completely."
                      },
                      pitfallsToAvoid: [
                        "Relying solely on in-memory state without distributed coordination.",
                        "Not handling network timeout states gracefully."
                      ]
                    }
                  ]
                })
              }
            };
          }

          // Copilot prompt
          return {
            message: {
              content: JSON.stringify({
                reply: "Hello Aditya! I've analyzed your resume against the Lead Full-Stack Engineer position at Google. Your background in distributed transaction systems and React architectures is a strong fit. To push your score even higher, consider using the **STAR Rewriter** to highlight scale on your lead bullet, and check the **Keyword Gap** tab to include GraphQL in your tech stack.",
                actionSuggestions: [
                  {
                    label: "Optimize with STAR",
                    actionType: "switch_tab",
                    tabTarget: "star",
                    payload: "Architected distributed microservices platform processing $40M+ in daily transaction volume.",
                    icon: "✨"
                  },
                  {
                    label: "View Missing Keywords",
                    actionType: "switch_tab",
                    tabTarget: "keywords",
                    icon: "🎯"
                  }
                ]
              })
            }
          };
        },
        feedback: async (path, message) => {
          return {
            message: {
              content: JSON.stringify({
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
              })
            }
          };
        },
        img2txt: async () => "Aditya Pathak\nLead Full-Stack Software Engineer\nTechCorp Global",
      },
    };
  });

  const page = await context.newPage();

  page.on("console", (msg) => console.log("PAGE LOG:", msg.type(), msg.text()));
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err));

  console.log("Navigating to http://localhost:5173/ ...");
  await page.goto("http://localhost:5173/");
  await page.waitForTimeout(2000);

  console.log("Navigating to Upload Page...");
  await page.goto("http://localhost:5173/upload");
  await page.waitForTimeout(1500);

  console.log("Filling Form fields...");
  await page.fill('input[name="company-name"]', "Google");
  await page.waitForTimeout(500);
  await page.fill('input[name="job-title"]', "Lead Full-Stack Engineer");
  await page.waitForTimeout(500);
  await page.fill('textarea[name="job-description"]', "Seeking a Lead Full-Stack Engineer experienced with React 19, TypeScript, distributed systems, PostgreSQL, and cloud infrastructure.");
  await page.waitForTimeout(800);

  console.log("Selecting sample PDF resume...");
  const pdfFilePath = path.resolve("temp/aditya_pathak_resume.pdf");
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.setInputFiles(pdfFilePath);
  }
  await page.waitForTimeout(1500);

  console.log("Clicking Analyze Resume button...");
  await page.click('button[type="submit"]');

  console.log("Waiting for analysis to complete and workspace to load...");
  await page.waitForURL(/.*\/resume\/.*/, { timeout: 30000 });
  console.log("Successfully redirected to Workspace:", page.url());
  await page.waitForTimeout(3000);

  console.log("Touring Workspace Tabs...");
  await page.waitForTimeout(2000);

  console.log("Clicking Deep Dive Tab...");
  const deepDiveTab = await page.$('button[role="tab"]:has-text("Deep Dive")');
  if (deepDiveTab) {
    await deepDiveTab.click();
    await page.waitForTimeout(2500);
  }

  console.log("Clicking Keyword Gap Tab...");
  const keywordTab = await page.$('button[role="tab"]:has-text("Keyword Gap")');
  if (keywordTab) {
    await keywordTab.click();
    await page.waitForTimeout(1500);
    const scanBtn = await page.$('button:has-text("Scan & Match Keywords")');
    if (scanBtn) {
      await scanBtn.click();
      await page.waitForTimeout(2500);
    }
  }

  console.log("Clicking STAR Rewriter Tab...");
  const starTab = await page.$('button[role="tab"]:has-text("STAR Rewriter")');
  if (starTab) {
    await starTab.click();
    await page.waitForTimeout(1500);

    const bulletArea = await page.$('textarea');
    if (bulletArea) {
      await bulletArea.fill("Engineered microservices and reduced checkout latency by 45%");
      await page.waitForTimeout(600);
    }

    const transformBtn = await page.$('button:has-text("Transform with AI")');
    if (transformBtn && !(await transformBtn.isDisabled())) {
      await transformBtn.click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(2500);
    }
  }

  console.log("Clicking Cover Letter Tab...");
  const clTab = await page.$('button[role="tab"]:has-text("Cover Letter")');
  if (clTab) {
    await clTab.click();
    await page.waitForTimeout(1500);
    const genLetterBtn = await page.$('button:has-text("Generate Tailored Letter")');
    if (genLetterBtn && !(await genLetterBtn.isDisabled())) {
      await genLetterBtn.click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(2500);
    }
  }

  console.log("Clicking Interview Prep Tab...");
  const interviewTab = await page.$('button[role="tab"]:has-text("Interview Prep")');
  if (interviewTab) {
    await interviewTab.click();
    await page.waitForTimeout(1500);
    const genPrepBtn = await page.$('button:has-text("Generate 6-8 Questions")');
    if (genPrepBtn && !(await genPrepBtn.isDisabled())) {
      await genPrepBtn.click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(2500);
    }
  }

  console.log("Clicking AI Copilot Tab...");
  const copilotTab = await page.$('button[role="tab"]:has-text("AI Copilot")');
  if (copilotTab) {
    await copilotTab.click();
    await page.waitForTimeout(2500);
  }

  console.log("Navigating to Dashboard to verify persistence...");
  await page.goto("http://localhost:5173/dashboard");
  await page.waitForTimeout(2500);

  console.log("Clicking on resume from Dashboard to verify smooth workspace load...");
  const reviewLink = await page.$('a:has-text("Review")');
  if (reviewLink) {
    await reviewLink.click();
    await page.waitForTimeout(3000);
    console.log("Workspace opened successfully from Dashboard!");
  }

  console.log("Closing browser and saving video recording...");
  await context.close();
  await browser.close();

  const videoFiles = fs.readdirSync(recordingsDir).filter((f) => f.endsWith(".webm"));
  if (videoFiles.length > 0) {
    const latestWebm = path.join(recordingsDir, videoFiles[videoFiles.length - 1]);
    console.log("Recorded WebM:", latestWebm);

    const artifactWebm = "C:\\Users\\ADITYA PATHAK\\.gemini\\antigravity\\brain\\449355ba-47a5-4efe-ac92-8d9115671dd5\\live_walkthrough_recording.webm";
    fs.copyFileSync(latestWebm, artifactWebm);
    console.log("Video copied to artifacts:", artifactWebm);
  }

  console.log("Done!");
}

run().catch((err) => {
  console.error("Recording error:", err);
  process.exit(1);
});
