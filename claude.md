# 🐄 moo - React + Convex Autograding System Guidelines

Purpose: This file is the single source of truth for how Claude should scaffold, implement, and iterate on the **moo** autograding application. Follow it exactly unless instructed otherwise in a specific task.

⸻

## 0) Project North Star
	•	**DX**: Fast feedback, type‑safe edge boundaries, minimal global state.
	•	**UX**: Real‑time, optimistic, accessible, mobile‑friendly multi-tenant interface.
	•	**AI**: Gemini autograding agents with strict schemas, observable runs, spend caps.
	•	**Integration**: Secure Google Classroom sync via Apps Script within school accounts.

### Definition of Done (DOD) — a change is "done" only if it includes:
	1.	Types (TypeScript) + runtime validation (Zod) at boundaries.
	2.	Tests (unit for hooks/utils, smoke for pages/components).
	3.	Storybook stories for new UI components.
	4.	Loading/empty/error states and a11y labels.
	5.	Docs in this repo (README updates or in‑file JSDoc).

⸻

## 1) Tech Choices
	•	**Frontend**: React 18, Vite (SPA). Tailwind, Headless UI or shadcn/ui.
	•	**Server**: Convex (queries/mutations/actions/files/vectors). All client <-> server calls go through Convex generated api.
	•	**Integration**: Google Apps Script WebApp (runs inside school Google account for API access).
	•	**AI**: Gemini AI (autograding, rubric feedback), Claude Code (coding assignment evaluation).
	•	**Validation**: Zod. Share schemas across client + Convex + Apps Script.
	•	**Testing**: Vitest + Testing Library. Playwright (optional) for E2E.
	•	**Formatting/Linting**: Prettier + ESLint (react-hooks/exhaustive-deps, @typescript-eslint/no-floating-promises).

Allowed deps (ask before adding others): zod, react-hook-form, @hookform/resolvers, lucide-react, clsx, date-fns, zustand (only for ephemeral UI), usehooks-ts (optional), react-aria (optional), recharts (optional for charts).

Banned patterns: untyped JSON at boundaries, secrets in client, ad‑hoc fetch calls to 3rd parties from client, giant components (>200 LOC), side effects in render.

⸻

## 2) Repository Layout (feature‑first, autograding‑specific)

```
src/
  app/                       # app shell: providers, routing, layout
    providers/               # Convex, theme, query cache
    routes/                  # route registrations
  features/
    auth/                    # Google OAuth, role-based access
      components/
      hooks/
      routes/
      services/
      types.ts
      index.ts
    classrooms/              # Google Classroom management
      components/
      hooks/
      routes/
      services/
      types.ts
      index.ts
    grading/                 # Autograding workflows
      components/
      hooks/
      routes/
      services/
      types.ts
      index.ts
    assignments/             # Assignment management
      components/
      hooks/
      routes/
      services/
      types.ts
      index.ts
    agents/                  # AI grading agents
      components/
      hooks/
      routes/
      services/
      types.ts
      index.ts
  shared/
    components/              # design system (Button, Input, Dialog, etc.)
    hooks/                   # generic hooks (useLocalStorage, useUndo)
    utils/                   # formatters, invariant(), cn()
  server/
    api/                     # thin client wrappers if needed
    schemas/                 # zod schemas shared with Convex
  styles/                    # tailwind.css, tokens
convex/
  schema.ts                  # tables and indexes
  auth.ts                    # auth helpers
  queries/*.ts
  mutations/*.ts
  actions/*.ts               # long/IO work, AI tools, classroom sync
  http/*.ts                  # http endpoints (if any)
  lib/zod.ts                 # shared zod helpers
  types.ts                   # shared types
appscript/                   # Google Apps Script integration
  Code.gs                    # Main integration logic
  schemas.gs                 # Data validation schemas
  webapp/                    # Configuration interface
tests/                       # E2E and integration tests
  e2e/                      # Playwright tests
  integration/              # Cross-system tests
.storybook/
.github/
  pull_request_template.md
```

Rule: every features/<name> folder should be shippable in isolation (components + hooks + routes + services).

⸻

## 3) React Mental Model & Hooks

Core idea: UI is a pure function of state. Keep state minimal, colocated, and derived when possible.

Hooks you will use and how:
	•	useState — local UI state only (inputs, toggles).
	•	useEffect(fn, deps) — subscribe/fetch/imperative DOM; never branch hook calls; handle cleanup.
	•	useMemo(factory, deps) — cache heavy derived values; don't prematurely optimize.
	•	useCallback(fn, deps) — stable callbacks for memoized children.
	•	useRef — persistent mutable cell or DOM ref; never for critical app state.
	•	useReducer — complex local workflows (forms, drag‑drop) with event objects.
	•	useContext — small global config (theme, auth, settings). Avoid for feature data.

