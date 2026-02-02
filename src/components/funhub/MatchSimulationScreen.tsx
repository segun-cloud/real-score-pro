import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, FastForward, Trophy, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMatchSimulation } from "@/hooks/useMatchSimulation";
import { SportTracker } from "@/components/SportTracker";
import type { Match as SportMatch } from "@/types/sports";

interface MatchData {
  id: string;
  competition_id: string;
  home_team_id: string;
  away_team_id: string;
  home_team_name: string;
  away_team_name: string;
  match_date: string;
  sport: string;
}

interface SimulationResult {
  homeScore: number;
  awayScore: number;
  events: Array<{ minute: number; type: string; team: 'home' | 'away' }>;
}

interface MatchSimulationScreenProps {
  matchId: string;
  userId: string;
  onBack: () => void;
  onComplete: () => void;
}

export const MatchSimulationScreen = ({ 
  matchId, 
  userId, 
  onBack, 
  onComplete 
}: MatchSimulationScreenProps) => {
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [phase, setPhase] = useState<'ready' | 'simulating' | 'saving' | 'complete'>('ready');
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);

  const simulation = useMatchSimulation({
    homeTeam: matchData?.home_team_name || 'Home',
    awayTeam: matchData?.away_team_name || 'Away',
    sport: matchData?.sport || 'football',
    homeStrength: 60,
    awayStrength: 55
  });

  useEffect(() => {
    loadMatchData();
  }, [matchId]);

  const loadMatchData = async () => {
    try {
      // Get match with team and competition details
      const { data: match, error } = await supabase
        .from('matches')
        .select(`
          id,
          competition_id,
          home_team_id,
          away_team_id,
          match_date,
          home_team:user_teams!matches_home_team_id_fkey(id, user_id, team_name),
          away_team:user_teams!matches_away_team_id_fkey(id, user_id, team_name),
          competitions(sport)
        `)
        .eq('id', matchId)
        .single();

      if (error) throw error;

      if (match) {
        setMatchData({
          id: match.id,
          competition_id: match.competition_id,
          home_team_id: match.home_team_id,
          away_team_id: match.away_team_id,
          home_team_name: (match.home_team as any)?.team_name || 'Unknown',
          away_team_name: (match.away_team as any)?.team_name || 'Unknown',
          match_date: match.match_date,
          sport: (match.competitions as any)?.sport || 'football'
        });

        // Determine which team belongs to user
        if ((match.home_team as any)?.user_id === userId) {
          setUserTeamId(match.home_team_id);
        } else if ((match.away_team as any)?.user_id === userId) {
          setUserTeamId(match.away_team_id);
        }
      }
    } catch (error) {
      console.error('Error loading match:', error);
      toast.error('Failed to load match data');
    } finally {
      setIsLoading(false);
    }
  };

  const startSimulation = async () => {
    setPhase('simulating');
    simulation.startSimulation();
  };

  const skipToResult = async () => {
    simulation.stopSimulation();
    await saveResult();
  };

  const saveResult = async () => {
    if (!matchData) return;
    
    setPhase('saving');
    
    try {
      const { data, error } = await supabase.functions.invoke('simulate-match-user', {
        body: { matchId: matchData.id }
      });

      if (error) throw error;

      if (data?.result) {
        setResult({
          homeScore: data.result.homeScore,
          awayScore: data.result.awayScore,
          events: data.result.events
        });
        setPhase('complete');
      }
    } catch (error: any) {
      console.error('Error saving result:', error);
      toast.error(error.message || 'Failed to save match result');
      setPhase('ready');
    }
  };

  // Watch for simulation completion
  useEffect(() => {
    if (phase === 'simulating' && !simulation.isSimulating && simulation.currentMinute > 0) {
      saveResult();
    }
  }, [simulation.isSimulating, phase]);

  const getResultMessage = () => {
    if (!result || !userTeamId || !matchData) return '';
    
    const isHome = matchData.home_team_id === userTeamId;
    const userScore = isHome ? result.homeScore : result.awayScore;
    const opponentScore = isHome ? result.awayScore : result.homeScore;
    
    if (userScore > opponentScore) return '🎉 Victory!';
    if (userScore < opponentScore) return '😔 Defeat';
    return '🤝 Draw';
  };

  const getResultColor = () => {
    if (!result || !userTeamId || !matchData) return 'text-muted-foreground';
    
    const isHome = matchData.home_team_id === userTeamId;
    const userScore = isHome ? result.homeScore : result.awayScore;
    const opponentScore = isHome ? result.awayScore : result.homeScore;
    
    if (userScore > opponentScore) return 'text-green-500';
    if (userScore < opponentScore) return 'text-red-500';
    return 'text-yellow-500';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading match...</p>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Match not found</p>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  // Create match object for SportTracker
  const trackerMatch: SportMatch = {
    id: matchData.id,
    homeTeam: matchData.home_team_name,
    awayTeam: matchData.away_team_name,
    homeScore: phase === 'complete' && result ? result.homeScore : simulation.homeScore,
    awayScore: phase === 'complete' && result ? result.awayScore : simulation.awayScore,
    status: phase === 'simulating' ? 'live' : 'scheduled',
    minute: simulation.currentMinute,
    sport: matchData.sport as any,
    league: 'Fun Hub',
    startTime: matchData.match_date
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          {phase === 'simulating' && (
            <Badge variant="destructive" className="animate-pulse">
              LIVE {simulation.currentMinute}'
            </Badge>
          )}
          {phase === 'complete' && (
            <Badge variant="secondary">
              Full Time
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Score Display */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <p className={`font-bold text-lg ${matchData.home_team_id === userTeamId ? 'text-primary' : ''}`}>
                  {matchData.home_team_name}
                </p>
                {matchData.home_team_id === userTeamId && (
                  <Badge variant="outline" className="text-xs mt-1">You</Badge>
                )}
              </div>
              
              <div className="px-8 text-center">
                <div className={`text-4xl font-bold ${phase === 'complete' ? getResultColor() : ''}`}>
                  {phase === 'complete' && result 
                    ? `${result.homeScore} - ${result.awayScore}`
                    : phase === 'simulating'
                    ? `${simulation.homeScore} - ${simulation.awayScore}`
                    : 'vs'
                  }
                </div>
                {phase === 'simulating' && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {simulation.currentMinute}' / {simulation.maxMinute}'
                  </p>
                )}
              </div>
              
              <div className="text-center flex-1">
                <p className={`font-bold text-lg ${matchData.away_team_id === userTeamId ? 'text-primary' : ''}`}>
                  {matchData.away_team_name}
                </p>
                {matchData.away_team_id === userTeamId && (
                  <Badge variant="outline" className="text-xs mt-1">You</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sport Tracker Visualization */}
        {(phase === 'simulating' || phase === 'complete') && (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <SportTracker
                match={trackerMatch}
                isSimulating={phase === 'simulating'}
                ballPosition={simulation.ballPosition}
                currentEvent={simulation.currentEvent}
              />
            </CardContent>
          </Card>
        )}

        {/* Result Message */}
        {phase === 'complete' && (
          <Card className="bg-card/50">
            <CardContent className="p-6 text-center">
              <Trophy className={`h-12 w-12 mx-auto mb-2 ${getResultColor()}`} />
              <h2 className={`text-2xl font-bold ${getResultColor()}`}>
                {getResultMessage()}
              </h2>
              <p className="text-muted-foreground mt-2">
                Match completed and standings updated
              </p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {phase === 'ready' && (
            <Button 
              onClick={startSimulation} 
              size="lg" 
              className="w-full"
            >
              <Play className="h-5 w-5 mr-2" />
              Start Match
            </Button>
          )}

          {phase === 'simulating' && (
            <Button 
              onClick={skipToResult} 
              variant="outline" 
              size="lg" 
              className="w-full"
            >
              <FastForward className="h-5 w-5 mr-2" />
              Skip to Result
            </Button>
          )}

          {phase === 'saving' && (
            <Button disabled size="lg" className="w-full">
              Saving result...
            </Button>
          )}

          {phase === 'complete' && (
            <Button 
              onClick={onComplete} 
              size="lg" 
              className="w-full"
            >
              Back to Matches
            </Button>
          )}
        </div>

        {/* Match Events Log */}
        {phase === 'complete' && result && result.events.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold mb-3">Match Events</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {result.events.map((event, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="text-muted-foreground w-12">{event.minute}'</span>
                    <span>
                      {event.type === 'goal' && '⚽'}
                      {event.type === 'basket' && '🏀'}
                      {event.type === 'set' && '🎾'}
                      {event.type === 'run' && '⚾'}
                      {event.type === 'round' && '🥊'}
                    </span>
                    <span className={event.team === 'home' ? 'text-primary' : ''}>
                      {event.team === 'home' ? matchData.home_team_name : matchData.away_team_name}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
