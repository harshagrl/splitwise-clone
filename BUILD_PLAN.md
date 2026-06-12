# BUILD_PLAN.md — Splitwise Clone

> **Source of truth**: [AI_CONTEXT.md](./AI_CONTEXT.md)  
> **Total estimated time**: ~16 working hours  
> **Status**: 🟡 Awaiting approval before implementation begins

---

## Phase 0 — Project Scaffolding (~1 hour)

### Goal
Set up the monorepo structure, initialize both apps, install all dependencies, and configure tooling.

### Steps
1. Create top-level folder structure:
   ```
   splitwise-clone/
   ├── client/
   ├── server/
   ├── AI_CONTEXT.md
   ├── BUILD_PLAN.md
   └── README.md
   ```

2. **Server setup** (`server/`):
   - `npm init -y`
   - Install dependencies:
     - `express`, `cors`, `dotenv`
     - `@prisma/client`, `prisma` (dev)
     - `bcrypt`, `jsonwebtoken`
     - `zod`
   - Install dev dependency:
     - `nodemon` (dev) — for auto-restart during development
   - Add `"dev": "nodemon index.js"` script to `package.json`
   - Create `server/.env` with placeholder values
   - Create `server/index.js` with Express boilerplate (CORS, JSON parsing, error handler, port)

3. **Client setup** (`client/`):
   - `npm create vite@latest ./ -- --template react`
   - Install dependencies:
     - `react-router-dom`
     - `axios`
     - `@supabase/supabase-js`
   - Install & configure Tailwind CSS v3:
     - `tailwindcss`, `postcss`, `autoprefixer`
     - `npx tailwindcss init -p`
     - Configure `tailwind.config.js` and `index.css`
   - Create `client/.env` with placeholder values

4. **Verify**: Both apps start without errors (`npm run dev` for both client and server).

### Files created
```
server/package.json
server/index.js
server/.env
server/.gitignore
client/  (Vite scaffold)
client/.env
client/tailwind.config.js
client/postcss.config.js
```

---

## Phase 1 — Database Schema & Prisma Setup (~1.5 hours)

### Goal
Define the complete Prisma schema, push it to Supabase, and verify with Prisma Studio.

### Steps
1. `npx prisma init` inside `server/`
2. Write `server/prisma/schema.prisma` with all 7 tables:

   ```prisma
   // All IDs are UUID with gen_random_uuid() default
   
   model User {
     id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
     name          String
     email         String   @unique
     password_hash String
     created_at    DateTime @default(now())
     
     // Relations
     groups_created  Group[]
     group_members   GroupMember[]
     expenses_paid   Expense[]     @relation("PaidBy")
     expense_splits  ExpenseSplit[]
     settlements_paid    Settlement[] @relation("SettlementPaidBy")
     settlements_received Settlement[] @relation("SettlementPaidTo")
     chat_messages   ChatMessage[]
   }
   
   model Group {
     id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
     name          String
     created_by_id String   @db.Uuid
     created_at    DateTime @default(now())
     
     created_by    User          @relation(fields: [created_by_id], references: [id])
     members       GroupMember[]
     expenses      Expense[]
     settlements   Settlement[]
   }
   
   model GroupMember {
     id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
     group_id  String   @db.Uuid
     user_id   String   @db.Uuid
     joined_at DateTime @default(now())
     
     group     Group @relation(fields: [group_id], references: [id])
     user      User  @relation(fields: [user_id], references: [id])
     
     @@unique([group_id, user_id])
   }
   
   enum SplitType {
     EQUAL
     EXACT
     PERCENTAGE
     SHARES
   }
   
   model Expense {
     id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
     group_id    String    @db.Uuid
     paid_by_id  String    @db.Uuid
     description String
     amount      Decimal   @db.Decimal(12, 2)
     split_type  SplitType
     created_at  DateTime  @default(now())
     
     group       Group          @relation(fields: [group_id], references: [id])
     paid_by     User           @relation("PaidBy", fields: [paid_by_id], references: [id])
     splits      ExpenseSplit[]
     messages    ChatMessage[]
   }
   
   model ExpenseSplit {
     id         String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
     expense_id String  @db.Uuid
     user_id    String  @db.Uuid
     amount     Decimal @db.Decimal(12, 2)
     
     expense    Expense @relation(fields: [expense_id], references: [id], onDelete: Cascade)
     user       User    @relation(fields: [user_id], references: [id])
   }
   
   model Settlement {
     id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
     group_id   String   @db.Uuid
     paid_by_id String   @db.Uuid
     paid_to_id String   @db.Uuid
     amount     Decimal  @db.Decimal(12, 2)
     created_at DateTime @default(now())
     
     group      Group @relation(fields: [group_id], references: [id])
     paid_by    User  @relation("SettlementPaidBy", fields: [paid_by_id], references: [id])
     paid_to    User  @relation("SettlementPaidTo", fields: [paid_to_id], references: [id])
   }
   
   model ChatMessage {
     id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
     expense_id String   @db.Uuid
     user_id    String   @db.Uuid
     content    String
     created_at DateTime @default(now())
     
     expense    Expense @relation(fields: [expense_id], references: [id], onDelete: Cascade)
     user       User    @relation(fields: [user_id], references: [id])
   }
   ```

