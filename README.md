# Astral — Personal Astrology App

A multi-user astrology dashboard. Users sign up, enter their birth details, and get a fully calculated natal chart + AI Oracle powered by Swiss Ephemeris and OpenAI GPT-4o.

## Project Structure

```
astro-app/
├── public/
│   └── index.html          # Full frontend (auth + onboarding + dashboard)
├── api/
│   ├── chart.js            # Swiss Ephemeris natal chart calculation
│   ├── geocode.js          # Place name → lat/lon (free Nominatim API)
│   ├── oracle.js           # OpenAI GPT-4o oracle responses
│   └── profile.js          # Supabase user profile save/load
├── vercel.json
└── package.json
```

---

## Setup: 4 Services to Configure

### 1. Supabase (auth + database) — Free

1. Go to [supabase.com](https://supabase.com) → New Project
2. Once created, go to **SQL Editor** and run:

```sql
create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text unique not null,
  name text,
  birth_date date,
  birth_time time,
  birth_place text,
  lat float,
  lon float,
  timezone float,
  chart jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

3. Go to **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public key** → `SUPABASE_ANON_KEY` (for the frontend)
   - **service_role key** → `SUPABASE_SERVICE_KEY` (for the API, keep secret)

4. In `public/index.html`, replace at the top of the script:
```js
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

5. In Supabase → **Authentication → Email**, you can turn off "Confirm email" for testing (Settings → Auth → Enable email confirmations → off)

---

### 2. OpenAI API Key

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new key → copy it

---

### 3. Push to GitHub

1. Go to [github.com/new](https://github.com/new) — name it `astro-app`, leave everything unchecked
2. In terminal inside this folder:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/CalliopeMusic/astro-app.git
git push -u origin main
```

---

### 4. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → Add New Project → import `astro-app`
2. Leave all build settings as default
3. Add these **Environment Variables**:

| Name | Value |
|---|---|
| `OPENAI_API_KEY` | your OpenAI key |
| `SUPABASE_URL` | your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | your Supabase service_role key |

4. Click **Deploy**

---

## Local Development

```bash
npm install
```

Create `.env` in project root:
```
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

Install Vercel CLI and run:
```bash
npm install -g vercel
vercel dev
```

Visit `http://localhost:3000`

---

## How It Works

1. User signs up → Supabase creates an account
2. User enters birth details → geocode API converts city to lat/lon
3. Chart API runs Swiss Ephemeris calculations → returns planets, houses, aspects
4. Profile saved to Supabase with the chart JSON
5. Dashboard renders the chart wheel, tables, and Oracle
6. Oracle API passes the natal chart + today's sky to GPT-4o
