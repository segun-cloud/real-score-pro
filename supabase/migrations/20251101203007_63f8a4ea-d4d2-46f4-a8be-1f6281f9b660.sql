-- Create seasons table for managing competition cycles
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport sport_type NOT NULL,
  season_number INTEGER NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('upcoming', 'active', 'completed')) DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sport, season_number)
);

-- Enable RLS on seasons
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

-- Anyone can view seasons
CREATE POLICY "Anyone can view seasons"
ON seasons FOR SELECT
TO authenticated
USING (true);

-- Update competitions table to support seasons and capacity
ALTER TABLE competitions ADD COLUMN season_id UUID REFERENCES seasons(id);
ALTER TABLE competitions ADD COLUMN max_participants INTEGER;
ALTER TABLE competitions ADD COLUMN match_generation_status TEXT DEFAULT 'pending';

-- Add indexes for performance
CREATE INDEX idx_competitions_season ON competitions(season_id);
CREATE INDEX idx_competitions_sport_division ON competitions(sport, division);

-- Update competition_participants table with detailed match statistics
ALTER TABLE competition_participants ADD COLUMN matches_played INTEGER DEFAULT 0;
ALTER TABLE competition_participants ADD COLUMN wins INTEGER DEFAULT 0;
ALTER TABLE competition_participants ADD COLUMN draws INTEGER DEFAULT 0;
ALTER TABLE competition_participants ADD COLUMN losses INTEGER DEFAULT 0;
ALTER TABLE competition_participants ADD COLUMN goals_for INTEGER DEFAULT 0;
ALTER TABLE competition_participants ADD COLUMN goals_against INTEGER DEFAULT 0;
ALTER TABLE competition_participants ADD COLUMN goal_difference INTEGER GENERATED ALWAYS AS (goals_for - goals_against) STORED;

-- Create division_movements table for tracking promotions/relegations
CREATE TABLE division_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES user_teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  from_division INTEGER NOT NULL,
  to_division INTEGER NOT NULL,
  movement_type TEXT CHECK (movement_type IN ('promotion', 'relegation', 'stayed')) NOT NULL,
  final_position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on division_movements
ALTER TABLE division_movements ENABLE ROW LEVEL SECURITY;

-- Users can view their own team's division movements
CREATE POLICY "Users can view their team's division movements"
ON division_movements FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_teams
    WHERE user_teams.id = division_movements.team_id
    AND user_teams.user_id = auth.uid()
  )
);

-- Update matches table to include match_day for scheduling
ALTER TABLE matches ADD COLUMN match_day INTEGER DEFAULT 1;