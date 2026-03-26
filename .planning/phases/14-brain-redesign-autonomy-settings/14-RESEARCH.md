# Phase 14: Brain Redesign + Autonomy Settings — Research

**Researched:** 2026-03-26
**Domain:** File upload (server), document parsing, React drag-and-drop, settings UI (segmented control), work output viewer
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BRAIN-01 | User can upload PDF, DOCX, TXT, and MD files via drag-and-drop (10MB max); content becomes searchable context for Hatches | multer v2.1.1 + pdf-parse v2.4.5 + mammoth v1.12.0; client-side validation before POST; existing `/api/projects/:id/brain/documents` endpoint extended with file parsing |
| BRAIN-02 | Uploaded documents appear as card list with type badge, date, preview, delete | New `DocumentCard` + `DocumentList` components; optimistic delete via TanStack Query; existing project PATCH endpoint; `brain.documents` JSONB already stores doc array |
| BRAIN-03 | Autonomy settings panel: enabled toggle, inactivity trigger, 4-position dial (Observe/Propose/Confirm/Autonomous) | `executionRules` JSONB column already exists; schema needs `autonomyLevel` + `inactivityTriggerMinutes` fields added; PATCH project endpoint supports these via strict Zod schema extension; shadcn Switch + Select already installed |
| BRAIN-04 | Work outputs from background agents browsable via expandable cards | Query existing tasks with `status=completed` + `metadata.hasOutput===true`; shadcn Collapsible already installed; no new endpoint needed |
</phase_requirements>

---

## Summary

Phase 14 is a frontend-heavy phase with a well-scoped backend extension. The existing `brain.documents` JSONB and `executionRules` JSONB columns already cover the data model — the only work is extending them with two new fields (`autonomyLevel` and `inactivityTriggerMinutes`) and adding server-side file parsing. No DB migrations are needed.

The file upload path is the most technically non-trivial part: multer v2.1.1 (v1.x has CVEs, per CLAUDE.md architecture decision) handles multipart on the server; pdf-parse v2.4.5 extracts text from PDFs; mammoth v1.12.0 converts DOCX to plain text. TXT and MD are read directly as UTF-8 strings. Client-side validation (file type + size) happens before any network call.

The autonomy settings UI uses three existing shadcn primitives (Switch, Select, a custom segmented control) and persists changes via a debounced PATCH to the existing project update endpoint. The 4-position autonomy dial is a custom discrete selector — not a Radix Slider — and maps to `'observe' | 'propose' | 'confirm' | 'autonomous'` stored in `executionRules.autonomyLevel`.

Work outputs (BRAIN-04) require no new backend work: filter the existing task list for `status === 'completed'` tasks with `metadata.hasOutput === true`. The shadcn Collapsible renders expandable preview cards.

**Primary recommendation:** Extend multer file-upload endpoint + parse text from each file type server-side before storing as brain document content. All UI components slot into the existing CSS-hide tab infrastructure from Phase 11. New packages: `multer@2.1.1`, `@types/multer@2.1.0`, `pdf-parse@2.4.5`, `mammoth@1.12.0`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| multer | 2.1.1 | Express multipart/form-data file upload middleware | Required by CLAUDE.md architecture decision: v1.x has active CVEs; v2 is the safe choice |
| pdf-parse | 2.4.5 | Extract plain text from PDF buffer | Pure TypeScript, cross-platform, no native deps; works in serverless Node environments |
| mammoth | 1.12.0 | Extract plain text from DOCX buffer | Standard DOCX-to-text library; returns raw text (not HTML) which is what brain documents need |
| shadcn Switch | (installed) | Autonomy enabled toggle | Already installed via `@radix-ui/react-switch`; accessible |
| shadcn Select | (installed) | Inactivity trigger dropdown | Already installed via `@radix-ui/react-select`; accessible |
| shadcn Collapsible | (installed) | Work output expandable cards | Already installed via `@radix-ui/react-collapsible`; accessible |
| Framer Motion | 11.18.2 (installed) | Document card mount/exit animations | Already installed; Phase 11-13 use this pattern consistently |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/multer | 2.1.0 | TypeScript types for multer v2 | Required alongside multer for full type safety |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| multer | formidable, busboy | Multer is the Express standard; formidable has similar API but less Express integration |
| pdf-parse | pdfjs-dist | pdfjs-dist is massive (>3MB), designed for browser rendering not text extraction |
| mammoth | docx | docx is for creating DOCX files, not parsing them |

