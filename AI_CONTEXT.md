# AI_CONTEXT.md — Splitwise Clone

> **Purpose**: This document is the single source of truth for the entire project.  
> Another evaluator should be able to paste this file into an AI tool and recreate a similar app.

---

## Status: 🟢 Interview Complete — Build Plan Ready

---

## 1. Product Goals
- Demonstrate full-stack ability for Spreetail internship evaluation
- Show ability to: understand a real product, direct an AI agent, build & deploy a working app, document everything reproducibly
- Evaluators will assess: working deployed app, clean readable code, all minimum features functional, detailed AI_CONTEXT.md reproducibility, ability to explain & modify codebase in technical interview

## 2. Splitwise Research
- User has manually gone through Splitwise UI and noted core flows
- No further joint research needed — scope is already clear
- **Features user actually uses**: creating groups, adding expenses (equal split), seeing who owes whom, settling up
- **Features user has never touched**: recurring expenses, IOUs outside groups, currency conversion, Pro features, activity export, Venmo/PayPal integrations

## 3. Core Workflows (from user's Splitwise research)
1. Register / Login
2. Create group
3. Invite members to group
4. Add expense with split type
5. View group balances
6. Settle a debt

## 4. User Personas
_Not separately scoped — the primary persona is a group of friends/roommates splitting shared expenses._

## 5. MVP Scope (Required Features per Evaluators)
- Authentication (register/login)
- Groups (create, add members by email of existing users)
- Expenses with 4 split types: **Equal, Exact, Percentage, Shares**
- **Realtime expense comments** (WebSocket via Supabase Realtime — per-expense comment threads, not group chat)
- Balance calculation (who owes whom)
- Settlements (manual, partial allowed)

## 6. Out-of-Scope Features
- Recurring expenses
- IOUs outside of groups
- Currency conversion
- Pro/premium features
- Activity/data export
- Payment integrations (Venmo, PayPal, etc.)

## 7. Data Model
- ORM: **Prisma** with Supabase PostgreSQL
- Relational approach — no JSON columns for split data
- **All IDs are UUIDs** — `gen_random_uuid()` default via Prisma
- **Tables**:
  - `users` (id, name, email, password_hash, created_at)
  - `groups` (id, name, created_by_id, created_at)
  - `group_members` (id, group_id, user_id, joined_at)
  - `expenses` (id, group_id, paid_by_id, description, amount, split_type, created_at)
  - `expense_splits` (id, expense_id, user_id, amount) — `amount` = what the user **owes** (their share)
  - `settlements` (id, group_id, paid_by_id, paid_to_id, amount, created_at)
  - `chat_messages` (id, expense_id, user_id, content, created_at)
- `split_type` enum: `EQUAL`, `EXACT`, `PERCENTAGE`, `SHARES`
- Expenses **cannot be edited** after creation — only created or deleted
- No `updated_at` on expenses

### 7a. Edge Cases & Rules
- **Deleting an expense**: cascade deletes `expense_splits` automatically; balances recalculate on the fly
- **Removing a group member with unsettled balances**: allowed; historical expenses/splits are kept intact, member just removed from active list
- **Group deletion**: not in MVP scope
- **Rounding**: remainder assigned to the first person in the split list (e.g., ₹100 ÷ 3 = ₹33.34 + ₹33.33 + ₹33.33)

## 8. Authentication
- **JWT-based, handled manually in Express** — NOT Supabase Auth
- Register form fields: **name, email, password** only (no avatar)
- Password hashing: **bcrypt**
- **Access token only** — no refresh token
- Token expiry: **7 days**
- Frontend storage: **localStorage**
- Protected routes in Express use JWT middleware
- Frontend: axios instance auto-attaches token from localStorage to every request

## 9. Groups
- A user can belong to multiple groups
- A group can have expenses paid by different members
- **Invite flow**: search/add by email of already-registered users only
  - No email sending, no invite links, no signup-from-invite
  - If email not found → show error: "User not found"

## 10. Expenses
- Any group member can add an expense
- Payer selection: the person adding can select who paid (self or another group member)
- Split can include a **subset** of group members (not necessarily everyone)
- **4 split types**:
  1. **Equal** — amount divided equally among selected members
  2. **Exact** — manually enter exact amount for each selected member
  3. **Percentage** — enter percentage for each selected member (must total 100%)
  4. **Shares** — enter share units per member, amount divided proportionally
