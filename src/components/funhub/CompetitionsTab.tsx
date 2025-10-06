import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompetitionCard } from "./CompetitionCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Competition, SportType, UserTeam } from "@/types/funhub";
import { SPORT_CONFIG, DIVISION_CONFIG } from "@/types/funhub";

interface CompetitionsTabProps {
  userTeams: UserTeam[];
  userCoins: number;
  onCoinsUpdate: () => void;
  onNavigate: (screen: string, competitionId?: string) => void;
}

export const CompetitionsTab = ({ userTeams, userCoins, onCoinsUpdate, onNavigate }: CompetitionsTabProps) => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedSport, setSelectedSport] = useState<SportType>('football');
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCompetitions();
  }, [selectedSport, selectedDivision]);

  const loadCompetitions = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('competitions')
        .select('*')
        .eq('sport', selectedSport)
        .order('start_date', { ascending: true });

      if (selectedDivision !== "all") {
        query = query.eq('division', parseInt(selectedDivision));
      }

      const { data: comps } = await query;

      if (comps) {
        setCompetitions(comps);
        
        // Load participant counts for each competition
        const counts: Record<string, number> = {};
        for (const comp of comps) {
          const { count } = await supabase
            .from('competition_participants')
            .select('*', { count: 'exact', head: true })
            .eq('competition_id', comp.id);
          
          counts[comp.id] = count || 0;
        }
        setParticipantCounts(counts);
      }
    } catch (error) {
      console.error('Error loading competitions:', error);
      toast.error('Failed to load competitions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinCompetition = async (competition: Competition) => {
    // Find user's team for this sport
    const userTeam = userTeams.find(t => t.sport === competition.sport);
    
    if (!userTeam) {
      toast.error(`You need a ${SPORT_CONFIG[competition.sport].name} team to join this competition`);
      return;
    }

    if (userCoins < competition.entry_fee) {
      toast.error('Insufficient coins to join this competition');
      return;
    }

    try {
      // Check if already participating
      const { data: existing } = await supabase
        .from('competition_participants')
        .select('id')
        .eq('competition_id', competition.id)
        .eq('team_id', userTeam.id)
        .single();

      if (existing) {
        toast.info('You are already participating in this competition');
        return;
      }

      // Join competition
      const { error: joinError } = await supabase
        .from('competition_participants')
        .insert({
          competition_id: competition.id,
          team_id: userTeam.id,
          points_earned: 0
        });

      if (joinError) throw joinError;

      // Deduct entry fee
      const { error: coinsError } = await supabase
        .from('user_profiles')
        .update({ coins: userCoins - competition.entry_fee })
        .eq('id', (await supabase.auth.getUser()).data.user?.id);

      if (coinsError) throw coinsError;

      toast.success(`Joined ${competition.name}!`);
      onCoinsUpdate();
      loadCompetitions();
    } catch (error) {
      console.error('Error joining competition:', error);
      toast.error('Failed to join competition');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-2 gap-3">
        <Select value={selectedSport} onValueChange={(value) => setSelectedSport(value as SportType)}>
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

        <Select value={selectedDivision} onValueChange={setSelectedDivision}>
          <SelectTrigger>
            <SelectValue placeholder="Select division" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            {DIVISION_CONFIG.map((div) => (
              <SelectItem key={div.level} value={div.level.toString()}>
                {div.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Competitions List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading competitions...</div>
      ) : competitions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No competitions found. Try adjusting your filters.
        </div>
      ) : (
        competitions.map((comp) => (
          <CompetitionCard
            key={comp.id}
            competition={comp}
            participantCount={participantCounts[comp.id] || 0}
            maxParticipants={8}
            onJoinCompetition={() => handleJoinCompetition(comp)}
            onNavigate={onNavigate}
          />
        ))
      )}
    </div>
  );
};
