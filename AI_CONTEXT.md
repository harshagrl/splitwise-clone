# Splitwise Clone — Complete Architecture & Implementation Context

This document captures the entire product scope, technical decisions, mathematical models, and API surface for the Splitwise Clone project. It serves as a comprehensive reference to reconstruct the application from scratch using an LLM.

## 1. Product Scope

**Core Features Implemented:**
- User registration and authentication (JWT).
- Group creation and management.
- Adding members to a group by email (must be registered users).
- Adding expenses within a group with four mathematical split types: Equal, Exact, Percentage, and Shares.
- Group-scoped balance dashboard (who owes whom within a group).
- Overall user dashboard balance (aggregate total across all groups).
- Settle Up functionality (partial and full settlements).
- Realtime comment threads on individual expenses (using Supabase Realtime).
- Deletion of expenses.
- A highly polished, modern, responsive UI designed sequentially after initial functionality was complete.

**Explicitly Excluded Features:**
- Email verification / invite links / signup-from-invite flows.
- Recurring expenses.
- IOUs outside of groups.
- Currency conversion.
- Receipt scanning / Pro features.
- Payment gateway integrations.

---

## 2. Technical Stack & Deployment Strategy

- **Backend**: Node.js + Express
- **Database**: PostgreSQL (hosted on Supabase)
- **ORM**: Prisma Client v7
- **Realtime**: Supabase Realtime (JS SDK listening directly to `chat_messages` table mutations)
- **Frontend**: React + Vite + React Router + Tailwind CSS v3
- **Authentication**: Custom JWT (No Supabase Auth used to minimize architectural complexity)
- **Deployment Strategy**: 
  - Backend: Render.com (Web Service)
  - Frontend: Vercel
  - Database: Supabase

---

## 3. Complete Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  // For Prisma v7, we must separate the Transaction Pooler (url) from the Session Pooler (directUrl)
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum SplitType {
  EQUAL
  EXACT
  PERCENTAGE
  SHARES
}

model User {
  id            String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name          String
  email         String         @unique
  password_hash String
  created_at    DateTime       @default(now())

  groups_created       Group[]
  group_memberships    GroupMember[]
  expenses_paid        Expense[]      @relation("PaidBy")
  expense_splits       ExpenseSplit[]
  settlements_paid     Settlement[]   @relation("SettlementPaidBy")
  settlements_received Settlement[]   @relation("SettlementPaidTo")
  chat_messages        ChatMessage[]
  @@map("users")
}

model Group {
  id            String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name          String
  created_by_id String         @db.Uuid
  created_at    DateTime       @default(now())

  created_by  User           @relation(fields: [created_by_id], references: [id])
  members     GroupMember[]
  expenses    Expense[]
  settlements Settlement[]
  @@map("groups")
}

model GroupMember {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  group_id  String   @db.Uuid
  user_id   String   @db.Uuid
  joined_at DateTime @default(now())

  group Group @relation(fields: [group_id], references: [id])
  user  User  @relation(fields: [user_id], references: [id])
  @@unique([group_id, user_id])
  @@map("group_members")
}

model Expense {
  id          String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  group_id    String         @db.Uuid
  paid_by_id  String         @db.Uuid
  description String
  amount      Decimal        @db.Decimal(12, 2)
  split_type  SplitType
  created_at  DateTime       @default(now())

  group    Group           @relation(fields: [group_id], references: [id])
  paid_by  User            @relation("PaidBy", fields: [paid_by_id], references: [id])
  splits   ExpenseSplit[]
  messages ChatMessage[]
  @@map("expenses")
}

model ExpenseSplit {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  expense_id String   @db.Uuid
  user_id    String   @db.Uuid
  amount     Decimal  @db.Decimal(12, 2)

  expense Expense @relation(fields: [expense_id], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [user_id], references: [id])
  @@map("expense_splits")
}

model Settlement {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  group_id   String   @db.Uuid
  paid_by_id String   @db.Uuid
  paid_to_id String   @db.Uuid
  amount     Decimal  @db.Decimal(12, 2)
  created_at DateTime @default(now())

  group   Group @relation(fields: [group_id], references: [id])
  paid_by User  @relation("SettlementPaidBy", fields: [paid_by_id], references: [id])
  paid_to User  @relation("SettlementPaidTo", fields: [paid_to_id], references: [id])
  @@map("settlements")
}

