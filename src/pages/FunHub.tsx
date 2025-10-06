import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Coins, Hammer, Zap, Shirt, Palette } from "lucide-react";
import { SportSelector } from "@/components/funhub/SportSelector";
import { TeamBuilder } from "@/components/funhub/TeamBuilder";
import { CompetitionCard } from "@/components/funhub/CompetitionCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SportType, UserTeam, Competition } from "@/types/funhub";
import { SPORT_CONFIG } from "@/types/funhub";

export const FunHub = () => {
  const [userCoins, setUserCoins] = useState(1000);
  const [userTeams, setUserTeams] = useState<UserTeam[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedSport, setSelectedSport] = useState<SportType | null>(null);
  const [showTeamBuilder, setShowTeamBuilder] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('coins')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserCoins(profile.coins);
      }

      // Load user teams
      const { data: teams } = await supabase
        .from('user_teams')
        .select('*')
        .eq('user_id', user.id);

      if (teams) {
        setUserTeams(teams);
      }

      // Load active competitions
      const { data: comps } = await supabase
        .from('competitions')
        .select('*')
        .eq('status', 'active');

      if (comps) {
        setCompetitions(comps);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeam = async (teamName: string, emblemId: number, kitId: number) => {
    if (!selectedSport) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const sportConfig = SPORT_CONFIG[selectedSport];
      const totalCost = sportConfig.playerCount * 50 + 50;

      // Create team
      const { data: team, error: teamError } = await supabase
        .from('user_teams')
        .insert({
          user_id: user.id,
          sport: selectedSport,
          team_name: teamName,
          emblem_id: emblemId,
          kit_id: kitId
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Generate random players
      const players = sportConfig.positions.map((position, index) => ({
        team_id: team.id,
        player_name: generateRandomName(),
        position,
        jersey_number: index + 1,
        overall_rating: Math.floor(Math.random() * 26) + 50, // 50-75
        pace: Math.floor(Math.random() * 26) + 50,
        shooting: Math.floor(Math.random() * 26) + 50,
        passing: Math.floor(Math.random() * 26) + 50,
        defending: Math.floor(Math.random() * 26) + 50,
        physical: Math.floor(Math.random() * 26) + 50,
      }));

      const { error: playersError } = await supabase
        .from('team_players')
        .insert(players);

      if (playersError) throw playersError;

      // Deduct coins
      const { error: coinsError } = await supabase
        .from('user_profiles')
        .update({ coins: userCoins - totalCost })
        .eq('id', user.id);

      if (coinsError) throw coinsError;

      // Reload data
      await loadUserData();
      setShowTeamBuilder(false);
      setSelectedSport(null);
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  };

  const generateRandomName = () => {
    const firstNames = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Carlos', 'Luis', 'Marco', 'Andre'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Martinez', 'Rodriguez', 'Silva', 'Santos'];
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  };

  const handleSportSelect = (sport: SportType) => {
    const hasTeam = userTeams.some(t => t.sport === sport);
    if (hasTeam) {
      toast.info('You already have a team for this sport!');
      return;
    }
    setSelectedSport(sport);
    setShowTeamBuilder(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (showTeamBuilder && selectedSport) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-4">
          <TeamBuilder
            sport={selectedSport}
            userCoins={userCoins}
            onBack={() => {
              setShowTeamBuilder(false);
              setSelectedSport(null);
            }}
            onCreateTeam={handleCreateTeam}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Fun Hub</h1>
          <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
            <Coins className="h-5 w-5 text-primary" />
            <span className="font-bold">{userCoins}</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Active Competitions */}
        {competitions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              🏆 Active Competitions
            </h2>
            {competitions.map((comp) => (
              <CompetitionCard
                key={comp.id}
                competition={comp}
                onViewStandings={() => toast.info('Standings coming soon!')}
                onPlayMatch={() => toast.info('Match simulation coming soon!')}
              />
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">⭐ Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardContent className="p-4 text-center">
                <Hammer className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium text-sm">Build Team</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary transition-colors opacity-50">
              <CardContent className="p-4 text-center">
                <Zap className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium text-sm">Train Players</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary transition-colors opacity-50">
              <CardContent className="p-4 text-center">
                <Shirt className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium text-sm">Customize Kit</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary transition-colors opacity-50">
              <CardContent className="p-4 text-center">
                <Palette className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium text-sm">Edit Emblem</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sport Selection */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">🎮 Select a Sport</h2>
          <SportSelector
            onSelectSport={handleSportSelect}
            userTeams={userTeams.map(t => ({ sport: t.sport, division: t.division }))}
          />
        </div>
      </div>
    </div>
  );
};
