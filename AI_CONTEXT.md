# Splitwise Clone — Complete Architecture & Implementation Context

This document captures the entire product scope, technical decisions, mathematical models, and API surface for the Splitwise Clone project. It serves as a comprehensive reference to reconstruct the application from scratch.

## 1. Product Scope

**Core Features Implemented:**
- User registration and authentication (JWT).
- Group creation and management.
- Adding members to a group by email (must be registered users).
- Adding expenses within a group with four split types: Equal, Exact, Percentage, and Shares.
- Group-scoped balance dashboard (who owes whom within a group).
- Overall user dashboard balance (aggregate total across all groups).
- Settle Up functionality (partial and full settlements).
- Realtime comment threads on individual expenses (no group-level chat).
- Deletion of expenses.

**Explicitly Excluded Features:**
- Email verification / invite links / signup-from-invite flows.
- Recurring expenses.
- IOUs outside of groups.
- Currency conversion.
- Pro features / receipt scanning.
- Activity feed / push notifications.
- Payment gateway integrations.

---

## 2. Technical Stack & Deployment Strategy

- **Backend**: Node.js + Express
- **Database**: PostgreSQL (hosted on Supabase)
- **ORM**: Prisma Client v7 (using `@prisma/adapter-pg` with `pg` for connection pooling compatibility)
- **Realtime**: Supabase Realtime (JS SDK listening directly to `chat_messages` table mutations)
- **Frontend**: React + Vite + React Router + Tailwind CSS v3
- **Authentication**: Custom JWT (No Supabase Auth used to minimize architectural complexity)
- **Deployment Strategy**: 
  - Backend: Render.com (Free Tier)
  - Frontend: Vercel (Free Tier)
  - Database: Supabase (Free Tier)

---

## 3. Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
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

## 4. API Routes

### Auth (`/api/auth`)
- `POST /register`: Registers user. Body: `{ name, email, password }`. Res: `{ token, user }`.
- `POST /login`: Authenticates user. Body: `{ email, password }`. Res: `{ token, user }`.
- `GET /me`: Fetches current user. Auth: JWT. Res: `{ user }`.

### Users (`/api/users`)
- `GET /me/balances`: Fetches overall total balance across all groups. Auth: JWT. Res: `{ totalBalance, perGroup: [...] }`.

### Groups (`/api/groups`)
- `POST /`: Creates group. Auth: JWT. Body: `{ name }`. Res: `{ group }`.
- `GET /`: Lists all groups for user. Auth: JWT. Res: `{ groups }`.
- `GET /:id`: Details and members. Auth: JWT. Res: `{ group }`.
- `POST /:id/members`: Add user by email. Auth: JWT. Body: `{ email }`. Res: `{ member }`.
- `DELETE /:id/members/:userId`: Removes user. Auth: JWT. Res: `{ success: true }`.

### Group Expenses & Balances (`/api/groups/:id`)
- `GET /expenses`: Lists expenses. Auth: JWT. Res: `{ expenses }`.
- `POST /expenses`: Create expense. Auth: JWT. Body: `{ description, amount, paid_by_id, split_type, selected_members, split_values }`. Res: `{ expense }`.
- `GET /balances`: Returns mathematical balances and simplified debts. Auth: JWT. Res: `{ balances, simplifiedDebts }`.

### Group Settlements (`/api/groups/:id/settlements`)
- `GET /`: List settlements. Auth: JWT. Res: `{ settlements }`.
- `POST /`: Record settlement. Auth: JWT. Body: `{ paid_to_id, amount }`. Res: `{ settlement }`.

### Expenses & Chat (`/api/expenses/:id`)
- `GET /`: Expense detail and splits. Auth: JWT. Res: `{ expense }`.
- `DELETE /`: Deletes expense and cascades splits/chat. Auth: JWT. Res: `{ success: true }`.
- `GET /messages`: List chat messages. Auth: JWT. Res: `{ messages }`.
- `POST /messages`: Create chat message. Auth: JWT. Body: `{ content }`. Res: `{ message }`.

