# Production Polish Hard-Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development for Phase 3 and superpowers:executing-plans for main-agent integration. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize and polish every owned Resumind source file into a feature-oriented structure, remove proven dead code, and improve maintainability without changing observable runtime behavior.

**Architecture:** Perform a hard cutover with no obsolete-path shims or barrels. Phase 2 moves code and updates imports without refactoring bodies; Phase 3 assigns non-overlapping modules to specialist subagents for line-by-line cleanup; Phase 4 uses an independent QA reviewer and complete regression verification.

**Tech Stack:** React 19.1, React Router 7.18.5 framework mode with SSR, TypeScript 5.8, Vite 6.4.6, Tailwind CSS 4, Zustand 5, Puter.js v2, PDF.js 5.3.93, Vitest 4.1.12, Testing Library, Playwright 1.65, Node >=24.15.0

**Spec:** `docs/superpowers/specs/2026-11-22-production-polish-hard-cutover-design.md`

## Global Constraints

- Preserve routes, business logic, API/SDK calls, prompts, persisted data, UI output, accessibility output, timing, and error behavior.
- Treat the current dirty working tree—including all untracked source and tests—as authoritative.
- Do not use `git add`, `git reset`, `git clean`, `git checkout`, `git stash`, or commit.
- Preserve the ten pre-existing staged deletions exactly.
- Do not add or upgrade dependencies. There is no linter; report that fact rather than installing one.
- Do not fix known product defects during this behavior-preserving refactor.
- Phase 2 is move/import/configuration work only; do not refactor function bodies while moving files.
- Use no compatibility shims, obsolete-path re-exports, or new barrel modules.
- Keep public assets because their URLs are externally observable.
- Keep `public/pdf.worker.min.mjs` byte-identical and exclude it from style refactoring.
- A deleted test must exclusively cover a proven runtime-dead component and must be documented by name.

## Review Focus

1. **Untracked authoritative files:** every baseline path must have a move, edit, documented deletion, or reviewed-unchanged disposition; Task 1 creates the manifest and Task 16 reconciles it.
2. **Prompt and persistence drift during relocation:** prompt text hashes, KV keys, and serialized field names must not change; Tasks 5-9 and Task 16 verify them.
3. **CSS/DOM drift:** moves and cleanup must retain stylesheet order, markup, strings, classes, ARIA attributes, and visual output; Tasks 3, 11, and 16 own visual comparisons.
4. **Puter/PDF lifecycle drift:** SDK call order, timeouts, object URLs, PDF worker path, upload rollback, and cleanup must remain unchanged; Tasks 4, 10, and 16 own focused tests.
5. **Route/build breakage after hard cutover:** all eight routes, SSR, client chunks, and direct module imports must survive without shims; Tasks 9, 10, and 16 own route/build verification.

---

## File Structure Locked by This Plan

### Shared application modules

- `app/components/auth/AuthGuard.tsx`: canonical protected-route component
- `app/components/layout/Navbar.tsx`: global navigation
- `app/components/layout/Sidebar.tsx`: authenticated workspace navigation
- `app/components/ui/Accordion.tsx`: accordion primitives
- `app/components/ui/Icon.tsx`: shared icon renderer and `IconName`
- `app/components/ui/ScoreBadge.tsx`: score tier calculation and badge
- `app/components/ui/ScoreGauge.tsx`: gauge visualization
- `app/hooks/useSafeTimeout.ts`: unmount-safe timeout scheduling
- `app/hooks/useScrollReveal.ts`: viewport reveal lifecycle
- `app/services/puter/store.ts`: Zustand Puter adapter
- `app/services/pdf/processPdfDocument.ts`: PDF.js loading, extraction, rendering, conversion
- `app/styles/global.css`: global Tailwind, tokens, and component styles in existing order
- `app/utils/classNames.ts`: `cn`
- `app/utils/formatSize.ts`: `formatSize`
- `app/utils/json.ts`: `cleanJson`, `safeJsonParse`
- `app/utils/redirect.ts`: `getSafeRedirect`
- `app/utils/uuid.ts`: `generateUUID`

### Feature modules

