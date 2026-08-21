# Renover — Lovable renovation budget app

Private two-person home renovation budgeting app (NOK).

## Links

- **Editor:** https://lovable.dev/projects/9f972027-09a7-432f-a9f5-162ae10a36c1
- **Preview:** https://id-preview--9f972027-09a7-432f-a9f5-162ae10a36c1.lovable.app
- **Project ID:** `9f972027-09a7-432f-a9f5-162ae10a36c1`
- **Workspace:** Erlend's Lovable (`1433608d2f91ac300fab`)

## Local development

This repo contains the full Vite + React 19 implementation (Lovable project ran out of credits).

```bash
npm install
npm run dev
```

Supabase env vars are in `.env` — same backend as the Lovable project.

## Hierarchy

Renovation Project → Rooms → Categories → Expenses

## Data model

| Table | Key fields |
|-------|-----------|
| `profiles` | id, display_name |
| `renovation_projects` | name, invite_code, total_budget, created_by |
| `project_members` | project_id, user_id (max 2) |
| `rooms` | project_id, name, budget, sort_order, archived, deleted_at |
| `categories` | project_id, name, budget |
| `expenses` | description, room_id, category_id, quantity, unit, unit_price, total_override, discount_*, supplier, expense_date, status, who_paid, notes, deleted_at, total |
| `expense_attachments` | expense_id, file_path, file_name |
| `activity_events` | project_id, event_type, payload |

## Status

**Complete local app** — auth, dashboard, rooms, expenses, suppliers, settings, FAB, expense sheet, realtime, soft-delete with undo.

## Gaps / notes

- Supabase RLS policies and storage bucket (`receipts`) must exist on the backend
- Activity events are read-only (no write triggers in this app yet)
- Category management UI is minimal (categories used in expense sheet; no dedicated CRUD page)
- Recharts is installed but not yet used on dashboard (progress bars used instead)
