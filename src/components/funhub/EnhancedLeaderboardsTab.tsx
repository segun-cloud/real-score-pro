import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import type { SportType } from "@/types/funhub";
import { SPORT_CONFIG, DIVISION_CONFIG } from "@/types/funhub";

interface LeaderboardEntry {
  team_id: string;
  team_name: string;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  division: number;
  matches_played?: number;
  goals_for?: number;
  goals_against?: number;
  position?: number;
}

interface EnhancedLeaderboardsTabProps {
  selectedSport?: SportType;
}

export const EnhancedLeaderboardsTab = ({ selectedSport }: EnhancedLeaderboardsTabProps) => {
  const [sport, setSport] = useState<SportType>(selectedSport || 'football');
  const [allTimeLeaderboard, setAllTimeLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [seasonLeaderboard, setSeasonLeaderboard] = useState<Map<number, LeaderboardEntry[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'season' | 'alltime'>('season');

  useEffect(() => {
    loadLeaderboards();
  }, [sport]);

  const loadLeaderboards = async () => {
    setIsLoading(true);
    try {
      // Load all-time leaderboard
      const { data: allTimeTeams } = await supabase
        .from('user_teams')
        .select('*')
        .eq('sport', sport)
        .order('points', { ascending: false })
        .order('wins', { ascending: false })
        .limit(50);

      if (allTimeTeams) {
        setAllTimeLeaderboard(allTimeTeams.map(t => ({
          team_id: t.id,
          team_name: t.team_name,
          wins: t.wins || 0,
          draws: t.draws || 0,
          losses: t.losses || 0,
          points: t.points || 0,
          division: t.division || 5
        })));
      }

      // Load current season leaderboard
      const { data: activeSeason } = await supabase
        .from('seasons')
        .select('id')
        .eq('sport', sport)
        .eq('status', 'active')
        .maybeSingle();

      if (activeSeason) {
        const { data: competitions } = await supabase
          .from('competitions')
          .select('id, division')
          .eq('season_id', activeSeason.id);

        if (competitions) {
          const divisionMap = new Map<number, LeaderboardEntry[]>();

          for (const comp of competitions) {
            const { data: participants } = await supabase
              .from('competition_participants')
              .select(`
                team_id,
                points_earned,
                wins,
                draws,
                losses,
                matches_played,
                goals_for,
                goals_against,
                goal_difference,
                user_teams (team_name)
              `)
              .eq('competition_id', comp.id)
              .order('points_earned', { ascending: false })
              .order('goal_difference', { ascending: false })
              .order('goals_for', { ascending: false });

            if (participants) {
              const entries: LeaderboardEntry[] = participants.map((p: any, idx: number) => ({
                team_id: p.team_id,
                team_name: p.user_teams?.team_name || 'Unknown Team',
                wins: p.wins || 0,
                draws: p.draws || 0,
                losses: p.losses || 0,
                points: p.points_earned || 0,
                division: comp.division,
                matches_played: p.matches_played || 0,
                goals_for: p.goals_for || 0,
                goals_against: p.goals_against || 0,
                position: idx + 1
              }));

              divisionMap.set(comp.division, entries);
            }
          }

          setSeasonLeaderboard(divisionMap);
        }
      }
    } catch (error) {
      console.error('Error loading leaderboards:', error);
      toast.error('Failed to load leaderboards');
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

  const getPositionStyle = (position: number, totalTeams: number) => {
    if (position <= 4 && totalTeams >= 20) {
      return 'bg-green-500/10 border-green-500/20'; // Promotion
    }
    if (position >= 17 && position <= 20 && totalTeams >= 20) {
      return 'bg-red-500/10 border-red-500/20'; // Relegation
    }
    if (position <= 3) {
      return 'bg-primary/10 border-primary/20'; // Top 3
    }
    return 'bg-muted';
  };

  const renderAllTimeLeaderboard = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          All-Time Rankings - {SPORT_CONFIG[sport].name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : allTimeLeaderboard.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No teams found for this sport yet
          </div>
        ) : (
          <div className="space-y-2">
            {allTimeLeaderboard.map((entry, index) => {
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
                        <Badge variant={`division${entry.division}` as any} className="mr-2">
                          {DIVISION_CONFIG.find(d => d.level === entry.division)?.name}
                        </Badge>
                        W:{entry.wins} D:{entry.draws} L:{entry.losses}
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
  );

  const renderSeasonLeaderboard = () => {
    if (seasonLeaderboard.size === 0) {
      return (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No active season found for this sport
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {Array.from(seasonLeaderboard.entries())
          .sort(([a], [b]) => a - b)
          .map(([division, entries]) => {
            const divConfig = DIVISION_CONFIG.find(d => d.level === division);
            return (
              <Card key={division}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-primary" />
                      {divConfig?.name} - Current Season
                    </span>
                    <Badge variant={`division${division}` as any}>
                      {entries.length} teams
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {entries.map((entry) => {
                      const medal = getMedalEmoji(entry.position || 0);

                      return (
                        <div
                          key={entry.team_id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            getPositionStyle(entry.position || 0, entries.length)
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex items-center justify-center w-8 h-8 font-bold">
                              {medal || entry.position}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{entry.team_name}</div>
                              <div className="text-xs text-muted-foreground">
                                P:{entry.matches_played} W:{entry.wins} D:{entry.draws} L:{entry.losses} • 
                                GF:{entry.goals_for} GA:{entry.goals_against}
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
                  <div className="mt-4 pt-4 border-t text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/50" />
                      <span>Top 4: Promotion Zone</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/50" />
                      <span>Bottom 4: Relegation Zone</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>
    );
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

      {/* Season / All-Time Toggle */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
        <TabsList className="w-full">
          <TabsTrigger value="season" className="flex-1">Current Season</TabsTrigger>
          <TabsTrigger value="alltime" className="flex-1">All Time</TabsTrigger>
        </TabsList>

        <TabsContent value="season">
          {renderSeasonLeaderboard()}
        </TabsContent>

        <TabsContent value="alltime">
          {renderAllTimeLeaderboard()}
        </TabsContent>
      </Tabs>
    </div>
  );
};