Rules of Hooks: call at top-level; exhaustive deps on; guard inside effects, not around hook calls.

### Custom hooks pattern:

```typescript
// features/grading/hooks/useAssignmentGrading.ts
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

export function useAssignmentGrading(assignmentId: string) {
  const assignment = useQuery(api.assignments.get, { assignmentId });
  const submissions = useQuery(api.submissions.listByAssignment, { assignmentId }) ?? [];
  const gradeSubmission = useMutation(api.grading.gradeSubmission);
  const [isGrading, setIsGrading] = useState(false);

  async function runAutograding(submissionId: string) {
    setIsGrading(true);
    try {
      await gradeSubmission({ submissionId, assignmentId });
    } finally {
      setIsGrading(false);
    }
  }

  return { assignment, submissions, runAutograding, isGrading };
}
```

⸻

## 4) Convex Golden Path (Autograding-Specific)

### Schemas & indexes
	•	Keep documents small, index common access paths (byTeacher, byStudent, byAssignment, byStatus).
	•	Validate all inputs with Zod inside queries/mutations/actions.

### Queries/Mutations/Actions
	•	useQuery(api.assignments.list, args) for reactive reads. undefined = loading, then array/object.
	•	useMutation(api.grading.updateGrade) for writes. Prefer optimistic UI + reconciliation.
	•	useAction(api.agents.runAutograding) for long/IO/AI calls; make them idempotent.

### Auth & authorization
	•	Enforce per‑doc checks server‑side; never trust client. Return minimal fields.
	•	Role-based access: teachers see all submissions, students see only their own.

### Files & vectors
	•	Store file IDs + metadata in docs; stream via Convex files API.
	•	For assignment attachments: chunk → embed → store vector IDs; keep provenance metadata.

### Observability
	•	Time actions, store token usage and cost in grading_runs table. Add /admin dashboard page.

⸻

## 5) Autograding System Architecture

### Core Tables
	•	**classrooms** — teacherId, courseId (Google), courseName, createdAt, syncedAt
	•	**assignments** — classroomId, assignmentId (Google), title, description, dueDate, rubric, createdAt
	•	**submissions** — assignmentId, studentId, content, status, grade, feedback, gradedAt, createdAt
	•	**students** — classroomId, studentId (Google), name, email, role ("teacher"|"student")
	•	**grading_runs** — submissionId, step, status (queued|running|succeeded|failed), attempt, lastError, cost, tokens
	•	**artifacts** — fileId/vectorId, kind, metadata

### System Flow

1. **Data Extraction (Apps Script)**
   - Apps Script WebApp runs inside school Google account
   - Pulls data from Google Classroom and Google Forms (quizzes, assignments, student submissions)
   - Normalizes to strict schema (assignments, questions, submissions, metadata)
   - **Schema validation** ensures data integrity at the boundary

2. **Sync to Backend (Convex)**
   - Apps Script calls Convex functions with validated schema data
   - Convex updates database with latest classrooms, assignments, and submissions
   - **Real-time sync** ensures React app stays updated automatically
   - All mutations use strict TypeScript schemas from Convex

3. **Teacher UI (React)**
   - Teachers log in and view their classrooms and assignments
   - Submissions displayed in organized, responsive TailwindCSS interface
   - Options to run AI autograding (Gemini AI) and generate rubric-based feedback
   - Teachers can override grades and add comments
   - **Role-based access control** ensures teacher-only features

4. **Student UI (React)**
   - Students log in to see their classrooms and assignments
   - View grading results, rubric feedback, and teacher comments
   - **Multi-tenant structure** ensures role-based access (teacher vs student)
   - **Responsive design** works on all devices

### Grading Agent Design
	•	Versioned name: gradeAssignment_v1.
	•	Strict Zod schemas for input/output.
	•	Small, composable tools: fetch rubric, analyze response, calculate score, generate feedback.
	•	Deterministic outputs with confidence scores.

Example grading action:

```typescript
// convex/actions/grading/gradeSubmission_v1.ts
import { v } from "convex/values";
import { action } from "convex/server";
import { GradingInputZ, GradingOutputZ } from "@/server/schemas/grading";

export const gradeSubmission_v1 = action({
  args: { submissionId: v.id("submissions"), rubricId: v.id("rubrics") },
  handler: async (ctx, { submissionId, rubricId }) => {
    const submission = await ctx.db.get(submissionId);
    const rubric = await ctx.db.get(rubricId);

    if (!submission || !rubric) {
      return { ok: false, error: { code: "NOT_FOUND", message: "submission or rubric" } };
    }

    // Gemini AI grading logic here
    const gradingResult = await callGeminiAI({
      submission: submission.content,
      rubric: rubric.criteria,
    });

    const validated = GradingOutputZ.parse(gradingResult);
    return { ok: true, data: validated };
  }
});
```

