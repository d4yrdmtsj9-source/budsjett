# Renover — renovation budget app

Private two-person home renovation budgeting app (NOK). Mobile-first Scandinavian product.

## Links

- **Local app (this repo):** `npm run dev` → http://localhost:5173
- **Lovable editor:** https://lovable.dev/projects/9f972027-09a7-432f-a9f5-162ae10a36c1
- **Lovable preview:** https://id-preview--9f972027-09a7-432f-a9f5-162ae10a36c1.lovable.app
- **Project ID:** `9f972027-09a7-432f-a9f5-162ae10a36c1`
- **Workspace:** Erlend's Lovable (`1433608d2f91ac300fab`)
- **Supabase:** `vqptscvjfcontauzdhqd`

## Why local + Lovable?

The Lovable agent scaffolded Cloud/Postgres (schema, RLS, design tokens) then the workspace ran out of credits before screens shipped. This repo is the complete working frontend wired to the same Lovable Cloud Supabase backend.

To finish the Lovable-hosted UI later: add credits at https://lovable.dev/settings/billing and continue the agent with the project knowledge already set on the Lovable project.

## Hierarchy

Renovation Project → Rooms → Categories → Expenses

## Calculations

- **Projected** = sum of all non-deleted expenses (all statuses)
- **Paid** = sum where status = `paid`
- Line total = `total_override` OR `quantity × unit_price − discount`
- Discount savings aggregated on the dashboard

## Data model

| Table | Purpose |
|-------|---------|
| `profiles` | Display names |
| `renovation_projects` | One shared renovation + invite code + total budget |
| `project_members` | Max 2 equal members (DB trigger) |
| `rooms` | Areas with optional budget, sort, archive, soft-delete |
| `categories` | Project-scoped, reusable across rooms |
| `expenses` | Line items with qty/unit/price, status, discounts, soft-delete |
| `expense_attachments` | Receipt files in `receipts` bucket |
| `activity_events` | Lightweight shared activity |

## Screens

1. Auth + create/join project
2. Dashboard (budget / paid / projected / remaining / by room & category / activity)
3. Rooms + room detail
4. All expenses (search, filter, sort, duplicate, undo delete)
5. Suppliers (auto from expenses)
6. Settings (invite code, budget, members)
7. FAB expense sheet (live qty×price, progressive discounts, receipts)

## Run

```bash
npm install
cp .env.example .env   # if needed
npm run dev
npm run build
```