**Installation:**
```bash
npm install multer@2.1.1 @types/multer@2.1.0 pdf-parse@2.4.5 mammoth@1.12.0
```

**Version verification (confirmed 2026-03-26):**
- `multer`: latest is 2.1.1 (v2 branch — use this, not v1)
- `pdf-parse`: latest is 2.4.5
- `mammoth`: latest is 1.12.0
- `@types/multer`: latest is 2.1.0

---

## Architecture Patterns

### Recommended Project Structure

New files for this phase:

```
client/src/components/sidebar/
├── BrainDocsTab.tsx          # Container: DocumentUploadZone + DocumentList + AutonomySettingsPanel + WorkOutputSection
├── DocumentUploadZone.tsx    # Drag-and-drop target, file validation, upload POST
├── DocumentCard.tsx          # Single document card with type badge + delete
├── AutonomySettingsPanel.tsx # Toggle + inactivity Select + 4-position dial
└── WorkOutputSection.tsx     # Filtered task list with Collapsible cards

server/routes/projects.ts     # Extend: add multer upload endpoint at POST /api/projects/:id/brain/upload
```

No changes to `shared/schema.ts` — `brain.documents` and `executionRules` JSONB columns already exist. The `executionRules` strict Zod schema in `projects.ts` needs `autonomyLevel` and `inactivityTriggerMinutes` fields added.

### Pattern 1: multer v2 File Upload on Express with ESM

The project uses `"type": "module"` (ESM). multer v2 ships as CJS but interops via the default import.

```typescript
// server/routes/projects.ts
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),   // Keep file in memory — no disk write needed
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB hard limit
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.txt', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_TYPE'));
    }
  },
});

app.post(
  '/api/projects/:id/brain/upload',
  upload.single('document'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const text = await extractText(req.file);
    // store text in brain.documents JSONB
  }
);
```

### Pattern 2: Server-Side Text Extraction Per File Type

```typescript
// server/routes/projects.ts (or a separate extractText.ts helper)
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import path from 'path';

async function extractText(file: Express.Multer.File): Promise<string> {
  const ext = path.extname(file.originalname).toLowerCase();

  if (ext === '.pdf') {
    const result = await pdfParse(file.buffer);
    return result.text.slice(0, 50_000); // Match existing brain doc 50k char limit
  }

  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value.slice(0, 50_000);
  }

  // .txt and .md — direct UTF-8 string
  return file.buffer.toString('utf-8').slice(0, 50_000);
}
```

**CRITICAL:** The existing `brainDocSchema` in `projects.ts` has `content: z.string().max(50000)`. Extracted text must be sliced to 50,000 chars before storage. The `type` field for uploaded files should use a new value — see Schema Extension section below.

### Pattern 3: Client-Side Drag-and-Drop Without Extra Libraries

Use native HTML5 drag events + a hidden `<input type="file">`. No `react-dropzone` needed (not installed; adding a new package for this is unnecessary).

```typescript
// DocumentUploadZone.tsx
function DocumentUploadZone({ onUpload }: { onUpload: (file: File) => void }) {
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const validate = (file: File): string | null => {
    const allowed = ['.pdf', '.docx', '.txt', '.md'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) return 'Only PDF, DOCX, TXT, and MD files are supported';
    if (file.size > 10 * 1024 * 1024) return 'File must be under 10MB';
    return null;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const error = validate(file);
    if (error) { setError(error); return; }
    onUpload(file);
  };

  return (
    <div
      role="button"
      aria-label="Upload document — drag and drop or click to browse"
      tabIndex={0}
      onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragOver={(e) => { e.preventDefault(); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      // Styling controlled by isDragging state
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = ''; // reset for re-upload
        }}
      />
    </div>
  );
}
```

### Pattern 4: Autonomy Level Dial (Discrete Segmented Control)

This is NOT a Radix Slider. It is a custom `role="radiogroup"` segmented control — four fixed positions with no sliding animation.

