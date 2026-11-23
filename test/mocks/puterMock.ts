import { vi } from "vitest";

export interface MockPuterUser {
  uuid: string;
  username: string;
}

export interface MockFSItem {
  id: string;
  uid: string;
  name: string;
  path: string;
  is_dir: boolean;
  parent_id: string;
  parent_uid: string;
  created: number;
  modified: number;
  accessed: number;
  size: number | null;
  writable: boolean;
}

export interface MockKVItem {
  key: string;
  value: string;
}

export const DEFAULT_MOCK_USER: MockPuterUser = {
  uuid: "user-uuid-12345",
  username: "testuser",
};

export const DEFAULT_AI_FEEDBACK_DATA = {
  overallScore: 82,
  ATS: {
    score: 85,
    tips: [
      { type: "good", tip: "Strong keyword match for software engineering roles." },
      { type: "improve", tip: "Include additional metrics on project impact." },
    ],
  },
  toneAndStyle: {
    score: 80,
    tips: [
      { type: "good", tip: "Consistent professional tone.", explanation: "Active voice used." },
    ],
  },
  content: {
    score: 84,
    tips: [
      { type: "good", tip: "Quantified achievements present.", explanation: "Good use of percentages." },
    ],
  },
  structure: {
    score: 88,
    tips: [
      { type: "good", tip: "Clear, logical section headers.", explanation: "Easy to parse." },
    ],
  },
  skills: {
    score: 75,
    tips: [
      { type: "improve", tip: "Add modern cloud stack tools.", explanation: "Mention AWS or Docker." },
    ],
  },
};

export const DEFAULT_MOCK_STAR_REWRITE_DATA = {
  originalBullet: "Worked on frontend features and fixed bugs in React application.",
  critique: "The original bullet point lacks quantifiable impact, scale, and active power verbs.",
  variants: [
    {
      id: "variant-1",
      type: "action-oriented",
      fullBullet: "Spearheaded frontend performance optimizations across 14 React micro-frontends, reducing Time-to-Interactive by 38% for 2.4M active users.",
      starBreakdown: {
        situation: "Legacy React frontend had poor Core Web Vitals and high bundle size.",
        task: "Lead technical refactoring to eliminate render bottlenecks.",
        action: "Implemented route code-splitting, lazy loading, and memoization patterns.",
        result: "Reduced TTI by 38% and cut bounce rates by 14%.",
        metrics: ["38%", "2.4M users", "14%"],
      },
      explanation: "Uses strong action verb 'Spearheaded' and quantifies performance improvements.",
    },
    {
      id: "variant-2",
      type: "metrics-focused",
      fullBullet: "Accelerated web app transaction throughput by 42% and slashed client bundle size by 1.2MB, unlocking $180K in annual AWS CDN bandwidth savings.",
      starBreakdown: {
        situation: "High data ingress costs and slow initial asset download times.",
        task: "Audit asset delivery network and optimize bundle sizes.",
        action: "Engineered tree-shaking and dynamic module imports.",
        result: "Slashed 1.2MB overhead and saved $180K annually.",
        metrics: ["42%", "1.2MB", "$180K"],
      },
      explanation: "Directly measures dollar ROI and bandwidth efficiency.",
    },
    {
      id: "variant-3",
      type: "technical-depth",
      fullBullet: "Architected distributed state synchronization layer using Zustand and Web Workers, maintaining 60 FPS rendering under heavy concurrent data loads.",
      starBreakdown: {
        situation: "Main thread was blocking during complex live chart computations.",
        task: "Offload compute-heavy transformations off the main UI thread.",
        action: "Offloaded processing to Web Workers with comlink and atomic state buffers.",
        result: "Maintained silky smooth 60 FPS under peak concurrency.",
        metrics: ["60 FPS", "sub-16ms frames"],
      },
      explanation: "Demonstrates advanced browser architecture and concurrent state management.",
    },
  ],
};

