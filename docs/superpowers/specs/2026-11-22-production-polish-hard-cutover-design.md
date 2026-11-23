# Production Polish Hard-Cutover Design

**Status:** Draft for approval  
**Date:** 2026-11-22  
**Repository:** Resumind / AI-Resume-Analyzer

## Intent

Reorganize and polish the complete Resumind codebase so its structure, naming, module boundaries, and implementation quality meet modern React Router and TypeScript standards while preserving all observable application behavior.

The refactor is maintenance work, not product work. It must not change routes, user flows, rendered appearance, prompts, Puter contracts, persistence formats, timing-sensitive behavior, accessibility output, error messages, or accepted inputs and outputs.

## Verified Baseline

The current dirty working tree, including its untracked application and test files, is the authoritative baseline.

- Node: `v24.19.0`
- npm: `11.17.0`
- Typecheck: passing
- Tests: 39 files, 546 tests, all passing
- Production build: passing for client and SSR
- Coverage: 82.48% statements, 79.45% branches, 77.01% functions, 83.61% lines
- Full and production-only npm audits: 0 vulnerabilities
- Internal import graph: no cycles and no unresolved relative imports
- Linter/formatter: none configured
- Git state at design time: 28 modified tracked files, 10 pre-existing staged deletions, 76 untracked files

The 76 untracked files include required routes, feature components, engines, all tests, Vitest configuration, and CI. An ordinary worktree based on `HEAD` would omit the working application and therefore cannot be used as the implementation baseline.

## Goals

1. Establish a clear feature-oriented application structure with separate shared UI, layout, hooks, services, utilities, routes, and domain types.
2. Perform a clean hard cutover: update every internal import directly and leave no compatibility shim, redirecting module, or re-export file at an obsolete path.
3. Audit every repository-owned source, test, configuration, script, style, and documentation file.
4. Remove code proven unreachable or unreferenced by production, tests, dynamic imports, route registration, scripts, and documentation.
5. Simplify implementation details without changing runtime semantics.
6. Standardize naming, direct imports, type-only imports, comments, and error-handling conventions.
7. Preserve a verifiable passing state after organization and after every Phase 3 workstream.

## Non-Goals

- Fixing known product defects or changing questionable existing behavior.
- Redesigning UI, copy, responsive behavior, animation, or visual styling.
- Changing route URLs, route metadata, auth gating, navigation, or query parameters.
- Changing Puter SDK methods, call ordering, storage keys, stored JSON shapes, AI models, prompt text, retry timing, or fallback behavior.
- Introducing loaders/actions, API routes, server persistence, or a new state-management approach.
- Adding dependencies, including linting or formatting packages, without separate approval.
- Rewriting tests to make behavior changes pass.
- Modifying ignored agent/session metadata under `.agents`, `.serena`, `.superpowers`, or `.playwright-mcp`.
- Committing, staging, resetting, cleaning, or discarding existing work.

## Anti-Goals

The refactor is considered a failure if it:

- changes any DOM structure, visible string, CSS class, data attribute, ARIA attribute, or visual output without an explicitly documented mechanical necessity;
- changes any public URL or asset URL;
- changes a Puter request, prompt, persistence record, or deletion/upload sequence;
- mixes defect fixes into structural cleanup;
- introduces generalized abstractions for code that only looks similar but has different semantics;
- mass-formats files while moving them, making behavior review impractical;
- deletes an untracked file merely because Git does not yet know about it;
- alters the ten pre-existing staged deletions or stages new changes.

## Chosen Approach

### Selected: clean hard cutover

Implementations move directly to their final locations. All imports in application code, tests, scripts, and documentation are updated in the same logical batch. Obsolete paths are removed immediately after their importers are migrated. No old-path compatibility modules or barrels remain.

The cutover is divided into mechanically reviewable batches, but the application may be temporarily non-buildable within a batch. Every batch ends with an import scan and typecheck. The complete Phase 2 ends with a mandatory typecheck, full test suite, and production build before Phase 3 starts.

