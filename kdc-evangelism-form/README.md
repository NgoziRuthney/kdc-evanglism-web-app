# KDC Evangelism Portal

A full-stack church evangelism data collection web app built with React + Supabase, deployable on Vercel.

---

## 🗂 Project Structure

```
kdc-evangelism/
├── api/
│   └── admin-users.js        # Vercel serverless function (service role, server-only)
├── public/
│   └── kdc_logo.png
├── src/
│   ├── components/           # Reusable UI components
│   ├── contexts/             # Auth context
│   ├── layouts/              # Admin sidebar layout
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── MemberForm.jsx
│   │   └── admin/
│   │       ├── Dashboard.jsx
│   │       ├── Analytics.jsx
│   │       └── MembersConfig.jsx
│   └── utils/                # Supabase, IndexedDB, DOCX, constants
├── supabase/
│   └── schema.sql            # Run this first in Supabase SQL editor
├── .env                      # Local dev only — never commit
├── .env.example              # Template for team members
├── vercel.json
└── package.json
```

---

## ⚡ Step 1 — Supabase Database Setup

1. Go to [supabase.com](https://supabase.com) → your project
2. Navigate to **SQL Editor** → **New Query**
3. Paste the entire contents of `supabase/schema.sql` and click **Run**
4. Confirm tables `profiles`, `converts`, and `pending_admin_actions` were created

---

## 👤 Step 2 — Create First Admin (Emmanuel Elijah)

You cannot sign up through the app UI — admins are created via Supabase.

### A) Create the Auth User

1. Go to **Authentication** → **Users** → **Add User**
2. Fill in:
   - **Email:** `YOUR_NUMBER@kdc.app`  ← use this exact format
   - **Password:** `YOUR_PASSWORD`
3. Click **Create User**
4. Copy the **UUID** shown (looks like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### B) Insert the Profile Row

Go back to **SQL Editor** and run:

```sql
INSERT INTO profiles (id, full_name, phone_number, role)
VALUES (
  'PASTE_UUID_HERE',
  'YOUR_FULLNAME',
  'YOUR_PHONENUMBER',
  'admin'
);
```

Replace `PASTE_UUID_HERE` with the UUID you copied.

You can now log in with:
- **Phone:** `YOUR_PHONENUMBER`
- **Password:** `YOUR_PASSWORD`

---

## 🚀 Step 3 — Deploy to Vercel

### Option A: GitHub (Recommended)

1. Push this project to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repo
3. Framework preset: **Vite**
4. Add these **Environment Variables** in Vercel dashboard:


5. Click **Deploy**

### Option B: Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

Set environment variables when prompted, or add them in the Vercel dashboard after deploy.

---

## 💻 Local Development

```bash
npm install
npm run dev
```

The `.env` file is already configured. Open `http://localhost:5173`.

---

## 🔐 Security Notes

- The **Service Role Key** is only used in `api/admin-users.js` (Vercel serverless). It is never sent to the browser.
- All admin routes verify the caller's JWT and check `profiles.role = 'admin'` server-side before executing.
- Row-Level Security (RLS) is enabled on all tables.
- Members can only INSERT converts — they cannot read, edit, or delete any data.
- Removing an admin requires confirmation from a **second, different admin**.

---

## 📋 User Roles

| Action | Member | Admin |
|--------|--------|-------|
| Login | ✅ | ✅ |
| Submit convert form | ✅ | ✅ (via modal) |
| View convert table | ❌ | ✅ |
| Edit / Delete converts | ❌ | ✅ |
| Download DOCX report | ❌ | ✅ |
| View analytics | ❌ | ✅ |
| Add / Remove members | ❌ | ✅ |
| Remove admin (requires 2nd admin) | ❌ | ✅ |

---

## 🛠 Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Database / Auth:** Supabase (PostgreSQL + RLS)
- **Offline Cache:** IndexedDB via `idb`
- **Charts:** Recharts
- **DOCX Export:** docx + file-saver
- **Deployment:** Vercel (SPA + Serverless API)
