# Resumind Architecture & Engineering Guide

> Resumind is an enterprise-grade, privacy-first AI Resume Intelligence platform built with React 19, React Router v7, and Puter.js v2. It provides multi-dimensional ATS diagnostic scoring, STAR bullet point rewriting, target job keyword gap matching, customized cover letter generation, tailored interview preparation, and real-time AI copilot career assistance.

---

## 1. System Architecture Overview

Resumind implements a **zero-backend-storage, cloud-native architecture**. The application runs as a modern single-page / server-rendered application with client-side execution, where all sensitive candidate information, uploaded PDFs, extracted text, and AI evaluation metrics reside exclusively inside the user's isolated **Puter Cloud** personal environment.

```
+-----------------------------------------------------------------------------------------+
|                                    USER BROWSER                                         |
|                                                                                         |
|   +-------------------+       +----------------------+       +----------------------+   |
|   |  React Router v7  | <---> |   Zustand Store      | <---> |   Feature Engines    |   |
|   |  (Routes & Shell) |       |  (app/services/puter)|       |  (STAR, Gap, Copilot)|   |
|   +-------------------+       +----------------------+       +----------------------+   |
|             |                            |                              |               |
|             v                            v                              v               |
|   +-------------------+       +----------------------+       +----------------------+   |
|   |   PDF.js Worker   |       |  PII-Safe Telemetry  |       |   Security Layer     |   |
|   |  (Render & Text)  |       |  (app/services/telem)|       |  (CSP, XML Prompts)  |   |
|   +-------------------+       +----------------------+       +----------------------+   |
+------------------------------------------+----------------------------------------------+
                                           | (Puter.js SDK v2)
                                           v
+-----------------------------------------------------------------------------------------+
|                                   PUTER CLOUD PLATFORM                                  |
|                                                                                         |
|   +-------------------+       +----------------------+       +----------------------+   |
|   |    Puter Auth     |       |    Puter FS (Disk)   |       |     Puter KV Store   |   |
|   | (OAuth 2.0 Token) |       | (PDFs & Rendered Img)|       | (Resumes & Profiles) |   |
|   +-------------------+       +----------------------+       +----------------------+   |
|                                          |                                              |
|                                          v                                              |
|                               +----------------------+                                  |
|                               |    Puter AI Chat     |                                  |
|                               | (Gemini 2.5 Flash)   |                                  |
|                               +----------------------+                                  |
+-----------------------------------------------------------------------------------------+
```

---

## 2. End-to-End Data Flow

```
[User PDF File]
       │
       ▼
[app/services/pdf/processPdfDocument.ts]
       ├─► Render Page 1 to Canvas ──► Convert to PNG Blob ──► puter.fs.write("./resumes/{id}_page_1.png")
       ├─► Extract Raw Text Stream ──► Sanitize & Tokenize
       └─► Detect Scanned Documents ──► Trigger OCR Fallback (if applicable)
       │
       ▼
[app/routes/upload.tsx & features/resume-analysis/prompt.ts]
       ├─► Wrap Inputs in Strict XML Boundaries: <job_title>, <job_description>
       ├─► Apply Prompt Injection Guardrails (reject role override attempts)
       └─► Call puter.ai.chat(instructions) [Gemini 2.5 Flash]
       │
       ▼
[JSON Normalization & Validation (app/utils/json.ts)]
       ├─► safeJsonParse & schema validation
       └─► Generate Structured Evaluation Data Model
       │
       ▼
[Persistence: Puter KV & Puter FS]
       ├─► puter.fs.write("./resumes/{id}.pdf", originalFile)
       └─► puter.kv.set("resume:{id}", JSON.stringify(resumeData))
       │
       ▼
[Navigation] ──► Redirect to /resume/{id} Studio
```

---

## 3. Puter.js v2 Integration Patterns

The application integrates with the official Puter.js SDK via `app/services/puter/store.ts`, structured around a reactive Zustand state machine:

### 3.1 Authentication Lifecycle
- **SDK Initialization**: Script injected via `app/root.tsx` (`https://js.puter.com/v2/`). Initialized on mount via `init()`.
- **Status Machine**: Transitions through `idle` → `checking` → `authenticated` | `unauthenticated` | `error`.
- **Route Gate**: `AuthGuard` component (`app/components/auth/AuthGuard.tsx`) protects private routes (`/dashboard`, `/workspace`, `/upload`, `/resume/:id`, `/profile`, `/wipe`). Unauthenticated sessions are safely redirected to `/auth?next={currentPath}`.
- **Login Flow**: Invokes `puter.auth.signIn()`, which opens Puter's secure hosted authentication modal.

### 3.2 Puter Cloud File System (`fs`)
- **Isolation**: Each user operates within their dedicated, sandboxed Puter app folder.
- **Upload Storage**: Resumes are written as `./resumes/{id}.pdf` using `puter.fs.write(path, blobOrFile)`.
- **Visual Previews**: High-resolution PNG renderings generated by PDF.js are saved as `./resumes/{id}_page_{n}.png`.
- **Atomic Deletions**: Deletion operations (`puter.fs.delete(path)`) remove both the raw PDF and all associated preview renderings.

### 3.3 Puter Key-Value Store (`kv`)
- **Key Schema**:
  - `resume:{id}`: Serialized `Resume` evaluation record including scores, ATS feedback, STAR rewrites, keyword gaps, and interview prep.
  - `profile:data`: Candidate career profile, target roles, experience tier, and strictness preferences.