```typescript
const DIAL_POSITIONS = ['observe', 'propose', 'confirm', 'autonomous'] as const;
type AutonomyLevel = typeof DIAL_POSITIONS[number];

function AutonomyDial({ value, onChange }: { value: AutonomyLevel; onChange: (v: AutonomyLevel) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Autonomy level"
      className="grid grid-cols-4 gap-0.5 rounded-lg border border-[var(--hatchin-border-subtle)] bg-[var(--hatchin-surface)] p-0.5"
    >
      {DIAL_POSITIONS.map((pos) => {
        const isActive = value === pos;
        const isAutonomous = pos === 'autonomous';
        return (
          <button
            key={pos}
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(pos)}
            className={`h-8 rounded text-xs font-medium capitalize transition-colors duration-150 ${
              isActive
                ? isAutonomous
                  ? 'bg-[var(--hatchin-green)] text-white'
                  : 'bg-[var(--hatchin-blue)] text-white'
                : 'text-[var(--hatchin-text-muted)] hover:text-[var(--hatchin-text)]'
            }`}
          >
            {pos}
          </button>
        );
      })}
    </div>
  );
}
```

### Pattern 5: Debounced PATCH for Settings Persistence

All settings (toggle, inactivity trigger, autonomy level) persist via a single debounced PATCH to `PATCH /api/projects/:id` — no save button.

```typescript
// Inside AutonomySettingsPanel
const [localSettings, setLocalSettings] = React.useState({
  autonomyEnabled: project.executionRules?.autonomyEnabled ?? false,
  autonomyLevel: project.executionRules?.autonomyLevel ?? 'confirm',
  inactivityTriggerMinutes: project.executionRules?.inactivityTriggerMinutes ?? 120,
});

const debouncedPatch = React.useRef(
  debounce(async (settings: typeof localSettings) => {
    await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ executionRules: settings }),
    });
    queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
  }, 800)
).current;

const handleChange = (key: keyof typeof localSettings, value: unknown) => {
  const next = { ...localSettings, [key]: value };
  setLocalSettings(next);
  debouncedPatch(next);
};
```

**No `lodash` debounce** — implement a simple `debounce` inline or use `useRef` with `clearTimeout`. The project has no lodash installed.

### Pattern 6: Work Output Query (No New Endpoint)

```typescript
// Inside WorkOutputSection
const { data: completedTasks } = useQuery({
  queryKey: ['/api/tasks', `?projectId=${projectId}`],  // MUST match ApprovalsTab queryKey
  queryFn: () => fetch(`/api/tasks?projectId=${projectId}`).then(r => r.json()),
  enabled: !!projectId,
  staleTime: 30_000,
});

const workOutputs = (completedTasks ?? []).filter((t: Task) => {
  const meta = t.metadata as Record<string, unknown>;
  return t.status === 'completed' && meta?.hasOutput === true;
});
```

**Note:** The `metadata.hasOutput` flag is not currently populated by the background executor. The planner should create a task to add this flag in `taskExecutionPipeline.ts` when it stores task output, or the filter can fall back to `status === 'completed'` and display all completed tasks with content in their metadata. Verify with the executor.

### Pattern 7: BrainDocsTab Slot in RightSidebar (CSS-Hide Pattern)

The Phase 11 CSS-hide tab infrastructure already exists in `RightSidebar.tsx`:

```typescript
// RightSidebar.tsx — already has this shell at line 392-396, brain panel is currently empty
{/* Brain & Docs tab panel (CSS-hidden, never unmounted) */}
<div
  style={{ display: activeTab === 'brain' ? 'flex' : 'none' }}
  aria-hidden={activeTab !== 'brain'}
  className="flex-1 flex flex-col overflow-y-auto hide-scrollbar"
>
  {/* REPLACE existing content with: */}
  <BrainDocsTab projectId={activeProject?.id} project={activeProject} />
</div>
```

The brain tab currently contains the old agent/team/project overview content (lines 398+). Phase 14 replaces that content with `<BrainDocsTab>`. The old content (agent profile, core direction fields, etc.) moves into the `BrainDocsTab` below the new document/settings UI, or is removed per the UI spec.

### Anti-Patterns to Avoid

