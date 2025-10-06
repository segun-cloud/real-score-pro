-- Create API Match Cache table
CREATE TABLE api_match_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_match_id text UNIQUE NOT NULL,
  sport sport_type NOT NULL,
  league_name text NOT NULL,
  home_team text NOT NULL,
  away_team text NOT NULL,
  home_score integer,
  away_score integer,
  status text NOT NULL,
  match_date timestamptz NOT NULL,
  minute integer,
  raw_data jsonb NOT NULL,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create API Request Log table
CREATE TABLE api_request_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  sport sport_type,
  request_params jsonb,
  response_status integer,
  cached boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add API league mapping columns
ALTER TABLE leagues ADD COLUMN api_league_id text;
ALTER TABLE leagues ADD COLUMN api_provider text DEFAULT 'api-sports';

-- Enable RLS
ALTER TABLE api_match_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_request_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_match_cache (public read)
CREATE POLICY "Anyone can view cached matches"
ON api_match_cache FOR SELECT
USING (true);

-- RLS Policies for api_request_log (admin only, but for now public read for monitoring)
CREATE POLICY "Anyone can view request logs"
ON api_request_log FOR SELECT
USING (true);

-- Indexes for performance
CREATE INDEX idx_api_match_cache_sport ON api_match_cache(sport);
CREATE INDEX idx_api_match_cache_date ON api_match_cache(match_date);
CREATE INDEX idx_api_match_cache_status ON api_match_cache(status);
CREATE INDEX idx_api_match_cache_updated ON api_match_cache(last_updated);
CREATE INDEX idx_api_request_log_created ON api_request_log(created_at);