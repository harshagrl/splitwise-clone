# BUILD_PLAN.md — Splitwise Clone

> **Source of truth**: [AI_CONTEXT.md](./AI_CONTEXT.md)  
> **Status**: 🟢 Completed

---

## Phase 0 — Project Scaffolding (✅ Completed)
- Created monorepo structure (`client` and `server`).
- Set up Express backend with dependencies (`express`, `cors`, `dotenv`, `prisma`, `zod`, `jsonwebtoken`, `bcrypt`).
- Set up Vite + React frontend with Tailwind CSS v3.
- *Notes*: Completed perfectly as planned.

## Phase 1 — Database Schema & Prisma Setup (✅ Completed)
- Wrote full schema in `server/prisma/schema.prisma` with 7 tables.
- **CRITICAL ISSUE ENCOUNTERED**: Prisma v7 introduced massive changes to how connection pooling works with Supabase. Previously, one URL could be used. In v7, we must configure `DATABASE_URL` to point to the Supabase Transaction Pooler (port 6543) for runtime queries, and `DIRECT_URL` to point to the Session Pooler (port 5432) purely for migrations. We successfully debugged and split these in `.env` and `schema.prisma`.

## Phase 2 — Backend API: Auth & Middleware (✅ Completed)
- Built `authMiddleware` for JWT validation.
- Built registration and login flows with bcrypt hashing.
- *Notes*: Chose custom JWT over Supabase Auth to keep the architectural footprint entirely within Express.

## Phase 3 — Backend API: Groups & Members (✅ Completed)
- Built group creation and member management.
- Implemented exact user lookup by email.
- *Notes*: Decided against email invites to maintain a simpler scope. Users must register first.

## Phase 4 — Backend API: Expenses, Splits & Balance Calculation (✅ Completed)
- Built robust mathematical engine for Equal, Exact, Percentage, and Shares splits.
- Built greedy debt simplification algorithm to calculate minimum number of transactions between users.
- Built Settlement logic for partial and full debt payments.
- *Notes*: The math was surprisingly complex, particularly dealing with `0.01` remainder distributions in percentage and equal splits. We built a robust remainder distributor algorithm to fix rounding errors.

## Phase 5 — Backend API: Chat Messages (✅ Completed)
- Created endpoints to store and retrieve chat messages linked to specific expenses.
- *Notes*: Connected easily via standard Prisma relations.

## Phase 6 — Frontend: Core Setup, Auth & Routing (✅ Completed)
- Integrated `react-router-dom` and `axios` with interceptors for 401 handling.
- Built beautiful Tailwind-based Login and Registration pages.
- Set up `AuthContext` backed by `localStorage`.
- *Notes*: Implemented a persistent navigation bar for better UX across authenticated routes.

## Phase 7 — Frontend: Dashboard, Group Detail & Expense Detail (✅ Completed)
- Built Dashboard showing all active groups and the user's total aggregate balance.
- Built Group Detail page to manage members, feed of expenses, and active debts.
- Built Add Expense modal with dynamic, conditionally rendered fields based on split type.
- Built Settle Up modal dynamically pulling exact debts.
- Built Expense Detail page with exact cost breakdown and Supabase Realtime live comments.
- *Notes*: Supabase Realtime integration worked perfectly by disabling RLS on the `chat_messages` table and listening via the Anon key.

## Phase 8 — UI Overhaul & Deployment Polish (✅ Completed)
- Executed a complete top-to-bottom UI overhaul to match modern SaaS aesthetics.
- Replaced generic styles with `Inter` font, modern responsive card layouts, hover-lift micro-animations, and dynamic pill badges.
- Upgraded the Chat interface to mimic iMessage with proper left/right alignment and bubble styling.
- Wrote exhaustive documentation (`README.md` and `AI_CONTEXT.md`).