### Alternatives considered

1. **Compatibility-first staged moves:** lowest compatibility risk, but rejected because it leaves shim files and duplicate import surfaces.
2. **In-place cleanup:** lowest move risk, but rejected because it does not achieve the requested scalable structure.
3. **Hard cutover:** selected because the package is private, all owned importers can be updated together, and the user explicitly prefers a clean final tree over source-path compatibility.

## Behavioral Invariants

These are stronger than style preferences and govern every edit:

1. `app/routes.ts` registers the same eight route URLs against behaviorally identical modules.
2. Route modules keep their framework exports and rendered output.
3. `usePuterStore` exposes the same state and callable API; SDK calls keep the same arguments, ordering, return handling, retries, and timeouts.
4. KV keys remain `resume:<id>` and `user_profile:<uuid>`; persisted object shapes remain unchanged.
5. PDF parsing, rendering, OCR, upload, rollback, and object-URL cleanup retain the same sequence and defaults.
6. AI prompt strings remain byte-for-byte equivalent after relocation; model calls and response normalization remain equivalent.
7. Existing known defects remain behaviorally unchanged and are reported separately rather than silently fixed.
8. Component props used by current production importers and tests remain accepted until a reference-aware deletion proves the component itself dead.
9. CSS cascade order, Tailwind import order, selectors used at runtime, and asset paths remain unchanged.
10. Browser-visible timing, loading, fallback, toast, focus, keyboard, and navigation behavior remain unchanged.

## Target Structure

```text
app/
  components/
    auth/
      AuthGuard.tsx
    layout/
      Navbar.tsx
      Sidebar.tsx
    ui/
      Accordion.tsx
      Icon.tsx
      ScoreBadge.tsx
      ScoreGauge.tsx
  features/
    upload/
      FileUploader.tsx
    resume-workspace/
      DetailsTab.tsx
      OverviewTab.tsx
      PdfPreviewer.tsx
      WorkspaceTabs.tsx
    keyword-gap/
      KeywordGapTab.tsx
      keywordGapEngine.ts
      keywordMatcher.ts
      prompt.ts
    star-rewriter/
      StarRewriterTab.tsx
      starRewriterEngine.ts
      prompt.ts
    cover-letter/
      CoverLetterTab.tsx
      coverLetterEngine.ts
      prompt.ts
    interview-prep/
      InterviewPrepTab.tsx
      interviewPrepEngine.ts
      prompt.ts
    copilot/
      AICopilotTab.tsx
      copilotEngine.ts
      prompt.ts
    resume-analysis/
      prompt.ts
  hooks/
    useSafeTimeout.ts
    useScrollReveal.ts
  services/
    pdf/
      processPdfDocument.ts
    puter/
      store.ts
  styles/
    global.css
  utils/
    classNames.ts
    formatSize.ts
    json.ts
    redirect.ts
    uuid.ts
  routes/
    auth.tsx
    dashboard.tsx
    home.tsx
    profile.tsx
    resume.tsx
    upload.tsx
    wipe.tsx
    workspace.tsx
  root.tsx
  routes.ts

types/
  copilot.d.ts
  cover-letter.d.ts
  interview-prep.d.ts
  keyword-gap.d.ts
  profile.d.ts
  puter.d.ts
  resume.d.ts
  star-rewriter.d.ts
  workspace.d.ts

test/
  setup.ts
  components/
  integration/
  mocks/
  routes/
  unit/

scripts/
  demo/
    captureLiveFrames.mjs
    generatePdf.mjs
    recordWalkthrough.mjs
```

No `index.ts` barrel is introduced. Cross-directory application imports use the existing `~/` alias and name the concrete module. Same-directory imports use `./`.

## Phase 1: Baseline and Audit

Phase 1 is complete and read-only.