- `app/features/upload/FileUploader.tsx`
- `app/features/resume-analysis/prompt.ts`
- `app/features/resume-workspace/{DetailsTab,OverviewTab,PdfPreviewer,WorkspaceTabs}.tsx`
- `app/features/keyword-gap/{KeywordGapTab.tsx,keywordGapEngine.ts,keywordMatcher.ts,prompt.ts}`
- `app/features/star-rewriter/{StarRewriterTab.tsx,starRewriterEngine.ts,prompt.ts}`
- `app/features/cover-letter/{CoverLetterTab.tsx,coverLetterEngine.ts,prompt.ts}`
- `app/features/interview-prep/{InterviewPrepTab.tsx,interviewPrepEngine.ts,prompt.ts}`
- `app/features/copilot/{AICopilotTab.tsx,copilotEngine.ts,prompt.ts}`

### Routes and types

- Keep the eight route filenames and `app/routes.ts` unchanged in location.
- Split ambient declarations into `types/{resume,workspace,profile,keyword-gap,star-rewriter,cover-letter,interview-prep,copilot,puter}.d.ts`.
- Introduce no type barrel and preserve required ambient global names.

---

## Phase 2 — Main-Agent Hard Cutover

### Task 1: Capture immutable safety and behavior manifests

**Files:**
- Read: all owned files outside ignored/generated directories
- Create outside repository: `%TEMP%\opencode\resumind-polish-baseline\*`

**Interfaces:**
- Consumes: current dirty working tree
- Produces: path/hash/status, routes, prompt hashes, test list, build asset list, and baseline screenshots used by Tasks 2-16

- [ ] **Step 1: Save exact Git state without modifying the index**

Run `git status --porcelain=v1 -uall` and `git diff --cached --name-status`; save output under the approved temp directory.

- [ ] **Step 2: Hash every authoritative owned file**

Exclude `.git`, `node_modules`, `build`, `coverage`, `.react-router`, `temp`, `.playwright-mcp`, `.serena`, `.superpowers`, and `.agents`. Save path, size, and SHA-256.

- [ ] **Step 3: Save behavioral manifests**

Record the eight route registrations, all exported prompt outputs for fixed fixtures, KV/storage key literals, Vitest test collection, and client/server build asset names.

- [ ] **Step 4: Capture baseline browser output outside the repository**

Use the existing Playwright dependency and deterministic Puter mocks to capture home, auth, dashboard, upload, profile, workspace, resume tabs, and wipe at mobile, tablet, and desktop widths. Save console/network logs.

- [ ] **Step 5: Re-run baseline gates**

Run `npm run typecheck`, `npm test`, and `npm run build`.

Expected: typecheck/build exit 0 and 39 test files / 546 tests pass.

### Task 2: Remove proven runtime-dead legacy components

**Files:**
- Delete: `app/components/ATS.tsx`
- Delete: `app/components/Details.tsx`
- Delete: `app/components/ResumeCard.tsx`
- Delete: `app/components/ScoreCircle.tsx`
- Delete: `app/components/Summary.tsx`
- Modify: `test/unit/score.test.tsx`

**Interfaces:**
- Consumes: final production/test/dynamic-import reference scan
- Produces: runtime tree without legacy components; `ScoreBadge` coverage remains

- [ ] **Step 1: Re-prove runtime deadness**

Search owned code, route registration, tests, scripts, and docs for imports, JSX usage, dynamic imports, and string module paths. Expected: only `ResumeCard -> ScoreCircle` in production; only `test/unit/score.test.tsx` imports `ATS` and `ScoreCircle`; no production entry reaches the five components.

- [ ] **Step 2: Remove only exclusive dead-component assertions**

Delete the `ScoreCircle Gradient ID Uniqueness` and `ATS Component Display & Suggestion Icons` describe blocks and their two imports. Keep every `ScoreBadge` assertion unchanged.

- [ ] **Step 3: Delete the five dead component files**

Do not delete icons or public assets referenced by their old markup because public URLs remain contracts.

- [ ] **Step 4: Verify the deletion**

Run `npx vitest run test/unit/score.test.tsx`, `npm run typecheck`, and the dead-path reference scan.

Expected: remaining ScoreBadge tests pass; no owned code references deleted paths.

### Task 3: Move shared components, hooks, and stylesheet