export const DEFAULT_MOCK_KEYWORD_GAP_DATA = {
  matchRate: 75,
  totalJobKeywords: 8,
  matchedCount: 6,
  missingCount: 2,
  matchedKeywords: [
    {
      keyword: "React",
      category: "technical",
      frequencyInJob: 4,
      frequencyInResume: 5,
      importance: "critical",
      contextOrSuggestion: "Prominently featured in Skills and Experience sections.",
    },
    {
      keyword: "TypeScript",
      category: "technical",
      frequencyInJob: 3,
      frequencyInResume: 4,
      importance: "critical",
      contextOrSuggestion: "Strongly demonstrated across project bullet points.",
    },
    {
      keyword: "Next.js",
      category: "technical",
      frequencyInJob: 2,
      frequencyInResume: 2,
      importance: "recommended",
      contextOrSuggestion: "Mentioned under Senior Frontend Engineer role.",
    },
    {
      keyword: "Tailwind CSS",
      category: "tools",
      frequencyInJob: 2,
      frequencyInResume: 3,
      importance: "recommended",
      contextOrSuggestion: "Used in recent project portfolio.",
    },
    {
      keyword: "GraphQL",
      category: "technical",
      frequencyInJob: 2,
      frequencyInResume: 1,
      importance: "recommended",
      contextOrSuggestion: "Present in technical skills list.",
    },
    {
      keyword: "CI/CD",
      category: "tools",
      frequencyInJob: 2,
      frequencyInResume: 2,
      importance: "optional",
      contextOrSuggestion: "Mentioned under GitHub Actions experience.",
    },
  ],
  missingKeywords: [
    {
      keyword: "Kubernetes",
      category: "tools",
      frequencyInJob: 3,
      frequencyInResume: 0,
      importance: "critical",
      contextOrSuggestion: "Mentioned 3 times in job requirements. Recommend adding to DevOps/Cloud skills.",
    },
    {
      keyword: "AWS",
      category: "technical",
      frequencyInJob: 3,
      frequencyInResume: 0,
      importance: "recommended",
      contextOrSuggestion: "Required for cloud deployment pipeline. Consider mentioning ECS/S3.",
    },
  ],
  topRecommendations: [
    "Incorporate Kubernetes into your skills summary or cloud deployment achievements.",
    "Highlight experience with AWS cloud infrastructure.",
    "Quantify your React performance optimizations with measurable metrics.",
  ],
};

export const DEFAULT_MOCK_COVER_LETTER_DATA = {
  roleTitle: "Senior Full-Stack Engineer",
  companyName: "Stripe",
  tone: "professional",
  subjectLine: "Application for Senior Full-Stack Engineer — Jane Doe",
  salutation: "Dear Hiring Team at Stripe,",
  hookParagraph: "I am writing to express my enthusiastic interest in the Senior Full-Stack Engineer role at Stripe. With over seven years of experience building mission-critical financial applications and modern React architectures, I have consistently driven measurable improvements in payment reliability and developer velocity.",
  bodyParagraphs: [
    "In my recent role, I spearheaded the re-architecture of our core payments platform, integrating real-time ledger sync and reducing checkout drop-off by 28%. By orchestrating distributed TypeScript microservices and optimizing PostgreSQL query pipelines, our team scaled transaction throughput to over $12M daily while maintaining sub-50ms p99 latency.",
    "Beyond architectural execution, I pride myself on fostering cross-functional alignment between engineering, design, and product management. I instituted rigorous code review standards and automated CI/CD canary deployments, reducing regression incident rates by 45% across a 24-person engineering organization."
  ],
  closingParagraph: "Stripe's mission to increase the GDP of the internet deeply resonates with my professional ethos. I welcome the opportunity to discuss how my technical leadership and distributed systems experience can contribute to Stripe's payment infrastructure. Thank you for your time and consideration.",
  signOff: "Sincerely,\nJane Doe",
  fullText: "Application for Senior Full-Stack Engineer — Jane Doe\n\nDear Hiring Team at Stripe,\n\nI am writing to express my enthusiastic interest in the Senior Full-Stack Engineer role at Stripe. With over seven years of experience building mission-critical financial applications and modern React architectures, I have consistently driven measurable improvements in payment reliability and developer velocity.\n\nIn my recent role, I spearheaded the re-architecture of our core payments platform, integrating real-time ledger sync and reducing checkout drop-off by 28%. By orchestrating distributed TypeScript microservices and optimizing PostgreSQL query pipelines, our team scaled transaction throughput to over $12M daily while maintaining sub-50ms p99 latency.\n\nBeyond architectural execution, I pride myself on fostering cross-functional alignment between engineering, design, and product management. I instituted rigorous code review standards and automated CI/CD canary deployments, reducing regression incident rates by 45% across a 24-person engineering organization.\n\nStripe's mission to increase the GDP of the internet deeply resonates with my professional ethos. I welcome the opportunity to discuss how my technical leadership and distributed systems experience can contribute to Stripe's payment infrastructure. Thank you for your time and consideration.\n\nSincerely,\nJane Doe"
};

