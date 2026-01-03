import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Trophy, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SportType, UserTeam } from "@/types/funhub";
import { SPORT_CONFIG, DIVISION_CONFIG } from "@/types/funhub";

interface TeamDetailsProps {
  teamId: string;
  onBack: () => void;
}

interface TeamPlayer {
  id: string;
  player_name: string;
  position: string;
  jersey_number: number;
  overall_rating: number;
  pace: number;
  shooting: number;
  passing: number;
  defending: number;
  physical: number;
  training_level: number;
}

export const TeamDetails = ({ teamId, onBack }: TeamDetailsProps) => {
  const [team, setTeam] = useState<UserTeam | null>(null);
  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTeamData();
  }, [teamId]);

  const loadTeamData = async () => {
    try {
      const { data: teamData, error: teamError } = await supabase
        .from('user_teams')
        .select('*')
        .eq('id', teamId)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);

      const { data: playersData, error: playersError } = await supabase
        .from('team_players')
        .select('*')
        .eq('team_id', teamId)
        .order('jersey_number');

      if (playersError) throw playersError;
      setPlayers(playersData || []);
    } catch (error) {
      console.error('Error loading team:', error);
      toast.error('Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 80) return 'bg-yellow-500 text-black';
    if (rating >= 70) return 'bg-gray-300 text-black';
    return 'bg-amber-700 text-white';
  };

  const getStatColor = (value: number) => {
    if (value >= 80) return 'text-green-500';
    if (value >= 65) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Team not found</p>
      </div>
    );
  }

  const sportConfig = SPORT_CONFIG[team.sport as SportType];
  const divisionConfig = DIVISION_CONFIG.find(d => d.level === team.division);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <span className="text-3xl">{sportConfig.icon}</span>
          <div>
            <h2 className="text-xl font-bold">{team.team_name}</h2>
            <p className="text-sm text-muted-foreground">{sportConfig.name}</p>
          </div>
        </div>
        <Badge variant={`division${team.division}` as any}>{divisionConfig?.name}</Badge>
      </div>

      {/* Team Stats Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Season Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{team.points || 0}</div>
              <div className="text-xs text-muted-foreground">Points</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-500">{team.wins || 0}</div>
              <div className="text-xs text-muted-foreground">Wins</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-500">{team.draws || 0}</div>
              <div className="text-xs text-muted-foreground">Draws</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-500">{team.losses || 0}</div>
              <div className="text-xs text-muted-foreground">Losses</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Squad Roster */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Squad ({players.length} Players)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {players.map((player) => (
            <div key={player.id} className="bg-muted rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-sm font-bold">
                    {player.jersey_number}
                  </div>
                  <div>
                    <p className="font-medium">{player.player_name}</p>
                    <p className="text-xs text-muted-foreground">{player.position}</p>
                  </div>
                </div>
                <Badge className={getRatingColor(player.overall_rating)}>
                  {player.overall_rating}
                </Badge>
              </div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                <div>
                  <div className={`font-bold ${getStatColor(player.pace)}`}>{player.pace}</div>
                  <div className="text-muted-foreground">PAC</div>
                </div>
                <div>
                  <div className={`font-bold ${getStatColor(player.shooting)}`}>{player.shooting}</div>
                  <div className="text-muted-foreground">SHO</div>
                </div>
                <div>
                  <div className={`font-bold ${getStatColor(player.passing)}`}>{player.passing}</div>
                  <div className="text-muted-foreground">PAS</div>
                </div>
                <div>
                  <div className={`font-bold ${getStatColor(player.defending)}`}>{player.defending}</div>
                  <div className="text-muted-foreground">DEF</div>
                </div>
                <div>
                  <div className={`font-bold ${getStatColor(player.physical)}`}>{player.physical}</div>
                  <div className="text-muted-foreground">PHY</div>
                </div>
              </div>

              {/* Training Level */}
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Training Level</span>
                  <span className="font-medium">{player.training_level}/10</span>
                </div>
                <Progress value={player.training_level * 10} className="h-1" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