---

## 5. Mathematical Models

### 5.1 Split Logic Algorithm
The `splitCalculator` takes a total expense amount and divides it among participants based on the `split_type`.
1. **EQUAL**: `baseAmount = floor(total * 100 / count) / 100`. Remainder (`total - baseAmount * count`) is mapped out by sequentially adding `0.01` to the first `N` participants until exhausted. This guarantees the sum of splits exactly equals the original amount.
2. **EXACT**: Verifies that the sum of the provided values strictly equals the total amount. Assigns exact values to users.
3. **PERCENTAGE**: `amount = Math.round(total * percentage / 100)`. Remainder is distributed systematically (just like EQUAL) to ensure the final total is mathematically perfect.
4. **SHARES**: `totalShares = sum(shares)`. Each participant gets `amount = Math.round(total * share / totalShares)`. Remainder is distributed to ensure mathematical perfection.

### 5.2 Balance Calculation
Balances are calculated *at query time* dynamically from three raw tables: `Expense`, `ExpenseSplit`, and `Settlement`.
- **+ (Positive)**: Credits (User paid an expense, User received a settlement).
- **- (Negative)**: Debits (User owes a split share, User paid a settlement).
- **Net Balance**: The sum of all credits and debits per user.

### 5.3 Debt Simplification (Greedy Algorithm)
1. Split balances into `debtors` (negative balance) and `creditors` (positive balance).
2. Sort both lists descending by absolute amount.
3. Match the largest debtor with the largest creditor.
4. Record a simplified debt (`debtor owes creditor Math.min(debtor_amount, creditor_amount)`).
5. Reduce both balances by that amount. If a balance reaches zero, move to the next person.
6. Repeat until all balances are zero. This perfectly minimizes the total number of transactions.

---

## 6. Frontend Architecture

### State Management
- `AuthContext`: Context API for token storage (`localStorage`), `login`, `register`, `logout`, and initial profile fetch.
- `Axios`: Intercepts every request to inject the `Bearer ${token}` and listens for 401 Unauthorized responses to dispatch a logout event.

### Routing & Pages
1. `App.jsx`: Uses `react-router-dom`. Configures `<ProtectedRoute>` wrapper.
2. `LoginPage.jsx`: Email/password form.
3. `RegisterPage.jsx`: Name/email/password form.
4. `DashboardPage.jsx`: Shows total user balance, individual group cards, and Create Group modal.
5. `GroupDetailPage.jsx`: Shows members, expenses feed, simplified debt list, Add Expense modal, and Settle Up modal.
6. `ExpenseDetailPage.jsx`: Expense detail, exact breakdown of splits, deletion capability, and Realtime Chat component.

### Supabase Realtime Setup
- **Why**: Used strictly for the realtime comment feed on individual expenses.
- **Security**: PostgreSQL RLS is disabled on `chat_messages`. The frontend subscribes using the Supabase `anon` key. Since no financial data is exposed in the chat, this avoids complex custom JWT integration with Supabase. Write-access is strictly controlled by Express.
- **Flow**: User sends message -> Express validates auth & saves to DB -> Supabase triggers `postgres_changes` event -> React optimistically appends and syncs incoming messages from others.

---

## 7. Known Limitations & Tradeoffs

1. **Disconnected Settlements**: If an expense is deleted, any settlements previously made to pay for that expense are *not* automatically deleted. This leaves mathematically correct but confusing "reverse-debts". Settlements must be manually balanced by creating reverse settlements, as the UI does not currently allow deleting them.
2. **No Offline Support**: The PWA/offline caching layer is not implemented.
3. **Email Invites**: Because automated email systems were excluded from scope, users must manually register before their friends can add them to a group by their exact email.
4. **Supabase Client vs. ORM**: Prisma handles all backend database mutations via the `pg` transaction pooler. The `@supabase/supabase-js` client is deliberately imported *only* in the frontend solely for WebSocket subscriptions.
