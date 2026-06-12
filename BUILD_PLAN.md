# BUILD_PLAN.md — Splitwise Clone

> **Source of truth**: [AI_CONTEXT.md](./AI_CONTEXT.md)  
> **Status**: 🟢 Completed

---

## 1. Product Research

### How I Studied Splitwise
- Used Splitwise personally and mapped all core user flows manually
- Identified the primary screens: Dashboard, Group Detail, Expense Detail
- Noted the 4 split types: Equal, Exact, Percentage, Shares
- Studied how balance calculation and debt simplification works
- Identified what features are core vs premium/advanced

### What I Learned
- Splitwise's core value is not just splitting — it's minimizing the 
  number of transactions needed to settle a group
- The debt simplification algorithm is the hardest technical piece
- Realtime chat is a lightweight social layer that increases engagement
- Group-scoped and overall balances serve different user needs

### Workflows Identified
1. Register → Login
2. Create group → Invite members by email
3. Add expense → Select split type → Select participants → Submit
4. View group balances → See who owes whom
5. Settle up → Record payment (full or partial)
6. View expense → See split breakdown → Add comment

### Product Assumptions Made
- Users must register before being added to a group (no invite links)
- Only one payer per expense (no split payer)
- Expenses cannot be edited, only deleted
- Currency is INR only
- No payment gateway — settlements are manual records only

---

## 2. Architecture

### Tech Stack
- Frontend: React + Vite + Tailwind CSS v3 + React Router + Axios
- Backend: Node.js + Express + Zod validation
- Database: PostgreSQL via Supabase (free tier)
- ORM: Prisma v7 with @prisma/adapter-pg
- Auth: Custom JWT with bcrypt (no Supabase Auth)
- Realtime: Supabase Realtime JS SDK on chat_messages table
- Deployment: Render (backend) + Vercel (frontend)

### Database Schema Summary
7 tables: users, groups, group_members, expenses, expense_splits, 
settlements, chat_messages
Key decisions:
- All IDs are UUIDs (gen_random_uuid())
- expense_splits stores owed amount per person, not paid amount
- Settlements are a separate table, not a special expense type
- Cascade delete: expense_splits and chat_messages delete with expense
- @@unique([group_id, user_id]) prevents duplicate memberships

### API Design
RESTful. 18 total endpoints across 5 route files.
All protected routes require Authorization: Bearer <token> header.
Consistent response shape: { data: ... } for success, { error: "..." } for errors.

### Frontend Structure
5 pages: Login, Register, Dashboard, GroupDetail, ExpenseDetail
3 modals: CreateGroup, AddExpense, SettleUp
Key patterns: AuthContext for global auth state, axios interceptor 
for auto JWT injection and 401 redirect, Supabase client only for 
Realtime subscriptions

### Deployment Approach
- Database deployed first (Supabase, always-on)
- Backend deployed to Render (auto-deploy from GitHub main branch)
- Frontend deployed to Vercel (auto-deploy from GitHub main branch)
- Environment variables used to connect the three services
- CORS restricted to Vercel URL only in production

---

## 3. AI Collaboration Process

### How I Instructed the AI
- Started with the required initial prompt from the assignment
- Used a 6-round interview format before any code was written
- Asked Claude Code to act as a junior engineer that asks questions 
  rather than assuming requirements
- Gave explicit, detailed answers to every question
- Instructed Claude to update AI_CONTEXT.md after every major section

### What Questions the AI Asked
Round 1: Product goals, Splitwise familiarity, evaluator expectations
Round 2: Split types, expense flow, realtime chat scope, invite mechanism, settlements
Round 3: Full stack choice, balance calculation approach, data model structure
Round 4: UI screens, auth details, JWT storage, API conventions, state management
Round 5: Supabase Realtime auth model, edge cases, schema precision, error handling
Round 6: Tailwind version, env vars, CORS policy, deployment commands, settle up UX

### How I Answered
- Answered one round at a time before Claude moved to the next
- Made deliberate technical decisions (e.g. chose on-the-fly balance 
  calculation over stored pairwise debts)
- Specified exact tradeoffs upfront (no email invites, no editing expenses)

### How the Plan Evolved
- Prisma v7 required @prisma/adapter-pg — unplanned but resolved quickly
- Supabase direct connection (port 5432) blocked by Indian ISP — 
  switched to session pooler as DIRECT_URL
- Supabase API keys and Realtime dashboard UI had changed — 
  used Legacy keys tab and SQL to enable Realtime
- UI overhaul added as an unplanned phase after all functionality complete

### How AI_CONTEXT.md Was Maintained
- Updated after every phase during implementation
- Final version contains 12 sections covering all aspects of the build
- Detailed enough that another developer can paste it into Claude Code 
  and recreate a similar application

---

## 4. Tradeoffs

### What I Simplified
- No email invites: users must register first, then be added by email
- No expense editing: expenses can only be created or deleted
- No group deletion: avoids cascading delete complexity
- No activity feed or notifications
- Manual testing only: no automated test suite

### What I Hardcoded
- Currency: INR only, no multi-currency support
- JWT expiry: 7 days, no refresh token
- Single payer per expense: one person paid, splits among participants

### What I Avoided
- Supabase Auth: used custom JWT to keep architecture simpler
- Redux or Zustand: React Context sufficient for auth-only global state
- Service layer: route + controller pattern only, no extra abstraction
- Recurring expenses, IOUs outside groups, receipt scanning

### What I Would Improve With More Time
- Add email notifications when added to a group or an expense
- Allow expense editing with an audit trail
- Add activity feed per group
- Add automated API tests with Jest + Supertest
- Implement proper Supabase Auth + RLS instead of disabling RLS
- Add multi-currency support with conversion rates
- Settlement deletion for cleaning up disconnected settlements

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