**Files:**
- Move: `app/components/auth/AuthGuard.tsx` (same canonical path)
- Delete after importer update: `app/components/AuthGuard.tsx`
- Move: `app/components/Navbar.tsx` → `app/components/layout/Navbar.tsx`
- Move: `app/components/Sidebar.tsx` → `app/components/layout/Sidebar.tsx`
- Move: `app/components/Accordion.tsx` → `app/components/ui/Accordion.tsx`
- Move: `app/components/Icon.tsx` → `app/components/ui/Icon.tsx`
- Move: `app/components/ScoreBadge.tsx` → `app/components/ui/ScoreBadge.tsx`
- Move: `app/components/ScoreGauge.tsx` → `app/components/ui/ScoreGauge.tsx`
- Move: `app/components/FileUploader.tsx` → `app/features/upload/FileUploader.tsx`
- Move: `app/lib/motion.ts` → `app/hooks/useScrollReveal.ts`
- Move: `app/lib/useSafeTimeout.ts` → `app/hooks/useSafeTimeout.ts`
- Move: `app/app.css` → `app/styles/global.css`
- Modify: all owned importers, including tests and `app/root.tsx`

**Interfaces:**
- Consumes: existing component and hook exports unchanged
- Produces: concrete final shared paths with no top-level `AuthGuard` shim

- [ ] **Step 1: Move files byte-for-byte**

Do not change file bodies, export forms, JSX, or CSS during this step.

- [ ] **Step 2: Update every owned import directly**

Use `~/components/auth/AuthGuard`, `~/components/layout/*`, `~/components/ui/*`, `~/features/upload/FileUploader`, and `~/hooks/*`. Update same-directory imports only where needed.

- [ ] **Step 3: Delete the obsolete top-level AuthGuard re-export**

Verify no source, test, script, or doc imports `~/components/AuthGuard`.

- [ ] **Step 4: Verify shared moves**

Run `npm run typecheck` and:

`npx vitest run test/unit/authGuard.test.tsx test/unit/authTimeout.test.tsx test/components/Navbar.test.tsx test/components/Sidebar.test.tsx test/unit/score.test.tsx test/unit/useSafeTimeout.test.tsx test/unit/dropzone.test.tsx`

Expected: all pass; CSS file hash equals its baseline hash.

### Task 4: Split utilities and move infrastructure services

**Files:**
- Move/split: `app/lib/utils.ts` → five `app/utils/*.ts` files
- Move: `app/lib/puter.ts` → `app/services/puter/store.ts`
- Move: `app/lib/pdf2img.ts` → `app/services/pdf/processPdfDocument.ts`
- Modify: all application/test importers

**Interfaces:**
- Produces unchanged signatures:
  - `cn(...inputs: ClassValue[]): string`
  - `formatSize(bytes: number): string`
  - `generateUUID(): string`
  - `getSafeRedirect(rawNext: string | null | undefined, fallback?: string): string`
  - `cleanJson(text: string): string`
  - `safeJsonParse<T>(input: unknown, fallback: T): T`
  - `usePuterStore` and `AuthStatus`
  - existing PDF interfaces and functions, including test-only `_setPdfJsLib`

- [ ] **Step 1: Copy utility symbols without body edits**

Preserve imports, signatures, implementation text, and export names; remove `app/lib/utils.ts` only after every importer targets a concrete utility file.

- [ ] **Step 2: Move Puter and PDF modules byte-for-byte**

Update all app/test mocks and imports directly; retain the public PDF worker URL and all SDK adapter behavior.

- [ ] **Step 3: Verify service and utility contracts**

Run `npx vitest run test/unit/utils.test.ts test/unit/stress-json.test.ts test/unit/adversarial_challenge.test.tsx test/unit/puterStore.test.ts test/unit/auth.test.ts test/unit/pdf2img.test.ts` and `npm run typecheck`.

Expected: all pass with identical assertion results.

### Task 5: Move resume-workspace presentation modules

**Files:**
- Move: four modules from `app/components/workspace` to `app/features/resume-workspace`
- Modify: `app/routes/resume.tsx` and component tests/importers

**Interfaces:**
- Produces unchanged components and props: `DetailsTab`, `OverviewTab`, `PdfPreviewer`, `WorkspaceTabs`, `TAB_DEFINITIONS`

- [ ] **Step 1: Move the four modules without body edits**
- [ ] **Step 2: Update concrete imports in routes and tests**
- [ ] **Step 3: Verify workspace presentation**