- All 132 non-agent repository-owned files were inventoried and audited; text files were read to EOF and binary assets received reference/status review.
- The ignored `.agents/teamwork` tree was inventoried as historical coordination metadata, not authoritative application source.
- Build, typecheck, tests, coverage, dependency audits, strict-unused diagnostics, import resolution, and cycle detection were executed.
- A directed structural graph was generated in the approved temporary directory, excluding the vendored PDF worker from architecture ranking. It contains 447 nodes and 1,261 relationships across 16 communities.

## Phase 2: Project Organization

Phase 2 performs moves only, plus the minimum import and configuration edits required by those moves. It does not refactor function bodies.

### Batch A: shared modules and infrastructure

- Move auth, layout, and shared UI components into `components/auth`, `components/layout`, and `components/ui`.
- Remove the top-level `app/components/AuthGuard.tsx` re-export after updating every importer to `~/components/auth/AuthGuard`.
- Move `motion.ts` and `useSafeTimeout.ts` into `hooks` under descriptive hook filenames.
- Move `puter.ts` to `services/puter/store.ts`.
- Move `pdf2img.ts` to `services/pdf/processPdfDocument.ts` without renaming exported symbols during Phase 2.
- Split `utils.ts` by existing function boundaries into five concrete utility modules without changing function bodies.
- Move `app/app.css` to `app/styles/global.css` as a byte-preserving move and update `root.tsx`.

End-of-batch gate: unresolved-import scan and `npm run typecheck`.

### Batch B: feature colocation

- Move each workspace tab into its feature directory.
- Move each feature engine beside its component.
- Split `constants/index.ts` into prompt modules by copying exact prompt/interface/function ranges, then delete the old constants module after every importer is updated.
- Keep the generic resume-evaluation prompt in `features/resume-analysis/prompt.ts`.
- Move `FileUploader.tsx` into `features/upload`.

End-of-batch gate: prompt-content comparison, unresolved-import scan, `npm run typecheck`, and targeted engine/component tests.

### Batch C: ambient types

- Split `types/index.d.ts` by domain while preserving ambient global names needed by current source.
- Retain `types/puter.d.ts` as the canonical Puter SDK declaration module.
- Remove only duplicate or reference-proven unused ambient aliases after a strict typecheck confirms no consumer.
- Do not convert the application to explicit domain-type imports in this project; that would be a separate API-changing migration.

End-of-batch gate: `npm run typecheck` and strict unused diagnostics.

### Batch D: tests, scripts, and documentation paths

- Move route-spanning tests with `e2e_*` names into `test/integration` and rename them to describe their actual integration scope.
- Rename milestone/challenger test files to behavior-based names. Test bodies remain unchanged in Phase 2.
- Keep feature-unit and component tests grouped by what they exercise.
- Move and rename demo scripts to `scripts/demo` using lower camel case.
- Update documentation paths and command references affected by the cutover.

End-of-batch gate: Vitest collection listing, `npm run typecheck`, and the full test suite.

### Mandatory Phase 2 gate

Before any Phase 3 refactor:

1. Confirm all authoritative baseline files still exist or have an intentional move/delete record.
2. Confirm no old module path has a compatibility shim or re-export.
3. Confirm no unresolved import or import cycle.
4. Run `npm run typecheck`.
5. Run `npm test`.
6. Run `npm run build`.
7. Compare route registrations, emitted client/server route chunks, prompt hashes, and Git status against the baseline.

Phase 3 is blocked until every item passes.

## Phase 3: Line-by-Line Refactoring

Independent subagents receive non-overlapping file ownership. Shared files are reserved for the main agent to prevent conflicting edits.

### Workstream 1: shared UI, layout, hooks, and styles

Scope:

- `app/components/auth`
- `app/components/layout`
- `app/components/ui`
- `app/hooks`
- `app/styles`

Required review:

- Remove compiler-proven unused imports and bindings.
- Preserve JSX structure, text, classes, ARIA, events, and timing.
- Simplify private helpers only when equivalent tests already exercise the behavior.
- Audit every CSS selector and token; delete only selectors proven unused by static references and runtime screenshot/network checks.
- Preserve CSS rule order when order can affect the cascade.

### Workstream 2: feature modules

