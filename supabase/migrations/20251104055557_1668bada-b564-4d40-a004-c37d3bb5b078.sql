-- Create security definer function to check opponent team visibility
CREATE OR REPLACE FUNCTION public.can_view_opponent_team(_viewer uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM competition_participants cp_target
    JOIN competitions c ON c.id = cp_target.competition_id
    JOIN competition_participants cp_self ON cp_self.competition_id = cp_target.competition_id
    JOIN user_teams ut_self ON ut_self.id = cp_self.team_id
    WHERE cp_target.team_id = _team_id
      AND ut_self.user_id = _viewer
      AND ut_self.id != _team_id
      AND c.status IN ('active', 'upcoming')
  );
$$;

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view opponent teams in competitions" ON user_teams;

-- Create new policy using the security definer function
CREATE POLICY "Users can view opponent teams in competitions" ON user_teams
  FOR SELECT
  USING (
    public.can_view_opponent_team(auth.uid(), id)
  );