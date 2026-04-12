

## Fix "Add to Home Screen" and Google Sign-In

### Issue 1: Add to Home Screen — Missing Icons

The `manifest.json` only has a 64x64 favicon. Chrome requires at least a **192x192** and a **512x512** icon to show the install prompt. Without them, the app is not considered installable.

**Fix:** Generate proper PNG icons and update `manifest.json` with 192x192 and 512x512 entries plus a `purpose: "any maskable"` field.

### Issue 2: Google Sign-In — Wrong API

Both `Login.tsx` and `Signup.tsx` use `supabase.auth.signInWithOAuth()` directly. Lovable Cloud projects must use the managed OAuth flow via `lovable.auth.signInWithOAuth()` from `@lovable.dev/cloud-auth-js`. The direct Supabase call bypasses the Cloud OAuth broker and fails.

**Fix:**
1. Run the Configure Social Auth tool to generate the `src/integrations/lovable/` module
2. Update `Login.tsx` and `Signup.tsx` to import and use `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`

### Files to Change

| File | Change |
|---|---|
| `public/manifest.json` | Add 192x192 and 512x512 icon entries |
| `public/icon-192.png` | Generate purple RealScore icon |
| `public/icon-512.png` | Generate purple RealScore icon |
| `src/pages/Login.tsx` | Switch Google OAuth to `lovable.auth.signInWithOAuth` |
| `src/pages/Signup.tsx` | Switch Google OAuth to `lovable.auth.signInWithOAuth` |

