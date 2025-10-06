-- Create leagues table for hierarchical league structure
CREATE TABLE IF NOT EXISTS public.leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  name text NOT NULL,
  tier integer NOT NULL,
  sport sport_type NOT NULL,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(country, name, sport)
);

-- Enable RLS on leagues
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;

-- Everyone can view leagues
CREATE POLICY "Anyone can view leagues"
ON public.leagues
FOR SELECT
USING (true);

-- Insert sample leagues data
INSERT INTO public.leagues (country, name, tier, sport) VALUES
-- England Football
('England', 'Premier League', 1, 'football'),
('England', 'Championship', 2, 'football'),
('England', 'League One', 3, 'football'),
('England', 'League Two', 4, 'football'),

-- Spain Football
('Spain', 'La Liga', 1, 'football'),
('Spain', 'Segunda División', 2, 'football'),

-- Germany Football
('Germany', 'Bundesliga', 1, 'football'),
('Germany', '2. Bundesliga', 2, 'football'),

-- Italy Football
('Italy', 'Serie A', 1, 'football'),
('Italy', 'Serie B', 2, 'football'),

-- France Football
('France', 'Ligue 1', 1, 'football'),
('France', 'Ligue 2', 2, 'football'),

-- USA Basketball
('USA', 'NBA', 1, 'basketball'),
('USA', 'G League', 2, 'basketball'),

-- USA Baseball
('USA', 'MLB', 1, 'baseball'),
('USA', 'Minor League', 2, 'baseball'),

-- International Tennis
('International', 'ATP Tour', 1, 'tennis'),
('International', 'WTA Tour', 1, 'tennis'),

-- International Boxing
('International', 'WBC', 1, 'boxing'),
('International', 'WBA', 1, 'boxing'),
('International', 'IBF', 1, 'boxing'),
('International', 'WBO', 1, 'boxing');