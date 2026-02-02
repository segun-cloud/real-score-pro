

## Plan: Remove Fun Hub Matches from Home Screen

### Problem
The Home screen is incorrectly displaying Fun Hub competition matches alongside real live scores. This creates confusion because:
- Fun Hub matches (from the `matches` table) are for the user's team competitions
- Real live scores (from SportMonks API) are actual professional matches
- These should be kept completely separate

### Solution
Remove the "Competition Matches" section from the Home screen. Fun Hub matches should only be visible in the Fun Hub → Matches tab (which already works correctly via `MyMatches.tsx`).

---

### Changes Required

**File: `src/pages/Home.tsx`**

1. **Remove the `dbMatches` state and `loadDbMatches` function** (lines 32, 50-69)
   - These fetch Fun Hub competition matches which don't belong on the Home screen

2. **Remove the `loadDbMatches()` call** from the useEffect (line 43)

3. **Remove the entire "Competition Matches" section** (lines 269-359)
   - This section displays Fun Hub matches with "Simulate Match" buttons
   - This should only be in Fun Hub, not on the main scores screen

---

### Result
After this fix:
- **Home screen** → Shows only real API matches (live scores from SportMonks)
- **Fun Hub → Matches tab** → Shows user's competition matches with simulation options

The dummy fixtures I created for testing will only appear in Fun Hub where they belong.

