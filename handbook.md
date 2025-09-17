React + Convex AI App Guidelines (handbook for Claude)

Purpose: This file is the single source of truth for how Claude should scaffold, implement, and iterate on a React + Convex application that uses AI agents. Follow it exactly unless instructed otherwise in a specific task.

⸻

0) Project North Star
	•	DX: Fast feedback, type‑safe edge boundaries, minimal global state.
	•	UX: Real‑time, optimistic, accessible, mobile‑friendly.
	•	AI: Tool-using agents with strict schemas, observable runs, spend caps.

Definition of Done (DOD) — a change is “done” only if it includes:
	1.	Types (TypeScript) + runtime validation (Zod) at boundaries.
	2.	Tests (unit for hooks/utils, smoke for pages/components).
	3.	Storybook stories for new UI components.
	4.	Loading/empty/error states and a11y labels.
	5.	Docs in this repo (README updates or in‑file JSDoc).

⸻

1) Tech Choices
	•	Frontend: React 18, Vite (SPA) or Next.js (if SEO needed). Tailwind, Headless UI or shadcn/ui.
	•	Server: Convex (queries/mutations/actions/files/vectors). All client <-> server calls go through Convex generated api.
	•	Validation: Zod. Share schemas across client + Convex.
	•	Testing: Vitest + Testing Library. Playwright (optional) for E2E.
	•	Formatting/Linting: Prettier + ESLint (react-hooks/exhaustive-deps, @typescript-eslint/no-floating-promises).

Allowed deps (ask before adding others): zod, react-hook-form, @hookform/resolvers, lucide-react, clsx, date-fns, zustand (only for ephemeral UI), usehooks-ts (optional), react-aria (optional), recharts (optional for charts).

Banned patterns: untyped JSON at boundaries, secrets in client, ad‑hoc fetch calls to 3rd parties from client, giant components (>200 LOC), side effects in render.

⸻

2) Repository Layout (feature‑first)

