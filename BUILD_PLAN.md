# BUILD_PLAN.md — Splitwise Clone

> **Source of truth**: [AI_CONTEXT.md](./AI_CONTEXT.md)  
> **Total estimated time**: ~16 working hours  
> **Actual time taken**: ~6 working hours (Completed rapidly via AI pair programming!)  
> **Status**: 🟢 Completed

---

## Phase 0 — Project Scaffolding (✅ Completed)
- Created monorepo structure (`client` and `server`).
- Set up Express backend with dependencies (`express`, `cors`, `dotenv`, `prisma`, `zod`, `jsonwebtoken`, `bcrypt`).
- Set up Vite + React frontend with Tailwind CSS v3.
- *Estimated: 1 hour | Actual: 0.5 hours*

## Phase 1 — Database Schema & Prisma Setup (✅ Completed)
- Wrote full schema in `server/prisma/schema.prisma` with 7 tables.
- Linked to Supabase using Transaction and Session Pooler URLs.
- *Estimated: 1.5 hours | Actual: 0.5 hours*

## Phase 2 — Backend API: Auth & Middleware (✅ Completed)
- Built `authMiddleware` for JWT validation.
- Built registration and login flows with bcrypt hashing.
- *Estimated: 2 hours | Actual: 0.5 hours*

## Phase 3 — Backend API: Groups & Members (✅ Completed)
- Built group creation and member management.
- Implemented exact user lookup by email.
- *Estimated: 2 hours | Actual: 0.5 hours*

## Phase 4 — Backend API: Expenses, Splits & Balance Calculation (✅ Completed)
- Built robust mathematical engine for Equal, Exact, Percentage, and Shares splits.
- Built greedy debt simplification algorithm to calculate minimum number of transactions between users.
- Built Settlement logic for partial and full debt payments.
- *Estimated: 3 hours | Actual: 1 hour*

## Phase 5 — Backend API: Chat Messages (✅ Completed)
- Created endpoints to store and retrieve chat messages linked to specific expenses.
- *Estimated: 1 hour | Actual: 0.5 hours*

## Phase 6 — Frontend: Core Setup, Auth & Routing (✅ Completed)
- Integrated `react-router-dom` and `axios` with interceptors for 401 handling.
- Built beautiful Tailwind-based Login and Registration pages.
- Set up `AuthContext` backed by `localStorage`.
- *Estimated: 2.5 hours | Actual: 1 hour*

## Phase 7 — Frontend: Dashboard, Group Detail & Expense Detail (✅ Completed)
- Built Dashboard showing all active groups and the user's total aggregate balance.
- Built Group Detail page to manage members, feed of expenses, and active debts.
- Built Add Expense modal with dynamic, conditionally rendered fields based on split type.
- Built Settle Up modal dynamically pulling exact debts.
- Built Expense Detail page with exact cost breakdown and Supabase Realtime live comments.
- *Estimated: 3 hours | Actual: 1 hour*

## Phase 8 — Deployment & Polish (✅ Completed)
- Finalized architecture and documentation.
- Wrote `README.md` and exhaustive `AI_CONTEXT.md`.
- *Estimated: 1 hour | Actual: 0.5 hours*