Run `npx vitest run test/components/PdfPreviewer.test.tsx test/components/WorkspaceTabs.test.tsx test/routes/resume.test.tsx test/routes/resume_m4.test.tsx` and `npm run typecheck`.

### Task 6: Move keyword-gap and STAR features with exact prompts

**Files:**
- Move: `KeywordGapTab.tsx`, `keywordGapEngine.ts`, `keywordMatcher.ts`, `StarRewriterTab.tsx`, `starRewriterEngine.ts`
- Create by exact extraction: `app/features/keyword-gap/prompt.ts`
- Create by exact extraction: `app/features/star-rewriter/prompt.ts`
- Modify: all importers

**Interfaces:**
- Keyword: `validateKeywordGapAnalysis`, `executeKeywordGapAnalysis`, `tokenizeAndMatchKeywords`, `prepareKeywordGapPrompt`, `KeywordGapPromptOptions`
- STAR: `validateStarRewriteResult`, `rewriteBulletWithStar`, `prepareStarRewriterPrompt`, `getStarToneGuideline`, `StarRewriterPromptOptions`

- [ ] **Step 1: Add prompt-output characterization checks in the temp verification script**

For fixed fixtures, assert the old and extracted prompt functions return exactly equal strings before deleting `constants/index.ts` ranges.

- [ ] **Step 2: Move feature modules without body edits**
- [ ] **Step 3: Extract only referenced prompt exports into feature prompt modules**
- [ ] **Step 4: Update all direct imports**
- [ ] **Step 5: Verify exact behavior**

Run prompt equality checks, `npm run typecheck`, and:

`npx vitest run test/unit/keywordGap.test.ts test/unit/starRewriter.test.ts test/unit/m3_adversarial.test.tsx test/unit/m3_challenger2_stress.test.tsx`

### Task 7: Move cover-letter, interview-prep, and copilot features with exact prompts

**Files:**
- Move: each feature tab and engine into its approved feature directory
- Create by exact extraction: each feature `prompt.ts`
- Modify: all importers

**Interfaces:**
- Cover letter: existing validators, counters, assembler, generator, tone helper, and prompt API
- Interview prep: existing validator, default-question generator, AI generator, and prompt API
- Copilot: existing validator, turn executor, and prompt API

- [ ] **Step 1: Add exact prompt-output comparisons for all three features**
- [ ] **Step 2: Move six implementation files without body edits**
- [ ] **Step 3: Extract only referenced prompt exports**
- [ ] **Step 4: Update all direct imports and remove obsolete constants paths**
- [ ] **Step 5: Verify exact behavior**

Run `npm run typecheck` and:

`npx vitest run test/unit/coverLetter.test.ts test/components/CoverLetterTab.test.tsx test/components/CoverLetterTab.stress.test.tsx test/unit/interviewPrep.test.ts test/components/InterviewPrepTab.test.tsx test/unit/aiCopilot.test.ts test/components/AICopilotTab.test.tsx test/unit/m4_challenger1_stress.test.ts test/unit/m4_challenger2_stress.test.ts`

### Task 8: Extract resume-analysis prompt and delete old library roots

**Files:**
- Create: `app/features/resume-analysis/prompt.ts`
- Modify: `app/routes/upload.tsx`
- Delete when empty: `constants/index.ts`, `constants/`, `app/lib/`, `app/components/workspace/`

**Interfaces:**
- Produces unchanged `prepareInstructions` and its exact prompt output

- [ ] **Step 1: Compare old/new `prepareInstructions` output for a fixed job fixture**
- [ ] **Step 2: Extract `AIResponseFormat` and `prepareInstructions` without text changes**
- [ ] **Step 3: Update upload import and delete empty obsolete roots**
- [ ] **Step 4: Scan for old paths and verify**

Run `npx vitest run test/routes/upload_cleanup.test.tsx test/routes/e2e_flow.test.tsx` and `npm run typecheck`.

Expected: no import contains `~/lib/`, `~/components/workspace/`, or `../../constants`.

### Task 9: Split ambient domain declarations

**Files:**
- Split/delete: `types/index.d.ts`
- Create: eight domain `.d.ts` files listed in the locked structure
- Keep: `types/puter.d.ts`

**Interfaces:**
- Consumes/produces: the same ambient global names required by application/tests