src/
  app/                       # app shell: providers, routing, layout
    providers/               # Convex, theme, query cache
    routes/                  # route registrations (or Next.js app/)
  features/
    auth/
      components/
      hooks/
      routes/
      services/
      types.ts
      index.ts
    chat/
    grading/
    agents/
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
  auth.ts                    # auth helpers (if used)
  queries/*.ts
  mutations/*.ts
  actions/*.ts               # long/IO work, AI tools
  http/*.ts                  # http endpoints (if any)
  lib/zod.ts                 # shared zod helpers
  types.ts                   # shared types
.storybook/
.github/
  pull_request_template.md

Rule: every features/<name> folder should be shippable in isolation (components + hooks + routes + services).

⸻

3) React Mental Model & Hooks

Core idea: UI is a pure function of state. Keep state minimal, colocated, and derived when possible.

Hooks you will use and how:
	•	useState — local UI state only (inputs, toggles).
	•	useEffect(fn, deps) — subscribe/fetch/imperative DOM; never branch hook calls; handle cleanup.
	•	useMemo(factory, deps) — cache heavy derived values; don’t prematurely optimize.
	•	useCallback(fn, deps) — stable callbacks for memoized children.
	•	useRef — persistent mutable cell or DOM ref; never for critical app state.
	•	useReducer — complex local workflows (forms, drag‑drop) with event objects.
	•	useContext — small global config (theme, auth, settings). Avoid for feature data.

Rules of Hooks: call at top-level; exhaustive deps on; guard inside effects, not around hook calls.

Custom hooks pattern:

// features/chat/hooks/useMessages.ts
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

export function useMessages(threadId: string) {
  const messages = useQuery(api.messages.list, { threadId }) ?? [];
  const send = useMutation(api.messages.send);
  const [isSending, setSending] = useState(false);

  async function sendMessage(text: string) {
    setSending(true);
    try { await send({ threadId, text }); } finally { setSending(false); }
  }

  return { messages, sendMessage, isSending };
}


⸻

4) Convex Golden Path

Schemas & indexes
	•	Keep documents small, index common access paths (byOwner, byThread, byStatus).
	•	Validate all inputs with Zod inside queries/mutations/actions.

Queries/Mutations/Actions
	•	useQuery(api.foo.get, args) for reactive reads. undefined = loading, then array/object.
	•	useMutation(api.foo.update) for writes. Prefer optimistic UI + reconciliation.
	•	useAction(api.foo.longTask) for long/IO/AI calls; make them idempotent.

Auth & authorization
	•	Enforce per‑doc checks server‑side; never trust client. Return minimal fields.

Files & vectors
	•	Store file IDs + metadata in docs; stream via Convex files API.
	•	For RAG: chunk → embed → store vector IDs; keep provenance metadata.

Observability
	•	Time actions, store token usage and cost in an agent_runs table. Add /admin dashboard page.

⸻

5) Agents: Architecture & Contracts

Tables
	•	threads — ownerId, title, createdAt, summary
	•	messages — threadId, role (“user”|“assistant”|“tool”), content, tokens, costCents, createdAt
	•	agent_runs — threadId, step, status (queued|running|succeeded|failed), attempt, lastError, cost
	•	artifacts — fileId/vectorId, kind, metadata

Tool design
	•	Versioned name: toolName_v1.
	•	Strict Zod schemas for input/output.
	•	Small, composable tools: fetch user, fetch assignment, score rubric, post result.
	•	Deterministic outputs (no freeform blobs unless absolutely needed).

Example tool action

// convex/actions/tools/getProfile_v1.ts
import { v } from "convex/values";
import { action } from "convex/server";
export const getProfile_v1 = action({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return { ok:false, error:{ code:"NOT_FOUND", message:"user" } };
    return { ok:true, data: { name: user.name, plan: user.plan } };
  }
});

Prompt Contract (system)

You are an agent that can call tools. Only use the tools defined below.
Return JSON that matches the provided schemas exactly.
If a tool fails, summarize the error and continue.
Prefer small, composable steps.

Spend & safety
	•	Per‑user daily cap (tokens and $). Hard stop + friendly UI notice when exceeded.
	•	Rate‑limit concurrent runs per user/thread.
	•	Log model, tokens in/out, cost; surface in UI.

⸻

6) UI Conventions

Design system
	•	Buttons: primary/secondary/ghost; Inputs: text/textarea/select; Dialog/Sheet/Dropdown; Tooltip; Toast.
	•	All components a11y labeled, keyboard navigable.

Containers vs Presentational
	•	Containers fetch and pass props; presentation components are pure and state‑light.

Forms
	•	react-hook-form + Zod resolver. Show inline errors. Disable submit while pending.

Routing
	•	SPA: Vite + React Router. For SEO/SSR, use Next.js app router. Keep feature routes colocated under features/*/routes.

States
	•	Always handle loading/empty/error. Show skeletons or spinners; avoid layout shift.

⸻

7) Performance
	•	Virtualize long lists.
	•	Code split per route (lazy, Suspense).
	•	Memoize only around hot paths; measure before optimizing.

⸻

8) Testing Checklist
	•	Hooks: unit tests (init, transitions, edge cases, error states).
	•	Components: render + a11y + events; include at least one story per state.
	•	Server: action unit tests (happy, error, idempotency).

Minimal examples to generate:
	•	features/chat/hooks/useMessages.test.ts
	•	convex/actions/tools/getProfile_v1.test.ts

⸻

9) PR Template (use this for all PRs)

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

## Risk & Rollout
- [ ] Backward compatible
- [ ] Requires data migration? If yes, include script/plan


⸻

10) Initial Skeleton to Generate (first feature)

User stories
	1.	Create a thread; send a message.
	2.	Agent replies using getProfile_v1.
	3.	UI shows per‑message tokens and cost.

Files to scaffold

convex/schema.ts
convex/queries/messages.ts
convex/mutations/messages.ts
convex/actions/agent/run.ts
convex/actions/tools/getProfile_v1.ts
src/server/schemas/message.ts
src/features/chat/hooks/useMessages.ts
src/features/chat/components/ChatPanel.tsx
src/features/chat/routes/ChatRoute.tsx
src/shared/components/{Button,Input,Card,Dialog}.tsx
src/app/providers/ConvexProvider.tsx
src/app/routes.tsx (or Next.js app/)