### AI Integration Contracts

**Gemini AI Grading**
- Input: Student responses with question schema
- Processing: AI analysis with rubric validation
- Output: Structured feedback with confidence scores

**Prompt Contract (system)**
```
You are an autograding agent that evaluates student submissions against provided rubrics.
Return JSON that matches the grading schema exactly.
Include specific feedback for each rubric criterion.
Assign confidence scores (0-100) for each grade component.
If unclear, mark for human review rather than guessing.
```

### Spend & safety
	•	Per‑teacher daily cap (tokens and $). Hard stop + friendly UI notice when exceeded.
	•	Rate‑limit concurrent grading runs per classroom.
	•	Log model, tokens in/out, cost; surface in UI.

⸻

## 6) UI Conventions (Multi-tenant)

### Design system
	•	Buttons: primary/secondary/ghost; Inputs: text/textarea/select; Dialog/Sheet/Dropdown; Tooltip; Toast.
	•	All components a11y labeled, keyboard navigable.

### Containers vs Presentational
	•	Containers fetch and pass props; presentation components are pure and state‑light.

### Forms
	•	react-hook-form + Zod resolver. Show inline errors. Disable submit while pending.

### Routing
	•	SPA: Vite + React Router. Keep feature routes colocated under features/*/routes.
	•	Routes: /teacher/classrooms, /teacher/assignments/:id, /student/assignments, /student/grades

### States
	•	Always handle loading/empty/error. Show skeletons or spinners; avoid layout shift.
	•	Multi-tenant: Teacher and Student interfaces with shared components but different data access.

⸻

## 7) Performance
	•	Virtualize long lists (assignment submissions, student rosters).
	•	Code split per route (lazy, Suspense).
	•	Memoize only around hot paths; measure before optimizing.

⸻

## 8) Testing Checklist (Autograding-Specific)
	•	Hooks: unit tests (init, transitions, edge cases, error states).
	•	Components: render + a11y + events; include at least one story per state.
	•	Server: action unit tests (happy, error, idempotency).
	•	Integration: Apps Script → Convex sync workflows.
	•	E2E: Complete teacher grading workflow, student grade viewing.

Minimal examples to generate:
	•	features/grading/hooks/useAssignmentGrading.test.ts
	•	convex/actions/grading/gradeSubmission_v1.test.ts
	•	tests/e2e/teacher-grading-workflow.spec.ts

⸻

## 9) PR Template (use this for all PRs)

```markdown
## Summary
- What changed? Why?

## Screenshots / Videos
- [ ] Added to PR

## Acceptance Criteria
- [ ] Types + Zod validation at boundaries
- [ ] Loading/empty/error/a11y covered
- [ ] Tests added or updated
- [ ] Stories added/updated
- [ ] Docs updated (README or JSDoc)

## Autograding-Specific
- [ ] Multi-tenant access tested (teacher vs student views)
- [ ] Google Classroom sync validated
- [ ] AI grading cost/token usage logged
- [ ] Schema validation at Apps Script boundary

## Risk & Rollout
- [ ] Backward compatible
- [ ] Requires data migration? If yes, include script/plan
```

⸻

## 10) Initial Skeleton (First Features)

### User stories
	1.	Teacher creates classroom connection via Apps Script.
	2.	System syncs Google Classroom assignments and students.
	3.	Teacher runs autograding on student submissions.
	4.	Students view their grades and feedback.

### Files to scaffold

```
convex/schema.ts
convex/queries/classrooms.ts
convex/queries/assignments.ts
convex/queries/submissions.ts
convex/mutations/classrooms.ts
convex/mutations/grading.ts
convex/actions/sync/classroomSync.ts
convex/actions/grading/gradeSubmission_v1.ts
src/server/schemas/classroom.ts
src/server/schemas/assignment.ts
src/server/schemas/grading.ts
src/features/classrooms/hooks/useClassrooms.ts
src/features/grading/hooks/useAssignmentGrading.ts
src/features/classrooms/components/ClassroomList.tsx
src/features/grading/components/GradingPanel.tsx
src/features/classrooms/routes/ClassroomRoute.tsx
src/features/grading/routes/GradingRoute.tsx
src/shared/components/{Button,Input,Card,Dialog}.tsx
src/app/providers/ConvexProvider.tsx
src/app/routes.tsx
appscript/Code.gs
appscript/schemas.gs
```

### Example Zod schemas

```typescript
// src/server/schemas/assignment.ts
import { z } from "zod";

export const Assignment = z.object({
  _id: z.string(),
  classroomId: z.string(),
  assignmentId: z.string(), // Google Classroom ID
  title: z.string(),
  description: z.string().optional(),
  dueDate: z.number().optional(),
  rubric: z.array(z.object({
    criterion: z.string(),
    maxPoints: z.number(),
    description: z.string(),
  })).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Assignment = z.infer<typeof Assignment>;

// src/server/schemas/grading.ts
export const GradingResult = z.object({
  submissionId: z.string(),
  totalScore: z.number(),
  maxScore: z.number(),
  feedback: z.string(),
  rubricScores: z.array(z.object({
    criterion: z.string(),
    score: z.number(),
    maxScore: z.number(),
    feedback: z.string(),
    confidence: z.number().min(0).max(100),
  })),
  gradedAt: z.number(),
  gradedBy: z.enum(["ai", "human"]),
  reviewRequired: z.boolean(),
});

export type GradingResult = z.infer<typeof GradingResult>;
```

⸻

## 11) Commands & Scripts

```bash
# Dev
pnpm i
pnpm dev            # Vite frontend + Convex backend
npx convex dev      # Convex backend only
pnpm dev:frontend   # Frontend only

# Quality gates
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration
pnpm test:e2e

# Storybook
pnpm storybook

# Schema validation
pnpm schema:validate   # Validate all Zod schemas
```

Add pre‑push hook to run: typecheck, lint, test.

⸻

## 12) Guardrails When Building Autograding Features
	•	Always generate file tree first with TODOs and explicit responsibilities.
	•	Start with schemas (Zod) → database (Convex) → components (React).
	•	Justify any new dependency; update this file if approved.
	•	No secrets in client. Use Convex environment variables and Actions for external APIs.
	•	Implement kill‑switches and spend caps for AI grading per teacher and global.
	•	Test multi-tenant access patterns thoroughly.
	•	Prefer small PRs with complete feature slices.

⸻

## 13) Zod vs Convex v — Project Policy

Principle: Use Zod at boundaries (forms, Apps Script sync, AI I/O) and for rich invariants; use Convex v for database schemas and function signatures to preserve codegen and Convex-specific types (v.id, v.bytes, etc.). Keep a single TS type inferred from Zod for app-wide typing.

Required practices:
	•	DB truth: Write tables and indexes with v in convex/schema.ts.
	•	Function args: Define args with v.*; optionally also parse with Zod inside the handler for extra rules/coercions.
	•	Shared domain types: Define Zod schemas in src/server/schemas/* without Convex system fields. Export type T = z.infer<typeof TZ>.
	•	AI/tool contracts: Version Zod I/O schemas: gradeSubmission_v1_inputZ, gradeSubmission_v1_outputZ.
	•	Apps Script boundary: Validate all data with Zod before sending to Convex.
	•	No drift: Add a unit test that round-trips a canonical sample through Zod and inserts into Convex.

⸻

## 14) zod-boundaries.ts (drop-in helper)

Put this at src/shared/utils/zod-boundaries.ts and import where needed.

```typescript
import { z, ZodError } from "zod";

export type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string; details?: ZodError };

export function safeParse<T>(schema: z.ZodType<T>, input: unknown): ParseResult<T> {
  const r = schema.safeParse(input);
  return r.success ? { ok: true, data: r.data } : { ok: false, error: formatZodError(r.error), details: r.error };
}

export function safeParseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new Error(formatZodError(r.error));
  return r.data;
}

export const asEnum = <T extends readonly string[]>(values: T) => z.enum(values as unknown as [T[number], ...T[number][]]);

export const coerceDateMs = z.preprocess((v) => {
  if (v instanceof Date) return v.getTime();
  const n = typeof v === "string" ? Date.parse(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
}, z.number().int().nonnegative());

export function formatZodError(err: ZodError): string {
  return err.issues.map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`).join("; ");
}
```

⸻

## 15) Production Deployment & Monitoring

### Security & Compliance
- **Google OAuth**: School domain restrictions, role-based access control
- **SOC 2 compliant**: Google Workspace integration within school policies
- **Data privacy**: Student data never leaves school-approved systems

### Performance & Scale
- **Real-time grading**: Handle 1000+ concurrent students
- **Cost monitoring**: Per-teacher AI spending caps and usage dashboards
- **Error tracking**: Comprehensive logging with schema validation errors

### Monitoring Dashboard (/admin)
- Live grading status and queue depth
- Token usage and cost per teacher/classroom
- Schema validation error rates
- Apps Script sync success/failure rates

---

Built with ❤️ using [Convex](https://convex.dev) - Schema-first, Test-driven, Production-ready Autograding