model ChatMessage {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  expense_id String   @db.Uuid
  user_id    String   @db.Uuid
  content    String
  created_at DateTime @default(now())

  expense Expense @relation(fields: [expense_id], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [user_id], references: [id])
  @@map("chat_messages")
}
```

---

## 4. Complete API Routes

All routes (except `/api/auth/register` and `/api/auth/login`) require a Bearer token in the `Authorization` header.

### Auth (`/api/auth`)
- `POST /register`
  - Body: `{ name, email, password }`
  - Auth Required: No
  - Res: `{ token, user }`
- `POST /login`
  - Body: `{ email, password }`
  - Auth Required: No
  - Res: `{ token, user }`
- `GET /me`
  - Auth Required: Yes
  - Res: `{ user }`

### Users (`/api/users`)
- `GET /me/balances`
  - Auth Required: Yes
  - Res: `{ data: { totalBalance, perGroup: [{ groupId, balance }] } }`

### Groups (`/api/groups`)
- `POST /`
  - Body: `{ name }`
  - Auth Required: Yes
  - Res: `{ data: { group } }`
- `GET /`
  - Auth Required: Yes
  - Res: `{ data: { groups: [...] } }`
- `GET /:id`
  - Auth Required: Yes
  - Res: `{ data: { group: { ..., members: [...] } } }`
- `POST /:id/members`
  - Body: `{ email }`
  - Auth Required: Yes
  - Res: `{ data: { member } }`
- `DELETE /:id/members/:userId`
  - Auth Required: Yes
  - Res: `{ data: { success: true } }`

### Group Expenses & Balances (`/api/groups/:id`)
- `GET /expenses`
  - Auth Required: Yes
  - Res: `{ data: { expenses: [...] } }`
- `POST /expenses`
  - Body: `{ description, amount, paid_by_id, split_type, selected_members: [uid1, uid2], split_values?: { [uid]: value } }`
  - Auth Required: Yes
  - Res: `{ data: { expense } }`
- `GET /balances`
  - Auth Required: Yes
  - Res: `{ data: { balances: { [uid]: amount }, simplifiedDebts: [{ from, to, amount, fromName, toName }] } }`

### Group Settlements (`/api/groups/:id/settlements`)
- `POST /`
  - Body: `{ paid_to_id, amount }`
  - Auth Required: Yes
  - Res: `{ data: { settlement } }`

### Expenses & Chat (`/api/expenses/:id`)
- `GET /`
  - Auth Required: Yes
  - Res: `{ data: { expense: { ..., splits: [...], paid_by: {...} } } }`
- `DELETE /`
  - Auth Required: Yes
  - Res: `{ data: { success: true } }`
- `GET /messages`
  - Auth Required: Yes
  - Res: `{ data: { messages: [{ id, content, created_at, user: {...} }] } }`
- `POST /messages`
  - Body: `{ content }`
  - Auth Required: Yes
  - Res: `{ data: { message } }`

---

## 5. Mathematical Models

### 5.1 Split Logic Algorithm (`server/utils/splitCalculator.js`)
Takes `(totalAmount, splitType, selectedMembers, splitValues)` and returns an array of exact amounts for each member.

1. **EQUAL**: 
   - `baseAmount = floor(total * 100 / count) / 100`. 
   - `remainder = Math.round((total - baseAmount * count) * 100)`. 
   - We distribute the remainder by adding `0.01` to the first `N` participants until the remainder reaches 0. This guarantees the sum of splits exactly equals the original amount without floating point errors.
2. **EXACT**: 
   - We sum the provided exact values. If they don't mathematically equal `totalAmount`, the API rejects the request. Otherwise, we simply assign the provided values to the users.
3. **PERCENTAGE**: 
   - We sum the provided percentages to ensure they equal `100`. 
   - Each user gets `amount = Math.floor(total * percentage / 100)`. 
   - The missing remainder is distributed exactly like EQUAL (adding `0.01` sequentially to users) to ensure a mathematically perfect split.
4. **SHARES**: 
   - `totalShares = sum(provided_shares)`. 
   - Each user gets `amount = Math.floor((total * share / totalShares) * 100) / 100`. 
   - The missing remainder is distributed exactly like EQUAL.

### 5.2 Balance Calculation Step-by-Step
Balances are calculated *dynamically* at query time, not stored as a static column. 
For a given group:
1. Initialize an empty map `balances = { [userId]: 0 }`.
2. **Process Expenses (Credits)**: Fetch all `Expense` rows. For each expense, add `expense.amount` to `balances[expense.paid_by_id]`.
3. **Process Splits (Debits)**: Fetch all `ExpenseSplit` rows. For each split, subtract `split.amount` from `balances[split.user_id]`.
4. **Process Settlements**: Fetch all `Settlement` rows. For each settlement, add `settlement.amount` to `balances[settlement.paid_by_id]` (they paid, so credit) and subtract `settlement.amount` from `balances[settlement.paid_to_id]` (they received, so debit).

### 5.3 Debt Simplification Algorithm (Greedy)
After calculating balances, we have a map of users to positive/negative values.
1. Split balances into `debtors` (negative balances) and `creditors` (positive balances).
2. Sort both lists descending by absolute amount.
3. Take the first debtor and the first creditor.
4. Record a simplified debt transaction: `debtor owes creditor Math.min(|debtor_amount|, creditor_amount)`.
5. Subtract this transaction amount from both the debtor's absolute balance and the creditor's balance.
6. If the debtor's remaining balance is 0, shift them off the list. If the creditor's balance is 0, shift them off the list.
7. Repeat until both lists are empty. This perfectly minimizes the total number of transactions required to settle the group.

---

## 6. Full Frontend Structure

**`/client/src/`**
- `App.jsx`: Root component handling `react-router-dom` setup and wrapping routes in `<ProtectedRoute>`.
- `api/axios.js`: Pre-configured Axios instance that injects `localStorage.getItem('token')` into Headers, and redirects to `/login` if a `401` response occurs.
- `api/supabase.js`: Initializes the Supabase JS client solely for Realtime WebSockets.
- `context/AuthContext.jsx`: Provides global `user`, `loading`, `login()`, `logout()` state to all components.

**Pages:**
- `LoginPage.jsx`: Email/password form. Centered professional card layout.
- `RegisterPage.jsx`: Name/email/password form.
- `DashboardPage.jsx`: Shows total aggregate balance widget at top. Displays responsive grid of group cards. Handles Create Group modal.
- `GroupDetailPage.jsx`: Main interface for a group. Left column shows feed of all expenses. Right column shows Balances breakdown and Members list. Hosts SettleUp and AddExpense modals.
- `ExpenseDetailPage.jsx`: Shows exact split breakdown for a single expense. Integrates the live Chat UI on the right side. Handles expense deletion.

**Components:**
- `ProtectedRoute.jsx`: Wrapper checking `AuthContext`. Prevents access to internal pages if not logged in. Contains the persistent global navigation bar.
- `AddExpenseModal.jsx`: Dynamic form. Switches input types based on Split Type (no inputs for EQUAL, percentage inputs for PERCENTAGE, exact inputs for EXACT, share inputs for SHARES). Contains live validation.
- `SettleUpModal.jsx`: Dynamically fetches the logged-in user's specific debts inside the group and allows them to pay them off via input fields.

---

## 7. Supabase Realtime Setup

- **How it works**: The backend (`Express`) strictly handles all writing to the `chat_messages` table via Prisma to maintain security. The frontend (`ExpenseDetailPage.jsx`) connects to Supabase via `@supabase/supabase-js` using the Anon Key to purely *listen* for `INSERT` events.
- **SQL Configuration Required**: 
  - Realtime replication must be explicitly enabled for `chat_messages` in the Supabase Dashboard.
  - Row Level Security (RLS) must be **disabled** for `chat_messages` so the frontend can receive events without needing to pass a custom JWT to Supabase.
- **Deduplication**: Because the user who sends the message will trigger a React state update *and* receive the WebSocket broadcast milliseconds later, the frontend checks `msg.id` to prevent duplicate renders.

---

## 8. Known Limitations & Tradeoffs

1. **Disconnected Settlements**: If an expense is deleted, any settlements previously made to pay for that expense are *not* automatically deleted. This leaves mathematically correct but confusing "reverse-debts" where users are owed money for nothing. Users must manually balance this by creating reverse settlements, as the UI does not currently allow deleting settlements.
2. **No Offline Support / PWA**: Web only. State is wiped on refresh (except Auth via token).
3. **No Email Delivery**: Because automated emails require 3rd party services (SendGrid/Resend), users must manually coordinate to register before their friends can add them to a group by their exact email.
4. **No Deep Supabase Auth**: We built our own JWT auth rather than using Supabase Auth. This means Supabase RLS cannot easily identify users natively, which is why we disabled RLS for chat messages.
