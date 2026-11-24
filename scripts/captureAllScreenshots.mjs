import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const SCREENSHOT_DIR = path.resolve("docs/screenshots");
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function generateSampleResumeImage(browser) {
  const page = await browser.newPage({ viewport: { width: 800, height: 1100 } });
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 48px 56px; color: #1c1917; line-height: 1.5; font-size: 13px; background: #ffffff; }
    h1 { margin: 0; font-size: 26px; color: #0c0a09; font-weight: 700; letter-spacing: -0.02em; }
    .title { color: #0284c7; font-weight: 600; font-size: 14px; margin-top: 4px; }
    .contact { color: #78716c; font-size: 12px; margin-top: 6px; margin-bottom: 22px; padding-bottom: 14px; border-bottom: 1.5px solid #e7e5e4; }
    h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: #0c0a09; margin-top: 18px; margin-bottom: 10px; font-weight: 700; }
    p { margin: 0 0 10px 0; color: #44403c; line-height: 1.6; }
    .entry { margin-bottom: 14px; }
    .entry-head { display: flex; justify-content: space-between; font-weight: 600; color: #1c1917; font-size: 13px; }
    .entry-role { color: #57534e; font-style: italic; margin-bottom: 5px; font-size: 12px; }
    ul { margin: 0; padding-left: 18px; }
    li { margin-bottom: 4px; color: #44403c; }
    .skills-grid { display: grid; grid-template-columns: 140px 1fr; row-gap: 6px; font-size: 12px; margin-top: 8px; }
    .skill-k { font-weight: 600; color: #1c1917; }
    .skill-v { color: #44403c; }
  </style>
</head>
<body>
  <h1>Alex Mercer</h1>
  <div class="title">Staff Systems & Infrastructure Architect</div>
  <div class="contact">San Francisco, CA • alex.mercer@example.com • github.com/alexmercer • linkedin.com/in/alex-mercer</div>

  <h2>Executive Summary</h2>
  <p>Staff Systems Architect with 8+ years designing high-throughput distributed services and resilient cloud infrastructures. Led architecture initiatives scaling transactions from 10k to 500k RPS with 99.999% uptime. Specialist in TypeScript, Go, distributed event queues, and container orchestration.</p>

  <h2>Work Experience</h2>
  <div class="entry">
    <div class="entry-head">
      <span>Stripe — Staff Infrastructure Engineer</span>
      <span>2022 – Present</span>
    </div>
    <div class="entry-role">Core Payment Flow & Settlement Engine</div>
    <ul>
      <li>Architected distributed microservices handling $40M+ in daily transaction volume, reducing p99 end-to-end settlement latency by 34%.</li>
      <li>Spearheaded zero-downtime database migration for 180M+ customer ledger accounts with zero data loss or consistency drift.</li>
      <li>Mentored 14 senior engineers across distributed systems design, asynchronous event queues, and automated canary deployments.</li>
    </ul>
  </div>

  <div class="entry">
    <div class="entry-head">
      <span>Datadog — Senior Distributed Systems Engineer</span>
      <span>2019 – 2022</span>
    </div>
    <div class="entry-role">Telemetry Ingestion & Storage Pipeline</div>
    <ul>
      <li>Engineered high-throughput telemetry ingestion pipeline processing 2.5B events/sec using Go, Kafka, and custom memory-mapped ring buffers.</li>
      <li>Cut memory footprint by 42% across 800+ Kubernetes pods by restructuring serialization layouts and eliminating GC hot loops.</li>
      <li>Built distributed tracing integration adopted by 3,200+ enterprise clients.</li>
    </ul>
  </div>

  <h2>Technical Skills</h2>
  <div class="skills-grid">
    <div class="skill-k">Languages:</div>
    <div class="skill-v">TypeScript, Go, Rust, Python, SQL</div>
    <div class="skill-k">Distributed Systems:</div>
    <div class="skill-v">Kafka, Redis Cluster, gRPC, PostgreSQL, Event-Driven Architecture</div>
    <div class="skill-k">Cloud & DevOps:</div>
    <div class="skill-v">Kubernetes, Docker, AWS (ECS, EKS, DynamoDB), Terraform, CI/CD</div>
  </div>
</body>
</html>`;

  await page.setContent(html);
  const buffer = await page.screenshot({ type: "png" });
  await page.close();
  return buffer;
}

async function main() {
  console.log("Launching Chromium for screenshot capture...");
  const browser = await chromium.launch({ headless: true });
  const sampleImageBuffer = await generateSampleResumeImage(browser);

  const sampleImageBase64 = sampleImageBuffer.toString("base64");

  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  // Intercept js.puter.com CDN script to inject rich mock store
  await desktopContext.route("**/js.puter.com/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "// Puter mock active",
    });
  });

  await desktopContext.addInitScript(({ sampleImageBase64 }) => {
    const rawImageBytes = Uint8Array.from(atob(sampleImageBase64), (c) => c.charCodeAt(0));

    const resumePrimary = {
      id: "res-stripe-lead",
      companyName: "Stripe",
      jobTitle: "Staff Infrastructure Engineer",
      jobDescription: "Seeking a Staff Infrastructure Engineer to design resilient, low-latency financial systems using TypeScript, Go, distributed queues, Kafka, and Kubernetes.",
      fileName: "alex_mercer_staff_engineer.pdf",
      fileSize: 52400,
      pageCount: 1,
      createdAt: "2026-11-20T10:00:00.000Z",
      updatedAt: "2026-11-24T08:30:00.000Z",
      parsedText: `ALEX MERCER
Staff Systems & Infrastructure Architect
San Francisco, CA • alex.mercer@example.com

EXECUTIVE SUMMARY
Staff Systems Architect with 8+ years designing high-throughput distributed services and resilient cloud infrastructures. Led architecture initiatives scaling transactions from 10k to 500k RPS with 99.999% uptime. Specialist in TypeScript, Go, distributed event queues, and container orchestration.

WORK EXPERIENCE
Stripe — Staff Infrastructure Engineer (2022 – Present)
Core Payment Flow & Settlement Engine
- Architected distributed microservices handling $40M+ in daily transaction volume, reducing p99 end-to-end settlement latency by 34%.
- Spearheaded zero-downtime database migration for 180M+ customer ledger accounts with zero data loss or consistency drift.
- Mentored 14 senior engineers across distributed systems design, asynchronous event queues, and automated canary deployments.

Datadog — Senior Distributed Systems Engineer (2019 – 2022)
Telemetry Ingestion & Storage Pipeline
- Engineered high-throughput telemetry ingestion pipeline processing 2.5B events/sec using Go, Kafka, and custom memory-mapped ring buffers.
- Cut memory footprint by 42% across 800+ Kubernetes pods by restructuring serialization layouts.

TECHNICAL SKILLS
Languages: TypeScript, Go, Rust, Python, SQL
Distributed Systems: Kafka, Redis Cluster, gRPC, PostgreSQL, Event-Driven Architecture
Cloud & DevOps: Kubernetes, Docker, AWS, Terraform, CI/CD`,
      resumePath: "resumes/alex_mercer.pdf",
      imagePath: "images/alex_mercer_p1.png",
      imagePaths: ["images/alex_mercer_p1.png"],
      feedback: {
        overallScore: 92,
        ATS: {
          score: 95,
          tips: [
            { type: "good", tip: "Standard, clean section hierarchy recognized flawlessly by ATS parsers." },
            { type: "good", tip: "Consistent chronological company and role formatting." },
            { type: "improve", tip: "Explicitly reference Terraform infrastructure-as-code in technical skills section." }
          ]
        },
        toneAndStyle: {
          score: 90,
          tips: [
            { type: "good", tip: "Authoritative active verbs ('Architected', 'Spearheaded', 'Engineered') throughout.", explanation: "Demonstrates technical leadership and proactive engineering ownership." },
            { type: "good", tip: "Zero conversational filler or first-person pronouns.", explanation: "Maintains high recruiter readability and brevity." }
          ]
        },
        content: {
          score: 93,
          tips: [
            { type: "good", tip: "Exceptional quantified business impact ($40M+ volume, 34% p99 speedup, 2.5B events/sec).", explanation: "Shows undeniable commercial return on engineering investment." },
            { type: "good", tip: "Clear architectural scale indicators (180M+ accounts, 800+ pods).", explanation: "Validates ability to lead high-concurrency systems." }
          ]
        },
        structure: {
          score: 95,
          tips: [
            { type: "good", tip: "Single-column format eliminates ATS two-column parsing collisions.", explanation: "Scores in the top 5% of ATS layout benchmarks." }
          ]
        },
        skills: {
          score: 88,
          tips: [
            { type: "good", tip: "Direct overlap with target stack: TypeScript, Go, Kubernetes, Kafka, AWS.", explanation: "Satisfies 95% of job requirements." },
            { type: "improve", tip: "Consider adding explicit distributed consensus keywords (Raft, Paxos).", explanation: "Strengthens specialized distributed systems alignment." }
          ]
        }
      },
      keywordAnalysis: {
        matchRate: 90,
        totalJobKeywords: 20,
        matchedCount: 18,
        missingCount: 2,
        matchedKeywords: [
          { keyword: "TypeScript", category: "technical", frequencyInJob: 6, frequencyInResume: 4, importance: "critical" },
          { keyword: "Go", category: "technical", frequencyInJob: 5, frequencyInResume: 3, importance: "critical" },
          { keyword: "Distributed Systems", category: "domain", frequencyInJob: 5, frequencyInResume: 4, importance: "critical" },
          { keyword: "Kubernetes", category: "tools", frequencyInJob: 4, frequencyInResume: 3, importance: "critical" },
          { keyword: "Kafka", category: "tools", frequencyInJob: 4, frequencyInResume: 2, importance: "critical" },
          { keyword: "PostgreSQL", category: "technical", frequencyInJob: 3, frequencyInResume: 2, importance: "recommended" },
          { keyword: "Microservices", category: "domain", frequencyInJob: 4, frequencyInResume: 3, importance: "recommended" },
          { keyword: "AWS", category: "tools", frequencyInJob: 3, frequencyInResume: 2, importance: "recommended" },
          { keyword: "Docker", category: "tools", frequencyInJob: 3, frequencyInResume: 2, importance: "recommended" },
          { keyword: "Redis", category: "tools", frequencyInJob: 2, frequencyInResume: 2, importance: "recommended" }
        ],
        missingKeywords: [
          { keyword: "Terraform", category: "tools", frequencyInJob: 3, frequencyInResume: 0, importance: "recommended", contextOrSuggestion: "Highlight infrastructure-as-code automation workflows under your Stripe role." },
          { keyword: "Distributed Consensus", category: "domain", frequencyInJob: 2, frequencyInResume: 0, importance: "optional", contextOrSuggestion: "Mention consensus algorithms (Raft, Paxos) or leader election mechanisms." }
        ],
        topRecommendations: [
          "Explicitly integrate Terraform into your DevOps tooling list to hit 95%+ keyword alignment.",
          "Highlight event-driven architecture and asynchronous message queues in your summary statement."
        ]
      },
      savedStarRewrites: [
        {
          id: "star-1",
          originalBullet: "Architected distributed microservices handling $40M+ in daily transaction volume, reducing p99 end-to-end settlement latency by 34%.",
          critique: "Strong quantified metrics. Variants highlight executive leadership, algorithmic optimization, and business risk reduction.",
          variants: [
            {
              id: "var-1",
              type: "action-oriented",
              fullBullet: "Spearheaded distributed settlement engine re-architecture processing $40M+ daily volume, slashing p99 transaction latency by 34% across 16 global nodes.",
              starBreakdown: {
                situation: "Legacy payment pipelines experienced latency spikes during peak cross-border settlement windows.",
                task: "Redesign core transaction ingestion and settlement workflows for sub-50ms deterministic execution.",
                action: "Implemented asynchronous Kafka event buffering, connection pooling, and parallelized worker groups in Go.",
                result: "Settled $40M+ daily volume with zero dropped events and reduced p99 latency by 34%.",
                metrics: ["$40M+ daily volume", "34% p99 latency reduction", "16 global nodes"]
              },
              explanation: "Focuses on aggressive action verbs and operational scale."
            },
            {
              id: "var-2",
              type: "metric-driven",
              fullBullet: "Boosted payment throughput by 4.2x and slashed p99 latency by 34% by designing a Go-based event queue handling $40M+ in daily transactions with 99.999% uptime.",
              starBreakdown: {
                situation: "Previous system peaked at 12k RPS before queuing delays impacted partner APIs.",
                task: "Scale throughput beyond 50k RPS without increasing database compute costs.",
                action: "Engineered in-memory ring buffers and batched database ledger commits.",
                result: "Achieved 4.2x throughput multiplier and maintained five-nines service uptime.",
                metrics: ["4.2x throughput increase", "99.999% uptime", "$40M+ daily transactions"]
              },
              explanation: "Maximizes numerical validation for senior hiring managers."
            },
            {
              id: "var-3",
              type: "leadership-focused",
              fullBullet: "Mobilized a 9-engineer cross-functional taskforce to re-engineer Stripe's settlement architecture, delivering $40M+ daily volume processing with zero downtime.",
              starBreakdown: {
                situation: "Infrastructure modernization required cross-team alignment between Payments, Risk, and Core Infrastructure.",
                task: "Lead engineering strategy and roadmap execution across a 6-month phased rollout.",
                action: "Established technical RFC standards, automated canary deployment gates, and mentored junior staff on fault-tolerant systems.",
                result: "Delivered on-time without customer disruptions, adopted as company-wide architectural template.",
                metrics: ["9-engineer taskforce", "6-month timeline", "$40M+ daily volume"]
              },
              explanation: "Highlights organizational influence, mentoring, and stakeholder management."
            }
          ],
          createdAt: "2026-11-24T08:15:00.000Z"
        }
      ],
      coverLetter: {
        text: `Dear Hiring Team at Stripe,

I am writing to express my enthusiastic interest in the Staff Infrastructure Engineer position. Having spent the last eight years architecting high-throughput distributed systems and scaling transaction engines, I have long admired Stripe's world-class engineering standards and developer-first philosophy.

In my current and previous roles, I have spearheaded the design of distributed microservices processing upwards of $40M in daily financial volume, cutting p99 settlement latencies by 34% while maintaining five-nines uptime. My hands-on expertise with Go, TypeScript, Kafka event streaming, and Kubernetes cluster orchestration aligns seamlessly with Stripe's mission to increase the GDP of the internet.

Beyond technical execution, I take pride in mentoring engineering teams, instituting rigorous architectural RFC processes, and fostering a culture of operational excellence. I would welcome the opportunity to discuss how my systems engineering background can accelerate Stripe's infrastructure roadmap.

Thank you for your time and consideration.

Sincerely,
Alex Mercer`,
        updatedAt: "2026-11-24T08:20:00.000Z"
      },
      interviewPrep: {
        questions: [
          {
            id: "q-1",
            category: "Technical Architecture",
            question: "How do you design a distributed financial settlement pipeline for idempotent, exactly-once processing under network partitions?",
            whyAsked: "Evaluates deep distributed systems knowledge, transaction isolation levels, and idempotency key strategies.",
            talkingPoints: [
              "Idempotency keys stored in distributed cache (Redis) with TTL before database transactions.",
              "Two-phase commit vs. Saga pattern with compensating transactions for multi-service operations.",
              "Outbox pattern with Kafka CDC (Change Data Capture) to prevent dual-write anomalies."
            ],
            starFramework: {
              situation: "Legacy payment engine occasionally duplicated ledger entries during transient network timeouts.",
              task: "Guarantee exactly-once ledger settlement across all payment rails.",
              action: "Implemented cryptographic request hashing and idempotent state machine validation in PostgreSQL.",
              result: "Eliminated 100% of duplicate transaction alerts across $40M daily volume."
            },
            isBookmarked: true
          },
          {
            id: "q-2",
            category: "System Scaling",
            question: "Describe a scenario where you identified and resolved an acute p99 latency bottleneck in a high-concurrency microservices mesh.",
            whyAsked: "Tests profiling skills, tracing telemetry usage, and root-cause analytical rigor.",
            talkingPoints: [
              "Distributed tracing using OpenTelemetry to locate the critical path.",
              "Connection pool starvation and GC pause analysis in runtime heap dumps.",
              "Asynchronous batching and circuit breaking to prevent cascading failures."
            ],
            isBookmarked: false
          },
          {
            id: "q-3",
            category: "Engineering Leadership",
            question: "How do you drive consensus across dissenting engineering teams when introducing major architectural shifts?",
            whyAsked: "Assesses communication, empathy, and technical leadership maturity at the Staff level.",
            talkingPoints: [
              "Drafting comprehensive RFCs with clear trade-off analyses and alternative proposals.",
              "Creating empirical proof-of-concepts to substantiate performance hypotheses.",
              "Fostering blameless discussions focused on user impact rather than team boundaries."
            ],
            isBookmarked: true
          }
        ],
        draftNotes: "Key reminder: Emphasize the Saga pattern and transactional outbox for question 1. Reference the $40M Stripe volume metric.",
        generatedAt: "2026-11-24T08:25:00.000Z"
      },
      chatHistory: [
        {
          id: "m-1",
          role: "user",
          content: "What are the three most critical changes I should make to position this resume for a Staff Infrastructure role at Stripe?",
          timestamp: 1732435000000
        },
        {
          id: "m-2",
          role: "assistant",
          content: `Here are the **top 3 high-leverage optimizations** for your resume:

1. **Highlight Infrastructure-as-Code (Terraform)**:
   - Your resume demonstrates immense distributed systems depth, but lacks explicit mention of *declarative infrastructure automation*.
   - *Recommendation*: Add a bullet under your lead role describing automated Terraform / Kubernetes operator pipelines.

2. **Quantify Financial Risk & Compliance Impact**:
   - You mention processing **$40M+ in daily volume**. Elevate this by stating how your architecture mitigated financial loss (e.g. *zero reconciliation discrepancies, SOC2 / PCI-DSS Level 1 compliance*).

3. **Showcase Organizational Force Multiplication**:
   - Staff roles at Stripe demand cross-organizational influence. Expand your mentoring bullet to show how your architectural templates accelerated engineering velocity across multiple teams.

### Quick Actions You Can Take:
- Check the **STAR Rewriter** tab to test our leadership-oriented variant.
- Review the **Keyword Gap** tab to see exact frequency scores for *Terraform* and *Consensus*.`,
          actionSuggestions: [
            "Rewrite Stripe bullet with leadership focus",
            "View missing keywords in Keyword Gap matrix",
            "Generate tailored cover letter"
          ],
          timestamp: 1732435005000
        }
      ]
    };

    const resumeSecondary = {
      id: "res-vercel-architect",
      companyName: "Vercel",
      jobTitle: "Principal Frontend Architect",
      jobDescription: "Lead Next.js, React Compiler, and web performance architecture across global enterprise sites.",
      fileName: "alex_mercer_frontend.pdf",
      fileSize: 49800,
      pageCount: 1,
      createdAt: "2026-11-22T14:00:00.000Z",
      updatedAt: "2026-11-23T11:00:00.000Z",
      resumePath: "resumes/alex_vercel.pdf",
      imagePath: "images/alex_mercer_p1.png",
      feedback: {
        overallScore: 88,
        ATS: { score: 90, tips: [{ type: "good", tip: "Clean typography and semantic layout." }] },
        toneAndStyle: { score: 87, tips: [{ type: "good", tip: "Strong technical tone." }] },
        content: { score: 89, tips: [{ type: "good", tip: "Good performance metrics." }] },
        structure: { score: 92, tips: [{ type: "good", tip: "Logical sections." }] },
        skills: { score: 85, tips: [{ type: "good", tip: "Strong modern frontend tech." }] }
      }
    };

    const resumeTertiary = {
      id: "res-datadog-eng",
      companyName: "Datadog",
      jobTitle: "Senior Distributed Systems Engineer",
      jobDescription: "High-throughput telemetry ingestion and observability platform engineering.",
      fileName: "alex_mercer_datadog.pdf",
      fileSize: 45100,
      pageCount: 1,
      createdAt: "2026-11-19T09:00:00.000Z",
      updatedAt: "2026-11-20T16:00:00.000Z",
      resumePath: "resumes/alex_datadog.pdf",
      imagePath: "images/alex_mercer_p1.png",
      feedback: {
        overallScore: 78,
        ATS: { score: 80, tips: [{ type: "good", tip: "Good format." }] },
        toneAndStyle: { score: 76, tips: [{ type: "improve", tip: "Use stronger verbs." }] },
        content: { score: 81, tips: [{ type: "good", tip: "Clear telemetry stats." }] },
        structure: { score: 80, tips: [{ type: "good", tip: "Standard sections." }] },
        skills: { score: 74, tips: [{ type: "improve", tip: "Add cloud certifications." }] }
      }
    };

    const store = new Map();
    store.set("resume:res-stripe-lead", resumePrimary);
    store.set("resume:res-vercel-architect", resumeSecondary);
    store.set("resume:res-datadog-eng", resumeTertiary);

    const userProfile = {
      displayName: "Alex Mercer",
      targetRole: "Staff Infrastructure Engineer",
      targetIndustry: "Cloud Platforms & FinTech",
      yearsExperience: 8,
      targetScore: 90,
      settings: {
        strictness: "strict",
        theme: "light",
        notifications: true
      }
    };
    store.set("user_profile:user-alex-123", userProfile);

    const fsStore = new Map();
    fsStore.set("images/alex_mercer_p1.png", new Blob([rawImageBytes], { type: "image/png" }));
    fsStore.set("resumes/alex_mercer.pdf", new Blob(["%PDF-1.4 mock pdf"], { type: "application/pdf" }));

    window.puter = {
      auth: {
        getUser: async () => ({ uuid: "user-alex-123", username: "alexmercer" }),
        isSignedIn: async () => true,
        signIn: async () => {},
        signOut: async () => {},
      },
      fs: {
        read: async (path) => {
          if (fsStore.has(path)) return fsStore.get(path);
          return new Blob([rawImageBytes], { type: "image/png" });
        },
        write: async () => {},
        upload: async () => ({ id: "1", path: "resumes/alex_mercer.pdf" }),
        delete: async () => {},
        readdir: async () => [],
      },
      kv: {
        get: async (k) => store.get(k) || null,
        set: async (k, v) => { store.set(k, v); return true; },
        delete: async (k) => { store.delete(k); return true; },
        list: async () => [
          { key: "resume:res-stripe-lead", value: resumePrimary },
          { key: "resume:res-vercel-architect", value: resumeSecondary },
          { key: "resume:res-datadog-eng", value: resumeTertiary }
        ],
      },
      ai: {
        chat: async () => ({ message: { content: "{}" } }),
        feedback: async () => ({ message: { content: "{}" } }),
      }
    };
  }, { sampleImageBase64 });

  const page = await desktopContext.newPage();

  console.log("1/16 Capturing Landing Page Hero (desktop 1440x900)...");
  await page.goto("http://localhost:5173/");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "hero-home.png") });

  console.log("2/16 Capturing Landing Page Features & Interactive Score Gauge...");
  await page.evaluate(() => window.scrollTo(0, 950));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "landing-features.png") });

  console.log("3/16 Capturing Auth / Sign-in Screen...");
  await page.goto("http://localhost:5173/auth");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "auth-login.png") });

  console.log("4/16 Capturing Upload Form...");
  await page.goto("http://localhost:5173/upload");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "upload-form.png") });

  console.log("5/16 Capturing Personal Dashboard (KPIs & Resume Grid)...");
  await page.goto("http://localhost:5173/dashboard");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "dashboard.png") });

  console.log("6/16 Capturing Workspace Overview (Score Gauge & Priority Actions)...");
  await page.goto("http://localhost:5173/resume/res-stripe-lead?tab=overview");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "workspace-overview.png") });

  console.log("7/16 Capturing Workspace Details (5-Pillar Quality Inspection)...");
  await page.goto("http://localhost:5173/resume/res-stripe-lead?tab=details");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "workspace-details.png") });

  console.log("8/16 Capturing Workspace STAR Rewriter Tab...");
  await page.goto("http://localhost:5173/resume/res-stripe-lead?tab=star");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "workspace-star-rewriter.png") });

  console.log("9/16 Capturing Workspace Keyword Gap Matrix...");
  await page.goto("http://localhost:5173/resume/res-stripe-lead?tab=keywords");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "workspace-keywords.png") });

  console.log("10/16 Capturing Workspace Cover Letter Tab...");
  await page.goto("http://localhost:5173/resume/res-stripe-lead?tab=cover-letter");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "workspace-cover-letter.png") });

  console.log("11/16 Capturing Workspace Interview Prep Tab...");
  await page.goto("http://localhost:5173/resume/res-stripe-lead?tab=interview-prep");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "workspace-interview-prep.png") });

  console.log("12/16 Capturing Workspace AI Copilot Tab...");
  await page.goto("http://localhost:5173/resume/res-stripe-lead?tab=copilot");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "workspace-copilot.png") });

  console.log("13/16 Capturing User Career Profile Page...");
  await page.goto("http://localhost:5173/profile");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "profile.png") });

  await desktopContext.close();

  // Mobile Context (390x844 - iPhone 14/15/16 standard viewport)
  console.log("Creating Mobile Context (390x844)...");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });

  await mobileContext.route("**/js.puter.com/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "// Puter mock active",
    });
  });

  await mobileContext.addInitScript(({ sampleImageBase64 }) => {
    const rawImageBytes = Uint8Array.from(atob(sampleImageBase64), (c) => c.charCodeAt(0));
    const resumePrimary = {
      id: "res-stripe-lead",
      companyName: "Stripe",
      jobTitle: "Staff Infrastructure Engineer",
      fileName: "alex_mercer_staff_engineer.pdf",
      fileSize: 52400,
      createdAt: "2026-11-20T10:00:00.000Z",
      resumePath: "resumes/alex_mercer.pdf",
      imagePath: "images/alex_mercer_p1.png",
      feedback: {
        overallScore: 92,
        ATS: { score: 95, tips: [{ type: "good", tip: "Clean hierarchy." }] },
        toneAndStyle: { score: 90, tips: [{ type: "good", tip: "Authoritative verbs." }] },
        content: { score: 93, tips: [{ type: "good", tip: "Great metrics." }] },
        structure: { score: 95, tips: [{ type: "good", tip: "Single column." }] },
        skills: { score: 88, tips: [{ type: "good", tip: "Strong tech stack." }] }
      }
    };

    const store = new Map();
    store.set("resume:res-stripe-lead", resumePrimary);

    window.puter = {
      auth: {
        getUser: async () => ({ uuid: "user-alex-123", username: "alexmercer" }),
        isSignedIn: async () => true,
        signIn: async () => {},
        signOut: async () => {},
      },
      fs: {
        read: async () => new Blob([rawImageBytes], { type: "image/png" }),
        write: async () => {},
        upload: async () => ({ id: "1", path: "resumes/alex_mercer.pdf" }),
        delete: async () => {},
        readdir: async () => [],
      },
      kv: {
        get: async (k) => store.get(k) || null,
        set: async (k, v) => { store.set(k, v); return true; },
        delete: async (k) => { store.delete(k); return true; },
        list: async () => [{ key: "resume:res-stripe-lead", value: resumePrimary }],
      },
      ai: {
        chat: async () => ({ message: { content: "{}" } }),
        feedback: async () => ({ message: { content: "{}" } }),
      }
    };
  }, { sampleImageBase64 });

  const mobilePage = await mobileContext.newPage();

  console.log("14/16 Capturing Mobile Landing Page (390x844)...");
  await mobilePage.goto("http://localhost:5173/");
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, "mobile-home.png") });

  console.log("15/16 Capturing Mobile Workspace Overview (390x844)...");
  await mobilePage.goto("http://localhost:5173/resume/res-stripe-lead?tab=overview");
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, "mobile-workspace.png") });

  console.log("16/16 Capturing Mobile Dashboard (390x844)...");
  await mobilePage.goto("http://localhost:5173/dashboard");
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, "mobile-dashboard.png") });

  await mobileContext.close();
  await browser.close();

  console.log("\nAll 16 high-resolution screenshots captured successfully into docs/screenshots/!");
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
