# Mango Procurement Search

Production-grade starting point for importing Mango ERP PO, WO, and vendor Excel exports into Supabase, then searching and filtering the data.

## Scope

- PO and WO stay as separate modules.
- Monthly Excel/CSV import is the source of truth.
- Duplicate protection is enforced in Supabase:
  - `po_items`: `unique(po_no, line_no)`
  - `wo_documents`: `unique(wo_no)`
  - `suppliers`: unique vendor code and tax ID indexes
- Import flow is preview first, then commit.
- Sample Mango exports live in `tests/fixtures` and are used as parser acceptance tests.

## Setup

1. Create a Supabase project.
2. Run `supabase/migrations/001_initial_procurement.sql`.
3. Copy `.env.example` to `.env.local` and fill in Supabase values.
4. Run `supabase/migrations/004_app_users.sql`.
5. Set `AUTH_SECRET` for signed login sessions.
6. Create an app user:

```bash
npm run create-user -- admin your-password "Administrator"
```

7. Run:

```bash
npm install
npm run test
npm run dev
```

## Import Flow

1. Open the Import page.
2. Select PO, WO, or Vendor.
3. Upload the Mango export file.
4. Preview to see new/existing/conflict rows.
5. Commit when the preview looks right.

The database constraints make repeated imports idempotent. Re-importing the same PO line, WO number, or vendor code updates the existing row instead of creating duplicates.