- **Using multer v1.x**: Has active CVEs. Use v2.1.1 only.
- **Storing raw file binary in the database**: Parse to text first, store text string in `brain.documents[].content`. Never store base64 binary blobs — they bloat JSONB and cannot be indexed.
- **Client-side text extraction (PDF.js in browser)**: Too heavy, 3MB+ bundle impact. Parse on server.
- **Adding `react-dropzone`**: Not installed, not needed. Native HTML5 drag events are sufficient for this use case.
- **Using Radix Slider for the autonomy dial**: The dial is discrete (4 fixed positions), not continuous. A segmented control with `role="radiogroup"` is semantically correct.
- **Not slicing extracted text to 50,000 chars**: The existing brain doc schema has a 50k char limit. Unsliced PDFs can easily exceed this.
- **Re-creating the queryKey for tasks**: The ApprovalsTab, RightSidebar, and WorkOutputSection must all use the same TanStack query key `['/api/tasks', '?projectId=...']` for deduplication.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF text extraction | Custom PDF parser | pdf-parse v2.4.5 | PDFs have complex compression, encoding, object trees — extracting text correctly from all PDF variants is a solved problem |
| DOCX text extraction | XML parsing of DOCX internals | mammoth v1.12.0 | DOCX is a ZIP of XML files with complex relationships; mammoth handles all OOXML variants |
| File upload middleware | Raw `req.pipe()` multipart parsing | multer v2.1.1 | Multipart parsing edge cases (boundaries, file encoding, partial uploads) are handled |
| Accessible toggle | Native checkbox | shadcn Switch (already installed) | Radix Switch handles focus, keyboard, ARIA automatically |
| Accessible dropdown | `<select>` | shadcn Select (already installed) | Custom Select has proper keyboard navigation, portal rendering |
| Expandable cards | Manual height animation | shadcn Collapsible (already installed) | Collapsible handles ARIA expanded state and keyboard interaction |

---

## Schema Extension Required

The `executionRules` Zod schema in `server/routes/projects.ts` (line 27-34) currently validates:

```typescript
executionRules: z.object({
  autonomyEnabled: z.boolean().optional(),
  autonomyPaused: z.boolean().optional(),
  inactivityAutonomyEnabled: z.boolean().optional(),
  rules: z.string().optional(),
  taskGraph: z.unknown().optional(),
}).nullable().optional(),
```

Phase 14 needs two new fields added:

```typescript
executionRules: z.object({
  autonomyEnabled: z.boolean().optional(),
  autonomyPaused: z.boolean().optional(),
  inactivityAutonomyEnabled: z.boolean().optional(),
  autonomyLevel: z.enum(['observe', 'propose', 'confirm', 'autonomous']).optional(),  // NEW
  inactivityTriggerMinutes: z.number().int().min(30).max(480).optional(),             // NEW (30min to 8hr range)
  rules: z.string().optional(),
  taskGraph: z.unknown().optional(),
}).nullable().optional(),
```

The `shared/schema.ts` Drizzle type for `executionRules` also needs updating:

```typescript
executionRules: jsonb("execution_rules").$type<{
  autonomyEnabled?: boolean;
  autonomyPaused?: boolean;
  inactivityAutonomyEnabled?: boolean;
  autonomyLevel?: 'observe' | 'propose' | 'confirm' | 'autonomous';  // NEW
  inactivityTriggerMinutes?: number;                                   // NEW
  rules?: string;
  taskGraph?: unknown;
}>().default({}),
```

No `db:push` migration needed — JSONB columns accept new fields without schema migration. The TypeScript type update is required for `npm run typecheck` to pass.

Similarly, the `brain.documents` array type needs a new upload-specific type value. The current type enum is `'idea-development' | 'project-plan' | 'meeting-notes' | 'research'`. Uploaded files need to be typed by file format: add `'uploaded-pdf' | 'uploaded-docx' | 'uploaded-txt' | 'uploaded-md'` to the union. This allows DocumentCard to show the correct type badge color.

---

## New Upload Endpoint

The existing `POST /api/projects/:id/brain/documents` receives JSON body. File uploads need `multipart/form-data`. A new endpoint is required:

```
POST /api/projects/:id/brain/upload
Content-Type: multipart/form-data

Field name: "document" (single file)
```

This endpoint:
1. Applies `upload.single('document')` multer middleware
2. Validates ownership
3. Calls `extractText(req.file)` to get text content
4. Creates a new brain document with `type: 'uploaded-pdf'` etc.
5. Appends to `brain.documents` array in JSONB
6. Returns the updated project

