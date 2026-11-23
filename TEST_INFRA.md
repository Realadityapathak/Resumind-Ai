# Resumind Test Infrastructure

## Current baseline

The hard-cutover suite runs with Vitest 4.1.12, Testing Library, and JSDOM.

| Location | Test files | Scope |
|---|---:|---|
| `test/unit/` | 24 | Engines, utilities, stores, hooks, route logic, stress and adversarial cases |
| `test/components/` | 8 | Shared layout and career-tool UI behavior |
| `test/routes/` | 5 | Route composition, cleanup, responsive, and security-oriented scenarios |
| `test/integration/` | 2 | Route-spanning resume journeys using the in-memory Puter harness |
| **Total** | **39** | **541 tests** |

The integration files exercise broad workflows, but they still run inside Vitest/JSDOM. They do not launch a deployed application in Chromium and must not be described as browser E2E coverage.

## Runner configuration

`vitest.config.ts` defines:

- JSDOM as the environment;
- global Vitest APIs;
- `test/setup.ts` as the setup file;
- `test/**/*.{test,spec}.{ts,tsx}` as the discovery pattern;
- V8 coverage with text, JSON, and HTML reporters; and
- the `~/` alias through `vite-tsconfig-paths` plus an explicit test alias.

`test/setup.ts` performs Testing Library cleanup and calls `vi.clearAllMocks()` after each test, clearing mock call histories without replacing implementations or clearing Puter data. Suites that need isolated Puter state call `resetPuterMock()` or `puterMock.reset()` from their own `beforeEach` hooks; that reset clears the in-memory KV and file stores and restores auth and custom AI state. The setup file also supplies deterministic object-URL, `matchMedia`, `ResizeObserver`, and canvas shims that JSDOM does not provide for these scenarios.

## Puter mock

`test/mocks/puterMock.ts` is the shared in-memory Puter harness. It models:

- authentication state and a mock user;
- key-value get/set/delete/list/flush behavior;
- file write/read/upload/delete/list behavior; and
- deterministic AI payloads for feedback, STAR rewrites, keyword analysis, cover letters, interview prep, copilot, and OCR.

Tests may customize mock payloads and failure modes, but production code remains independent of the harness.

## Coverage map

| Area | Representative files |
|---|---|
| Authentication and navigation | `test/unit/auth.test.ts`, `test/unit/authGuard.test.tsx`, `test/components/Navbar.test.tsx`, `test/components/Sidebar.test.tsx` |
| Upload and PDF lifecycle | `test/unit/dropzone.test.tsx`, `test/unit/pdf2img.test.ts`, `test/routes/upload_cleanup.test.tsx` |
| Resume workspace | `test/routes/resume.test.tsx`, `test/components/WorkspaceTabs.test.tsx`, `test/components/PdfPreviewer.test.tsx` |
| Keyword and STAR tools | `test/unit/keywordGap.test.ts`, `test/unit/starRewriter.test.ts`, `test/unit/starKeywordWorkspace.adversarial.test.tsx`, `test/unit/starKeywordWorkspace.stress.test.tsx` |
| Cover letters | `test/unit/coverLetter.test.ts`, `test/unit/coverLetter.stress.test.ts`, `test/components/CoverLetterTab.test.tsx`, `test/components/CoverLetterTab.stress.test.tsx` |
| Interview prep and copilot | `test/unit/interviewPrep.test.ts`, `test/unit/interviewCopilot.stress.test.ts`, `test/components/InterviewPrepTab.test.tsx`, `test/components/AICopilotTab.test.tsx` |
| Persistence and journeys | `test/unit/resumePersistence.test.tsx`, `test/integration/resumeJourney.integration.test.tsx`, `test/integration/resumeJourneySecurity.integration.test.tsx` |
| General adversarial behavior | `test/unit/adversarial_challenge.test.tsx`, `test/routes/responsive_and_security_stress.test.tsx`, `test/unit/stress-json.test.ts` |

Security-oriented tests cover application behavior such as redirect validation, rendered-text handling, malformed model data, cleanup, and state transitions. The repository does not currently verify response CSP headers or a deployed browser environment.

## Commands

```bash
# Full deterministic suite
npm test

# Watch mode
npm run test:watch

# Coverage output
npm run test:coverage

# Example focused run
npx vitest run test/integration/resumeJourney.integration.test.tsx

# Separate compile and production gates
npm run typecheck
npm run build
```

There is no linter or formatter configuration and no `lint` script. TypeScript, Vitest, and the production build are separate gates; TypeScript is not a linter.

## CI

`.github/workflows/ci.yml` uses Node 24.15.0 and runs `npm ci`, typecheck, tests, production build, and npm audits on pushes to `main` and pull requests.

Playwright is installed for the scripts under `scripts/demo/`; those capture utilities are not part of the automated test suite.