- **Add expense flow**: description → amount → who paid → split type → select included members → enter split values (if not equal) → submit

### 10a. Expense Comments (Realtime)
- Each expense has its own comment thread (stored in `chat_messages` table)
- **Not** a group-level chat
- WebSocket-based via **Supabase Realtime**
- Frontend subscribes using **Supabase anon key** with **RLS disabled** on `chat_messages`
- Filters subscription by `expense_id`
- Comments are not sensitive (no financial data in chat) — security tradeoff is acceptable
- **Write path**: authenticated users POST via Express API (auth enforced at API level)
- **Read path**: Supabase Realtime subscription (read-only, no auth needed)
- If two users have the same expense open, new comments appear live without refresh

## 11. Settlements
- **Manual only** — just records that a payment was made, no payment gateway
- **Partial settlements allowed** — e.g., owe ₹500, can record ₹200 now; balance updates accordingly
- Settlement is between two specific users within a group

### Settle Up Modal UX
- Pre-populated from simplified balances
- Shows list of people the logged-in user owes in this group
- Each row: "You owe [Name] ₹[amount]" with a **Settle** button
- Clicking Settle opens input **pre-filled with the full owed amount**
- User can reduce for partial settlement, then confirm
- After confirming: close modal, refresh group balances
- If user is owed money (not owing): show "You are owed money in this group. No settlements needed."

## 12. Balance Calculation
- **Computed on the fly** at query time — no stored pairwise debt rows
- Source data: `expense_splits` + `settlements` tables
- Formula: `net_balance = Σ(what I paid in expenses) − Σ(my share in expense_splits) + Σ(settlements I received) − Σ(settlements I paid)`
- **Debt simplification enabled** — minimize number of transactions needed
- **Two views**:
  1. **Group-scoped**: who owes whom within a specific group
  2. **Overall dashboard**: total net balance across all groups (e.g., "You owe ₹300 overall")

## 13. UI Screens

| Route | Screen | Auth | Notes |
|-------|--------|------|-------|
| `/login` | Login page | Public | |
| `/register` | Register page | Public | |
| `/dashboard` | Dashboard | Protected | Overall balance + group list |
| `/groups/:id` | Group Detail | Protected | Expenses, members, balances |
| `/expenses/:id` | Expense Detail | Protected | Expense info + realtime comments |

- **Add Expense** → Modal on Group Detail page (not a separate route)
- **Settle Up** → Modal on Group Detail page (not a separate route)

### Dashboard Layout
- Overall balance summary at top ("You are owed ₹X" or "You owe ₹X")
- List of all groups user belongs to
- Each group card: group name + user's net balance in that group
- "Create New Group" button
- No activity feed

### Group Detail Layout
- Group name + created-by info
- Member list with add-by-email and remove-member options
- Expense list (description, amount, who paid, date) — each clickable → `/expenses/:id`
- Group balance summary (who owes whom, simplified)
- "Add Expense" button → opens modal
- "Settle Up" button → opens modal

## 14. Routing
- **react-router-dom** (client-side)
- Public routes: `/login`, `/register`
- Protected routes: `/dashboard`, `/groups/:id`, `/expenses/:id`
- Protected route wrapper component checks JWT in localStorage; redirects to `/login` if missing/expired

## 15. Frontend Architecture
- **React + Vite** (SPA)
- **react-router-dom** for client-side routing
- **State management**: React Context + useReducer for **auth state only**; all other data fetched directly with axios (no global store)
- **CSS**: Tailwind CSS **v3** (class-based config, not v4)
- **HTTP client**: axios with a configured instance that auto-attaches JWT from localStorage
- **Supabase JS client** used on frontend for Realtime comment subscriptions only

## 16. Backend Architecture
- **Node.js + Express**
- **Prisma ORM** → Supabase PostgreSQL
- JWT auth middleware (bcrypt + jsonwebtoken)
- **Validation**: zod for request validation
- Supabase JS client: **not used on backend** — Realtime is frontend-only
- **Error handling**: centralized middleware in `middleware/errorHandler.js`
  - All routes use try/catch + `next(error)`
  - Error response: `{ error: "message" }`
  - Success response: `{ data: ... }`

### Backend Folder Structure
```
server/
  index.js
  routes/
    auth.js
    groups.js
    expenses.js
    settlements.js
    chat.js
  controllers/
    authController.js
    groupsController.js
    expensesController.js
    settlementsController.js
    chatController.js
  middleware/
    authMiddleware.js
    errorHandler.js
  utils/
    balanceCalc.js
    splitCalculator.js
  prisma/
    schema.prisma
```
- **Route + Controller pattern only** — no service layer