The existing JSON endpoint (`POST /api/projects/:id/brain/documents`) remains for programmatic use (agents adding documents).

Delete endpoint also needed:

```
DELETE /api/projects/:id/brain/documents/:docId
```

This filters the document out of the `brain.documents` array and PATCHes the project.

---

## Common Pitfalls

### Pitfall 1: multer Error Handling in ESM

**What goes wrong:** multer's error callback `cb(new Error('INVALID_TYPE'))` does not trigger Express's error handler automatically. Without an explicit error-handling middleware after the route, the server hangs.

**Why it happens:** multer calls the fileFilter callback with an error, but Express needs an error-handling middleware `(err, req, res, next)` to catch it.

**How to avoid:** Wrap the multer middleware and check for error:

```typescript
app.post('/api/projects/:id/brain/upload', (req, res, next) => {
  upload.single('document')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File must be under 10MB' });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  // handle upload
});
```

**Warning signs:** Route handler never reached after file validation failure.

### Pitfall 2: pdf-parse Test File Side Effect

**What goes wrong:** pdf-parse v1.x (and some v2.x builds) automatically reads a test PDF from `node_modules/pdf-parse/test/data/` on import in test environments, causing errors when that path doesn't exist.

**Why it happens:** pdf-parse's internal test runner is coupled to the import.

**How to avoid:** This is largely fixed in v2.4.5 but to be safe, only import pdf-parse in the route handler (not at module top level) or wrap in try/catch.

**Warning signs:** `ENOENT: no such file or directory, open '.../pdf-parse/test/...'` at startup.

### Pitfall 3: Zod strict() Rejects autonomyLevel

**What goes wrong:** The `updateProjectSchema` uses `.strict()` (line 35 of `projects.ts`). Any field not in the schema causes a 400 validation error.

**Why it happens:** `.strict()` means "reject unknown keys." If `autonomyLevel` or `inactivityTriggerMinutes` are not added to the nested `executionRules` schema, the PATCH silently fails.

**How to avoid:** Add the two new fields to the `executionRules` z.object() within `updateProjectSchema` before wiring the frontend.

**Warning signs:** PATCH returns 400 with Zod validation error mentioning "unrecognized keys."

### Pitfall 4: debounce Without lodash

**What goes wrong:** Without lodash, debounce must be implemented manually. A naive implementation inside the component body creates a new debounce function on every render, defeating the purpose.

**Why it happens:** `const debounced = debounce(fn, 800)` inside a function component re-creates on every render.

**How to avoid:** Use `useRef` to hold the debounce timer:

```typescript
const debounceTimer = React.useRef<ReturnType<typeof setTimeout>>();

const scheduleSave = (settings: Settings) => {
  if (debounceTimer.current) clearTimeout(debounceTimer.current);
  debounceTimer.current = setTimeout(() => save(settings), 800);
};
```

Clean up in `useEffect` return to cancel pending save on unmount.

### Pitfall 5: Brain Tab Still Shows Old Content

**What goes wrong:** `RightSidebar.tsx` (lines 398+) has a large agent/team/project overview block inside the `activeTab === 'brain'` div. Phase 14 must replace or relocate this.

**Why it happens:** The brain tab was the original "everything" panel before the v1.3 tab refactor. The old content was kept in place when tabs were added.

**How to avoid:** The `BrainDocsTab` component should be the sole content of the brain tab panel. The executor must remove or archive the old content (agent profile, core direction textareas, execution rules accordion, progress timeline) when slotting in `BrainDocsTab`. Coordinate with Phase 15 (Polish) if removing old content.

### Pitfall 6: TanStack Query Key Mismatch for Tasks

**What goes wrong:** WorkOutputSection uses a different query key than ApprovalsTab → creates a second fetch instead of sharing the cached result.

**How to avoid:** WorkOutputSection must use `queryKey: ['/api/tasks', '?projectId=${projectId}']` — exactly matching ApprovalsTab and RightSidebar's task query key. Document this constraint in the component comment.

---

## Code Examples

### Text Extraction Helper

