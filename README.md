# Skyward Properties CRM

Internal CRM for Skyward Properties — built with TanStack Start, React, TypeScript, and Supabase.

## Features
- Lead management (Kanban + table view, drag-and-drop)
- Property inventory with image upload to Supabase Storage
- Property-to-lead matching engine
- Follow-up scheduling
- Real-time sync across devices (Supabase Realtime)
- Role-based access (Admin / Sales)
- Reporting & analytics
- Activity log & notifications

## Tech Stack
- **Framework:** TanStack Start (React + TypeScript)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **Styling:** Tailwind CSS v4
- **Charts:** Recharts

## Setup

### 1. Clone & install
```bash
git clone https://github.com/rahul200618/strict-visual-hug.git
cd strict-visual-hug
npm install
```

### 2. Configure Supabase
```bash
cp .env.example .env
```
Fill in your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### 3. Run database schema
Go to your Supabase project → **SQL Editor** → paste and run `supabase/schema.sql`.

### 4. Create auth users
Go to **Authentication → Users → Add user** in Supabase dashboard.

### 5. Create storage bucket
Go to **Storage → New bucket** → name: `property-images` → set to **Public**.

### 6. Start dev server
```bash
npm run dev
```

## Deploy
```bash
npm run build
npx nitro deploy --prebuilt
```