export const DEFAULT_MOCK_INTERVIEW_PREP_DATA = {
  roleTitle: "Staff Software Engineer",
  companyName: "Stripe",
  questions: [
    {
      id: "q-1",
      category: "behavioral",
      question: "Tell me about a time you had to balance technical debt with urgent feature deadlines.",
      recruiterIntent: "Evaluates pragmatic engineering judgment, prioritization under pressure, and communication with product managers.",
      resumeAnchor: "Anchored to your experience modernizing legacy services at your previous role.",
      starModelAnswer: {
        situation: "Our team faced a critical product release while our legacy database layer was encountering connection timeouts.",
        task: "Deliver the feature on time without causing database cascading failures.",
        action: "I implemented connection pooling and read-replica routing as a stopgap, negotiated a 2-week technical sprint post-launch, and instrumented p99 latency alarms.",
        result: "Launched the feature on schedule with zero downtime, and subsequently reduced p99 latency by 45%.",
        fullAnswer: "At my previous company, we were facing a hard release deadline when our legacy database started dropping connections under load. Rather than doing a risky full refactor during a freeze, I introduced connection pooling and read replicas as an immediate buffer, while securing commitment from the product team for a dedicated tech debt sprint right after. We launched on time with zero downtime and improved p99 latency by 45% once the full migration finished."
      },
      pitfallsToAvoid: [
        "Blaming the product team for demanding unreasonable deadlines.",
        "Refusing to compromise and letting the release slip without proposing mitigation.",
        "Failing to track or quantify the subsequent tech debt resolution."
      ]
    },
    {
      id: "q-2",
      category: "technical",
      question: "How do you profile, identify, and resolve p99 latency bottlenecks in distributed microservices?",
      recruiterIntent: "Probes distributed tracing fluency, database index optimization, and deep knowledge of async I/O.",
      resumeAnchor: "Anchored to your listed microservices and high-throughput transaction experience.",
      starModelAnswer: {
        situation: "Checkout p99 latency spiked over 1,500ms during Black Friday flash sales.",
        task: "Identify the root cause bottleneck and bring p99 latency under 200ms.",
        action: "Instrumented OpenTelemetry distributed tracing, uncovered N+1 synchronous calls in auth token validation, and implemented Redis token caching with local cache fallback.",
        result: "Reduced p99 latency by 82% to 120ms and saved $18k in unnecessary compute scaling.",
        fullAnswer: "During a peak flash sale, our checkout p99 latency spiked past 1.5s. I instrumented distributed tracing with OpenTelemetry, discovered synchronous N+1 queries during auth verification, and introduced a Redis caching tier with a 30-second local cache. This brought p99 latency down to 120ms and stabilized compute costs."
      },
      pitfallsToAvoid: [
        "Suggesting blind vertical scaling without root-cause profiling.",
        "Failing to consider cache stampede or invalidation edge cases."
      ]
    },
    {
      id: "q-3",
      category: "situational",
      question: "How would you handle a critical production outage when the primary database replica fails to promote?",
      recruiterIntent: "Evaluates calm incident management, disaster recovery protocols, and stakeholder communication.",
      resumeAnchor: "Anchored to your operational leadership and infrastructure ownership.",
      starModelAnswer: {
        situation: "Primary DB failed during business hours and the read replica failed automated promotion due to replication lag.",
        task: "Restore transaction write capability without corrupting financial ledgers.",
        action: "Declared Sev-1 incident, routed incoming writes to a durable queuing buffer, manually verified replication consistency, and executed failover.",
        result: "Recovered complete cluster in 7 minutes with zero data loss.",
        fullAnswer: "In an unexpected failover stall, my priority is preventing data corruption while containing blast radius. I route write traffic to a durable buffer queue, verify ledger log positions manually before forced promotion, and keep status channels transparently updated every 3 minutes."
      },
      pitfallsToAvoid: [
        "Forcing failover blindly without checking transaction log gaps.",
        "Operating in isolation without informing customer support and leadership."
      ]
    }
  ]
};

export const DEFAULT_MOCK_COPILOT_DATA = {
  reply: "I've reviewed your resume against the target role. Your distributed systems experience is strong, but your bullet points could benefit from more quantifiable business impact. Additionally, you are missing 3 key ATS keywords: **Docker**, **Kubernetes**, and **CI/CD**.\n\nHere is how you can optimize your background:\n- Use the **STAR Rewriter** to quantify your lead engineering bullet.\n- View the **Keyword Gap** tab to incorporate container orchestration into your skills section.",
  actionSuggestions: [
    {
      id: "act-1",
      label: "Optimize with STAR",
      actionType: "switch_tab",
      tabTarget: "star",
      payload: "Led engineering team to overhaul legacy services",
      icon: "✨"
    },
    {
      id: "act-2",
      label: "View Missing Keywords",
      actionType: "switch_tab",
      tabTarget: "keywords",
      icon: "🎯"
    }
  ]
};

