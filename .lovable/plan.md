

## Derive Match Phases from API-Sports Statistics

### Problem
The current `useMatchPhaseTracker` hook depends on Goalserve (a separate paid API you don't have). It polls a `fetch-live-match-state` edge function that calls Goalserve, which means live match phases never actually work.

### Solution
Rewrite `useMatchPhaseTracker` to derive phases entirely from API-Sports statistics that are **already being fetched** via `fetch-match-details-apisports`. The hook will poll that existing edge function every 30 seconds, compare stat deltas (shots, corners, possession), and infer the current match phase.

### Phase Inference Logic

```text
Every 30s, fetch fresh statistics from API-Sports:

1. Compare new stats vs previous stats:
   - Shots on target increased for team X → "dangerous_attack" by team X
   - Total shots increased for team X     → "attack" by team X  
   - Corners increased for team X         → "setpiece" by team X
   - Fouls increased against team X       → opponent was attacking

2. If no stat deltas detected:
   - Possession > 60% for team X → "attack" by team X
   - Possession 40-60%           → "safe"
   - Possession < 40% for team X → opponent "attack"

3. Ball position approximation from phase:
   - dangerous_attack (home): ballX ~80, ballY ~50
   - attack (home):           ballX ~65, ballY ~45
   - safe:                    ballX ~50, ballY ~50
   - (mirrored for away team)

4. Phase decays back to "safe" after 15 seconds if no new deltas
```

### Files to Change

| File | Change |
|------|--------|
| `src/hooks/useMatchPhaseTracker.tsx` | Rewrite: remove Goalserve dependency, poll `fetch-match-details-apisports` every 30s, compare stat deltas to derive phase |
| `supabase/functions/fetch-live-match-state/index.ts` | Delete or repurpose — no longer needed since we use existing `fetch-match-details-apisports` |
| `src/pages/MatchDetails.tsx` | Remove `goalserveMatchId` prop from hook call; pass `matchDetails.statistics` to the hook so it can also use already-fetched stats without extra API calls |
| `src/components/LiveMatchTracker.tsx` | Pass `livePhase` and `liveAttackingTeam` down to the `FootballTracker` inside it (currently not wired) |
| `src/components/SportTracker.tsx` | Add `livePhase` and `liveAttackingTeam` props to pass through to `FootballTracker` |

### What stays the same
- `live_match_state` table — kept for caching derived phases (optional, can skip DB entirely and keep it client-side only)
- `FootballTracker.tsx` and `useFootballSimEngine.ts` — already accept `livePhase`/`liveAttackingTeam` props, no changes needed
- No new API keys, no new edge functions, no new costs

### Technical Detail: Hook Rewrite

The new `useMatchPhaseTracker` will:
1. Accept `matchId`, `isLive`, and optionally the current `statistics` object from MatchDetails
2. Store previous stats in a ref
3. Every 30s, call `fetch-match-details-apisports` to get fresh stats
4. Diff the stats to determine phase and attacking team
5. Set a 15-second decay timer to return to "safe" if no new deltas
6. Approximate ball position based on inferred phase
7. No Realtime subscription needed — purely client-side polling + inference