## 17. Database Choice
- **PostgreSQL** hosted on **Supabase free tier**
- Accessed via **Prisma ORM** from Express backend
- Supabase Realtime used for live comment subscriptions (frontend connects directly)

## 18. API Design
- **RESTful** routes, all prefixed with `/api`
- Dedicated balance endpoint (not embedded in group detail)

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |

### Groups
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/groups` | List user's groups |
| POST | `/api/groups` | Create new group |
| GET | `/api/groups/:id` | Get group detail |
| POST | `/api/groups/:id/members` | Add member by email |
| DELETE | `/api/groups/:id/members/:userId` | Remove member |

### Expenses
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/groups/:id/expenses` | List group expenses |
| POST | `/api/groups/:id/expenses` | Create expense with splits |
| GET | `/api/expenses/:id` | Get expense detail |
| DELETE | `/api/expenses/:id` | Delete expense |

### Comments (Expense Messages)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/expenses/:id/messages` | Get expense comments |
| POST | `/api/expenses/:id/messages` | Post a comment |

### Balances & Settlements
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/groups/:id/balances` | Group balances (simplified) |
| GET | `/api/groups/:id/settlements` | List group settlements |
| POST | `/api/groups/:id/settlements` | Record a settlement |
| GET | `/api/users/me/balances` | Overall balance across all groups |

## 19. Deployment
- **Monorepo locally**, separate deploys:
  - Frontend (React/Vite) → **Vercel** free tier
  - Backend (Express) → **Render.com** free tier
  - Database (PostgreSQL) → **Supabase** free tier

### Top-Level Folder Structure
```
splitwise-clone/
├── client/          ← React + Vite frontend
├── server/          ← Node + Express backend
├── AI_CONTEXT.md
├── BUILD_PLAN.md
└── README.md
```

### Environment Variables
**Server `.env`**:
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase PostgreSQL connection string (Transaction mode, port 6543) |
| `DIRECT_URL` | Supabase PostgreSQL direct connection string (Session mode, port 5432) |
| `JWT_SECRET` | Random secret for signing JWT tokens |
| `PORT` | 5000 locally; Render sets automatically |
| `CLIENT_URL` | Vercel frontend URL (for CORS) |

**Client `.env`**:
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Express backend URL (Render in prod, localhost:5000 in dev) |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |

### CORS Configuration
- Production: allow `CLIENT_URL` only (no wildcard `*`)
- Development: allow `localhost:5173`
- Use `CLIENT_URL` env var to handle both environments

### Render.com Commands
- **Build command**: `npm install && npx prisma generate`
- **Start command**: `node index.js`
- `prisma db push` run **manually once from local** after setting `DATABASE_URL` — never on Render

## 20. Testing
- **No automated tests** — manual testing only via the frontend UI
- Acceptable tradeoff given 16-hour timeline
- Known limitation documented here

## 21. Known Risks
- Render.com free tier has cold starts (~30s spin-up after inactivity)
- No refresh token — if JWT expires, user must re-login
- No RLS on `chat_messages` — anyone with the anon key could theoretically subscribe to any expense's comments
- No automated tests — regressions caught only through manual testing
- Debt simplification algorithm complexity — must be correct or balances will be wrong
- 16-hour timeline is tight for all features

## 22. Tradeoffs
| Decision | Tradeoff |
|----------|----------|
| No Supabase Auth | Simpler stack, but must implement auth manually |
| No refresh token | Simpler, but 7-day hard expiry |
| No RLS on chat | Simpler realtime, but less secure reads |
| No service layer | Faster development, but controllers may get large |
| No automated tests | More build time, but no regression safety net |
| Compute balances on the fly | No stale data, but slower queries at scale |
| No group deletion | Avoids cascade complexity, but groups persist forever |
| No expense editing | Simpler balance logic, but users must delete+recreate |

---

## Changelog
| Date | Change |
|------|--------|
| 2026-06-12 | Created AI_CONTEXT.md; began discovery interview |
| 2026-06-12 | Completed Rounds 1–5: all architecture, data model, edge cases, and tradeoffs documented |
| 2026-06-12 | Completed Round 6: Tailwind v3, env vars, CORS, deployment commands, settle up UX — interview complete |