```typescript
// server/lib/extractDocumentText.ts
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import path from 'path';

const MAX_CHARS = 50_000;

export async function extractDocumentText(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const ext = path.extname(filename).toLowerCase();

  try {
    if (ext === '.pdf') {
      const result = await pdfParse(buffer);
      return result.text.slice(0, MAX_CHARS);
    }
    if (ext === '.docx') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value.slice(0, MAX_CHARS);
    }
    // .txt and .md
    return buffer.toString('utf-8').slice(0, MAX_CHARS);
  } catch {
    return ''; // Return empty content rather than crashing the upload
  }
}
```

### DocumentCard with Optimistic Delete

```typescript
// client/src/components/sidebar/DocumentCard.tsx
import { motion } from 'framer-motion';
import { FileText, Trash2 } from 'lucide-react';
import { formatDate } from 'date-fns';

interface BrainDoc {
  id: string;
  title: string;
  type: string;
  createdAt: string;
}

function getTypeBadgeStyle(type: string) {
  if (type.includes('pdf')) return 'bg-[var(--hatchin-blue)] text-white';
  if (type.includes('docx')) return 'bg-[var(--hatchin-orange)] text-white';
  if (type.includes('md')) return 'bg-[var(--hatchin-green)] text-white';
  return 'bg-[var(--hatchin-surface-muted)] text-[var(--hatchin-text-muted)]';
}

export function DocumentCard({ doc, onDelete }: { doc: BrainDoc; onDelete: (id: string) => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="flex items-center gap-2 px-3 py-3 rounded-[10px] bg-[var(--hatchin-surface-elevated)] border border-[var(--hatchin-border-subtle)]"
    >
      <FileText className="w-4 h-4 text-[var(--hatchin-text-muted)] shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--hatchin-text-bright)] truncate">{doc.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded uppercase ${getTypeBadgeStyle(doc.type)}`}>
            {doc.type.replace('uploaded-', '')}
          </span>
          <span className="text-xs text-[var(--hatchin-text-muted)]">
            {formatDate(new Date(doc.createdAt), 'MMM d')}
          </span>
        </div>
      </div>
      <button
        aria-label={`Delete ${doc.title}`}
        onClick={() => onDelete(doc.id)}
        className="w-8 h-8 flex items-center justify-center rounded text-[var(--hatchin-text-muted)] hover:text-red-400 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| multer v1.x | multer v2.1.1 | v2 released 2024 | v1 has unpatched CVEs; v2 has identical API, just safer |
| react-dropzone for drag-and-drop | Native HTML5 drag events | Ongoing best practice | Avoids adding a 15KB dependency for a feature that native browser APIs handle well |
| Slider for discrete choices | Segmented control (`role="radiogroup"`) | UX standard | Discrete options should be discrete UI elements; sliders imply continuous values |

**Deprecated/outdated:**
- multer v1.4.x: Has active CVEs — do not install. CLAUDE.md explicitly calls this out.
- Storing uploaded file as base64 in JSONB: Bloats column, prevents indexing, wastes network bandwidth. Always extract text first.

---

## Open Questions

1. **`metadata.hasOutput` flag in task execution pipeline**
   - What we know: The background executor in `taskExecutionPipeline.ts` stores task outputs somewhere but the field name `hasOutput` is not confirmed in the codebase (grep found nothing)
   - What's unclear: Whether completed background tasks currently set any metadata flag the WorkOutputSection can filter on
   - Recommendation: The planner should create a task to audit `taskExecutionPipeline.ts` and either (a) confirm the existing metadata field name, or (b) add `metadata.hasOutput = true` and `metadata.outputText = ...` when a task completes. Without this, BRAIN-04 falls back to showing all `status === 'completed'` tasks.

2. **Old brain tab content disposition**
   - What we know: RightSidebar.tsx lines 398+ contain the old agent/team/project overview (core direction textareas, execution rules accordion, progress timeline) inside the brain tab panel
   - What's unclear: Whether Phase 14 replaces this entirely or incorporates it below the new components
   - Recommendation: Replace entirely — the old content pre-dates the v1.3 tabbed UI and is now in the wrong tab. The UI spec confirms BrainDocsTab is the sole content.

