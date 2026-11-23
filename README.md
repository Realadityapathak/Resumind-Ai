# Resumind — AI Resume Analyzer

<div>
  <img alt="React 19" src="https://img.shields.io/badge/React_19-4c84f3?style=for-the-badge&logo=react&logoColor=white">
  <img alt="React Router 7.18.5" src="https://img.shields.io/badge/React_Router_7.18.5-CA4245?style=for-the-badge&logo=react-router&logoColor=white">
  <img alt="Tailwind CSS 4" src="https://img.shields.io/badge/Tailwind_CSS_4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white">
  <img alt="Vite 6.4.6" src="https://img.shields.io/badge/Vite_6.4.6-646CFF?style=for-the-badge&logo=vite&logoColor=white">
  <img alt="Vitest 4.1.12" src="https://img.shields.io/badge/Vitest_4.1.12-6E9F18?style=for-the-badge&logo=vitest&logoColor=white">
</div>

**Resumind** is a commercial-grade, privacy-first resume analyzer and career copilot. It extracts multi-page PDF text, computes multidimensional ATS feedback, compares job-description keywords, rewrites bullets with the STAR method, and generates tailored cover letters and interview preparation.

The app runs in React Router framework mode with server-side rendering enabled. Authentication, file storage, key-value persistence, OCR, and Gemini requests are delegated from the browser to Puter.js; the repository does not contain an app-owned data API or database service.

## Features

- **Puter authentication and storage** — browser-loaded Puter.js provides the user session, cloud files, key-value records, and AI calls.
- **Multi-page PDF processing** — PDF.js extracts text and renders high-DPI page previews, with Puter OCR as a scanned-document fallback.
- **ATS feedback workspace** — overall, ATS, tone, content, structure, and skills feedback share a seven-tab resume workspace.
- **Keyword gap analysis** — compares resume text with a target role and highlights matched and missing terms.
- **STAR bullet rewriting** — produces action-, metrics-, leadership-, and technical-focused alternatives.
- **Cover letters and interview prep** — generates editable role-specific material from the saved resume context.
- **AI copilot** — answers resume questions and links suggestions to workspace actions.
- **Dashboard and profile** — searches, filters, sorts, opens, downloads, and deletes saved evaluations; stores user preferences separately.

## Architecture and stack

| Area | Current implementation |
|---|---|
| UI | React 19.1.0, Tailwind CSS 4.1.11 |
| Framework | React Router 7.18.5 in framework mode, `ssr: true` |
| Build | Vite 6.4.6, TypeScript 5.8.3 in strict mode |
| State | Zustand 5 |
| Browser platform | Puter.js v2 loaded from `https://js.puter.com/v2/` |
| AI model | `google/gemini-2.5-flash` through Puter AI |
| PDF pipeline | `pdfjs-dist` 5.3.93 with the matching vendored worker at `public/pdf.worker.min.mjs` |
| Tests | Vitest 4.1.12, Testing Library, JSDOM |
| Runtime | Node.js `>=24.15.0` |

Feature UI and engines live under `app/features/`; shared UI, services, utilities, hooks, routes, and ambient declarations have separate top-level folders. See [`CODEBASE.md`](CODEBASE.md) for the current tree and boundaries.

AI text is normalized with `cleanJson` and `safeJsonParse`; feature engines check their required response shapes before committing generated data.

## Quick start

### Prerequisites

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) `>=24.15.0`
- npm

### Install and run

```bash
git clone https://github.com/Realadityapathak/AI-Resume-Analyzer.git
cd AI-Resume-Analyzer
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Build and serve the SSR bundle:

```bash
npm run build
npm run start
```

## Verification

```bash
npm test
npm run typecheck
npm run build
```

The hard-cutover baseline contains **39 test files and 541 tests**. These are Vitest suites running in JSDOM, including route-spanning integration scenarios; they are not deployed-browser end-to-end tests. See [`TEST_INFRA.md`](TEST_INFRA.md) for scope and [`TEST_READY.md`](TEST_READY.md) for the current verification snapshot.

No linter or formatter is configured, and there is no `lint` script.

## License

This project is intended for learning and portfolio purposes.
