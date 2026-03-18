

## Make the Tracker Simulation Data-Driven

### Problem
The football tracker simulation is 100% random. It doesn't reflect actual match data — a team dominating possession 70-30 in reality would still show ~50-50 on the tracker.

### Solution
Feed real match statistics from the API into the simulation engine to bias its behavior, so the animation reflects actual match dynamics.

### How It Works

**1. Pass real stats into the engine**

The `update-live-scores` edge function already fetches match data. The `MatchDetails` page already has access to match statistics (possession, shots, etc.). We pass these into `useFootballSimEngine` as new props:

```text
realPossession?: { home: number, away: number }  // e.g. 62/38
realPressure?: 'home' | 'away' | 'neutral'       // derived from shots/corners
matchStatus?: string                               // 1H, 2H, HT, FT
```

**2. Bias the micro-event probabilities**

Instead of fixed 70/15/10/5 split, weight them by real stats:
- If home has 65% possession → home team gets ~65% of micro-events as the possessing team
- If away has more shots → increase shot attempt probability when away has ball
- Turnovers happen more for the team with less possession

**3. Bias formation shifts with real pressure**

Use shots-on-target ratio to determine which third the ball spends most time in. If home has 8 shots vs away's 2, the pressure zone naturally gravitates toward the away goal.

**4. Sync goal events from real data**

Already partially done — `currentEvent` triggers goal celebrations. Enhance to also trigger for cards, corners (set piece phase), and substitutions.

### Files to Change

| File | Change |
|------|--------|
| `src/hooks/useFootballSimEngine.ts` | Add `realStats` prop, bias `generateMicroEvent` probabilities and possession weighting |
| `src/components/trackers/FootballTracker.tsx` | Pass real stats from parent through to engine |
| `src/pages/MatchDetails.tsx` | Pass fetched match statistics to the tracker component |

### Key Logic Change in `generateMicroEvent`

```text
Current:  roll < 0.70 → pass (fixed)
Proposed: possessionBias = realPossession[currentTeam] / 100
          roll < (0.60 + possessionBias * 0.15) → pass
          This means team with 65% possession keeps ball ~69% of micro-events
          Team with 35% keeps it ~55%, creating natural turnover flow
```

### For Fun Hub Simulations
These don't have real API data, so the engine falls back to its current random behavior — which is correct since those matches are fictional.

### What This Does NOT Require
- No new database tables
- No new edge functions
- No API changes — uses data already being fetched