- **Listing & Pagination**: Utilizes `puter.kv.list("resume:*", true)` to fetch all candidate records. Handles nested or raw value variants seamlessly through defensive parsing.
- **Atomic Maintenance**: The `/wipe` maintenance route uses `puter.kv.flush()` alongside file deletion for complete local cloud cleanup.

### 3.4 Puter AI Service (`ai`)
- **Model Target**: Gemini 2.5 Flash (`claude-3-5-sonnet` and `gemini-2.5-flash` supported via Puter AI gateway).
- **Format Guarantee**: Prompts instruct AI to return strictly typed JSON conforming to domain schemas.
- **Defensive Recovery**: If the AI gateway returns Markdown fences (` ```json `), conversational conversational preamble, or plain text, `safeJsonParse` and engine regex fallbacks recover valid structural models without application crashes.

---

## 4. Security & Privacy Architecture

### 4.1 Zero Central Server Retention
Resumind has **no centralized relational or document database**. Candidate resumes, parsed contact info, and scores are never transmitted to any third-party analytics database or stored on application servers. All data rests in the user's personal Puter account.

### 4.2 Content Security Policy (CSP)
Defined via `<meta http-equiv="Content-Security-Policy">` in `app/root.tsx`:
```http
Content-Security-Policy:
  default-src 'self' blob:;
  script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://js.puter.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com data:;
  img-src 'self' data: blob: https:;
  connect-src 'self' blob: https://js.puter.com https://puter.com https://*.puter.com https://api.puter.com;
  frame-src 'self' https://js.puter.com https://puter.com https://*.puter.com;
  worker-src 'self' blob:;
```
Enforces strict origin limits: only Puter services (including apex `https://puter.com` and subdomains), Google Fonts, and local self-hosted blobs are permitted.

### 4.3 Prompt Injection Defense & XML Guardrails
User inputs (Job Title, Job Description, Bullet Points, and Raw Resume Text) are wrapped in rigid XML boundary tags (`<job_title>`, `<job_description>`) within `app/features/resume-analysis/prompt.ts`:
- Clear separation between system meta-instructions and untrusted user data.
- Input sanitization via `sanitizeXmlBoundary()` automatically strips any attempted closing/opening tags (`</job_title>`, `</job_description>`, `<system>`, `<instructions>`), preventing delimiter break-out attacks.
- System instructions explicitly forbid the AI model from honoring prompt injection attacks, roleplay commands, JSON schema manipulations, or administrative override directives embedded in candidate inputs.

### 4.4 Client Observability & PII-Safe Telemetry
The client telemetry engine (`app/services/telemetry.ts`):
- Scrubs email addresses, US/international phone numbers, Social Security Numbers, and credit card patterns via regex.
- Automatically redacts sensitive fields (`resumeText`, `parsedText`, `apiKey`, `password`, `fileContent`).
- Automatically replaces text payloads exceeding 3,000 characters with `[RESUME_TEXT_REDACTED length=N]`.
- Hooks into `ErrorBoundary` in `app/root.tsx` to safely log runtime exceptions without leaking user PII.

---

## 5. Route Map

| Route | File Path | Auth Required | Description |
|---|---|---|---|
| `/` | `app/routes/home.tsx` | No | Public landing page with live interactive score preview and metrics |
| `/auth` | `app/routes/auth.tsx` | No | Puter Cloud authentication and session bootstrap gate |
| `/dashboard` | `app/routes/dashboard.tsx` | Yes | Resume evaluation ledger, search/filter, score tier chips, delete modal |
| `/workspace` | `app/routes/workspace.tsx` | Yes | AI Optimization Studio hub with search and capability quick-launch |
| `/upload` | `app/routes/upload.tsx` | Yes | Drag-and-drop PDF uploader, extraction status, and scoring pipeline |
| `/resume/:id` | `app/routes/resume.tsx` | Yes | Comprehensive studio: ATS score, STAR rewriter, keyword gap, cover letter, prep, copilot |
| `/profile` | `app/routes/profile.tsx` | Yes | Career settings, target roles, AI evaluation strictness, cloud storage stats |
| `/wipe` | `app/routes/wipe.tsx` | Yes | Maintenance interface for atomic deletion of KV keys and files |

---

## 6. Tooling & CI Automation

### 6.1 Testing Suite
Vitest runs unit, integration, route, and adversarial stress suites:
```bash
# Run all test suites
npm test

# Run tests in watch mode
npm run test:watch

# Run test coverage audit
npm run test:coverage
```

### 6.2 Code Quality & Type Safety
```bash
# Typecheck React Router routes and TypeScript source
npm run typecheck

# Run ESLint across all codebase files
npm run lint

# Build production bundle
npm run build
```

### 6.3 GitHub Actions Workflow (`.github/workflows/ci.yml`)
The continuous integration pipeline validates every pull request and push to `main`:
1. **Node Setup**: Node.js 24.15.0 LTS with npm caching.
2. **Typecheck**: Validates complete type generation via `react-router typegen && tsc`.
3. **Lint**: Enforces ESLint standards across code files.
4. **Test**: Executes all 48+ test suites and 600+ unit and adversarial assertions.
5. **Build**: Verifies production build assets generate cleanly.
6. **Audit**: Scans dependencies for known vulnerabilities.
