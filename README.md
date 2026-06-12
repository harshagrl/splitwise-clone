# Splitwise Clone

A fully functional, modern clone of the popular expense sharing application, Splitwise. This app allows users to create groups, add expenses with various split methods (Equal, Exact, Percentage, Shares), simplify debts, record settlements, and chat about specific expenses in real-time.

Built entirely via pair programming with **Claude Code by Anthropic**.

**Deployed Application:** [Insert Vercel URL Here]  
**GitHub Repository:** [Insert Repo URL Here]

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS v3, React Router DOM, Axios
- **Backend**: Node.js, Express, Prisma ORM, Zod, JWT
- **Database**: PostgreSQL (hosted on Supabase)
- **Realtime Services**: Supabase Realtime (for live comment threads)

## Features
- **Authentication**: JWT-based custom auth.
- **Group Management**: Add users by exact email matching.
- **Complex Splitting Math**: Supports exact amounts, percentages, and share-based splits perfectly rounded to 2 decimal places.
- **Debt Simplification**: Greedy algorithmic calculation to ensure the absolute minimum number of payments between group members.
- **Live Chat**: Instant, socket-based comment threads on specific expenses.

---

## Local Setup Instructions

### 1. Prerequisites
- Node.js (v18+)
- A free Supabase account for the database

### 2. Environment Variables

Create `.env` inside the `server/` directory:
```ini
# Supabase Transaction Pooler (Port 6543) - used by the app at runtime
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"

# Supabase Session Pooler (Port 5432) - used ONLY for Prisma migrations
DIRECT_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

# Backend Configuration
PORT="5000"
JWT_SECRET="super_secret_jwt_string_123"
CLIENT_URL="http://localhost:5173"
```

Create `.env` inside the `client/` directory:
```ini
# Backend URL
VITE_API_URL="http://localhost:5000/api"

# Supabase Realtime Config (Found in Project Settings > API)
VITE_SUPABASE_URL="https://[project-ref].supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key-here"
```

### 3. Backend Setup

Open a terminal and run:
```bash
cd server
npm install

# Push the schema to Supabase to create your tables
npx prisma db push

# Generate the Prisma client
npx prisma generate

# Start the development server
npm run dev
```

### 4. Supabase Realtime Setup
In your Supabase Dashboard:
1. Go to **Authentication > Policies** and confirm RLS is **disabled** for the `chat_messages` table.
2. Go to **Database > Replication** and turn on Realtime for the `chat_messages` table.

### 5. Frontend Setup

Open a second terminal and run:
```bash
cd client
npm install

# Start the Vite development server
npm run dev
```

Visit `http://localhost:5173` to view the application!
