

## Plan: Fix Remaining Bugs and Security Issues

### Fix 1: DOM Nesting Warning in CompetitionAdmin

**File:** `src/components/funhub/CompetitionAdmin.tsx` (lines 283-292)

**Change:** Replace the `<ul>` list inside `AlertDialogDescription` with a `<div>` wrapper that contains the description content. The `AlertDialogDescription` component wraps content in a `<p>` tag, so we need to restructure the HTML:

- Move the list content outside the `AlertDialogDescription` 
- Or use `asChild` prop on `AlertDialogDescription` and wrap with a `<div>` instead
- The cleanest solution is to keep the initial paragraph in `AlertDialogDescription` and add the list as a separate `<div>` element below it

### Fix 2: Enable Leaked Password Protection

**Action:** Configure authentication settings to enable leaked password protection using the Supabase configure-auth tool

### Fix 3: Add INSERT Policy for user_notifications

**Database Migration:** Add an RLS policy that allows:
- Service role to insert notifications for any user
- Or allow authenticated users to receive notifications addressed to them

```sql
CREATE POLICY "System can create notifications" ON user_notifications
FOR INSERT
WITH CHECK (true);
-- Or more restrictive: only allow backend/service role
```

### Fix 4: Audit and Tighten Permissive RLS Policies

**Action:** Review all tables with `USING (true)` policies and determine:
- Which need public read access (keep as-is for SELECT)
- Which need stricter write policies (update INSERT/UPDATE/DELETE)

---

## Summary of Changes

| Priority | Issue | File/Location | Change |
|----------|-------|---------------|--------|
| High | DOM nesting warning | `CompetitionAdmin.tsx` | Restructure AlertDialogDescription to avoid `<ul>` inside `<p>` |
| High | Missing INSERT policy | `user_notifications` table | Add RLS policy for inserting notifications |
| Medium | Leaked password | Auth config | Enable leaked password protection |
| Medium | Permissive RLS | Various tables | Audit and tighten as needed |

