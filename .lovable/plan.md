

## Refactor MatchDetails.tsx into tab sub-components

The current `src/pages/MatchDetails.tsx` is 1,298 lines monolithic. The uploaded version is 501 lines with each tab extracted into its own file under `src/pages/tabs/`. This makes the codebase far easier to maintain.

### What I'll do

**1. Create `src/pages/tabs/` directory with 8 sub-components (exact code from your uploads):**
- `DetailsTab.tsx` — match events list
- `StatisticsTab.tsx` — football/basketball stats with progress bars
- `OddsTab.tsx` — home/draw/away odds card
- `StandingsTab.tsx` — league table with team highlight + cup empty state
- `LineupsTab.tsx` — football pitch + substitutes bench
- `MatchesTab.tsx` — H2H + recent fixtures empty state
- `MediaTab.tsx` — placeholder highlights/photos grid
- `PredictionTab.tsx` — AI prediction unlock + display (with `matchDetails.sport` fix)

**2. Replace `src/pages/MatchDetails.tsx`** with the uploaded 501-line version which:
- Imports the 8 tab components
- Keeps all data-loading effects (match details, standings, H2H, coin balance)
- Keeps `useMatchPhaseTracker` hook + handlers (`handleUnlockPrediction`, `handleWatchRewardedAd`)
- Renders the sticky header, match score card, and `TabNavigation`
- Uses a clean `renderTabContent()` switch

### Bug fixes baked into the refactor (vs current file)

- **Statistics tab no longer falls through to Odds** — the duplicate `case "statistics"` is removed
- **Derived values declared before `renderTabContent`** — avoids potential ReferenceError on const hoisting
- **`PredictionTab` uses `matchDetails.sport`** instead of optional `match.sport` (which can be undefined)
- **`MatchesTab` shows clean empty state** when no H2H data is available (no broken `recentMatches` references)
- **Score fallbacks** — `homeScore ?? 0` / `awayScore ?? 0` everywhere to avoid `undefined` rendering

### Verification

- Run `npx tsc --noEmit` to confirm no type errors
- Confirm all 9 tabs (Details, Tracker, Stats, Standings, Lineups, Media, AI, Matches, Odds) render without crashing
- Confirm coin balance loads from Supabase, AI prediction flow still deducts coins only on success, live tracker still receives `currentAction` + `ballPosition` from `matchPhase`

### File count
- 1 file replaced: `src/pages/MatchDetails.tsx` (1,298 → 501 lines)
- 8 new files: `src/pages/tabs/{DetailsTab,StatisticsTab,OddsTab,StandingsTab,LineupsTab,MatchesTab,MediaTab,PredictionTab}.tsx`

Approve and I'll switch to default mode and apply all 9 file changes in one pass.

