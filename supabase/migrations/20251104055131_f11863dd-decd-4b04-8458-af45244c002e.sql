-- Fix infinite recursion in user_teams RLS policy
-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view opponent teams in competitions" ON user_teams;

-- Recreate the policy without recursion using JOINs
CREATE POLICY "Users can view opponent teams in competitions" ON user_teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM competition_participants cp1
      JOIN user_teams ut ON ut.id = cp1.team_id
      JOIN competition_participants cp2 ON cp2.competition_id = cp1.competition_id
      JOIN competitions c ON c.id = cp1.competition_id
      WHERE ut.user_id = auth.uid()
        AND cp2.team_id = user_teams.id
        AND user_teams.id != ut.id
        AND c.status IN ('active', 'upcoming')
    )
  );