export class InMemoryPuterMock {
  public kvStore = new Map<string, string>();
  public fsStore = new Map<string, Blob | File | string>();
  public currentUser: MockPuterUser | null = DEFAULT_MOCK_USER;
  public signedIn: boolean = true;
  public customAiResponse: string | null = null;
  public customAiError: Error | null = null;

  reset() {
    this.kvStore.clear();
    this.fsStore.clear();
    this.currentUser = DEFAULT_MOCK_USER;
    this.signedIn = true;
    this.customAiResponse = null;
    this.customAiError = null;
  }

  private listFiles(dirPath: string): MockFSItem[] {
    const normalizedDir = dirPath.endsWith("/") ? dirPath : dirPath + "/";
    const items: MockFSItem[] = [];

    for (const [key, val] of this.fsStore.entries()) {
      if (dirPath === "./" || key.startsWith(normalizedDir)) {
        items.push({
          id: `fs_${key}`,
          uid: "uid_mock",
          name: key.split("/").pop() || key,
          path: key,
          is_dir: false,
          parent_id: "root",
          parent_uid: "uid_mock",
          created: Date.now(),
          modified: Date.now(),
          accessed: Date.now(),
          size: typeof val === "string" ? val.length : val.size,
          writable: true,
        });
      }
    }
    return items;
  }

  // --- Auth Namespace ---
  auth = {
    getUser: vi.fn(async (): Promise<MockPuterUser> => {
      if (!this.signedIn || !this.currentUser) {
        throw new Error("Not signed in");
      }
      return this.currentUser;
    }),
    isSignedIn: vi.fn(async (): Promise<boolean> => {
      return this.signedIn;
    }),
    signIn: vi.fn(async (): Promise<void> => {
      this.signedIn = true;
      this.currentUser = DEFAULT_MOCK_USER;
    }),
    signOut: vi.fn(async (): Promise<void> => {
      this.signedIn = false;
      this.currentUser = null;
    }),
  };

  // --- KV Namespace ---
  kv = {
    get: vi.fn(async (key: string): Promise<string | null> => {
      return this.kvStore.has(key) ? this.kvStore.get(key)! : null;
    }),
    set: vi.fn(async (key: string, value: string): Promise<boolean> => {
      this.kvStore.set(key, value);
      return true;
    }),
    del: vi.fn(async (key: string): Promise<boolean> => {
      return this.kvStore.delete(key);
    }),
    list: vi.fn(
      async (pattern: string = "*", returnValues: boolean = false): Promise<string[] | MockKVItem[]> => {
        const globPattern = pattern === undefined || pattern === null ? "*" : pattern;
        const escaped = globPattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
        const regexStr = "^" + escaped.replace(/\*/g, ".*") + "$";
        const regex = new RegExp(regexStr);

        const matchedKeys = Array.from(this.kvStore.keys()).filter((k) => regex.test(k));

        if (returnValues) {
          return matchedKeys.map((k) => ({
            key: k,
            value: this.kvStore.get(k)!,
          }));
        }
        return matchedKeys;
      }
    ),
    flush: vi.fn(async (): Promise<boolean> => {
      this.kvStore.clear();
      return true;
    }),
  };

  // --- FS Namespace ---
  fs = {
    write: vi.fn(async (filePath: string, data: string | File | Blob): Promise<File | undefined> => {
      this.fsStore.set(filePath, data);
      if (data instanceof File) return data;
      return new File([data], filePath.split("/").pop() || "file");
    }),
    read: vi.fn(async (filePath: string): Promise<Blob> => {
      const stored = this.fsStore.get(filePath);
      if (!stored) {
        throw new Error(`File not found: ${filePath}`);
      }
      if (stored instanceof Blob) return stored;
      return new Blob([stored], { type: "text/plain" });
    }),
    upload: vi.fn(async (files: File[] | Blob[]): Promise<MockFSItem> => {
      const file = files[0];
      const name = file instanceof File ? file.name : "uploaded_blob.pdf";
      const filePath = `resumes/${Date.now()}_${name}`;
      this.fsStore.set(filePath, file);

      return {
        id: `fs_${Math.random().toString(36).substring(2, 9)}`,
        uid: "uid_mock",
        name,
        path: filePath,
        is_dir: false,
        parent_id: "root",
        parent_uid: "uid_mock",
        created: Date.now(),
        modified: Date.now(),
        accessed: Date.now(),
        size: file.size,
        writable: true,
      };
    }),
    delete: vi.fn(async (filePath: string): Promise<void> => {
      this.fsStore.delete(filePath);
    }),
    readdir: vi.fn(async (dirPath: string): Promise<MockFSItem[]> => {
      return this.listFiles(dirPath);
    }),
    readDir: vi.fn(async (dirPath: string): Promise<any[]> => {
      return this.listFiles(dirPath);
    }),
  };