3. **inactivityAutonomyEnabled vs inactivityTriggerMinutes**
   - What we know: The existing `executionRules.inactivityAutonomyEnabled` is a boolean toggle; the backgroundRunner already reads it. The UI spec shows a "Auto-start after" Select with minute values.
   - What's unclear: Whether `inactivityTriggerMinutes` should replace `inactivityAutonomyEnabled` or sit alongside it
   - Recommendation: Keep `inactivityAutonomyEnabled` for backward compatibility with the backgroundRunner. Add `inactivityTriggerMinutes` as an additional field. The backgroundRunner can later be updated to use the minutes value. Set `inactivityAutonomyEnabled = true` when the user selects any inactivity trigger value.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest v4.1.0 |
| Config file | `vitest.config.ts` (exists at project root) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npm run typecheck && npx vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BRAIN-01 | File upload endpoint accepts PDF/DOCX/TXT/MD, rejects other types, enforces 10MB limit | unit | `npx vitest run scripts/test-brain-upload.ts -x` | No — Wave 0 |
| BRAIN-01 | Text extraction returns correct text for each file type | unit | `npx vitest run scripts/test-extract-document-text.ts -x` | No — Wave 0 |
| BRAIN-02 | Document delete endpoint removes correct doc from brain.documents array | unit | (covered in upload test file) | No — Wave 0 |
| BRAIN-03 | executionRules PATCH accepts autonomyLevel and inactivityTriggerMinutes | unit | `npm run typecheck` (Zod schema) | N/A — typecheck |
| BRAIN-04 | Work outputs filter returns only completed tasks with hasOutput flag | unit | (covered in upload test file) | No — Wave 0 |

### Sampling Rate
- Per task commit: `npm run typecheck`
- Per wave merge: `npm run typecheck && npx vitest run`
- Phase gate: Full typecheck green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `scripts/test-brain-upload.ts` — covers BRAIN-01, BRAIN-02: multer middleware, type rejection, size rejection, text extraction routing per extension, delete removes correct doc
- [ ] `scripts/test-extract-document-text.ts` — covers text extraction unit tests with sample PDF buffer, DOCX buffer, TXT string, MD string

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection: `server/routes/projects.ts` (existing endpoints, Zod schema, brain document structure)
- Direct codebase inspection: `shared/schema.ts` (Drizzle types for `brain` and `executionRules` JSONB columns)
- Direct codebase inspection: `server/autonomy/config/policies.ts` (existing `executionRules` field usage)
- Direct codebase inspection: `server/autonomy/background/backgroundRunner.ts` (how `inactivityAutonomyEnabled` is consumed)
- Direct codebase inspection: `client/src/components/sidebar/*.tsx` (Phase 11-13 patterns — CSS-hide, query keys, animation conventions)
- Direct codebase inspection: `client/src/components/RightSidebar.tsx` (brain tab slot location, existing content to replace)
- Direct codebase inspection: `client/src/index.css` (CSS custom properties: `--hatchin-blue`, `--hatchin-green`, `--hatchin-orange`, `--hatchin-border-subtle`, `.skeleton-shimmer`, `.flash-save`, `.hide-scrollbar`)
- Direct codebase inspection: `package.json` (confirmed multer/pdf-parse/mammoth are NOT installed; full dependency list)
- `.planning/phases/14-brain-redesign-autonomy-settings/14-UI-SPEC.md` (UI design contract for this phase)
- `.planning/v1.3-autonomy-visibility-sidebar-revamp.md` (architecture decisions: multer v2.0.2 required, no DB migrations)

### Secondary (MEDIUM confidence)

- npm registry: multer latest v2.1.1 (confirmed 2026-03-26)
- npm registry: pdf-parse latest v2.4.5 (confirmed 2026-03-26)
- npm registry: mammoth latest v1.12.0 (confirmed 2026-03-26)
- npm registry: @types/multer latest v2.1.0 (confirmed 2026-03-26)

### Tertiary (LOW confidence)

- pdf-parse test-file side effect: known community issue with v1.x; assume resolved in v2.4.5 but not confirmed from changelog

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry 2026-03-26; UI components confirmed installed
- Architecture: HIGH — patterns derived directly from Phase 11-13 sidebar codebase; JSONB schema confirmed from source
- Pitfalls: HIGH (multer error handling, Zod strict schema, query key) / MEDIUM (pdf-parse test file side effect — confirmed issue pattern, version fix unconfirmed)

**Research date:** 2026-03-26
**Valid until:** 2026-04-25 (stable libraries; autonomy backend is active development — re-verify backgroundRunner if > 30 days)
