# AI Resume Analyzer — Codebase Reference

This document describes the hard-cutover tree. Deleted legacy modules such as `app/lib/*`, `constants/index.ts`, root-level feature components, and `types/index.d.ts` are not part of the current architecture.

## Project identity

| Field | Current value |
|---|---|
| App | Resumind |
| UI | React 19.1.0 |
| Framework | React Router 7.18.5 framework mode with SSR enabled |
| Build and tests | Vite 6.4.6; Vitest 4.1.12 |
| Language | TypeScript 5.8.3 with `strict: true` |
| Styling | Tailwind CSS 4.1.11 and `tw-animate-css` |
| State | Zustand 5 |
| Browser services | Puter.js v2 for auth, files, KV, OCR, and AI |
| AI model | `google/gemini-2.5-flash` |
| PDF | `pdfjs-dist` 5.3.93; matching worker at `public/pdf.worker.min.mjs` |
| Runtime | Node.js `>=24.15.0` |

`react-router.config.ts` sets `ssr: true`. The Node process renders and serves the application, while user data and AI operations remain browser-initiated Puter calls. There are no app-owned API routes or database services in this repository.

## Current tree

```text
AI-Resume-Analyzer/
├── app/
│   ├── components/
│   │   ├── auth/                 # AuthGuard
│   │   ├── layout/               # Navbar and Sidebar
│   │   └── ui/                   # Accordion, Icon, ScoreBadge, ScoreGauge
│   ├── features/
│   │   ├── copilot/              # Copilot tab, engine, and prompt
│   │   ├── cover-letter/         # Cover-letter tab, engine, and prompt
│   │   ├── interview-prep/       # Interview tab, engine, and prompt
│   │   ├── keyword-gap/          # Keyword tab, matcher, engine, and prompt
│   │   ├── resume-analysis/      # Main feedback prompt
│   │   ├── resume-workspace/     # Workspace tabs and PDF preview
│   │   ├── star-rewriter/        # STAR tab, engine, and prompt
│   │   └── upload/               # FileUploader
│   ├── hooks/                    # Scroll reveal and safe timeout hooks
│   ├── routes/                   # Eight route modules
│   ├── services/
│   │   ├── pdf/                  # PDF.js loading, text extraction, rendering
│   │   └── puter/                # Zustand wrapper around window.puter
│   ├── styles/                   # Global Tailwind theme and shared classes
│   ├── utils/                    # Class names, sizes, JSON, redirects, UUIDs
│   ├── root.tsx                  # Document shell, Puter script, store init
│   └── routes.ts                 # React Router route registration
├── types/                        # Domain-split ambient declarations
├── test/
│   ├── components/              # 8 component test files
│   ├── integration/             # 2 JSDOM integration test files
│   ├── routes/                  # 5 route test files
│   ├── unit/                    # 24 unit/stress test files
│   ├── mocks/puterMock.ts        # In-memory Puter harness
│   └── setup.ts                  # Testing Library cleanup and JSDOM shims
├── scripts/demo/                 # PDF generation, screenshots, walkthrough video
├── public/                       # Static assets and the PDF.js worker
├── docs/                         # Supplemental documentation
├── package.json
├── react-router.config.ts
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## Module boundaries

- **Routes** compose pages, coordinate persistence, and own route-level loading and navigation.
- **Features** colocate career-tool UI, prompt construction, parsing, and domain behavior.
- **Components** contain shared auth, layout, and primitive UI used by more than one feature or route.
- **Services** isolate browser-platform integrations: Puter and PDF.js.
- **Utilities and hooks** contain cross-cutting, platform-independent helpers.
- **Types** are ambient declarations split by domain instead of a single catch-all file.

Use the `~/` alias for `app/` imports. Register every route in `app/routes.ts`; do not rely on filename discovery alone.

## Routes

| URL | Module | Purpose |
|---|---|---|
| `/` | `app/routes/home.tsx` | Public landing page |
| `/auth` | `app/routes/auth.tsx` | Puter sign-in and safe `next` redirect |
| `/dashboard` | `app/routes/dashboard.tsx` | Saved evaluation dashboard |
| `/profile` | `app/routes/profile.tsx` | User preferences and storage summary |
| `/workspace` | `app/routes/workspace.tsx` | Saved-resume selection workspace |
| `/upload` | `app/routes/upload.tsx` | PDF upload and analysis pipeline |
| `/resume/:id` | `app/routes/resume.tsx` | Seven-tab resume workspace |
| `/wipe` | `app/routes/wipe.tsx` | Authenticated data-removal utility |

## Browser service boundary

`app/services/puter/store.ts` exports `usePuterStore()`. Its public namespaces are:

| Namespace | Operations |
|---|---|
| `auth` | sign in/out, refresh/check session, read current user |
| `fs` | write, read, upload, delete, and list files |
| `ai` | chat, resume feedback, and image-to-text OCR |
| `kv` | get, set, delete, list, and flush records |

`app/root.tsx` loads `https://js.puter.com/v2/` and initializes the store in the browser. Application code should use the store rather than call `window.puter` directly.

## Persistence

| Key | Serialized value |
|---|---|
| `resume:<uuid>` | `Resume`, including feedback and optional career-tool results |
| `user_profile:<puter-user-uuid>` | `UserProfile` preferences |

The upload pipeline uploads the original PDF, processes every page, optionally applies OCR, uploads page previews, requests feedback, and only then writes the resume record. Failed pipelines attempt to remove files uploaded during that attempt.

## PDF and AI handling

- `app/services/pdf/processPdfDocument.ts` loads PDF.js lazily and points it to `/pdf.worker.min.mjs`.
- The vendored worker reports PDF.js version 5.3.93, matching `pdfjs-dist` in the lockfile.
- `app/utils/json.ts` normalizes fenced or noisy model responses and supplies fallback parsing.
- Feature engines perform domain-specific shape checks before returning generated results.
- Scores use the `0–100` range; ATS tips omit `explanation`, while the other feedback groups include it.

## Commands and quality gates

| Command | Purpose |
|---|---|
| `npm run dev` | React Router development server |
| `npm run build` | Client and SSR production bundles |
| `npm run start` | Serve `build/server/index.js` |
| `npm test` | Run all Vitest suites once |
| `npm run test:watch` | Watch Vitest suites |
| `npm run test:coverage` | Run V8 coverage reporters |
| `npm run typecheck` | Generate route types, then run TypeScript |

The current suite contains 39 test files and 541 tests. No linter or formatter is configured.

## Conventions

1. Keep Puter access in the browser-facing store; do not add server code that exposes private API credentials.
2. Put feature-specific UI and engines in the matching `app/features/<feature>/` directory.
3. Put only reusable primitives in `app/components/`.
4. Add ambient declarations to the matching file under `types/`.
5. Keep `public/pdf.worker.min.mjs` synchronized with the installed `pdfjs-dist` version.
6. Treat `test/integration/` as Vitest/JSDOM integration coverage, not deployed-browser E2E coverage.