  // --- AI Namespace ---
  ai = {
    chat: vi.fn(async (_prompt: any, _options?: any): Promise<any> => {
      if (this.customAiError) {
        throw this.customAiError;
      }

      let contentString = this.customAiResponse;

      if (contentString === null) {
        // Inspect prompt to route to context-appropriate mock response
        let promptText = "";
        if (typeof _prompt === "string") {
          promptText = _prompt;
        } else if (Array.isArray(_prompt) && _prompt[0]) {
          promptText = typeof _prompt[0].content === "string"
            ? _prompt[0].content
            : JSON.stringify(_prompt[0].content);
        }

        if (
          promptText.includes("CoverLetterResponse") ||
          promptText.includes("cover letter") ||
          promptText.includes("hookParagraph")
        ) {
          contentString = JSON.stringify(DEFAULT_MOCK_COVER_LETTER_DATA);
        } else if (
          promptText.includes("InterviewPrepResponse") ||
          promptText.includes("interview questions") ||
          promptText.includes("recruiterIntent") ||
          promptText.includes("Principal Hiring Manager")
        ) {
          contentString = JSON.stringify(DEFAULT_MOCK_INTERVIEW_PREP_DATA);
        } else if (
          promptText.includes("CopilotResponse") ||
          promptText.includes("Resumind Copilot") ||
          promptText.includes("actionSuggestions") ||
          promptText.includes("CANDIDATE CURRENT INQUIRY")
        ) {
          contentString = JSON.stringify(DEFAULT_MOCK_COPILOT_DATA);
        } else if (
          promptText.includes("STAR") ||
          promptText.includes("StarRewriteResponse") ||
          promptText.includes("Accomplished [X]") ||
          promptText.includes("starBreakdown")
        ) {
          contentString = JSON.stringify(DEFAULT_MOCK_STAR_REWRITE_DATA);
        } else if (
          promptText.includes("KeywordGapResponse") ||
          promptText.includes("keyword gap") ||
          promptText.includes("matchedKeywords") ||
          (promptText.includes("Candidate Resume Text") && promptText.includes("Target Job Description"))
        ) {
          contentString = JSON.stringify(DEFAULT_MOCK_KEYWORD_GAP_DATA);
        } else {
          contentString = JSON.stringify(DEFAULT_AI_FEEDBACK_DATA);
        }
      }

      return {
        index: 0,
        message: {
          role: "assistant",
          content: contentString,
          refusal: null,
          annotations: [],
        },
        logprobs: null,
        finish_reason: "stop",
        usage: [{ type: "token", model: "google/gemini-2.5-flash", amount: 120, cost: 0 }],
        via_ai_chat_service: true,
      };
    }),
    feedback: vi.fn(async (_path: string, _instructions: string): Promise<any> => {
      if (this.customAiError) {
        throw this.customAiError;
      }

      const contentString =
        this.customAiResponse !== null
          ? this.customAiResponse
          : JSON.stringify(DEFAULT_AI_FEEDBACK_DATA);

      return {
        index: 0,
        message: {
          role: "assistant",
          content: contentString,
          refusal: null,
          annotations: [],
        },
        logprobs: null,
        finish_reason: "stop",
        usage: [{ type: "token", model: "google/gemini-2.5-flash", amount: 120, cost: 0 }],
        via_ai_chat_service: true,
      };
    }),
    img2txt: vi.fn(async (_image: any, _testMode?: boolean): Promise<string> => {
      return "Extracted resume text: Jane Doe, Senior Full-Stack Engineer with React & TypeScript expertise.";
    }),
  };
}

export const puterMock = new InMemoryPuterMock();

export function installPuterMock(): InMemoryPuterMock {
  (window as any).puter = puterMock;
  (globalThis as any).puter = puterMock;
  return puterMock;
}

export function resetPuterMock(): void {
  puterMock.reset();
}

export function seedPuterKV(records: Record<string, any>): void {
  for (const [key, val] of Object.entries(records)) {
    puterMock.kvStore.set(key, typeof val === "string" ? val : JSON.stringify(val));
  }
}