Scope is split by feature directory so keyword, STAR, cover letter, interview, copilot, upload, and resume-workspace can be reviewed independently.

Required review:

- Keep prompt text and AI request/response semantics unchanged.
- Remove private dead declarations and redundant comments.
- Extract repeated AI response handling only if the implementations are semantically identical and all engine tests pass before and after.
- Avoid broad memoization; only address measured or obvious unstable-reference problems without changing timing.
- Preserve all current component exports that still have owned references.

### Workstream 3: services and utilities

Scope:

- `app/services`
- `app/utils`

Required review:

- Preserve Puter SDK call order, error state, timeout, and return semantics.
- Preserve JSON cleanup behavior and redirect security behavior exactly.
- Preserve PDF.js loading, rendering, text extraction, and fallback behavior.
- Replace `any` only where a stronger type cannot alter accepted runtime values.
- Do not fix the known keyword, PDF-limit, profile-save, or deletion behavior defects in this refactor.

### Workstream 4: routes

Scope is split among route modules, but shared route configuration remains main-agent owned.

Required review:

- Keep URLs, metadata, navigation targets, location/search state, loading order, storage behavior, UI output, and error/fallback messages unchanged.
- Extract private presentational sections only when resulting markup is byte-for-byte equivalent in rendered DOM snapshots.
- Do not change auth behavior, persistence behavior, wipe semantics, or data mutation ordering.

### Workstream 5: tests, scripts, types, configuration, and docs

Required review:

- Remove test-only unused imports and parameters without weakening assertions.
- Replace tests that reimplement production logic only when a direct production invocation can assert the identical behavior.
- Do not update tests to bless a changed runtime result.
- Parameterize hard-coded script output paths while retaining defaults and generated output semantics; this is allowed only if current invocations remain equivalent.
- Update architecture/testing documentation to match the final verified tree and actual counts.
- Do not add a linter or formatter. Run TypeScript strict-unused checks and repository analysis scripts instead.

### Main-agent integration ownership

The main agent alone owns edits to:

- `package.json` and `package-lock.json`
- `app/routes.ts`
- `app/root.tsx`
- cross-feature type declarations
- CI and build configuration
- any shared helper introduced after duplicate-semantics review

Subagent changes are reviewed and integrated one workstream at a time, with a verification gate between integrations.

## Dead-Code Policy

### Whole-file deletion candidates

Delete after a final reference scan confirms the Phase 1 result:

- `app/components/Details.tsx`
- `app/components/ResumeCard.tsx`
- `app/components/Summary.tsx`
- `app/components/ATS.tsx` because it is test-only and absent from the runtime graph
- `app/components/ScoreCircle.tsx` because its only runtime importer is the dead `ResumeCard`
- tests whose sole subject is one of those deleted components; remove only the affected cases, not unrelated assertions in a shared test file

The test count may decrease only by the exactly documented cases that exclusively covered deleted runtime-dead components. Every remaining test must pass.

### Declaration deletion candidates

Delete only after reference-aware verification:

- `resumes`
- `StarRewriterFormat`
- `KeywordGapFormat`
- `CoverLetterFormat`
- `InterviewPrepFormat`
- `CopilotResponseFormat`
- `CopilotTurnResult`
- `TabDefinition.isM4`
- `KeywordGapAnalysis`
- `StarVariantType`
- `SavedStarRewrite`
- `CoverLetterExportFormat`
- duplicate global `PrepareCopilotPromptOptions`
- the commented-out implementation line in the Puter store

Prompt-format constants are removed only if their full literal content is already embedded in the corresponding prompt output and tests prove no output change.

### CSS and assets

- CSS candidates are deleted only after static search plus before/after visual verification proves they are unused.
- Public assets are retained even when no source reference is found because their URLs are externally addressable behavior.
- The vendored `public/pdf.worker.min.mjs` is retained and excluded from line-by-line style refactoring.

## Naming and Import Conventions

