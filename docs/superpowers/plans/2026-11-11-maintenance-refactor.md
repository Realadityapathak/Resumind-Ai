# Maintenance Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove proven dead code and React import warnings while preserving every existing behavior and rendered interface.

**Architecture:** Apply local, mechanical cleanups only. Preserve exported component props as compatibility contracts, keep the existing PDF loading promise as the singleton/concurrency mechanism, and avoid introducing new abstractions where duplicate markup is not behaviorally identical.

**Tech Stack:** React 19, TypeScript 5.8, React Router 7, Vite 6, Vitest 3

**Spec:** `docs/superpowers/specs/2026-11-11-maintenance-refactor-design.md`

## Global Constraints

- Preserve all existing functionality, UI, responsiveness, routes, auth, Puter data flows, and AI integrations.
- Do not modify tests or add dependencies.
- Keep test-imported legacy components and compatibility shims.
- Do not commit, reset, or discard unrelated working-tree changes.
- Keep edits mechanical and limited to compiler/build-proven cleanup.

## Review Focus

- Compatibility props supplied by current tests must remain accepted; covered by the full typecheck and component suite in Task 3.
- PDF.js concurrent loading must remain guarded by `loadPromise`; covered by `test/unit/pdf2img.test.ts` in Task 3.
- Fullscreen PDF preview behavior and Escape handling must not change; covered by `test/components/PdfPreviewer.test.tsx` in Task 3.
- Auth and route rendering must not change from import rewrites; covered by route/auth suites in Task 3.
- SSR output must not retain unused React default imports; covered by the warning-free production build in Task 3.

---

### Task 1: Remove compiler-proven dead bindings

**Files:**
- Modify: `app/components/workspace/CoverLetterTab.tsx`
- Modify: `app/components/workspace/InterviewPrepTab.tsx`
- Modify: `app/components/workspace/KeywordGapTab.tsx`
- Modify: `app/components/workspace/PdfPreviewer.tsx`
- Modify: `app/components/workspace/StarRewriterTab.tsx`
- Modify: `app/lib/pdf2img.ts`
- Modify: `app/routes/dashboard.tsx`
- Modify: `app/routes/resume.tsx`
- Modify: `app/routes/upload.tsx`
- Modify: `app/routes/wipe.tsx`

**Interfaces:**
- Consumes: Existing exported prop interfaces and route/store APIs.
- Produces: The same exported interfaces and runtime behavior with no unused local bindings.

- [x] **Step 1: Run the strict unused-code compiler check and capture the expected app diagnostics**

Run: `npx tsc --noEmit --noUnusedLocals --noUnusedParameters`
Expected before implementation: diagnostics for the audited unused props, helper parameter, PDF flag, imports, and store bindings.

- [x] **Step 2: Remove only the reported dead bindings**

Keep compatibility props declared in exported interfaces but omit them from function destructuring. Remove `isLoading` and its assignments from `pdf2img.ts`; `loadPromise` remains unchanged.

- [x] **Step 3: Re-run the strict unused-code compiler check**

Run: `npx tsc --noEmit --noUnusedLocals --noUnusedParameters`
Expected: no diagnostic whose path starts with `app/`.

### Task 2: Remove obsolete React default imports

**Files:**
- Modify: `app/routes/profile.tsx`
- Modify: `app/components/Accordion.tsx`
- Modify: `app/components/ScoreBadge.tsx`
- Modify: `app/components/auth/AuthGuard.tsx`
- Modify: `app/components/workspace/AICopilotTab.tsx`
- Modify: `app/components/workspace/CoverLetterTab.tsx`
- Modify: `app/components/workspace/DetailsTab.tsx`
- Modify: `app/components/workspace/InterviewPrepTab.tsx`
- Modify: `app/components/workspace/KeywordGapTab.tsx`
- Modify: `app/components/workspace/OverviewTab.tsx`
- Modify: `app/components/workspace/PdfPreviewer.tsx`
- Modify: `app/components/workspace/StarRewriterTab.tsx`
- Modify: `app/components/workspace/WorkspaceTabs.tsx`

**Interfaces:**
- Consumes: React named hooks and type exports (`FC`, event types, `ReactNode`).
- Produces: Identical components without default React imports in the SSR bundle.

- [x] **Step 1: Run the production build and capture the expected warning**

Run: `npm run build`
Expected before implementation: PASS with an SSR warning that React's `default` import is never used in 14 app files.

- [x] **Step 2: Convert namespace type usage to named type imports**

Use `import type` or inline `type` specifiers while retaining named runtime hook imports. Do not alter component bodies or JSX.

- [x] **Step 3: Confirm no app file imports React's default export**

Run a repository search for `^import React` under `app/`.
Expected: no matches.

### Task 3: Regression verification

**Files:**
- Test: existing `test/` suite only; no test files modified.

**Interfaces:**
- Consumes: Cleaned production modules from Tasks 1 and 2.
- Produces: Verification evidence for behavior, types, and production bundling.

- [x] **Step 1: Run targeted PDF tests**

Run: `npx vitest run test/unit/pdf2img.test.ts test/components/PdfPreviewer.test.tsx`
Expected: PASS.

- [x] **Step 2: Run project typecheck**

Run: `npm run typecheck`
Expected: PASS with zero TypeScript errors.

- [x] **Step 3: Run the complete regression suite**

Run: `npm test`
Expected: 534 tests passed, zero failed.

- [x] **Step 4: Run the production build**

Run: `npm run build`
Expected: PASS with no unused React default-import warning.

- [x] **Step 5: Review the final diff and working-tree scope**

Confirm no tests, dependencies, generated build artifacts, UI strings/classes, or unrelated user files were changed by this pass. Do not commit.
