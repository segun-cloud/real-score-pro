
You're right — I stacked features instead of fixing things. Here is an evidence-based audit of every confirmed bug across the four areas you flagged, with the exact fix in one batch. I will not write any code until you approve.

## Confirmed bugs (with file + line evidence)

### A. Authentication
1. **Stale `currentScreen` in auth listener** — `App.tsx` `onAuthStateChange` reads `currentScreen` but the effect runs once on mount with no dep. After Google OAuth redirect, it can stick on the wrong screen. Also onboarding decision races a `setTimeout(0)` query and can flicker.
2. **No `useAuthReady` gate** — Components query Supabase before the session is restored from storage; under bad timing RLS fails silently.
3. **Signup success toast fires even when email confirmation is required** — Misleads user.
4. **Forgot-password redirect is `/`** not a dedicated `/reset-password` — the UpdatePassword screen relies on `PASSWORD_RECOVERY` event but this can race with normal session restore and skip the screen.

### B. Ads + Add to Home Screen
5. **AdMob test/prod mode hardcoded `useTesting=false`** — In dev/web preview the placeholder is correct, but on a fresh native build the real Ad IDs will return "no fill" until AdMob approval, leaving banner blank with no fallback. Default should be `useTesting = !import.meta.env.PROD`.
6. **Interstitial/Rewarded Ad IDs are placeholders** (`INTERSTITIAL_ID`, `REWARDED_ID`) — will crash AdMob calls in production builds.
7. **A2HS guide blocks the whole UI** with `z-[100] fixed inset-0` even on tablets/landscape, no escape via Esc, dismissed flag is set only on completion or X — not on "Maybe later" path properly (it does call `onDismiss`, OK), but it never re-checks `isStandalone` so users who installed mid-session still see it next visit until they dismiss.
8. **Manifest icon `purpose: "any maskable"`** — combining "any maskable" in one entry is deprecated; Chrome wants separate entries. Currently A2HS install prompt may not appear on Android.
9. **No `apple-touch-icon` link in `index.html`** — iOS A2HS uses a generic screenshot instead of your icon.

### C. Live data + Match Details tabs
10. **CRITICAL: Duplicate `case "statistics":`** in `MatchDetails.tsx` lines 343 and 373. The first case has no `return` on the success path, so it falls through into `case "odds":` → wrong content shown for Stats tab when stats exist.
11. **Hardcoded mock fixtures** in the Matches tab (lines 1105-1133) — Sevilla, Barcelona, Valencia hardcoded for every match.
12. **Hardcoded mock highlights** in Media tab (lines 1160-1164) — "Benzema Goal", "Lewandowski Goal" shown for every match.
13. **`mockUserProfile` used as initial coins** — coin balance check (`userProfile.coins >= 20`) reads stale mock data, not the real user balance from `user_profiles`. The AI prediction button enables/disables incorrectly.
14. **`getBallPosition` fallback uses `Math.sin(minute)` procedural noise** — when phase tracker has no data, the ball wobbles randomly which looks broken.
15. **`useMatchPhaseTracker` sets state THEN inferred state in two separate `setState` calls** (lines 99-117) — second overwrites first when batched, possession counters reset to defaults on each poll.
16. **League standings lookup uses `.single()` with truncated league name** (`split(' ').slice(0, 2)`) — fails for "UEFA Champions League", "Premier League 2", etc., dropping standings tab silently.
17. **No live matches today** in API-Sports (logs confirm: 0 matches for 2026-04-16 across all polls). User sees "Showing sample matches" toast every refresh — annoying & misleading. Should show empty state without spamming.

### D. Fun Hub / coins / notifications
18. **`FunHub.tsx` initial coin state is `1000`** (line 30) — flashes 1000 before profile loads, lying to the user.
19. **`generateRandomName`** picks from 10 names — every team has duplicate player names quickly.
20. **Coin deduction not atomic** — Team creation deducts coins via a separate UPDATE (line 141) without `select` check; race condition lets users go negative.
21. **`useFavoriteNotifications` matches teams by case-insensitive name only** — "Man Utd" ≠ "Manchester United" so favorites silently miss most goal alerts.
22. **`usePushNotifications` uses a public-demo VAPID key** (well-known Mozilla example key) — push subscriptions won't actually deliver from your edge functions.
23. **Goal toast in `useFavoriteNotifications` derives `scoringTeam` only by which score went up** — wrong if both scored between polls or score corrected downward.

