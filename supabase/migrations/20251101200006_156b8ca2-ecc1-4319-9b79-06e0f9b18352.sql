-- Fix security issues by updating RLS policies

-- 1. Drop overly permissive policy on api_request_log and replace with admin-only access
DROP POLICY IF EXISTS "Anyone can view request logs" ON api_request_log;

-- 2. Drop overly permissive policy on api_match_cache and replace with authenticated-only access
DROP POLICY IF EXISTS "Anyone can view cached matches" ON api_match_cache;
CREATE POLICY "Authenticated users can view cached matches" ON api_match_cache
  FOR SELECT TO authenticated
  USING (true);

-- 3. Drop overly permissive policy on user_teams
DROP POLICY IF EXISTS "Users can view other teams for matches" ON user_teams;

-- 4. Keep the existing "Users can view their own teams" policy, but add a new policy for viewing opponent teams in active competitions
CREATE POLICY "Users can view opponent teams in competitions" ON user_teams
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM competition_participants cp1
      JOIN competition_participants cp2 ON cp1.competition_id = cp2.competition_id
      JOIN competitions c ON c.id = cp1.competition_id
      WHERE cp1.team_id IN (SELECT id FROM user_teams WHERE user_id = auth.uid())
      AND cp2.team_id = user_teams.id
      AND c.status IN ('active', 'upcoming')
    )
  );

-- 5. Drop overly permissive policy on team_players
DROP POLICY IF EXISTS "Users can view players from any team" ON team_players;

-- 6. Add policy to view players from teams in active competitions
CREATE POLICY "Users can view players from competition teams" ON team_players
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT ut.id FROM user_teams ut
      WHERE ut.user_id = auth.uid()
    )
    OR
    team_id IN (
      SELECT ut.id FROM user_teams ut
      JOIN competition_participants cp1 ON cp1.team_id = ut.id
      JOIN competition_participants cp2 ON cp2.competition_id = cp1.competition_id
      JOIN competitions c ON c.id = cp1.competition_id
      WHERE cp2.team_id IN (SELECT id FROM user_teams WHERE user_id = auth.uid())
      AND c.status IN ('active', 'upcoming')
    )
  );