- [ ] **Step 1: Move declarations by domain without renaming**
- [ ] **Step 2: Remove only reference-proven duplicate/unused aliases listed in the spec**
- [ ] **Step 3: Verify declaration completeness**

Run `npm run typecheck` and `npx tsc --noEmit --noUnusedLocals --noUnusedParameters`.

Expected: ordinary typecheck passes; strict-unused has no application diagnostics and any test-only diagnostics are recorded for Phase 3.

### Task 10: Reorganize tests and demo scripts

**Files:**
- Move: `test/routes/e2e_flow.test.tsx` → `test/integration/resumeJourney.integration.test.tsx`
- Move: `test/routes/e2e_adversarial.test.tsx` → `test/integration/resumeJourneySecurity.integration.test.tsx`
- Move: `test/routes/resume_m4.test.tsx` → `test/routes/resumeCareerTools.test.tsx`
- Move: `test/unit/m3_adversarial.test.tsx` → `test/unit/starKeywordWorkspace.adversarial.test.tsx`
- Move: `test/unit/m3_challenger2_stress.test.tsx` → `test/unit/starKeywordWorkspace.stress.test.tsx`
- Move: `test/unit/m4_challenger1_stress.test.ts` → `test/unit/coverLetter.stress.test.ts`
- Move: `test/unit/m4_challenger2_stress.test.ts` → `test/unit/interviewCopilot.stress.test.ts`
- Move/rename: three scripts to `scripts/demo/*.mjs`
- Modify: documentation references only; do not change test/script bodies in Phase 2

**Interfaces:**
- Produces: identical Vitest collection except the five documented dead-component cases; identical script entry behavior at new paths

- [ ] **Step 1: Record current test names and counts per file**
- [ ] **Step 2: Move tests and scripts without body edits**
- [ ] **Step 3: Update path mentions in docs and script help text only**
- [ ] **Step 4: Verify collection and scripts parse**

Run `npm test`, `node --check` for each demo script, and compare collected test names to the baseline minus the five deleted legacy-component cases.

### Task 11: Execute the mandatory Phase 2 gate

**Files:**
- Review: all moved/deleted/modified paths

**Interfaces:**
- Produces: verified organized codebase used as the immutable starting point for parallel Phase 3 work

- [ ] **Step 1: Reconcile the file manifest**

Every baseline owned file must map to a destination, documented deletion, or reviewed-unchanged path.

- [ ] **Step 2: Scan structural invariants**

Confirm no obsolete path/shim/barrel, unresolved import, import cycle, debug `console.log`, route change, storage-key change, or prompt hash change.

- [ ] **Step 3: Run Phase 2 verification**

Run `npm run typecheck`, `npm test`, and `npm run build`.

Expected: all remaining tests pass; build/typecheck exit 0; all eight route chunks exist.

- [ ] **Step 4: Review the organization-only diff**

Confirm implementation bodies are unchanged except utility/prompt file boundary extraction and import paths.

---

## Phase 3 — Parallel Line-by-Line Refactoring

### Task 12: Dispatch non-overlapping module refactors

**Files:**
- Workstream A: `app/components`, `app/hooks`, `app/styles`, plus the auth guard, Navbar, Sidebar, score, and timeout tests
- Workstream B: `app/services`, `app/utils`, plus focused utility/PDF/Puter unit tests; `test/mocks/puterMock.ts` remains main-agent owned
- Workstream C: keyword-gap and STAR feature directories plus `keywordGap`, `starRewriter`, `starKeywordWorkspace.adversarial`, and `starKeywordWorkspace.stress` tests
- Workstream D: cover-letter feature directory plus its component, unit, and stress tests
- Workstream E: interview-prep, copilot, upload, resume-analysis, and resume-workspace feature directories plus their non-route component, unit, dropzone, and stress tests
- Workstream F: `app/routes/*.tsx` plus route and integration tests, excluding `app/routes.ts`
- Workstream G: `scripts` and docs; audit `types` and root configuration read-only and return recommendations because shared declarations/config remain main-agent owned

**Interfaces:**
- Consumes: passing Phase 2 tree
- Produces: one reviewed patch/report per non-overlapping workstream

- [ ] **Step 1: Invoke `dispatching-parallel-agents` and dispatch all seven workstreams together**

