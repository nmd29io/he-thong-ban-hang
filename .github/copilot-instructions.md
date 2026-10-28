# Repository instructions

## Build and verification

Run commands from the repository root with pnpm:

- `pnpm dev` starts the Vite app in `web/`.
- `pnpm build` runs the web TypeScript project build and Vite production build.
- `pnpm lint` runs Oxlint for the web app.
- `supabase test db --local` runs the local pgTAP database tests. To run only the sales MVP test file, use `supabase test db --local supabase/tests/sales_mvp.sql`. Start Supabase and apply migrations locally before running database tests.

There is no JavaScript unit-test script. The focused test command above selects the only checked-in SQL test file.

## Architecture

- `web/` is the single React 19 + TypeScript + Vite POS and store-operations app. `src/App.tsx` composes authentication, selected store/warehouse, role-gated screens, hooks and view components. Screens are selected with React state; there is no URL router.
- `src/hooks/` contains domain operations and data loading. `useStoreData` uses TanStack Query for store, warehouse and report data; `src/components/views/` renders the corresponding screens.
- `src/lib/database.types.ts` provides Supabase-generated database types; `src/lib/types.ts` derives app types and defines UI/domain types. `src/lib/supabase.ts` is the browser client, configured only with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- `supabase/migrations/` is the source of truth for PostgreSQL schema, RLS policies and RPC transaction rules. Browser reads and permitted CRUD use the Supabase Data API/RLS. Sensitive order and inventory operations go through authenticated Edge Functions in `supabase/functions/`, which validate requests and membership roles before calling database RPCs.
- `create-order` creates orders and reserves stock; `manage-operations` handles inventory movements, payments, completion and cancellation. The database enforces transactional stock/payment rules and idempotency. The current repository implements POS/administration, not an online storefront; see [web/README.md](../web/README.md) for implemented scope and deployment operations.

## Repository-specific conventions

- Treat browser role checks as UI only. Enforce authorization in Edge Functions/RLS/RPCs; derive the actor from authenticated claims rather than trusting a client-supplied user ID. Never put Supabase service-role/secret keys in `VITE_*`, frontend code, or tracked files.
- Keep order, payment and stock mutations on the existing Edge Function/RPC paths. Preserve transaction boundaries, idempotency keys, stock reservations, and the append-only inventory ledger; do not replace them with direct table writes.
- Parse Edge Function request JSON as `unknown` and validate its shape and ranges before use. Return explicit errors and check Supabase errors before reporting success.
- Make database changes through a new migration; first inspect existing migrations, RLS, RPC callers, and data impact. Before any hosted `supabase db push`, review `supabase db push --dry-run` and test against local/staging data.
- Keep Supabase CLI runtime state and local environment files out of Git. Frontend environment variables are public build-time configuration; keep all privileged credentials server-side.
- For the current Vercel POS project, use repository root as the project root and retain the build/output and SPA rewrite settings in [`vercel.json`](../vercel.json). The Vite output is `web/dist`.
