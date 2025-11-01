import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";

interface StandingsEntry {
  id: string;
  team_id: string;
  points_earned: number;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  team: {
    team_name: string;
    user_id: string;
  };
}

interface CompetitionStandingsProps {
  competitionId: string;
  userTeamId?: string;
  division: number;
}

export const CompetitionStandings = ({ competitionId, userTeamId, division }: CompetitionStandingsProps) => {
  const [standings, setStandings] = useState<StandingsEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStandings();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel(`standings_${competitionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'competition_participants',
          filter: `competition_id=eq.${competitionId}`
        },
        () => {
          loadStandings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [competitionId]);

  const loadStandings = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('competition_participants')
        .select(`
          *,
          team:user_teams(team_name, user_id)
        `)
        .eq('competition_id', competitionId)
        .order('points_earned', { ascending: false })
        .order('goal_difference', { ascending: false })
        .order('goals_for', { ascending: false });

      if (data) {
        setStandings(data as any);
      }
    } catch (error) {
      console.error('Error loading standings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMedalEmoji = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return null;
  };

  const getPositionBadge = (position: number) => {
    // Promotion zone (top 4) - only for Div 2-4
    if (position <= 4 && division > 1 && division <= 4) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    // Relegation zone (17-20) - only for Div 2-4
    if (position >= 17 && position <= 20 && division > 1 && division <= 4) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading standings...</div>;
  }

  if (standings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Competition Standings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            No teams have joined this competition yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Competition Standings
        </CardTitle>
      </CardHeader>
      <CardContent>
        {division > 1 && division <= 4 && (
          <div className="flex gap-4 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Top 4: Promotion</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-muted-foreground">Bottom 4: Relegation</span>
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Pos</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-center">P</TableHead>
                <TableHead className="text-center">W</TableHead>
                <TableHead className="text-center">D</TableHead>
                <TableHead className="text-center">L</TableHead>
                <TableHead className="text-center">GF</TableHead>
                <TableHead className="text-center">GA</TableHead>
                <TableHead className="text-center">GD</TableHead>
                <TableHead className="text-center font-bold">Pts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standings.map((entry, index) => {
                const position = index + 1;
                const isUserTeam = entry.team_id === userTeamId;
                const medal = getMedalEmoji(position);
                const positionIndicator = getPositionBadge(position);

                return (
                  <TableRow 
                    key={entry.id}
                    className={isUserTeam ? 'bg-primary/10 font-semibold' : ''}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1">
                        {medal || position}
                        {positionIndicator}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {entry.team.team_name}
                        {isUserTeam && <Badge variant="outline">You</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{entry.matches_played}</TableCell>
                    <TableCell className="text-center">{entry.wins}</TableCell>
                    <TableCell className="text-center">{entry.draws}</TableCell>
                    <TableCell className="text-center">{entry.losses}</TableCell>
                    <TableCell className="text-center">{entry.goals_for}</TableCell>
                    <TableCell className="text-center">{entry.goals_against}</TableCell>
                    <TableCell className="text-center">
                      <span className={entry.goal_difference > 0 ? 'text-green-600' : entry.goal_difference < 0 ? 'text-red-600' : ''}>
                        {entry.goal_difference > 0 ? '+' : ''}{entry.goal_difference}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-bold">{entry.points_earned}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};