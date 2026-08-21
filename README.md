# Renover

Private two-person home renovation budgeting app (NOK). Built with Vite, React 19, TypeScript, Tailwind CSS v4, and Supabase.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Copy `.env.example` to `.env` if needed — credentials are already configured for the shared Supabase project.

```bash
npm run build   # production build
npm run preview # preview production build
```

## Features

- Email/password auth with display name
- Create project or join via invite code (max 2 members)
- Dashboard: budget, paid, projected, remaining, progress by room/category
- Rooms with budgets and expense tracking
- All expenses: search, filter, sort, edit, duplicate, soft-delete with undo
- Suppliers overview (auto-generated from expense data)
- Settings: profile, project budget, invite code, members, sign out
- Expense sheet: qty×price calc, status, discounts, receipt upload
- Realtime updates via Supabase subscriptions

## Tech stack

- **Frontend:** Vite 8, React 19, TypeScript, Tailwind CSS v4
- **Routing:** react-router-dom
- **Data:** Supabase (auth, Postgres, storage, realtime)
- **State:** TanStack React Query
- **UI:** lucide-react, sonner, recharts, date-fns

## Design

- Fraunces (display) + Sora (body)
- Forest-teal accent (`oklch(0.45 0.062 178)`)
- Soft atmospheric off-white backgrounds
- Mobile-first with bottom navigation

## Lovable project

The original Lovable scaffold (out of credits) lives here:

- **Editor:** https://lovable.dev/projects/9f972027-09a7-432f-a9f5-162ae10a36c1
- **Preview:** https://id-preview--9f972027-09a7-432f-a9f5-162ae10a36c1.lovable.app
- **Project ID:** `9f972027-09a7-432f-a9f5-162ae10a36c1`

This repo is the full local implementation wired to the same Supabase backend.

## Project structure

```
src/
  lib/          supabase client, types, format, calc, utils
  hooks/        auth, project, rooms, categories, expenses, suppliers, activity
  components/   layout, ui, expense
  pages/        dashboard, rooms, expenses, suppliers, settings, auth
```

See also [docs/renover-project.md](docs/renover-project.md).