- React components: `PascalCase.tsx`
- Hooks: `useThing.ts`
- Other TypeScript modules: lower camel case `.ts`
- Feature directories: kebab-case
- Demo scripts: lower camel case `.mjs`
- Tests: `<subject>.test.ts(x)`, `<subject>.integration.test.tsx`, or `<subject>.stress.test.ts(x)`
- Cross-directory application imports: `~/path/to/concreteModule`
- Same-directory imports: `./module`
- Type-only dependencies: `import type`
- No new barrels, wildcard exports, compatibility shims, or default/named duplicate export surfaces unless both forms still have owned consumers
- Comments explain invariants or reasons, not line-by-line mechanics

## Git and Workspace Safety

1. Do not use `git add`, `git reset`, `git clean`, `git checkout`, `git stash`, or commit.
2. Capture an exact path/hash/status manifest in the approved temp directory before Phase 2.
3. Preserve the ten existing staged deletions exactly.
4. Treat every untracked application/test/config file as user work and authoritative source.
5. Use explicit file moves; never recreate the repository from `HEAD`.
6. Review `git status --porcelain=v1 -uall` after every batch for unexpected losses.
7. Generated build, type, coverage, screenshot, and graph artifacts remain outside Git or under already ignored paths.

## Verification Strategy

### Per move batch

- file manifest reconciliation
- unresolved-import scan
- import-cycle scan
- `npm run typecheck`
- targeted tests for moved modules

### Per Phase 3 workstream

- focused tests for owned files
- strict unused diagnostics
- diff review for strings, JSX, classes, prompts, keys, and API calls
- `npm run typecheck`

### Final QA

1. Review the complete diff, including deletions and untracked destinations.
2. Confirm every baseline source file has a move, edit, intentional deletion, or reviewed-unchanged disposition.
3. Run `npm run typecheck`.
4. Run the full test suite.
5. Run coverage and compare covered-module inventory and percentages, allowing only documented dead-test removal effects.
6. Run the production build.
7. Run `npm audit` and `npm audit --omit=dev`.
8. Run strict unused, unresolved-import, import-cycle, debug-log, secret, and dead-file scans.
9. Validate all routes in the production server.
10. Compare before/after screenshots at mobile, tablet, and desktop widths using existing Playwright tooling, with captures stored outside the repository.
11. Confirm no missing asset requests or browser console errors.
12. Confirm the pre-existing staged deletions are unchanged and no new changes were staged.

There is no lint result to report because no linter exists and no dependency may be added without approval. The final report must state this explicitly rather than describing TypeScript as a linter.

## Known Defects Intentionally Preserved

The following were identified during audit but are outside this behavior-preserving refactor:

- stale resume navigation state can overwrite newer KV data;
- interview persistence failure can replace valid AI output with fallback questions;
- wipe and dashboard deletion have partial-failure/idempotency risks;
- profile can report an undefined Puter write as success;
- PDF page processing is unbounded and does not destroy the PDF document;
- special-symbol keyword matching produces false negatives;
- two ATS checklist items are hard-coded as passed;
- copilot history can remain stale for empty or same-length replacements;
- mobile off-home marketing anchors can target the wrong document;
- security documentation overstates CSP implementation.

Changing these would violate the requirement to preserve behavior. They remain separately actionable product defects.

## Acceptance Criteria

The work is complete only when:

1. The final tree matches the approved architecture with no obsolete-path shims or barrels.
2. Every internal import resolves and no cycle is introduced.
3. Every repository-owned source/test/config/script/style/doc file is accounted for.
4. Only reference-proven dead code and its exclusive tests are deleted.
5. Routes, UI, prompts, storage contracts, SDK calls, and runtime behavior remain unchanged.
6. Typecheck, all remaining tests, production build, coverage, and both npm audits pass.
7. Production route and visual smoke checks show no missing assets, console errors, or visual changes.
8. No dependency is added.
9. No existing work is staged, reverted, discarded, or committed.
10. The final report lists the new structure, every deletion, major mechanical refactor, verification evidence, linting absence, and known defects intentionally left unchanged.
