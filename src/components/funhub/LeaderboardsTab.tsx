import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SportType, UserTeam } from "@/types/funhub";
import { SPORT_CONFIG } from "@/types/funhub";

interface LeaderboardEntry {
  team_id: string;
  team_name: string;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  division: number;
}

interface LeaderboardsTabProps {
  selectedSport?: SportType;
}

export const LeaderboardsTab = ({ selectedSport }: LeaderboardsTabProps) => {
  const [sport, setSport] = useState<SportType>(selectedSport || 'football');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [sport]);

  const loadLeaderboard = async () => {
    setIsLoading(true);
    try {
      const { data: teams } = await supabase
        .from('user_teams')
        .select('*')
        .eq('sport', sport)
        .order('points', { ascending: false })
        .order('wins', { ascending: false })
        .limit(50);

      if (teams) {
        setLeaderboard(teams.map(t => ({
          team_id: t.id,
          team_name: t.team_name,
          wins: t.wins || 0,
          draws: t.draws || 0,
          losses: t.losses || 0,
          points: t.points || 0,
          division: t.division || 5
        })));
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      toast.error('Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  const getMedalEmoji = (position: number) => {
    if (position === 1) return "🥇";
    if (position === 2) return "🥈";
    if (position === 3) return "🥉";
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Sport Filter */}
      <Select value={sport} onValueChange={(value) => setSport(value as SportType)}>
        <SelectTrigger>
          <SelectValue placeholder="Select sport" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(SPORT_CONFIG).map(([key, config]) => (
            <SelectItem key={key} value={key}>
              {config.icon} {config.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Global Rankings - {SPORT_CONFIG[sport].name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No teams found for this sport yet
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, index) => {
                const position = index + 1;
                const medal = getMedalEmoji(position);
                
                return (
                  <div
                    key={entry.team_id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      position <= 3 ? 'bg-primary/10 border border-primary/20' : 'bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center justify-center w-8 h-8 font-bold">
                        {medal || position}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{entry.team_name}</div>
                        <div className="text-xs text-muted-foreground">
                          Division {entry.division} • W:{entry.wins} D:{entry.draws} L:{entry.losses}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">{entry.points}</div>
                      <div className="text-xs text-muted-foreground">pts</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
