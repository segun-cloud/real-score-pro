

## Plan: Fix Notification Display & Auto-Toggle Live Matches

### Problem 1: Notification Always Off

**Current Behavior:**
- The bell icon shows as "off" (hollow bell) for most users
- Only users who previously enabled push notifications show the "on" state

**Root Cause:**
- This is expected behavior - the notification toggle shows the current subscription state
- Users must click the bell to request browser permission and subscribe
- The Lovable preview environment may have limitations with Web Push API

**Solution:**
Add better visual feedback and debugging to help understand notification state.

**Changes to `src/components/NotificationToggle.tsx`:**
- Add console logging to debug the notification state
- Show loading state while checking subscription

---

### Problem 2: Auto-Toggle to Live Matches

**Current Behavior:**
- The "Show Live Only" toggle defaults to OFF
- Users must manually enable it

**Desired Behavior:**
- Automatically enable "Live Only" mode when there are live matches available

**Changes to `src/pages/Home.tsx`:**
- After loading matches, check if any have `status === 'live'`
- If live matches exist, automatically set `showLiveOnly` to `true`
- Only auto-enable on initial load (not on refresh) to avoid annoying users who manually turned it off

---

### Technical Implementation

#### NotificationToggle.tsx
- Add console logging to track `isSupported`, `isSubscribed`, `permission` values
- This will help diagnose why notifications appear off

#### Home.tsx  
- Add a `hasAutoToggledLive` ref to track if we've already auto-toggled
- After `apiMatches` loads, check if any are live
- If live matches exist and we haven't auto-toggled yet, set `showLiveOnly = true`

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Home.tsx` | Add auto-toggle logic for live matches |
| `src/components/NotificationToggle.tsx` | Add debugging logs |