Example Zod schema

// src/server/schemas/message.ts
import { z } from "zod";
export const Message = z.object({
  _id: z.string(),
  threadId: z.string(),
  role: z.enum(["user","assistant","tool"]),
  content: z.string(),
  tokens: z.number().default(0),
  costCents: z.number().default(0),
  createdAt: z.number(),
});
export type Message = z.infer<typeof Message>;


⸻

11) Commands & Scripts

# Dev
pnpm i
pnpm dev            # Vite/Next
npx convex dev      # Convex local

# Quality gates
pnpm typecheck
pnpm lint
pnpm test

# Storybook
pnpm storybook

Add pre‑push hook to run: typecheck, lint, test.

⸻

12) Guardrails When Letting AI Build
	•	Always generate file tree first with TODOs and explicit responsibilities.
	•	Start with contracts (types + Zod) before components.
	•	Justify any new dependency; update this file if approved.
	•	No secrets in client. Use Convex environment variables and Actions for external APIs.
	•	Implement kill‑switches and caps for AI calls per user and global.
	•	Prefer small PRs (

⸻

13) Zod vs Convex v — Project Policy

Principle: Use Zod at boundaries (forms, URL/webhooks, LLM/tool I/O) and for rich invariants; use Convex v for database schemas and function signatures to preserve codegen and Convex-specific types (v.id, v.bytes, etc.). Keep a single TS type inferred from Zod for app-wide typing.

Required practices
	•	DB truth: Write tables and indexes with v in convex/schema.ts.
	•	Function args: Define args with v.*; optionally also parse with Zod inside the handler for extra rules/coercions.
	•	Shared domain types: Define Zod schemas in src/server/schemas/* without Convex system fields. Export type T = z.infer<typeof TZ>.
	•	LLM/tool contracts: Version Zod I/O schemas: toolName_v1_inputZ, toolName_v1_outputZ.
	•	No drift: Add a unit test that round-trips a canonical sample through Zod and inserts into Convex.

Optional (advanced)

If you want “schema-first”, limit to a convertible subset of Zod (primitives/enums/optionals) and generate v shapes for function args. Keep indexes and v.id() handwritten.

⸻

14) zod-boundaries.ts (drop-in helper)

Put this at src/shared/utils/zod-boundaries.ts and import where needed.

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

Example usage (React form + LLM tool)

// forms
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { safeParse } from "@/shared/utils/zod-boundaries";

const ProfileZ = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  birth: coerceDateMs,
});

type Profile = z.infer<typeof ProfileZ>;

const form = useForm<Profile>({ resolver: zodResolver(ProfileZ) });

// LLM tool output
const ToolOutZ = z.object({ score: z.number().int().min(0).max(100) });
const parsed = safeParse(ToolOutZ, maybeJson);
if (!parsed.ok) return toast.error(parsed.error);

Example usage (Convex mutation)

// keep v for signature, Zod for extra invariants
export const create = mutation({
  args: { userId: v.id("users"), title: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const parsed = AssignmentZ.parse({
      userId: args.userId,
      title: args.title,
      description: args.description,
      createdAt: Date.now(),
    });
    await ctx.db.insert("assignments", { ...parsed, userId: args.userId });
  },
});


⸻

15) CI Guardrail (drift test sketch)

// tests/schema-drift.test.ts
import { expect, test } from "vitest";
import { AssignmentZ } from "@/server/schemas/assignment";

// pseudo: ensure a sample valid domain object maps into Convex insert shape

test("assignment domain shape is insertable", () => {
  const sample = AssignmentZ.parse({
    userId: "users:123", // replace with real Id<"users"> in app code
    title: "Test",
    createdAt: Date.now(),
  });
  expect(sample.title.length).toBeGreaterThan(0);
});

Add more strict checks as your converter/bridge evolves.