3. Set `DATABASE_URL` (Transaction mode) and `DIRECT_URL` (Session mode) in `server/.env` to Supabase connection strings
4. Run `npx prisma db push` from local to create tables
5. Disable RLS on `chat_messages` table in Supabase dashboard
6. Enable Realtime on `chat_messages` table in Supabase dashboard
7. Verify tables in Prisma Studio: `npx prisma studio`

### Files created/modified
```
server/prisma/schema.prisma
server/.env (DATABASE_URL and DIRECT_URL filled in)
```

### Important notes
- `ExpenseSplit` has `onDelete: Cascade` from `Expense` — deleting an expense auto-deletes its splits
- `ChatMessage` also cascades on expense delete
- `GroupMember` has `@@unique([group_id, user_id])` to prevent duplicate membership

---

## Phase 2 — Backend API: Auth & Middleware (~2 hours)

### Goal
Build the authentication system and shared middleware.

### Steps
1. Create Prisma client singleton (`server/utils/prisma.js`)
2. Create auth middleware (`server/middleware/authMiddleware.js`):
   - Extract JWT from `Authorization: Bearer <token>` header
   - Verify with `jsonwebtoken`
   - Attach `req.user = { id, email, name }` to request
   - Return 401 if missing/invalid
3. Create centralized error handler (`server/middleware/errorHandler.js`):
   - Catches all errors passed via `next(error)`
   - Returns `{ error: "message" }` with appropriate status codes
4. Create auth routes + controller:
   - `POST /api/auth/register`: validate with zod → hash password with bcrypt → create user → return JWT
   - `POST /api/auth/login`: validate → find user by email → compare password → return JWT
   - JWT payload: `{ id, email, name }`, expires in 7 days
5. Wire routes into `server/index.js`

### Files created
```
server/utils/prisma.js
server/middleware/authMiddleware.js
server/middleware/errorHandler.js
server/routes/auth.js
server/controllers/authController.js
```

### Verify
- Register a test user via Postman/curl
- Login with same user → get JWT back
- Use JWT on a test protected route → get 200
- Bad token → get 401

---

## Phase 3 — Backend API: Groups & Members (~2 hours)

### Goal
CRUD for groups and member management.

