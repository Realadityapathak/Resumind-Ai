# Maintenance Refactor Design

## Goal

Remove verified dead bindings and obsolete React default imports without changing Resumind's behavior, UI, public component contracts, routes, storage format, or responsive layout.

## Scope

- Remove imports, local variables, and destructured values reported unused by TypeScript.
- Keep compatibility-only component props in their exported interfaces because current callers and regression tests still provide them.
- Replace React default imports used only as a type namespace with named value imports and `type` imports.
- Remove the private PDF loader flag that has no reader; retain `loadPromise` as the concurrency guard.
- Simplify `PdfPreviewer`'s private render helper by removing its unused parameter.

## Non-goals

- No route, auth, Puter KV/FS, AI, parsing, persistence, or visual behavior changes.
- No shared page-shell, score-chip, or resume-record abstraction in this pass; those candidates are not exact enough to justify their regression risk.
- No CSS selector deletion because runtime and test-composed class usage cannot be proven dead safely.
- No dependency, test, or test-fixture changes.
- No commits while the checkout contains unrelated user changes.

## Compatibility Strategy

Exported prop interfaces remain source-compatible. Unused compatibility props are accepted but no longer destructured into local bindings. Existing component markup, strings, classes, IDs, and data attributes remain unchanged.

## Verification

1. `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` must report no diagnostics under `app/` (test-only diagnostics may remain because tests are out of scope).
2. `npm run typecheck` must pass.
3. `npm test` must pass all 534 existing tests.
4. `npm run build` must pass without the React default-import warning.
