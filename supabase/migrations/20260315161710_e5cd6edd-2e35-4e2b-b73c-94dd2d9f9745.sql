
-- notification_preferences table
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_reminders boolean NOT NULL DEFAULT true,
  match_kickoff boolean NOT NULL DEFAULT true,
  goals boolean NOT NULL DEFAULT true,
  cards boolean NOT NULL DEFAULT true,
  penalties boolean NOT NULL DEFAULT true,
  match_end boolean NOT NULL DEFAULT true,
  news_updates boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Add status and events_hash to match_score_cache
ALTER TABLE public.match_score_cache
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS events_hash text DEFAULT '';

-- reminder_sent_cache to avoid duplicate reminders
CREATE TABLE public.reminder_sent_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id text NOT NULL,
  user_id uuid NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(match_id, user_id)
);

ALTER TABLE public.reminder_sent_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can insert reminders"
  ON public.reminder_sent_cache FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read reminders"
  ON public.reminder_sent_cache FOR SELECT
  USING (true);
