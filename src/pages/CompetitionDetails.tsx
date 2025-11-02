import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Trophy, Calendar } from "lucide-react";
import { SPORT_CONFIG, DIVISION_CONFIG } from "@/types/funhub";
import type { Competition } from "@/types/funhub";
import { CompetitionStandings } from "@/components/funhub/CompetitionStandings";

interface Participant {
  id: string;
  team_id: string;
  team_name: string;
  points_earned: number;
  final_position: number | null;
}

interface Match {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_team_name: string;
  away_team_name: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  match_date: string;
}

interface CompetitionDetailsProps {
  competitionId: string;
  onBack: () => void;
}

export const CompetitionDetails = ({ competitionId, onBack }: CompetitionDetailsProps) => {
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCompetitionDetails();
  }, [competitionId]);

  const loadCompetitionDetails = async () => {
    if (!competitionId) return;

    try {
      // Load competition
      const { data: comp } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', competitionId)
        .single();

      if (comp) {
        setCompetition(comp);
      }

      // Load participants with team names
      const { data: parts } = await supabase
        .from('competition_participants')
        .select(`
          id,
          team_id,
          points_earned,
          final_position,
          user_teams (team_name)
        `)
        .eq('competition_id', competitionId)
        .order('points_earned', { ascending: false });

      if (parts) {
        setParticipants(parts.map((p: any) => ({
          id: p.id,
          team_id: p.team_id,
          team_name: p.user_teams?.team_name || 'Unknown Team',
          points_earned: p.points_earned || 0,
          final_position: p.final_position
        })));
      }

      // Load matches with team names
      const { data: matchData } = await supabase
        .from('matches')
        .select(`
          id,
          home_team_id,
          away_team_id,
          home_score,
          away_score,
          status,
          match_date,
          home_team:user_teams!matches_home_team_id_fkey(team_name),
          away_team:user_teams!matches_away_team_id_fkey(team_name)
        `)
        .eq('competition_id', competitionId)
        .order('match_date', { ascending: true });

      if (matchData) {
        setMatches(matchData.map((m: any) => ({
          id: m.id,
          home_team_id: m.home_team_id,
          away_team_id: m.away_team_id,
          home_team_name: m.home_team?.team_name || 'Unknown',
          away_team_name: m.away_team?.team_name || 'Unknown',
          home_score: m.home_score,
          away_score: m.away_score,
          status: m.status,
          match_date: m.match_date
        })));
      }
    } catch (error) {
      console.error('Error loading competition details:', error);
      toast.error('Failed to load competition details');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <p className="text-muted-foreground">Competition not found</p>
      </div>
    );
  }

  const sportConfig = SPORT_CONFIG[competition.sport];
  const divisionConfig = DIVISION_CONFIG.find(d => d.level === competition.division);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{competition.name}</h1>
            <p className="text-sm text-muted-foreground">
              {sportConfig.icon} {sportConfig.name} • {divisionConfig?.name}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Competition Info */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Prize Pool</span>
              <span className="font-bold text-primary">{competition.prize_coins} coins</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Entry Fee</span>
              <span className="font-medium">{competition.entry_fee} coins</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Participants</span>
              <span className="font-medium">{participants.length} teams</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className="font-medium capitalize">{competition.status}</span>
            </div>
          </CardContent>
        </Card>

        {/* Prize Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Prize Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-primary/10 rounded">
              <span className="font-medium">🥇 1st Place</span>
              <span className="font-bold text-primary">{competition.prize_coins} coins</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="font-medium">🥈 2nd Place</span>
              <span className="font-bold">{Math.floor(competition.prize_coins * 0.6)} coins</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="font-medium">🥉 3rd Place</span>
              <span className="font-bold">{Math.floor(competition.prize_coins * 0.4)} coins</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="font-medium">4th Place</span>
              <span className="font-bold">{Math.floor(competition.prize_coins * 0.2)} coins</span>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="standings" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="standings" className="flex-1">Standings</TabsTrigger>
            <TabsTrigger value="fixtures" className="flex-1">Fixtures</TabsTrigger>
          </TabsList>

          <TabsContent value="standings">
            <CompetitionStandings competitionId={competitionId} division={competition.division || 5} />
          </TabsContent>

          <TabsContent value="fixtures">
            <div className="space-y-3">
              {matches.length > 0 ? (
                matches.map((match) => (
                  <Card key={match.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(match.match_date).toLocaleDateString()}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          match.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                          match.status === 'in_progress' ? 'bg-yellow-500/10 text-yellow-500' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {match.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium flex-1">{match.home_team_name}</span>
                        <div className="px-4 font-bold">
                          {match.home_score !== null ? (
                            <>{match.home_score} - {match.away_score}</>
                          ) : (
                            'vs'
                          )}
                        </div>
                        <span className="font-medium flex-1 text-right">{match.away_team_name}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No matches scheduled yet
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
