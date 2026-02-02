

## Plan: Match Simulation System for Fun Hub

### Overview
Build a complete match simulation experience where users can watch their Fun Hub matches play out with visual animations, live score updates, and automatic database updates.

### Current State Analysis

**What exists:**
- `useMatchSimulation.tsx` hook: Generates random events and runs a 30-second client-side animation
- Sport-specific visual trackers: Football, Basketball, Tennis, Baseball, Boxing (with animated ball/player movements)
- `simulate-match` edge function: Calculates match result based on team strengths and updates the database (admin-only)
- `MyMatches.tsx`: Lists user's matches but has no simulation capability
- `CompetitionDetails.tsx`: Shows fixtures list but no simulation option

**What's missing:**
- No UI to trigger match simulation
- Edge function requires admin role (users can't simulate their own matches)
- No connection between client-side visual simulation and database updates
- No dedicated match simulation screen with the visual tracker

---

### Solution Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                    MATCH SIMULATION FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [MyMatches.tsx]                                               │
│       │                                                         │
│       ▼ Click "Play Match"                                     │
│  [MatchSimulationScreen.tsx] ◄── New Component                 │
│       │                                                         │
│       ├── Shows sport-specific visual tracker                  │
│       ├── Uses useMatchSimulation hook for animations          │
│       └── Calls simulate-match-user edge function              │
│                    │                                            │
│                    ▼                                            │
│  [simulate-match-user] ◄── New Edge Function                   │
│       │                                                         │
│       ├── Validates user owns one of the teams                 │
│       ├── Calculates result based on team strengths            │
│       ├── Updates match scores & status                        │
│       └── Updates competition_participants stats               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Implementation Steps

#### 1. Create New Edge Function: `simulate-match-user`

**File:** `supabase/functions/simulate-match-user/index.ts`

A user-facing version that:
- Validates the user owns at least one of the teams in the match
- Checks match is scheduled and match date is today or in the past
- Calculates team strengths from player ratings
- Generates realistic scores based on sport type
- Updates match record with final score
- Updates both teams' competition standings
- Returns the final result to the client

#### 2. Create Match Simulation Screen Component

**File:** `src/components/funhub/MatchSimulationScreen.tsx`

Features:
- Full-screen simulation experience
- Displays sport-specific visual tracker (FootballTracker, BasketballTracker, etc.)
- Shows team names, scores, and match minute
- "Start Match" button to begin simulation
- Uses `useMatchSimulation` hook for client-side animation
- Calls edge function at the end to save the result
- Victory/defeat celebration animation at the end
- "Back to Matches" button

#### 3. Update MyMatches Component

**File:** `src/components/funhub/MyMatches.tsx`

Changes:
- Add "Play Match" button for scheduled matches where:
  - Match date is today or earlier
  - User's team is participating
- Button opens the simulation screen
- Add callback to refresh matches after simulation completes

#### 4. Update FunHub Navigation

**File:** `src/pages/FunHub.tsx`

Changes:
- Add new `activeView` state: `'simulation'`
- Add `selectedMatchId` state
- Pass navigation callback to MyMatches
- Render MatchSimulationScreen when in simulation view

#### 5. Enhance useMatchSimulation Hook

**File:** `src/hooks/useMatchSimulation.tsx`

Changes:
- Add callback for when simulation completes
- Add ability to pass pre-determined result (from edge function)
- Support all sport types in SPORT_CONFIG
- Add more event types: cards, fouls, substitutions for football
- Return events list for match recap

---

### Technical Details

#### Edge Function Logic (simulate-match-user)

```text
1. Authenticate user from JWT
2. Fetch match details
3. Verify user owns home_team_id OR away_team_id
4. Check match.status === 'scheduled'
5. Check match.match_date <= NOW
6. Calculate team strengths:
   - Fetch team_players for both teams
   - Average overall_rating per team
7. Generate score based on sport:
   - Football: 0-5 goals (weighted by strength)
   - Basketball: 80-120 points (weighted)
   - Tennis: Best of 3/5 sets
   - etc.
8. Update matches table:
   - home_score, away_score, status='completed'
9. Update competition_participants:
   - matches_played, wins/draws/losses
   - goals_for, goals_against, points_earned
10. Return { homeScore, awayScore, events }
```

#### Match Simulation Screen UI

```text
┌────────────────────────────────────┐
│  ← Back          LIVE  45'         │
├────────────────────────────────────┤
│                                    │
│    [Sport-Specific Visual Tracker] │
│    (Football pitch, basketball     │
│     court, etc. with animations)   │
│                                    │
├────────────────────────────────────┤
│                                    │
│  Home Team FC      2 - 1    Away FC│
│                                    │
├────────────────────────────────────┤
│  Match Events:                     │
│  23' ⚽ Goal - Home Team           │
│  45' ⚽ Goal - Away Team           │
│  67' ⚽ Goal - Home Team           │
├────────────────────────────────────┤
│                                    │
│  [  Skip to Result  ]              │
│                                    │
└────────────────────────────────────┘
```

#### Match Eligibility Rules

A match can be simulated when:
1. Status is `scheduled`
2. `match_date` is today or in the past
3. Current user owns at least one participating team
4. Competition status is `active`

---

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/simulate-match-user/index.ts` | User-facing simulation endpoint |
| `src/components/funhub/MatchSimulationScreen.tsx` | Visual simulation experience |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/funhub/MyMatches.tsx` | Add "Play Match" button |
| `src/pages/FunHub.tsx` | Add simulation view routing |
| `src/hooks/useMatchSimulation.tsx` | Add completion callback |
| `supabase/config.toml` | Register new edge function |

---

### Edge Cases Handled

1. **User tries to simulate opponent's match:** Rejected - must own a team
2. **Match already completed:** Show error message
3. **Match date in future:** Button disabled with tooltip
4. **Network failure during save:** Show retry option
5. **User closes mid-simulation:** Match remains scheduled

### Additional Enhancements (Optional)

- **Match replay:** Store events and allow rewatching
- **Sound effects:** Goal celebrations, crowd noise
- **Skip animation:** "Simulate Instantly" for impatient users
- **Match summary:** Post-match stats screen with player ratings

