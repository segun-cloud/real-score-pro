import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Trophy } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { SportType } from "@/types/funhub";

interface Match {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  status: 'scheduled' | 'completed';
  match_date: string;
  match_day: number;
  home_team: { team_name: string };
  away_team: { team_name: string };
}

interface SeasonScheduleProps {
  teamId: string;
}

export const SeasonSchedule = ({ teamId }: SeasonScheduleProps) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, [teamId]);

  const loadMatches = async () => {
    setIsLoading(true);
    try {
      // Get competitions where this team is participating
      const { data: participations } = await supabase
        .from('competition_participants')
        .select('competition_id')
        .eq('team_id', teamId);

      if (!participations || participations.length === 0) {
        setMatches([]);
        setIsLoading(false);
        return;
      }

      const competitionIds = participations.map(p => p.competition_id);

      // Get matches for these competitions
      const { data: matchData } = await supabase
        .from('matches')
        .select(`
          *,
          home_team:user_teams!matches_home_team_id_fkey(team_name),
          away_team:user_teams!matches_away_team_id_fkey(team_name)
        `)
        .in('competition_id', competitionIds)
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .order('match_date', { ascending: true })
        .limit(10);

      if (matchData) {
        setMatches(matchData as any);
      }
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-4 text-muted-foreground">Loading schedule...</div>;
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Season Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No matches scheduled. Join a competition to get started!
          </p>
        </CardContent>
      </Card>
    );
  }

  const upcomingMatches = matches.filter(m => m.status === 'scheduled');
  const recentResults = matches.filter(m => m.status === 'completed').slice(0, 5);

  return (
    <div className="space-y-4">
      {upcomingMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Upcoming Matches
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingMatches.map(match => (
              <div key={match.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                <div className="flex-1">
                  <div className="font-semibold">
                    {match.home_team.team_name} vs {match.away_team.team_name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(match.match_date), 'MMM d, yyyy')} • Match Day {match.match_day}
                  </div>
                </div>
                <Badge variant="outline">{formatDistanceToNow(new Date(match.match_date), { addSuffix: true })}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {recentResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Recent Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentResults.map(match => {
              const isHomeTeam = match.home_team_id === teamId;
              const userScore = isHomeTeam ? match.home_score : match.away_score;
              const opponentScore = isHomeTeam ? match.away_score : match.home_score;
              const won = userScore! > opponentScore!;
              const draw = userScore === opponentScore;

              return (
                <div key={match.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex-1">
                    <div className="font-semibold">
                      {match.home_team.team_name} vs {match.away_team.team_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(match.match_date), 'MMM d, yyyy')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">
                      {match.home_score} - {match.away_score}
                    </span>
                    {won && <Badge className="bg-green-500">W</Badge>}
                    {draw && <Badge variant="secondary">D</Badge>}
                    {!won && !draw && <Badge variant="destructive">L</Badge>}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
};