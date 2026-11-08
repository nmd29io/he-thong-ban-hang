# Repository instructions

This repository is a pnpm workspace for a Vite + React + TypeScript POS and store-operations app backed by Supabase. The app is intentionally split between a browser client in `web/` and server-side database logic in `supabase/`.

## Build, test, and lint commands

Run most commands from the repository root:

- `pnpm install` — install workspace dependencies.
- `pnpm dev` — starts the Vite app in `web/`.
- `pnpm build` — runs the web TypeScript build and Vite production build.
- `pnpm lint` — runs Oxlint on the web app.
- `supabase start` — starts the local Supabase stack.
- `supabase migration up --local` — applies local schema migrations.
- `supabase functions serve` — serves Edge Functions locally in a second terminal.
- `supabase test db --local` — runs the local pgTAP database suite.
- `supabase test db --local supabase/tests/sales_mvp.sql` — runs the single checked-in SQL test file for the sales MVP.

There is no JavaScript unit test script; the checked-in database test is the targeted validation path for business logic.

## Architecture

- `web/` is the single React 19 + TypeScript app for POS, inventory, customer, report, and member-management flows. `web/src/App.tsx` composes auth, selected store/warehouse, role-based screens, and domain hooks; screens are state-driven rather than URL-routed.
- `web/src/hooks/` contains data fetching and business operations; `useStoreData` is the main TanStack Query aggregation point for products, balances, orders, customers, reports, and recommendations. `web/src/components/views/` renders the UI screens and view-specific actions.
- `web/src/lib/supabase.ts` is the browser Supabase client and only uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. `database.types.ts` contains DB-generated types and `types.ts` contains app/domain types.
- `supabase/migrations/` is the source of truth for PostgreSQL schema, RLS policies, and RPC logic. Browser reads and the permitted CRUD paths use Supabase Data API/RLS.
- `supabase/functions/` contains server-side Edge Functions used for sensitive flows: `create-order` reserves stock and creates sales orders; `manage-operations` handles inventory movements, payments, completion and cancellation; `manage-members` is the member/role management path.
- The database enforces transactional stock/payment rules and idempotency; do not bypass these flows with direct table writes when the requirement is covered by an existing RPC/Edge Function.
- This repo implements a POS/admin system rather than an online storefront. See `web/README.md` for the project scope and deployment notes.

## Key conventions and repository-specific rules

- Treat browser-only role checks as UI checks only. Authorization must still be enforced in Edge Functions, RLS, or RPCs; derive the actor from authenticated claims instead of trusting client-supplied IDs.
- Keep order, payment, and stock mutations on the existing Edge Function/RPC paths. Preserve transaction boundaries, idempotency keys, stock reservations, and the append-only inventory ledger.
- Parse Edge Function request JSON as `unknown` and validate its shape and numeric ranges before use. Return explicit error messages and check Supabase errors before declaring success.
- Make database changes through a new migration, then inspect existing migrations, RLS, and RPC callers to confirm impact before pushing to hosted environments. Review `supabase db push --dry-run` before any hosted deployment.
- Keep local CLI state and `.env.local` files out of Git. Public frontend environment variables are build-time config only; keep privileged credentials server-side.
- For Vercel deployment, keep the repo root as the project root and preserve the SPA rewrite configuration in `vercel.json`; Vite output is `web/dist`.
- Prefer the existing `seed:admin` script for initial owner setup when needed: `pnpm --filter web seed:admin -- admin@tenant.example.com`.
- This project relies on a small number of carefully designed permission presets and membership checks; do not invent bypasses in the frontend.

## Local environment notes

- Use `web/.env.local` for the browser client values (`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`). Do not add service-role or secret keys to `VITE_*` values or to tracked code.
- After changing environment variables, restart the dev server (`pnpm dev`).
- If auth is involved in local setup, configure Supabase Auth redirect URLs and Site URL for the app’s local and production domains; use the public publishable key only in the UI.

## Useful context for future Copilot sessions

- The repository is not a generic CRUD app: business invariants are enforced in Postgres and Edge Functions, and the frontend is presentation + orchestration.
- Most data reads are through React Query and named hooks; follow that pattern when adding new screens or domain data loads.
- Any change affecting stock, payments, or order lifecycle should be reviewed against the existing migration/RPC/Edge Function contracts before being implemented directly in the browser.
