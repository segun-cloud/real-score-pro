

## Real Match Phase Tracking: The Data Problem

### The Core Issue

API-Sports (your current data provider) **does not provide** real-time match phases like "Attack", "Dangerous Attack", or "Safe Ball". These indicators come from specialized providers like **Goalserve** or **BetRadar** that track:
- Ball coordinates (x, y) every 1 second
- Game states (attack, dangerous attack, throw-in, shot, offside)
- Which team has possession in real-time

API-Sports only provides:
- Score updates
- Match events (goals, cards, subs) — after they happen
- Statistics (possession %, shots, corners) — updated periodically

### Two Options

**Option A: Add Goalserve as a secondary data source (recommended for real data)**

Goalserve provides exactly what you want:
- `attacks` / `dangerous_attacks` counts per team, updated every 2-5 seconds
- Ball position coordinates (x, y) every 1 second
- Game state labels: "attack", "dangerous attack", "safe", "throw-in", "corner", "shot"
- Cost: paid API (~$50-150/month depending on plan)

Implementation:
1. New edge function `fetch-live-match-state` that polls Goalserve for the current match state
2. Store attack state + ball position in a `live_match_state` table (match_id, phase, ball_x, ball_y, attacking_team, updated_at)
3. Frontend subscribes via Realtime and feeds real phase data into the tracker
4. The tracker animation responds to actual "attack" / "dangerous attack" / "safe" labels

**Option B: Derive phases from API-Sports statistics (no extra cost, approximation)**

Use the statistics we already fetch (possession, shots, corners) to infer phases:
- Poll `fetch-match-details-apisports` every 30 seconds during live matches
- Compare stat deltas: if home shots increased → home was attacking
- If possession shifts heavily one way → that team is building up
- If shots-on-target increase → dangerous attack phase
- This is an approximation — there's a 30-second delay and it's inferring, not reading real state

Implementation:
1. Add a `useMatchPhaseTracker` hook that polls stats every 30s
2. Detect stat changes (shot count up = attack happened, corner up = set piece)
3. Feed derived phase into the simulation engine to bias animations
4. Show "Attack" / "Dangerous Attack" labels based on stat velocity

### Files to Change (Either Option)

| File | Change |
|------|--------|
| New edge function | Fetch live match state (Goalserve) or poll stats more frequently |
| New `live_match_state` table | Store phase, ball position, attacking team per match |
| `src/hooks/useFootballSimEngine.ts` | Accept `phase` from real data instead of generating randomly |
| `src/components/trackers/FootballTracker.tsx` | Display real phase labels ("Attack", "Dangerous Attack", "Safe") |
| `src/components/LiveMatchTracker.tsx` | Pass real `currentAction` from API data instead of hardcoded `minute % 5` |
| `src/pages/MatchDetails.tsx` | Subscribe to live match state and pass to tracker |

### Recommendation

Option A (Goalserve) gives you **real** attack/dangerous attack data like FlashScore and SofaScore use. Option B is free but is an educated guess with delays. Which would you prefer?

