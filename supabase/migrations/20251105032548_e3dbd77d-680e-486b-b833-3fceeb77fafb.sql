-- PHASE 1: Create user_favourites table
CREATE TABLE IF NOT EXISTS public.user_favourites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('match', 'team', 'league', 'competition')),
  entity_id text NOT NULL,
  entity_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, entity_type, entity_id)
);

-- Enable RLS on user_favourites
ALTER TABLE public.user_favourites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_favourites
CREATE POLICY "Users can view their own favourites"
  ON public.user_favourites
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favourites"
  ON public.user_favourites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favourites"
  ON public.user_favourites
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for user_favourites
CREATE INDEX idx_user_favourites_user_id ON public.user_favourites(user_id);
CREATE INDEX idx_user_favourites_entity ON public.user_favourites(entity_type, entity_id);

-- PHASE 2: Add unique constraint for competition_participants
ALTER TABLE public.competition_participants 
ADD CONSTRAINT unique_team_per_competition 
UNIQUE (competition_id, team_id);

CREATE INDEX IF NOT EXISTS idx_competition_participants_lookup 
ON public.competition_participants(competition_id, team_id);

-- PHASE 2: Add coin balance validation function and trigger
CREATE OR REPLACE FUNCTION public.validate_coin_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.coins < 0 THEN
    RAISE EXCEPTION 'Coin balance cannot be negative';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_coin_balance ON public.user_profiles;
CREATE TRIGGER trigger_validate_coin_balance
  BEFORE INSERT OR UPDATE OF coins ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_coin_balance();

-- PHASE 2: Add unique constraints for other tables
ALTER TABLE public.team_players
ADD CONSTRAINT unique_jersey_per_team 
UNIQUE (team_id, jersey_number);

CREATE UNIQUE INDEX IF NOT EXISTS unique_match_per_competition 
ON public.matches(competition_id, home_team_id, away_team_id, match_date);

ALTER TABLE public.seasons
ADD CONSTRAINT unique_season_per_sport
UNIQUE (sport, season_number);