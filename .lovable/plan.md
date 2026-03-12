

## Issues Found

1. **Duplicate API fetch on mount** -- `Home.tsx` has two `useEffect` hooks that both call `loadApiMatches()` on initial render: one with `[]` deps (line 44) and one with `[selectedSport, selectedDate]` deps (line 60). This causes every match fetch to happen twice.

2. **Excessive console.log spam** -- `NotificationToggle.tsx` logs state on every render (line 18), causing 10+ log entries per page load. The `useLiveScores` hook also logs every realtime payload and subscription status change.

3. **Duplicate fetch on sport/date change** -- The first useEffect (line 44) is entirely redundant since the second one (line 60) already covers initial mount.

## Plan

### 1. Fix duplicate fetch in Home.tsx
- Remove the first `useEffect(() => { loadApiMatches(); }, [])` (lines 44-46) since the second effect with `[selectedSport, selectedDate]` already fires on mount.

### 2. Remove debug console.log in NotificationToggle.tsx
- Remove line 18 (`console.log('[NotificationToggle] State:' ...)`).

### 3. Remove verbose console.log in useLiveScores.tsx
- Remove `console.log('Realtime update received:', payload)` (line 86).
- Remove `console.log('Realtime subscription status:', status)` (line 148).
- Remove `console.log('Fetching matches for date:' ...)` in Home.tsx (line 72).

