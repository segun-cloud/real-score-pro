

## Comprehensive Notification System Tied to User Favourites

### Overview
Enhance the existing notification infrastructure to deliver rich, event-driven alerts for favourited matches, teams, and leagues. Notifications will cover the full match lifecycle (pre-match through post-match) plus news/transfer/injury updates.

### Notification Types

| Type | Trigger | Example |
|------|---------|---------|
| `match_reminder` | 1 hour before kickoff | "Arsenal vs Chelsea kicks off in 1 hour" |
| `match_kickoff` | Match status changes to live | "Arsenal vs Chelsea has kicked off!" |
| `goal` | Score change detected | "GOAL! Arsenal 1-0 Chelsea" |
| `red_card` | Red card event from API | "Red Card! Player sent off" |
| `yellow_card` | Yellow card event | "Yellow Card for Player" |
| `penalty` | Penalty awarded/scored | "Penalty! Arsenal scores from the spot" |
| `substitution` | Key substitution | "Substitution: Player On for Player Off" |
| `halftime` | Status changes to HT | "Half Time: Arsenal 1-0 Chelsea" |
| `match_ended` | Status changes to FT | "Full Time: Arsenal 2-1 Chelsea" |
| `news` | Sports feed with injury/transfer tag | "Transfer: Player signs for Club" |

### Backend Changes

**1. Add `notification_preferences` table** (migration)
```sql
CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  match_reminders boolean DEFAULT true,
  match_kickoff boolean DEFAULT true,
  goals boolean DEFAULT true,
  cards boolean DEFAULT true,
  match_end boolean DEFAULT true,
  news_updates boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```
With RLS for owner-only access. One row per user, created on first notification toggle.

**2. Enhance `update-live-scores` edge function**
- Track previous status per match (not just scores) in `match_score_cache` -- add `status` and `events_hash` columns to detect new events
- When status transitions: `scheduled -> live` = kickoff, `live -> HT` = halftime, `live/HT -> FT` = match ended
- Fetch match events from API-Sports (`/fixtures/events?fixture=ID`) for goals, cards, penalties, substitutions
- For each detected event, query `user_favourites` to find affected users, then insert into `user_notifications`
- Also trigger browser push via `send-goal-notification` (rename/generalize to `send-match-notification`)

**3. New `check-upcoming-matches` edge function** (scheduled via pg_cron every 15 min)
- Queries API-Sports for fixtures starting within the next 60-75 minutes
- Cross-references with `user_favourites` (match, team, league entity types)
- Inserts `match_reminder` notifications for matched users
- Uses a `reminder_sent_cache` to avoid duplicate reminders

**4. Enhance `send-goal-notification` -> rename to `send-match-notification`**
- Generalize to handle all notification types, not just goals
- Different notification title/body templates per event type

### Frontend Changes

**5. Enhance `useFavoriteNotifications` hook**
- Subscribe to `user_notifications` INSERT events (already subscribed to `live_scores`)
- Show different toast styles per notification type (goal = success, red card = destructive, reminder = info)
- Play different notification sounds per event type (optional)

**6. Update `NotificationsList` component**
- Add icons for new notification types: cards (yellow/red), whistle (kickoff/end), clock (reminder), newspaper (news)
- Add filter tabs: All, Matches, News

**7. Add Notification Settings to Profile page**
- Toggle preferences: Match Reminders, Kickoff Alerts, Goals, Cards, Match End, News Updates
- Reads/writes from `notification_preferences` table

**8. Update `NotificationBell`**
- Subscribe to realtime inserts on `user_notifications` for instant badge count updates (already done)

### Database Migrations
1. Create `notification_preferences` table with RLS
2. Add `status` column to `match_score_cache` table
3. Create `reminder_sent_cache` table (match_id + user_id unique, with TTL cleanup)

### Technical Notes
- The `update-live-scores` function already polls every 10 seconds from the frontend; event detection piggybacks on this
- API-Sports `/fixtures/events` endpoint provides goals, cards, substitutions, VAR decisions
- All notification inserts use service role key (bypasses RLS) since they're system-generated
- The existing `user_notifications` INSERT policy already allows public inserts (`WITH CHECK: true`)