### Steps
1. Create group routes + controller:
   - `GET /api/groups` — list groups where current user is a member (include member count + user's net balance)
   - `POST /api/groups` — create group, auto-add creator as member
   - `GET /api/groups/:id` — get group detail with members list (verify user is a member)
   - `POST /api/groups/:id/members` — add member by email (look up user, error if not found or already member)
   - `DELETE /api/groups/:id/members/:userId` — remove member (allow even if unsettled; keep historical data)
2. Add membership check middleware/helper — for all group-specific routes, verify the requesting user is a group member

### Files created
```
server/routes/groups.js
server/controllers/groupsController.js
```

### Verify
- Create group → creator auto-added as member
- Add member by valid email → success
- Add member by non-existent email → `{ error: "User not found" }`
- Add already-existing member → `{ error: "User is already a member" }`
- Non-member tries to access group → 403

---

## Phase 4 — Backend API: Expenses, Splits & Balance Calculation (~3 hours)

### Goal
Expense creation with all 4 split types, balance calculation with debt simplification, and settlements.

### Steps

#### 4a. Split Calculator (`server/utils/splitCalculator.js`)
- Input: `totalAmount`, `splitType`, `selectedMembers[]`, `splitValues{}` (for EXACT/PERCENTAGE/SHARES)
- Output: `Array<{ userId, amount }>` — the owed amount per person
- Implement all 4 types:
  - **EQUAL**: `totalAmount / count`, remainder to first person
  - **EXACT**: validate sum equals totalAmount
  - **PERCENTAGE**: validate sum equals 100%, convert to amounts
  - **SHARES**: calculate proportional amounts, remainder to first person
- Round all amounts to 2 decimal places

#### 4b. Expense Routes + Controller
- `POST /api/groups/:id/expenses` — validate with zod, run split calculator, create expense + expense_splits in a transaction
- `GET /api/groups/:id/expenses` — list expenses with paid_by user name, ordered by created_at desc
- `GET /api/expenses/:id` — expense detail with splits (each split shows user name + amount)
- `DELETE /api/expenses/:id` — verify user is group member, delete (cascade removes splits)

#### 4c. Balance Calculator (`server/utils/balanceCalc.js`)
- **Group balances** (`GET /api/groups/:id/balances`):
  1. Query all `expense_splits` for the group + all `expenses` (to get paid_by amounts)
  2. For each user: `net = Σ(paid) − Σ(owed)`
  3. Query all `settlements` for the group and adjust nets
  4. Run debt simplification algorithm:
     - Separate users into creditors (net > 0) and debtors (net < 0)
     - Greedily match largest debtor to largest creditor
     - Output: `Array<{ from, to, amount }>` — simplified debts
  5. Return simplified debts + each user's net balance

- **Overall balance** (`GET /api/users/me/balances`):
  1. Across all groups the user is in, compute their total net
  2. Return: `{ totalBalance: number, perGroup: Array<{ groupId, groupName, balance }> }`

#### 4d. Settlements Routes + Controller
- `POST /api/groups/:id/settlements` — validate (paid_by, paid_to, amount), create settlement record
- `GET /api/groups/:id/settlements` — list settlements for the group

### Files created
```
server/utils/splitCalculator.js
server/utils/balanceCalc.js
server/routes/expenses.js
server/controllers/expensesController.js
server/routes/settlements.js
server/controllers/settlementsController.js
```

### Verify
- Create expense with each split type → correct splits stored
- Equal split with rounding → first person gets remainder
- Delete expense → splits cascade-deleted, balances update
- Create 3-person scenario with multiple expenses → balances match expected values
- Record partial settlement → balances update correctly
- Debt simplification produces minimum transactions

---

## Phase 5 — Backend API: Chat Messages (~1 hour)

### Goal
REST endpoints for expense comments (Supabase Realtime handles the live subscription on the frontend).

### Steps
1. Create chat routes + controller:
   - `GET /api/expenses/:id/messages` — list messages for expense, ordered by created_at asc, include user name
   - `POST /api/expenses/:id/messages` — validate content not empty, create message, return created message
2. Verify the expense exists and the user is a member of the expense's group before allowing read/write

### Files created
```
server/routes/chat.js
server/controllers/chatController.js
```

### Verify
- Post a message → saved to DB, returned with user info
- List messages → ordered chronologically
- Non-group-member tries to post → 403

---

## Phase 6 — Frontend: Core Setup, Auth & Routing (~2.5 hours)

### Goal
Build the React SPA shell: auth context, protected routes, login/register pages, and axios configuration.

### Steps

#### 6a. Core Setup
- Configure axios instance (`client/src/api/axios.js`):
  - `baseURL` from `VITE_API_URL`
  - Request interceptor: attach JWT from localStorage
  - Response interceptor: on 401, clear token + redirect to login
- Configure Supabase client (`client/src/api/supabase.js`):
  - Initialize with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
  - Export client for Realtime subscriptions only

#### 6b. Auth Context
- `client/src/context/AuthContext.jsx`:
  - State: `{ user, token, isAuthenticated, isLoading }`
  - Actions: `login(email, password)`, `register(name, email, password)`, `logout()`
  - On mount: check localStorage for existing token, decode it, set user
  - Provide via React Context

#### 6c. Routing
- `client/src/App.jsx`:
  - `<BrowserRouter>` with routes:
    - `/login` → `<LoginPage />`
    - `/register` → `<RegisterPage />`
    - `/dashboard` → `<ProtectedRoute><DashboardPage /></ProtectedRoute>`
    - `/groups/:id` → `<ProtectedRoute><GroupDetailPage /></ProtectedRoute>`
    - `/expenses/:id` → `<ProtectedRoute><ExpenseDetailPage /></ProtectedRoute>`
    - `/` → redirect to `/dashboard`
  - `<ProtectedRoute>` component: checks `isAuthenticated`, redirects to `/login` if false

#### 6d. Login & Register Pages
- Simple forms with Tailwind styling
- Show validation errors from API
- On success: store token, redirect to `/dashboard`
- Link between login ↔ register pages

### Files created
```
client/src/api/axios.js
client/src/api/supabase.js
client/src/context/AuthContext.jsx
client/src/components/ProtectedRoute.jsx
client/src/pages/LoginPage.jsx
client/src/pages/RegisterPage.jsx
client/src/App.jsx (modified)
```

### Verify
- Register → redirected to dashboard
- Login → redirected to dashboard
- Visit `/dashboard` without token → redirected to `/login`
- Bad credentials → error message shown

---

## Phase 7 — Frontend: Dashboard, Group Detail & Expense Detail (~3 hours)

### Goal
Build the three main protected pages and their modals.

### Steps

#### 7a. Dashboard Page
- Fetch `GET /api/users/me/balances` on mount
- Display overall balance summary at top
- Fetch `GET /api/groups` → display group cards (name + net balance)
- "Create New Group" button → opens simple modal (group name input)
- On group card click → navigate to `/groups/:id`

#### 7b. Group Detail Page
- Fetch `GET /api/groups/:id` for group info + members
- Fetch `GET /api/groups/:id/expenses` for expense list
- Fetch `GET /api/groups/:id/balances` for simplified balances
- **Members section**: list with "Add Member" input (email) and remove buttons
- **Expenses section**: list showing description, amount, payer, date → click navigates to `/expenses/:id`
- **Balances section**: show simplified debts ("Alice owes Bob ₹200")
- **Add Expense Modal**:
  - Form: description, amount, who paid (dropdown of members), split type (radio/select), select participants (checkboxes), split value inputs (shown for EXACT/PERCENTAGE/SHARES)
  - On submit → `POST /api/groups/:id/expenses` → refresh expense list + balances
- **Settle Up Modal**:
  - Fetch balances, filter to debts where current user is the debtor
  - Show "You owe [Name] ₹[amount]" rows with Settle button
  - Click Settle → input pre-filled with full amount, editable for partial
  - Confirm → `POST /api/groups/:id/settlements` → close modal, refresh balances
  - If user is owed money: show "You are owed money in this group. No settlements needed."

#### 7c. Expense Detail Page
- Fetch `GET /api/expenses/:id` for expense info + splits
- Display: description, total amount, who paid, split type, date
- Display split breakdown: each participant and their share
- **Delete button**: `DELETE /api/expenses/:id` → redirect to group page
- **Comments section**: 
  - Fetch existing messages via `GET /api/expenses/:id/messages`
  - Subscribe to Supabase Realtime channel for `chat_messages` table filtered by `expense_id`
  - Display messages chronologically with user name + timestamp
  - Input field + send button → `POST /api/expenses/:id/messages`
  - New messages from Realtime subscription appear without refresh

### Files created
```
client/src/pages/DashboardPage.jsx
client/src/pages/GroupDetailPage.jsx
client/src/pages/ExpenseDetailPage.jsx
client/src/components/CreateGroupModal.jsx
client/src/components/AddExpenseModal.jsx
client/src/components/SettleUpModal.jsx
client/src/components/BalancesList.jsx
client/src/components/ExpenseList.jsx
client/src/components/MembersList.jsx
client/src/components/ChatMessages.jsx
```

### Verify
- Dashboard shows groups with correct balances
- Create group → appears in dashboard
- Add expense with each split type → balances update correctly
- Settle up (full and partial) → balances update
- Realtime chat: open expense in two browser tabs → messages appear in both live
- Delete expense → removed from list, balances recalculate

---

## Phase 8 — Deployment & Polish (~1 hour)

### Goal
Deploy all three services and do final end-to-end verification.

### Steps
1. **Supabase** (already set up in Phase 1):
   - Confirm RLS disabled on `chat_messages`
   - Confirm Realtime enabled on `chat_messages`
   - Note connection string, URL, anon key

2. **Backend → Render.com**:
   - Create new Web Service, connect to GitHub repo, set root directory to `server/`
   - Build command: `npm install && npx prisma generate`
   - Start command: `node index.js`
   - Set env vars: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `PORT`, `CLIENT_URL`

3. **Frontend → Vercel**:
   - Import repo, set root directory to `client/`
   - Build command: `npm run build` (Vite default)
   - Output directory: `dist`
   - Set env vars: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

4. **Update CORS**: set `CLIENT_URL` on Render to the Vercel production URL

5. **End-to-end smoke test**:
   - Register two users
   - Create a group
   - Add second user to group
   - Create expense (each split type)
   - Check balances are correct
   - Settle up (partial + full)
   - Chat on an expense in two tabs
   - Delete an expense
   - Verify all flows work on deployed URLs

6. **Polish**:
   - Add loading states and error messages where missing
   - Responsive layout check (desktop + mobile viewport)
   - Update `README.md` with setup instructions

7. **Finalize AI_CONTEXT.md**:
   - Update with all final implementation decisions made during coding
   - Document the exact Prisma schema as implemented
   - List every API route with request/response shapes
   - Explain balance calculation logic step-by-step with examples
   - Explain split calculator logic for all 4 types with examples
   - Document deployment configuration (env vars, build commands, URLs)
   - Document all known limitations and tradeoffs
   - Must be detailed enough that another person can paste it into an AI tool and recreate a similar app

### Files created/modified
```
README.md
AI_CONTEXT.md
```

---

## Time Budget Summary

| Phase | Description | Est. Hours |
|-------|-------------|------------|
| 0 | Project Scaffolding | 1.0 |
| 1 | Database Schema & Prisma | 1.5 |
| 2 | Backend: Auth & Middleware | 2.0 |
| 3 | Backend: Groups & Members | 2.0 |
| 4 | Backend: Expenses, Splits, Balances, Settlements | 3.0 |
| 5 | Backend: Chat Messages | 1.0 |
| 6 | Frontend: Auth, Routing, Core Setup | 2.5 |
| 7 | Frontend: Dashboard, Group Detail, Expense Detail | 3.0 |
| 8 | Deployment & Polish | 1.0 |
| **Total** | | **~16 hours** |

---

## Dependency Order

```
Phase 0 (scaffolding)
  └── Phase 1 (database schema)
        ├── Phase 2 (auth + middleware)
        │     └── Phase 3 (groups)
        │           └── Phase 4 (expenses + balances + settlements)
        │                 └── Phase 5 (chat)
        └── Phase 6 (frontend core + auth)
              └── Phase 7 (frontend pages)
                    └── Phase 8 (deploy + polish)
```

Phases 2–5 (backend) and Phase 6 (frontend core) can overlap if needed, but the backend APIs must exist before frontend pages can be wired up in Phase 7.

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Debt simplification algorithm is wrong | Test with known scenarios (3-person, 5-person) and hand-verify results before moving to frontend |
| Supabase Realtime doesn't work with RLS disabled | Test subscription in isolation in Phase 1 before building chat UI |
| Render cold start delays | Document for evaluators; add a loading indicator on the frontend |
| Running out of time | Phases are ordered by priority — if behind, chat comments (Phase 5/7c) can be simplified to non-realtime (just REST polling) |
| Split calculator rounding bugs | Write test cases for edge amounts (₹1 split 3 ways, ₹0.01 scenarios) |
