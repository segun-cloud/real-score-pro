-- Create live_scores table for real-time score tracking
CREATE TABLE public.live_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id TEXT NOT NULL UNIQUE,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled',
  minute INTEGER,
  league_name TEXT NOT NULL,
  home_team_logo TEXT,
  away_team_logo TEXT,
  sport TEXT NOT NULL DEFAULT 'football',
  match_date TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_scores ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view live scores (public data)
CREATE POLICY "Anyone can view live scores"
ON public.live_scores
FOR SELECT
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_live_scores_match_id ON public.live_scores(match_id);
CREATE INDEX idx_live_scores_status ON public.live_scores(status);

-- Enable realtime for live_scores table
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_scores;