Each agent must audit every line in its assigned files, preserve the behavioral invariants, run focused tests, and report every reviewed-unchanged file. Agents may not edit files outside their ownership.

- [ ] **Step 2: Require characterization tests before any helper extraction not already directly covered**

Expected: tests pass before and after; no defect fix is bundled.

- [ ] **Step 3: Require each workstream to return its focused command outputs and diff risk notes**

### Task 13: Integrate shared UI/hooks/styles workstream

**Files:**
- Modify only Workstream A paths

**Interfaces:**
- Preserves all component props, markup, CSS order, animation behavior, and hook timing

- [ ] **Step 1: Review patch for JSX/CSS/ARIA/timing drift**
- [ ] **Step 2: Reject speculative memoization or abstractions**
- [ ] **Step 3: Run focused component/hook tests, typecheck, and visual comparison**

Expected: no screenshot pixel difference attributable to this workstream.

### Task 14: Integrate services/utilities and feature workstreams

**Files:**
- Modify only Workstreams B-E paths

**Interfaces:**
- Preserves every exported signature still referenced after Phase 2, SDK/prompt behavior, and persistence semantics

- [ ] **Step 1: Integrate one workstream at a time and review its complete diff**
- [ ] **Step 2: Run that workstream's focused tests and `npm run typecheck` before the next integration**
- [ ] **Step 3: Compare prompt hashes, SDK call signatures, PDF lifecycle calls, and JSON outputs to baseline**

### Task 15: Integrate routes and engineering-support workstreams

**Files:**
- Modify: Workstream F paths
- Modify: approved Workstream G paths
- Main-agent-only review/edit: `app/root.tsx`, `app/routes.ts`, `package.json`, `package-lock.json`, CI/build/Vitest/TypeScript configs, `test/setup.ts`, `test/mocks/puterMock.ts`, and cross-domain ambient declarations

**Interfaces:**
- Preserves route registrations, application shell, scripts, tests, and build behavior

- [ ] **Step 1: Review every route diff against strings, JSX, classes, storage operations, navigation, and async ordering**
- [ ] **Step 2: Apply only verified support-file cleanup; do not add lint/format dependencies**
- [ ] **Step 3: Update documentation to the actual final structure and verified counts**
- [ ] **Step 4: Run route/integration tests, full typecheck, and production build**

---

## Phase 4 — Independent QA and Final Verification

### Task 16: QA reviewer audit and complete regression gate

**Files:**
- Review: complete Git diff, all final owned files, baseline manifests, and verification logs

**Interfaces:**
- Consumes: fully integrated refactor
- Produces: independent severity-ranked findings and final go/no-go evidence

- [ ] **Step 1: Dispatch a fresh QA/reviewer subagent**

The reviewer must examine the full diff for behavior changes, missing files, broken imports, accidental prompt/string/CSS/DOM changes, weakened tests, unnecessary abstractions, and incomplete per-file coverage. The reviewer makes no edits.

- [ ] **Step 2: Resolve every verified blocker/high/medium regression introduced by the refactor**

Use focused tests before each correction. Do not fix pre-existing product defects.

- [ ] **Step 3: Run fresh final commands**

Run:

- `npm run typecheck`
- `npm test`
- `npm run test:coverage`
- `npm run build`
- `npm audit`
- `npm audit --omit=dev`
- `git diff --check`
- strict-unused diagnostics
- unresolved-import and import-cycle scans
- debug-log, secret, dead-file, and missing-asset scans

- [ ] **Step 4: Run production runtime and visual QA**

Boot `react-router-serve`, visit all eight routes using deterministic mocks where authentication/data are required, compare all baseline viewport captures, and assert no new console or network errors.

- [ ] **Step 5: Reconcile Git and file manifests**

Confirm the original ten staged deletions are unchanged, no new path is staged, all 76 authoritative untracked baseline files are accounted for, and no temp/browser artifact can enter Git or Docker.

- [ ] **Step 6: Produce the final report**

Include:

1. final folder structure;
2. moved/deleted files and dead declarations removed;
3. major behavior-preserving refactors;
4. typecheck/test/coverage/build/audit/runtime/visual results;
5. explicit statement that no linter exists and none was installed;
6. known defects intentionally preserved;
7. remaining risks, if any.
