# Fun Hub Automation Setup

This document provides instructions for setting up automated match simulation and season management using cron jobs in Supabase.

## Prerequisites

Before running these SQL commands, ensure the following edge functions are deployed:
- `simulate-match`
- `process-season-end`
- `initialize-season`

## Step 1: Enable Required Extensions

Run this in your Supabase SQL editor:

```sql
-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

## Step 2: Create Daily Match Simulation Job

This cron job runs every day at 00:05 UTC to simulate matches scheduled for that day:

```sql
-- Daily match simulation (runs at 00:05 UTC every day)
SELECT cron.schedule(
  'simulate-daily-matches',
  '5 0 * * *', -- Every day at 00:05 UTC
  $$
  DO $$
  DECLARE
    match_record RECORD;
    match_date_start TIMESTAMPTZ;
    match_date_end TIMESTAMPTZ;
  BEGIN
    -- Define the date range for today's matches
    match_date_start := CURRENT_DATE;
    match_date_end := CURRENT_DATE + INTERVAL '1 day';
    
    -- Loop through all scheduled matches for today
    FOR match_record IN
      SELECT id
      FROM public.matches
      WHERE status = 'scheduled'
        AND match_date >= match_date_start
        AND match_date < match_date_end
    LOOP
      -- Call the simulate-match edge function
      PERFORM net.http_post(
        url := 'https://ioajkewinekfdoayvwqs.supabase.co/functions/v1/simulate-match',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvYWprZXdpbmVrZmRvYXl2d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODY0MjIsImV4cCI6MjA3NDk2MjQyMn0.pFkLAyV-8aSO0PXKVN8xennn8rna_4DbpEbROx13N1U'
        ),
        body := jsonb_build_object('matchId', match_record.id)
      );
      
      -- Log the simulation
      RAISE NOTICE 'Simulated match: %', match_record.id;
    END LOOP;
  END $$;
  $$
);
```

## Step 3: Create Weekly Season Management Job

This cron job runs every Monday at 01:00 UTC to check for completed competitions and process season endings:

```sql
-- Weekly season management (runs every Monday at 01:00 UTC)
SELECT cron.schedule(
  'manage-seasons-weekly',
  '0 1 * * 1', -- Every Monday at 01:00 UTC
  $$
  DO $$
  DECLARE
    comp_record RECORD;
  BEGIN
    -- Find competitions that have ended but not yet processed
    FOR comp_record IN
      SELECT id, season_id, sport
      FROM public.competitions
      WHERE status = 'active'
        AND end_date < NOW()
    LOOP
      -- Call process-season-end for each completed competition
      PERFORM net.http_post(
        url := 'https://ioajkewinekfdoayvwqs.supabase.co/functions/v1/process-season-end',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvYWprZXdpbmVrZmRvYXl2d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODY0MjIsImV4cCI6MjA3NDk2MjQyMn0.pFkLAyV-8aSO0PXKVN8xennn8rna_4DbpEbROx13N1U'
        ),
        body := jsonb_build_object('competitionId', comp_record.id)
      );
      
      RAISE NOTICE 'Processed season end for competition: %', comp_record.id;
    END LOOP;
    
    -- Check if any sports need new seasons initialized
    FOR comp_record IN
      SELECT DISTINCT sport
      FROM public.seasons
      WHERE status = 'completed'
        AND sport NOT IN (
          SELECT sport FROM public.seasons WHERE status IN ('active', 'upcoming')
        )
    LOOP
      -- Initialize new season for this sport
      PERFORM net.http_post(
        url := 'https://ioajkewinekfdoayvwqs.supabase.co/functions/v1/initialize-season',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvYWprZXdpbmVrZmRvYXl2d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODY0MjIsImV4cCI6MjA3NDk2MjQyMn0.pFkLAyV-8aSO0PXKVN8xennn8rna_4DbpEbROx13N1U'
        ),
        body := jsonb_build_object('sport', comp_record.sport)
      );
      
      RAISE NOTICE 'Initialized new season for sport: %', comp_record.sport;
    END LOOP;
  END $$;
  $$
);
```

## Step 4: Verify Cron Jobs

Check that your cron jobs are properly scheduled:

```sql
-- View all scheduled cron jobs
SELECT * FROM cron.job;

-- View cron job execution history
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

## Step 5: Manual Triggering (Testing)

You can manually trigger these jobs for testing:

```sql
-- Manually run the daily match simulation
SELECT cron.schedule('test-match-sim', '* * * * *', $$
  -- Paste the DO $$ block from Step 2 here
$$);

-- Unschedule the test job after running
SELECT cron.unschedule('test-match-sim');
```

## Monitoring

To monitor the automated system:

1. **Check Match Status:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
  COUNT(*) FILTER (WHERE status = 'completed') as completed
FROM matches
WHERE match_date >= CURRENT_DATE - INTERVAL '7 days';
```

2. **Check Competition Status:**
```sql
SELECT sport, status, COUNT(*)
FROM competitions
GROUP BY sport, status;
```

3. **Check Cron Execution Logs:**
```sql
SELECT 
  jobid,
  job_name,
  status,
  start_time,
  end_time,
  return_message
FROM cron.job_run_details
WHERE job_name IN ('simulate-daily-matches', 'manage-seasons-weekly')
ORDER BY start_time DESC
LIMIT 20;
```

## Troubleshooting

If matches aren't simulating:
1. Check that matches have `match_date` set correctly
2. Verify the edge functions are deployed
3. Check cron job execution logs for errors
4. Ensure `pg_net` has proper permissions

If seasons aren't processing:
1. Check competition `end_date` values
2. Verify all competitions in a season have completed
3. Check edge function logs for errors

## Notes

- All times are in UTC. Adjust cron schedules if needed for your timezone.
- The match simulation spreads matches across the season duration via the `generate-fixtures` function.
- Notifications are automatically created for promotions, relegations, and prize awards.
- Division movements are tracked in the `division_movements` table.