### E. Cross-cutting
24. **No global error boundary** — any crash in MatchDetails/FunHub white-screens the whole app.
25. **`mockMatches.filter` always called even when `selectedSport` doesn't match any mock** — silent empty list, confusing toast.
26. **Edge function `update-live-scores` polls every 10s 24/7** even when no live matches. Needless API spend (logs show this firing constantly).

## Fix plan (single consolidated change set)

I will deliver these in **one** approved code change, not stacked patches:

| # | Fix | Files |
|---|---|---|
| 1 | Refactor auth: extract `useAuthReady` hook; remove `setTimeout`; correct screen routing post-OAuth; gate guarded queries on `isReady && user` | `src/hooks/useAuthReady.ts` (new), `src/App.tsx` |
| 2 | Add `/reset-password` handling tied to `PASSWORD_RECOVERY` event only; signup toast respects email confirmation | `src/App.tsx`, `src/pages/Signup.tsx`, `src/pages/Login.tsx` |
| 3 | AdMob: dev-mode default = test ads, remove fake interstitial/rewarded IDs (mark as TODO + no-op until set), proper web fallback height | `src/hooks/useAdMob.ts`, `src/components/BannerAd.tsx` |
| 4 | A2HS: split manifest icons (`any` + `maskable` separate), add `apple-touch-icon` link, re-check standalone on each load | `public/manifest.json`, `index.html`, `src/App.tsx` |
| 5 | **Fix duplicate `statistics` case** + return on success path; remove all hardcoded fixtures/highlights, show real `matchDetails.events`/`media` or proper empty states | `src/pages/MatchDetails.tsx` |
| 6 | Replace `mockUserProfile` with real `user_profiles.coins` fetched on mount + realtime subscription; AI prediction button gates on real balance | `src/pages/MatchDetails.tsx` |
| 7 | Phase tracker: combine into single `setState` (functional update with merged inferred), drop random `sin/cos` ball wobble in favor of held position | `src/hooks/useMatchPhaseTracker.tsx`, `src/pages/MatchDetails.tsx` |
| 8 | League lookup: use `ilike` with full league name, `.maybeSingle()`, fallback log | `src/pages/MatchDetails.tsx` |
| 9 | Throttle "Showing sample matches" toast (once per session), and switch to clean empty state | `src/pages/Home.tsx` |
| 10 | FunHub: initial coins `0` (not 1000), atomic coin deduction via Postgres function `deduct_coins(user_id, amount)`, expanded random name pool | `src/pages/FunHub.tsx` + new migration |
| 11 | Favorite notifications: store team `api_team_id` and match by ID not name; clarify scoring team via diff > 0 AND validation | `src/hooks/useFavoriteNotifications.tsx` + favourites schema check |
| 12 | Push notifications: surface a clear warning + disable subscribe button until a real `VAPID_PUBLIC_KEY` secret is added; instructions in chat | `src/hooks/usePushNotifications.tsx` |
| 13 | Add global `ErrorBoundary` wrapping `<App>` content, with reset button | `src/components/ErrorBoundary.tsx` (new), `src/App.tsx` |
| 14 | `update-live-scores` cron: early-exit when no fixtures live for the sports in DB; reduce frequency dynamically | `supabase/functions/update-live-scores/index.ts` |

## Out of scope (won't touch this round)
- Visual redesign, new tabs, new features
- Capacitor native build pipeline (separate after fixes verified)
- New AdMob ad units (you must supply real interstitial/rewarded IDs)

## What I need from you to proceed
- **Real VAPID key pair** for push (or confirm you want push disabled until you generate one)
- **Real interstitial + rewarded AdMob IDs** (or confirm they should stay no-op)
- Approval to add the `deduct_coins` Postgres function (atomic coin spend) and to add an `api_team_id` column to `user_favourites` if missing

Approve this plan and I'll switch to default mode and ship all 14 fixes in one pass with verification.
