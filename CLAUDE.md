# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

CASEGOSTO — a single-page management app for a Brazilian family marmitaria (lunch-box restaurant). Handles orders (pedidos), menu (cardápio), inventory/expenses (estoque), finances/bills (financeiro), customers (clientes), daily special (prato do dia), reports, and an AI financial assistant. UI text and domain vocabulary are in Brazilian Portuguese — keep it that way.

Generated and maintained via Lovable. `src/integrations/supabase/client.ts` and `src/integrations/supabase/types.ts` are auto-generated — do not hand-edit them.

## Commands

```bash
npm run dev          # Vite dev server on http://localhost:8080
npm run build        # production build
npm run build:dev    # development-mode build
npm run lint         # eslint over the repo
npm run test         # vitest run (single pass, jsdom)
npm run test:watch   # vitest watch mode
npx vitest run src/test/example.test.ts   # run one test file
```

Package manager is npm (`package-lock.json` is the source of truth; `bun.lock`/`bun.lockb` are also present but npm is used).

Playwright is configured via `lovable-agent-playwright-config` (`playwright.config.ts`) for Lovable's agent harness — there is no project npm script for it.

## Architecture

**Stack:** Vite + React 18 + TypeScript, React Router v6, TanStack Query, Supabase (Postgres + Auth + Edge Functions), Tailwind + shadcn/ui (Radix), `react-hook-form` + `zod`, `sonner` for toasts, `recharts` for charts, `date-fns`.

**Routing & shell** (`src/App.tsx`): all real routes are wrapped in `ProtectedRoute` + `AppLayout`. `/login` (rendered by `src/pages/Auth.tsx`) uses `AuthRoute` (redirects to `/` if already signed in). The catch-all `*` route renders `NotFound` outside the auth shell. Auth state comes from `AuthProvider` in `src/hooks/useAuth.tsx`, which subscribes to `supabase.auth.onAuthStateChange` and exposes `{ session, user, loading, signOut }` via `useAuth()`. Adding a page = create `src/pages/X.tsx`, then register a `<ProtectedRoute><AppLayout><X /></AppLayout></ProtectedRoute>` route.

**Data access pattern:** pages talk to Supabase directly through the `supabase` singleton (`import { supabase } from "@/integrations/supabase/client"`) wrapped in TanStack Query `useQuery`/`useMutation`. There is no separate API/service layer. Conventions to follow (see `src/pages/Pedidos.tsx` as the canonical example):
- Query keys are string arrays like `["orders", dayStart]`, `["orders_haver"]`, `["dashboard"]`.
- Mutations invalidate every related query key in `onSuccess` (e.g. updating an order invalidates `["orders"]`, `["orders_haver"]`, and `["dashboard"]`) — when you add a mutation, trace which lists depend on that data and invalidate all of them.
- Some lists use `refetchInterval` (e.g. orders poll every 10s) for near-real-time updates.
- Relational reads use nested selects, e.g. `orders` with `*, order_items(*, menu_items(name)), order_payments(*)`.

**Database** (`supabase/migrations/`, types in `src/integrations/supabase/types.ts`): tables are `orders`, `order_items`, `order_payments`, `menu_items`, `bills`, `expenses`, `clientes`, `pratos`, `payment_methods`, `profiles`. Orders support split payments via `order_payments` (a "haver" method = store credit/owed). Money is `NUMERIC(10,2)`; `updated_at` is maintained by a shared `update_updated_at_column()` trigger.

**RLS is mixed and mostly permissive.** Core operational tables (`menu_items`, `orders`, `order_items`, …) use `FOR ALL USING (true)` — effectively shared across all authenticated users (single-tenant shop). Some tables (e.g. `bills`) carry a `user_id` and are user-scoped. Check the relevant migration before assuming a table is user-isolated.

**AI assistant** (`supabase/functions/assistente-financeiro/index.ts`): a Deno Supabase Edge Function powering `/assistente`. It loads the shop's bills/menu/expenses/orders, builds a Portuguese system prompt with the real data, and calls the Lovable AI gateway (`ai.gateway.lovable.dev`, model `google/gemini-2.5-flash`) with two tools — `registrar_conta` (insert a bill) and `dar_baixa_conta` (mark a bill paid). It loops up to 4 times to resolve tool calls and returns `{ reply, actions, paid }`. Requires `LOVABLE_API_KEY` in the function env; uses the caller's `Authorization` header so inserts run as the signed-in user.

## Conventions

- Path alias `@/` → `src/` (configured in `vite.config.ts`, `vitest.config.ts`, and tsconfig).
- shadcn/ui primitives live in `src/components/ui/` (generated; `components.json` drives `npx shadcn` additions). App-specific components are in `src/components/` (e.g. `NewOrderDialog`, `PaymentSplits`, `PrintOrderCoupon`, `KgItemFields`).
- Use `uuid()` from `src/lib/uuid.ts` instead of `crypto.randomUUID()` directly — it has a fallback for non-HTTPS / older browser contexts.
- `cn()` from `src/lib/utils.ts` for Tailwind class merging.
- Env vars are Vite-style `VITE_*` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, …) read via `import.meta.env`.
- TypeScript is lenient here: `tsconfig` has `noImplicitAny`/`strictNullChecks` relaxed and eslint disables `@typescript-eslint/no-unused-vars`. Don't fight existing loose typing, but prefer typed code in new files.
