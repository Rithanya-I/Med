# Supabase Integration for MediSlot AI

This guide explains how to connect MediSlot AI to your Supabase project.

---

## 1. Retrieve Supabase Credentials

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Create a new project or select an existing one.
3. In **Project Settings** > **API**:
   - Copy **Project URL** (`https://<project-ref>.supabase.co`)
   - Copy **anon / public** key
   - Copy **service_role** secret key (for backend operations)
4. In **Project Settings** > **Database**:
   - Under **Connection string**, select **URI** and choose **Transaction Pooler** (port `6543`, recommended for serverless / edge environments) or **Direct connection** (port `5432`).
   - Copy the URI: `postgresql://postgres.<project-ref>:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`

---

## 2. Configure Environment Variables

Update your [`.env`](file:///c:/Users/Rithanya.I/Med/.env) file:

```env
# Supabase API Configuration
SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"

SUPABASE_ANON_KEY="<your-anon-key>"
VITE_SUPABASE_ANON_KEY="<your-anon-key>"

SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"

# PostgreSQL Database Connection
DATABASE_URL="postgresql://postgres.<your-project-ref>:<your-password>@aws-0-<region>.pooler.supabase.com:6543/postgres"
```

---

## 3. Apply Database Schema

You can apply the database schema in either of two ways:

### Option A: Via Supabase SQL Editor (Recommended)
1. Open your Supabase Dashboard and go to the **SQL Editor**.
2. Open the [`supabase/schema.sql`](file:///c:/Users/Rithanya.I/Med/supabase/schema.sql) file from this repository.
3. Paste the contents into the SQL Editor and click **Run**.
   - This creates tables: `users`, `specialties`, `doctors`, `appointments`, `favorite_doctors`, and `medibot_messages` with proper indexes and Row Level Security (RLS) policies.

### Option B: Via Drizzle Kit
Run the migration push command:
```bash
npm run db:push
```

---

## 4. Seed Initial Data

Populate verified medical specialists and specialties with realistic clinic profiles, fees, copays, and schedules:

```bash
npm run db:seed
```

---

## 5. Architecture & Integration Overview

- **Database Layer**: [`src/db/index.ts`](file:///c:/Users/Rithanya.I/Med/src/db/index.ts) uses a PostgreSQL connection pool configured for Supabase with SSL enabled by default.
- **Backend Supabase Client**: [`src/lib/supabase.ts`](file:///c:/Users/Rithanya.I/Med/src/lib/supabase.ts) provides an authenticated Supabase client using the Service Role or Anon key.
- **Frontend Supabase Client**: [`src/lib/supabase-client.ts`](file:///c:/Users/Rithanya.I/Med/src/lib/supabase-client.ts) provides a client for React components.
- **Hybrid Authentication**: [`src/middleware/auth.ts`](file:///c:/Users/Rithanya.I/Med/src/middleware/auth.ts) transparently supports both Supabase Auth JWT tokens and Firebase ID tokens.
- **Status Endpoint**: Check your live connection anytime by calling `GET /api/supabase/status`.
