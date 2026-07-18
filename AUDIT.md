# InsightFlow Recovery and Deployment Audit

## Current Architecture

InsightFlow is a React, TypeScript, Vite, and Express application for AI-assisted business intelligence. The frontend handles upload, profiling, dashboards, history, settings, and export workflows. The server owns Gemini access through `/api/*` routes so API keys never ship to the browser.

## Verified Application Areas

- Upload supports CSV, JSON, and XLSX files.
- Dashboard renders KPIs, charts, AI Workspace, filters, and transaction review.
- History uses IndexedDB through `localforage` and supports open, rename, duplicate, export, single delete, multi-delete, and clear all.
- Settings supports theme, animation, analysis profile, report format, model display, and language preferences.
- Exports support PDF, DOCX, PNG, CSV, and print.
- Gemini requests are centralized server-side in `src/server/aiService.ts`.
- If Gemini is not configured, the AI endpoints return deterministic local fallback insights instead of breaking the UI.

## Recovery Findings

- The project was restored from backup and rebuilt into a working application structure.
- Fake AI model names were removed from active code paths.
- Excel parsing now uses `read-excel-file` instead of the previously vulnerable `xlsx` package.
- Export reports were corrected to use dataset-derived observations and recommendations rather than hardcoded demo findings.
- Export libraries are dynamically loaded so heavy PDF/DOCX/PNG dependencies do not block the normal dashboard bundle.

## Deployment Readiness

- Local development command: `npm run dev`
- Production build command: `npm run build`
- Production start command: `npm start`
- Render blueprint: `render.yaml`
- Required production environment variable: `GEMINI_API_KEY`
- Optional production environment variable: `GEMINI_MODEL`

## Known Constraints

- GitHub Pages alone is not the recommended production host because InsightFlow needs a server for secure Gemini API calls.
- GitHub should be used for source hosting. Render should be used for the deployed web service.
- Very large datasets can still make browser-side parsing and rendering expensive; a Web Worker parser is the next scale upgrade.

## Latest Verification

- TypeScript check: passing.
- Production build: passing.
- npm audit at moderate severity: passing with zero vulnerabilities.
- Local server: running on `http://localhost:3000`.
