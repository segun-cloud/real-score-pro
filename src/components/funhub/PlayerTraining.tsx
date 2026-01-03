import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Zap, Coins, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SportType, UserTeam } from "@/types/funhub";
import { SPORT_CONFIG } from "@/types/funhub";

interface PlayerTrainingProps {
  teamId: string;
  userId: string;
  userCoins: number;
  onBack: () => void;
  onCoinsUpdate: () => void;
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

const STATS = [
  { key: 'pace', label: 'Pace', icon: '⚡' },
  { key: 'shooting', label: 'Shooting', icon: '🎯' },
  { key: 'passing', label: 'Passing', icon: '🎯' },
  { key: 'defending', label: 'Defending', icon: '🛡️' },
  { key: 'physical', label: 'Physical', icon: '💪' },
];

export const PlayerTraining = ({ teamId, userId, userCoins, onBack, onCoinsUpdate }: PlayerTrainingProps) => {
  const [team, setTeam] = useState<UserTeam | null>(null);
  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<TeamPlayer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTraining, setIsTraining] = useState(false);

  useEffect(() => {
    loadTeamData();
  }, [teamId]);

  const loadTeamData = async () => {
    try {
      const { data: teamData } = await supabase
        .from('user_teams')
        .select('*')
        .eq('id', teamId)
        .single();

      setTeam(teamData);

      const { data: playersData } = await supabase
        .from('team_players')
        .select('*')
        .eq('team_id', teamId)
        .order('overall_rating', { ascending: false });

      setPlayers(playersData || []);
      if (playersData && playersData.length > 0) {
        setSelectedPlayer(playersData[0]);
      }
    } catch (error) {
      console.error('Error loading team:', error);
      toast.error('Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  };

  const getTrainingCost = (level: number) => {
    return 50 + (level * 25); // 50, 75, 100, 125, etc.
  };

  const handleTrain = async (statKey: string) => {
    if (!selectedPlayer) return;

    const cost = getTrainingCost(selectedPlayer.training_level);
    
    if (userCoins < cost) {
      toast.error(`Insufficient coins. You need ${cost} coins.`);
      return;
    }

    if (selectedPlayer.training_level >= 10) {
      toast.error('This player has reached max training level!');
      return;
    }

    const currentStat = selectedPlayer[statKey as keyof TeamPlayer] as number;
    if (currentStat >= 99) {
      toast.error('This stat is already maxed out!');
      return;
    }

    setIsTraining(true);
    try {
      // Calculate stat increase (1-3 points)
      const increase = Math.floor(Math.random() * 3) + 1;
      const newStatValue = Math.min(99, currentStat + increase);

      // Calculate new overall rating
      const stats = ['pace', 'shooting', 'passing', 'defending', 'physical'];
      let totalStats = 0;
      stats.forEach(stat => {
        if (stat === statKey) {
          totalStats += newStatValue;
        } else {
          totalStats += selectedPlayer[stat as keyof TeamPlayer] as number;
        }
      });
      const newOverall = Math.round(totalStats / 5);

      // Update player stats
      const updateData: Record<string, number> = {
        [statKey]: newStatValue,
        overall_rating: newOverall,
      };

      // Increase training level every 5 trainings (simplified: just increment)
      const newTrainingLevel = Math.min(10, selectedPlayer.training_level + 1);
      updateData.training_level = newTrainingLevel;

      const { error: playerError } = await supabase
        .from('team_players')
        .update(updateData)
        .eq('id', selectedPlayer.id);

      if (playerError) throw playerError;

      // Deduct coins
      const { error: coinsError } = await supabase
        .from('user_profiles')
        .update({ coins: userCoins - cost })
        .eq('id', userId);

      if (coinsError) throw coinsError;

      toast.success(`+${increase} ${statKey.charAt(0).toUpperCase() + statKey.slice(1)}! (Cost: ${cost} coins)`);
      
      // Refresh data
      await loadTeamData();
      onCoinsUpdate();

      // Re-select the updated player
      const updatedPlayer = players.find(p => p.id === selectedPlayer.id);
      if (updatedPlayer) {
        setSelectedPlayer({
          ...updatedPlayer,
          [statKey]: newStatValue,
          overall_rating: newOverall,
          training_level: newTrainingLevel,
        });
      }
    } catch (error) {
      console.error('Training error:', error);
      toast.error('Failed to train player');
    } finally {
      setIsTraining(false);
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 80) return 'bg-yellow-500 text-black';
    if (rating >= 70) return 'bg-gray-300 text-black';
    return 'bg-amber-700 text-white';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const sportConfig = team ? SPORT_CONFIG[team.sport as SportType] : null;
  const trainingCost = selectedPlayer ? getTrainingCost(selectedPlayer.training_level) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <TrendingUp className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Player Training</h2>
            <p className="text-sm text-muted-foreground">{team?.team_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
          <Coins className="h-4 w-4 text-primary" />
          <span className="font-bold">{userCoins}</span>
        </div>
      </div>

      {/* Player Selector */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Select Player</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {players.map((player) => (
              <Button
                key={player.id}
                variant={selectedPlayer?.id === player.id ? "default" : "outline"}
                className="justify-start h-auto py-2"
                onClick={() => setSelectedPlayer(player)}
              >
                <span className="w-6 text-center mr-2">{player.jersey_number}</span>
                <span className="truncate flex-1 text-left">{player.player_name}</span>
                <Badge className={`ml-2 ${getRatingColor(player.overall_rating)}`} variant="secondary">
                  {player.overall_rating}
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Player Stats */}
      {selectedPlayer && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{selectedPlayer.player_name}</CardTitle>
                <p className="text-sm text-muted-foreground">{selectedPlayer.position}</p>
              </div>
              <Badge className={getRatingColor(selectedPlayer.overall_rating)}>
                OVR {selectedPlayer.overall_rating}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Training Level */}
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Training Level</span>
                <span className="text-sm">{selectedPlayer.training_level}/10</span>
              </div>
              <Progress value={selectedPlayer.training_level * 10} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                Next training costs: <span className="font-bold text-primary">{trainingCost} coins</span>
              </p>
            </div>

            {/* Stats Training Buttons */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Train a Stat</p>
              {STATS.map((stat) => {
                const value = selectedPlayer[stat.key as keyof TeamPlayer] as number;
                const isMaxed = value >= 99;
                
                return (
                  <div key={stat.key} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">{stat.icon} {stat.label}</span>
                        <span className="text-sm font-bold">{value}</span>
                      </div>
                      <Progress value={value} className="h-2" />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleTrain(stat.key)}
                      disabled={isTraining || isMaxed || userCoins < trainingCost || selectedPlayer.training_level >= 10}
                      className="w-20"
                    >
                      {isMaxed ? 'MAX' : <><Zap className="h-3 w-3 mr-1" /> Train</>}
                    </Button>
                  </div>
                );
              })}
            </div>

            {selectedPlayer.training_level >= 10 && (
              <p className="text-sm text-center text-yellow-500">
                ⚠️ This player has reached max training level!
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
