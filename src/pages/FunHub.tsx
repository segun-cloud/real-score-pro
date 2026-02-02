import { useState, useEffect } from "react";
import { Coins } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SportSelector } from "@/components/funhub/SportSelector";
import { TeamBuilder } from "@/components/funhub/TeamBuilder";
import { MyTeamsTab } from "@/components/funhub/MyTeamsTab";
import { MyMatches } from "@/components/funhub/MyMatches";
import { CompetitionsTab } from "@/components/funhub/CompetitionsTab";
import { EnhancedLeaderboardsTab } from "@/components/funhub/EnhancedLeaderboardsTab";
import { CompetitionAdmin } from "@/components/funhub/CompetitionAdmin";
import { NotificationBell } from "@/components/funhub/NotificationBell";
import { TeamDetails } from "@/components/funhub/TeamDetails";
import { PlayerTraining } from "@/components/funhub/PlayerTraining";
import { TeamKitManager } from "@/components/funhub/TeamKitManager";
import { MatchSimulationScreen } from "@/components/funhub/MatchSimulationScreen";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SportType, UserTeam } from "@/types/funhub";
import { SPORT_CONFIG } from "@/types/funhub";

interface FunHubProps {
  userId?: string;
  onCoinsUpdate: () => void;
  onNavigate: (screen: string, competitionId?: string) => void;
}

type ActiveView = 'list' | 'teamDetails' | 'training' | 'kitManager' | 'simulation';

export const FunHub = ({ userId, onCoinsUpdate, onNavigate }: FunHubProps) => {
  const [userCoins, setUserCoins] = useState(1000);
  const [userTeams, setUserTeams] = useState<UserTeam[]>([]);
  const [selectedSport, setSelectedSport] = useState<SportType | null>(null);
  const [showTeamBuilder, setShowTeamBuilder] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('list');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
  }, [userId]);

  const loadUserData = async () => {
    if (!userId) {
      toast.error('You must be logged in to access Fun Hub');
      setIsLoading(false);
      return;
    }

    try {
      // Check if user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!roleData);

      // Load user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('coins')
        .eq('id', userId)
        .single();

      if (profile) {
        setUserCoins(profile.coins);
      }

      // Load user teams
      const { data: teams } = await supabase
        .from('user_teams')
        .select('*')
        .eq('user_id', userId);

      if (teams) {
        setUserTeams(teams);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeam = async (
    teamName: string, 
    emblemId: number | null, 
    kitId: number | null,
    customEmblemId: string | null,
    customKitId: string | null,
    totalCost: number
  ) => {
    if (!selectedSport || !userId) return;

    try {
      const sportConfig = SPORT_CONFIG[selectedSport];

      // Create team
      const { data: team, error: teamError } = await supabase
        .from('user_teams')
        .insert({
          user_id: userId,
          sport: selectedSport,
          team_name: teamName,
          emblem_id: emblemId,
          kit_id: kitId,
          custom_emblem_id: customEmblemId,
          custom_kit_id: customKitId
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
        .eq('id', userId);

      if (coinsError) throw coinsError;

      // Reload data
      await loadUserData();
      onCoinsUpdate(); // Update parent component coins
      setShowTeamBuilder(false);
      setSelectedSport(null);
      toast.success(`Team "${teamName}" created successfully!`);
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
            userId={userId}
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

  // Handle sub-views for team management and match simulation
  if (activeView !== 'list' && userId) {
    const handleBackToList = async () => {
      setActiveView('list');
      setSelectedTeamId(null);
      setSelectedMatchId(null);
      await loadUserData(); // Refresh data when returning
    };

    // Match simulation view
    if (activeView === 'simulation' && selectedMatchId) {
      return (
        <MatchSimulationScreen
          matchId={selectedMatchId}
          userId={userId}
          onBack={handleBackToList}
          onComplete={handleBackToList}
        />
      );
    }

    // Team management views
    if (selectedTeamId) {
      return (
        <div className="min-h-screen bg-background pb-20">
          <div className="p-4">
            {activeView === 'teamDetails' && (
              <TeamDetails teamId={selectedTeamId} onBack={handleBackToList} />
            )}
            {activeView === 'training' && (
              <PlayerTraining
                teamId={selectedTeamId}
                userId={userId}
                userCoins={userCoins}
                onBack={handleBackToList}
                onCoinsUpdate={() => {
                  loadUserData();
                  onCoinsUpdate();
                }}
              />
            )}
            {activeView === 'kitManager' && (
              <TeamKitManager
                teamId={selectedTeamId}
                userId={userId}
                userCoins={userCoins}
                onBack={handleBackToList}
                onCoinsUpdate={() => {
                  loadUserData();
                  onCoinsUpdate();
                }}
              />
            )}
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Fun Hub</h1>
          <div className="flex items-center gap-3">
            {userId && <NotificationBell userId={userId} />}
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
              <Coins className="h-5 w-5 text-primary" />
              <span className="font-bold">{userCoins}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <Tabs defaultValue="my-teams" className="w-full">
          <TabsList className={`w-full grid ${isAdmin ? 'grid-cols-5' : 'grid-cols-4'}`}>
            <TabsTrigger value="my-teams">Teams</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
            <TabsTrigger value="competitions">Join</TabsTrigger>
            <TabsTrigger value="leaderboards">Ranks</TabsTrigger>
            {isAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
          </TabsList>

          <TabsContent value="my-teams" className="mt-4 space-y-4">
            <MyTeamsTab
              teams={userTeams}
              onViewTeam={(id) => {
                setSelectedTeamId(id);
                setActiveView('teamDetails');
              }}
              onTrainPlayers={(id) => {
                setSelectedTeamId(id);
                setActiveView('training');
              }}
              onCustomizeKit={(id) => {
                setSelectedTeamId(id);
                setActiveView('kitManager');
              }}
            />
            {userTeams.length === 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold">🎮 Create Your First Team</h2>
                <SportSelector
                  onSelectSport={handleSportSelect}
                  userTeams={userTeams.map(t => ({ sport: t.sport, division: t.division }))}
                />
              </div>
            )}
            {userTeams.length > 0 && userTeams.length < Object.keys(SPORT_CONFIG).length && (
              <div className="space-y-4 mt-6">
                <h2 className="text-lg font-bold">Create Another Team</h2>
                <SportSelector
                  onSelectSport={handleSportSelect}
                  userTeams={userTeams.map(t => ({ sport: t.sport, division: t.division }))}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="matches" className="mt-4">
            <MyMatches 
              userTeams={userTeams}
              onNavigate={onNavigate}
              onPlayMatch={(matchId) => {
                setSelectedMatchId(matchId);
                setActiveView('simulation');
              }}
            />
          </TabsContent>

          <TabsContent value="competitions" className="mt-4">
            <CompetitionsTab
              userTeams={userTeams}
              userCoins={userCoins}
              onCoinsUpdate={onCoinsUpdate}
              onNavigate={onNavigate}
            />
          </TabsContent>

          <TabsContent value="leaderboards" className="mt-4">
            <EnhancedLeaderboardsTab />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin" className="mt-4">
              <CompetitionAdmin />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};
