
-- Create live_match_state table for real-time match phase tracking
CREATE TABLE public.live_match_state (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id text NOT NULL,
  phase text NOT NULL DEFAULT 'safe',
  ball_x numeric NOT NULL DEFAULT 50,
  ball_y numeric NOT NULL DEFAULT 50,
  attacking_team text,
  home_attacks integer DEFAULT 0,
  home_dangerous_attacks integer DEFAULT 0,
  away_attacks integer DEFAULT 0,
  away_dangerous_attacks integer DEFAULT 0,
  home_possession numeric DEFAULT 50,
  away_possession numeric DEFAULT 50,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(match_id)
);

-- Enable RLS
ALTER TABLE public.live_match_state ENABLE ROW LEVEL SECURITY;

-- Anyone can read live match state
CREATE POLICY "Anyone can view live match state"
ON public.live_match_state
FOR SELECT
TO public
USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_match_state;
