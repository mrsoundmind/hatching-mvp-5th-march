---
phase: 14-brain-redesign-autonomy-settings
plan: "01"
subsystem: server
tags: [brain, file-upload, autonomy-settings, schema, multer, pdf-parse, mammoth]
dependency_graph:
  requires: []
  provides:
    - POST /api/projects/:id/brain/upload (multer v2 + text extraction)
    - DELETE /api/projects/:id/brain/documents/:docId
    - server/lib/extractDocumentText.ts (PDF/DOCX/TXT/MD extraction)
    - shared/schema.ts brain uploaded-* doc types
    - shared/schema.ts executionRules.autonomyLevel + inactivityTriggerMinutes
  affects:
    - server/routes/projects.ts (new endpoints + extended Zod schema)
    - shared/schema.ts (extended TypeScript types)
tech_stack:
  added:
    - multer@2.1.1 (multipart file upload, memory storage)
    - pdf-parse@2.4.5 (PDF text extraction via PDFParse class API)
    - mammoth@1.12.0 (DOCX text extraction)
  patterns:
    - TDD (Red-Green on Task 1 — extractDocumentText)
    - multer fileFilter for extension allowlist
    - try/catch returning '' for all extraction errors (graceful degradation)
key_files:
  created:
    - server/lib/extractDocumentText.ts
    - scripts/test-extract-document-text.test.ts
    - scripts/test-document-upload.test.ts
  modified:
    - shared/schema.ts
    - server/routes/projects.ts
    - package.json (multer, pdf-parse, mammoth added)
decisions:
  - Used PDFParse class API (pdf-parse v2.x) instead of default function — v2.x changed from functional to class-based API, required named import
  - multer.memoryStorage() chosen over disk — avoids temp file cleanup, fits 10MB constraint
  - fileFilter rejects non-allowed types at multer level returning INVALID_TYPE error, caught in middleware wrapper and returned as 400
  - extractDocumentText returns '' on any error (try/catch) — safe for all callers
  - inactivityTriggerMinutes validation: min 30, max 480 (30min to 8hr range)
metrics:
  duration: 227s
  completed: "2026-03-26T08:57:37Z"
  tasks: 2
  files: 6
---

# Phase 14 Plan 01: Brain Upload Backend + Autonomy Settings Schema Summary

Backend foundation for brain file upload (PDF/DOCX/TXT/MD with 50k char extraction + 10MB cap), document delete, and extended autonomy settings schema with autonomyLevel dial and inactivityTriggerMinutes.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install packages, create extractDocumentText, write tests | 6330850 | server/lib/extractDocumentText.ts, scripts/test-extract-document-text.test.ts, package.json |
| 2 | Extend schema types + add upload/delete endpoints + Zod schema update | f68ce50 | shared/schema.ts, server/routes/projects.ts, scripts/test-document-upload.test.ts |

## What Was Built

**`server/lib/extractDocumentText.ts`** — Utility with `extractDocumentText(buffer, filename)` that detects file type by extension and extracts plain text:
- `.pdf` via `PDFParse` class (pdf-parse v2 API)
- `.docx` via `mammoth.extractRawText()`
- `.txt` / `.md` via `buffer.toString('utf-8')`
- All paths truncate to `MAX_CHARS = 50_000`
- Any error or unknown extension returns `''`

**`POST /api/projects/:id/brain/upload`** — Accepts `multipart/form-data` with field `document`. Validates extension (PDF/DOCX/TXT/MD), enforces 10MB limit via multer, extracts text, stores as a brain document with `type: "uploaded-{ext}"`.

**`DELETE /api/projects/:id/brain/documents/:docId`** — Filters document out of `brain.documents`, returns 404 if not found.

**Schema extensions** (`shared/schema.ts` + `updateProjectSchema`):
- Brain doc type union extended with `uploaded-pdf | uploaded-docx | uploaded-txt | uploaded-md`
- `executionRules.autonomyLevel?: 'observe' | 'propose' | 'confirm' | 'autonomous'`
- `executionRules.inactivityTriggerMinutes?: number` (int, 30–480)

## Test Results

- 5 extraction unit tests (TXT, MD, truncation, unknown ext, invalid PDF) — all pass
- 15 schema validation tests (autonomyLevel enum, inactivityTriggerMinutes range, uploaded-* doc types) — all pass
- Total: 20 / 20 tests passing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] pdf-parse v2.x changed from default function to named PDFParse class**
- **Found during:** Task 1 (typecheck after writing implementation)
- **Issue:** `import pdfParse from 'pdf-parse'` fails in v2.x — no default export. The new API uses `new PDFParse({ data: Uint8Array })` then `.getText()`
- **Fix:** Changed to `import { PDFParse } from 'pdf-parse'` and updated PDF case to use `new PDFParse({ data: new Uint8Array(buffer) }).getText()`
- **Files modified:** server/lib/extractDocumentText.ts
- **Commit:** f68ce50

### Out-of-Scope Discoveries (Deferred)

**sparkles.tsx missing @tsparticles dependencies** — Pre-existing untracked file. Logged to `deferred-items.md`. No action taken.

## Self-Check: PASSED

- server/lib/extractDocumentText.ts: FOUND
- scripts/test-extract-document-text.test.ts: FOUND
- scripts/test-document-upload.test.ts: FOUND
- commit 6330850: FOUND
- commit f68ce50: FOUND
