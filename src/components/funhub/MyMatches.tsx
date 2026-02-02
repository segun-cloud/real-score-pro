import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Trophy, Play } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import type { UserTeam } from "@/types/funhub";

interface Match {
  id: string;
  competition_id: string;
  competition_name: string;
  home_team_id: string;
  away_team_id: string;
  home_team_name: string;
  away_team_name: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  match_date: string;
  isHomeTeam: boolean;
  competitionStatus?: string;
}

interface MyMatchesProps {
  userTeams: UserTeam[];
  onNavigate?: (screen: string, competitionId?: string) => void;
  onPlayMatch?: (matchId: string) => void;
}

export const MyMatches = ({ userTeams, onNavigate, onPlayMatch }: MyMatchesProps) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, [userTeams]);

  const loadMatches = async () => {
    if (userTeams.length === 0) {
      setIsLoading(false);
      return;
    }

    try {
      const teamIds = userTeams.map(t => t.id);

      // Get all matches where user's teams are playing
      const { data: matchData, error } = await supabase
        .from('matches')
        .select(`
          id,
          competition_id,
          home_team_id,
          away_team_id,
          home_score,
          away_score,
          status,
          match_date,
          home_team:user_teams!matches_home_team_id_fkey(team_name),
          away_team:user_teams!matches_away_team_id_fkey(team_name),
          competitions(name, status)
        `)
        .or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`)
        .order('match_date', { ascending: true });

      if (error) throw error;

      if (matchData) {
        // Filter out matches with deleted teams (null team references)
        const validMatches = matchData.filter((m: any) => 
          m.home_team?.team_name && m.away_team?.team_name
        );
        
        setMatches(validMatches.map((m: any) => ({
          id: m.id,
          competition_id: m.competition_id,
          competition_name: m.competitions?.name || 'Unknown Competition',
          home_team_id: m.home_team_id,
          away_team_id: m.away_team_id,
          home_team_name: m.home_team.team_name,
          away_team_name: m.away_team.team_name,
          home_score: m.home_score,
          away_score: m.away_score,
          status: m.status,
          match_date: m.match_date,
          isHomeTeam: teamIds.includes(m.home_team_id),
          competitionStatus: m.competitions?.status
        })));
      }
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const upcomingMatches = matches.filter(m => m.status === 'scheduled');
  const completedMatches = matches.filter(m => m.status === 'completed');

  const getMatchResult = (match: Match) => {
    if (match.status !== 'completed') return null;
    
    const userScore = match.isHomeTeam ? match.home_score : match.away_score;
    const opponentScore = match.isHomeTeam ? match.away_score : match.home_score;
    
    if (userScore === null || opponentScore === null) return null;
    
    if (userScore > opponentScore) return 'win';
    if (userScore < opponentScore) return 'loss';
    return 'draw';
  };

  const canPlayMatch = (match: Match) => {
    if (match.status !== 'scheduled') return false;
    if (match.competitionStatus !== 'active') return false;
    const matchDate = new Date(match.match_date);
    return isPast(matchDate) || isToday(matchDate);
  };

  const renderMatch = (match: Match) => {
    const result = getMatchResult(match);
    const matchDate = new Date(match.match_date);
    const isPastMatch = isPast(matchDate);
    const canPlay = canPlayMatch(match);
    
    return (
      <Card 
        key={match.id} 
        className={`transition-colors ${
          result === 'win' ? 'border-l-4 border-l-green-500' :
          result === 'loss' ? 'border-l-4 border-l-red-500' :
          result === 'draw' ? 'border-l-4 border-l-yellow-500' : ''
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">{match.competition_name}</span>
            <Badge variant={match.status === 'completed' ? 'secondary' : 'outline'}>
              {match.status === 'completed' ? 'Completed' : 
               canPlay ? 'Ready to Play' :
               isPastMatch ? 'Pending Result' : format(matchDate, 'MMM d')}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div className={`flex-1 ${match.isHomeTeam ? 'font-bold' : ''}`}>
              {match.home_team_name}
              {match.isHomeTeam && <span className="text-xs text-primary ml-1">(You)</span>}
            </div>
            
            <div className="px-4 text-lg font-bold">
              {match.status === 'completed' ? (
                <span className={
                  result === 'win' ? 'text-green-500' :
                  result === 'loss' ? 'text-red-500' : 'text-yellow-500'
                }>
                  {match.home_score} - {match.away_score}
                </span>
              ) : (
                <span className="text-muted-foreground">vs</span>
              )}
            </div>
            
            <div className={`flex-1 text-right ${!match.isHomeTeam ? 'font-bold' : ''}`}>
              {!match.isHomeTeam && <span className="text-xs text-primary mr-1">(You)</span>}
              {match.away_team_name}
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(matchDate, 'EEEE, MMMM d, yyyy')}
            </div>
            
            {canPlay && onPlayMatch && (
              <Button 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayMatch(match.id);
                }}
                className="gap-1"
              >
                <Play className="h-3 w-3" />
                Play
              </Button>
            )}
            
            {match.status === 'completed' && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate?.('competition-details', match.competition_id);
                }}
              >
                View Standings
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">Loading matches...</div>
    );
  }

  if (userTeams.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Create a team and join a competition to see your matches
        </CardContent>
      </Card>
    );
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No matches yet. Join a competition to get started!
        </CardContent>
      </Card>
    );
  }

  // Calculate stats
  const wins = completedMatches.filter(m => getMatchResult(m) === 'win').length;
  const draws = completedMatches.filter(m => getMatchResult(m) === 'draw').length;
  const losses = completedMatches.filter(m => getMatchResult(m) === 'loss').length;

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="font-medium">Season Record</span>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-green-500 font-bold">{wins}W</span>
              <span className="text-yellow-500 font-bold">{draws}D</span>
              <span className="text-red-500 font-bold">{losses}L</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="upcoming" className="flex-1">
            Upcoming ({upcomingMatches.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1">
            Results ({completedMatches.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-3">
          {upcomingMatches.length > 0 ? (
            upcomingMatches.map(renderMatch)
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No upcoming matches
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3">
          {completedMatches.length > 0 ? (
            [...completedMatches].reverse().map(renderMatch)
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No completed matches yet
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
