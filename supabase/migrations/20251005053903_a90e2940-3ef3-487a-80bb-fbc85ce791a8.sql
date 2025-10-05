-- Create enum for sports
CREATE TYPE public.sport_type AS ENUM (
  'football',
  'basketball',
  'tennis',
  'baseball',
  'boxing',
  'cricket',
  'ice-hockey',
  'rugby',
  'american-football'
);

-- Create enum for competition status
CREATE TYPE public.competition_status AS ENUM ('upcoming', 'active', 'completed');

-- Create enum for match status
CREATE TYPE public.match_status AS ENUM ('scheduled', 'completed');

-- User profiles table
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  coins INTEGER DEFAULT 1000 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- User teams table
CREATE TABLE public.user_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  sport sport_type NOT NULL,
  team_name TEXT NOT NULL,
  emblem_id INTEGER,
  kit_id INTEGER,
  division INTEGER DEFAULT 5 CHECK (division >= 1 AND division <= 5),
  points INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, sport)
);

-- Team players table
CREATE TABLE public.team_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.user_teams(id) ON DELETE CASCADE NOT NULL,
  player_name TEXT NOT NULL,
  position TEXT NOT NULL,
  jersey_number INTEGER NOT NULL,
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 99),
  pace INTEGER CHECK (pace >= 1 AND pace <= 99),
  shooting INTEGER CHECK (shooting >= 1 AND shooting <= 99),
  passing INTEGER CHECK (passing >= 1 AND passing <= 99),
  defending INTEGER CHECK (defending >= 1 AND defending <= 99),
  physical INTEGER CHECK (physical >= 1 AND physical <= 99),
  training_level INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Team emblems table (predefined)
CREATE TABLE public.team_emblems (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  svg_path TEXT NOT NULL,
  unlock_cost INTEGER DEFAULT 50 NOT NULL
);

-- Team kits table (predefined)
CREATE TABLE public.team_kits (
  id SERIAL PRIMARY KEY,
  sport sport_type NOT NULL,
  name TEXT NOT NULL,
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  pattern TEXT DEFAULT 'solid',
  unlock_cost INTEGER DEFAULT 100 NOT NULL
);

-- Competitions table
CREATE TABLE public.competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport sport_type NOT NULL,
  division INTEGER CHECK (division >= 1 AND division <= 5),
  name TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status competition_status DEFAULT 'upcoming',
  prize_coins INTEGER NOT NULL,
  entry_fee INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Competition participants table
CREATE TABLE public.competition_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.user_teams(id) ON DELETE CASCADE NOT NULL,
  final_position INTEGER,
  points_earned INTEGER DEFAULT 0,
  UNIQUE(competition_id, team_id)
);

-- Matches table
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE NOT NULL,
  home_team_id UUID REFERENCES public.user_teams(id) ON DELETE CASCADE NOT NULL,
  away_team_id UUID REFERENCES public.user_teams(id) ON DELETE CASCADE NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  status match_status DEFAULT 'scheduled',
  match_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_emblems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_teams
CREATE POLICY "Users can view their own teams"
  ON public.user_teams FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view other teams for matches"
  ON public.user_teams FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own teams"
  ON public.user_teams FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own teams"
  ON public.user_teams FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own teams"
  ON public.user_teams FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for team_players
CREATE POLICY "Users can view players from any team"
  ON public.team_players FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own team players"
  ON public.team_players FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_teams
      WHERE user_teams.id = team_players.team_id
      AND user_teams.user_id = auth.uid()
    )
  );

-- RLS Policies for team_emblems and kits (public read)
CREATE POLICY "Anyone can view emblems"
  ON public.team_emblems FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view kits"
  ON public.team_kits FOR SELECT
  USING (true);

-- RLS Policies for competitions
CREATE POLICY "Anyone can view competitions"
  ON public.competitions FOR SELECT
  USING (true);

-- RLS Policies for competition_participants
CREATE POLICY "Anyone can view participants"
  ON public.competition_participants FOR SELECT
  USING (true);

CREATE POLICY "Users can join competitions with their teams"
  ON public.competition_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_teams
      WHERE user_teams.id = competition_participants.team_id
      AND user_teams.user_id = auth.uid()
    )
  );

-- RLS Policies for matches
CREATE POLICY "Anyone can view matches"
  ON public.matches FOR SELECT
  USING (true);

-- Trigger for updated_at on user_profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, coins)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    1000
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Seed data for emblems
INSERT INTO public.team_emblems (name, svg_path, unlock_cost) VALUES
  ('Shield', 'M12 2L2 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z', 0),
  ('Lion', 'M12 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 4c-2.76 0-5 2.24-5 5v6h2v-2h6v2h2v-6c0-2.76-2.24-5-5-5z', 50),
  ('Eagle', 'M12 2L3 9v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V9l-9-7z', 100),
  ('Dragon', 'M12 2c-1.5 0-2.7 1.2-2.7 2.7 0 1.5 1.2 2.7 2.7 2.7s2.7-1.2 2.7-2.7c0-1.5-1.2-2.7-2.7-2.7z', 150),
  ('Phoenix', 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', 200),
  ('Wolf', 'M12 2L4 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-8-5z', 250),
  ('Tiger', 'M12 2c-2 0-3.5 1.5-3.5 3.5S10 9 12 9s3.5-1.5 3.5-3.5S14 2 12 2z', 300);

-- Seed data for kits (basic kits for each sport)
INSERT INTO public.team_kits (sport, name, primary_color, secondary_color, pattern, unlock_cost) VALUES
  ('football', 'Classic Red', '#FF0000', '#FFFFFF', 'solid', 0),
  ('football', 'Blue Stripes', '#0000FF', '#FFFFFF', 'stripes', 100),
  ('football', 'Green Gradient', '#00FF00', '#006600', 'gradient', 150),
  ('basketball', 'Classic Orange', '#FF8800', '#000000', 'solid', 0),
  ('basketball', 'Purple Gold', '#800080', '#FFD700', 'solid', 100),
  ('tennis', 'White Classic', '#FFFFFF', '#000080', 'solid', 0),
  ('tennis', 'Neon Yellow', '#FFFF00', '#000000', 'solid', 50),
  ('baseball', 'Pinstripes', '#FFFFFF', '#000080', 'stripes', 0),
  ('baseball', 'Red Sox', '#BD1F31', '#FFFFFF', 'solid', 100),
  ('boxing', 'Black Gold', '#000000', '#FFD700', 'solid', 0),
  ('boxing', 'Red Flame', '#FF0000', '#FFAA00', 'gradient', 75),
  ('cricket', 'Traditional White', '#FFFFFF', '#000080', 'solid', 0),
  ('cricket', 'Sky Blue', '#87CEEB', '#000080', 'solid', 100),
  ('ice-hockey', 'Black Red', '#000000', '#FF0000', 'solid', 0),
  ('ice-hockey', 'Blue Lightning', '#0000FF', '#FFFFFF', 'stripes', 150),
  ('rugby', 'Hoops', '#000000', '#FFFFFF', 'stripes', 0),
  ('rugby', 'Green Gold', '#006633', '#FFD700', 'solid', 100),
  ('american-football', 'Silver Black', '#C0C0C0', '#000000', 'solid', 0),
  ('american-football', 'Navy Gold', '#000080', '#FFD700', 'solid', 150);