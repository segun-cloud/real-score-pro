import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronRight, ChevronLeft, Check, Search, X } from "lucide-react";

interface OnboardingProps {
  userId: string;
  onComplete: () => void;
}

const SPORTS = [
  { id: 'football', name: 'Football', icon: '⚽' },
  { id: 'basketball', name: 'Basketball', icon: '🏀' },
  { id: 'tennis', name: 'Tennis', icon: '🎾' },
  { id: 'baseball', name: 'Baseball', icon: '⚾' },
  { id: 'boxing', name: 'Boxing', icon: '🥊' },
  { id: 'cricket', name: 'Cricket', icon: '🏏' },
  { id: 'rugby', name: 'Rugby', icon: '🏉' },
  { id: 'ice-hockey', name: 'Ice Hockey', icon: '🏒' },
  { id: 'american-football', name: 'American Football', icon: '🏈' },
];

const POPULAR_TEAMS: Record<string, { id: string; name: string; logo?: string }[]> = {
  football: [
    { id: 'manu', name: 'Manchester United' },
    { id: 'manc', name: 'Manchester City' },
    { id: 'liv', name: 'Liverpool' },
    { id: 'ars', name: 'Arsenal' },
    { id: 'che', name: 'Chelsea' },
    { id: 'tot', name: 'Tottenham' },
    { id: 'barca', name: 'Barcelona' },
    { id: 'real', name: 'Real Madrid' },
    { id: 'bayern', name: 'Bayern Munich' },
    { id: 'psg', name: 'Paris Saint-Germain' },
    { id: 'juve', name: 'Juventus' },
    { id: 'inter', name: 'Inter Milan' },
  ],
  basketball: [
    { id: 'lakers', name: 'LA Lakers' },
    { id: 'warriors', name: 'Golden State Warriors' },
    { id: 'celtics', name: 'Boston Celtics' },
    { id: 'bulls', name: 'Chicago Bulls' },
    { id: 'heat', name: 'Miami Heat' },
    { id: 'nets', name: 'Brooklyn Nets' },
  ],
  tennis: [
    { id: 'djokovic', name: 'Novak Djokovic' },
    { id: 'alcaraz', name: 'Carlos Alcaraz' },
    { id: 'sinner', name: 'Jannik Sinner' },
    { id: 'swiatek', name: 'Iga Swiatek' },
  ],
  baseball: [
    { id: 'yankees', name: 'NY Yankees' },
    { id: 'dodgers', name: 'LA Dodgers' },
    { id: 'redsox', name: 'Boston Red Sox' },
  ],
  boxing: [
    { id: 'usyk', name: 'Oleksandr Usyk' },
    { id: 'fury', name: 'Tyson Fury' },
    { id: 'crawford', name: 'Terence Crawford' },
  ],
  cricket: [
    { id: 'india', name: 'India' },
    { id: 'australia', name: 'Australia' },
    { id: 'england', name: 'England' },
  ],
  rugby: [
    { id: 'allblacks', name: 'New Zealand All Blacks' },
    { id: 'springboks', name: 'South Africa Springboks' },
  ],
  'ice-hockey': [
    { id: 'leafs', name: 'Toronto Maple Leafs' },
    { id: 'bruins', name: 'Boston Bruins' },
  ],
  'american-football': [
    { id: 'chiefs', name: 'Kansas City Chiefs' },
    { id: 'eagles', name: 'Philadelphia Eagles' },
    { id: 'cowboys', name: 'Dallas Cowboys' },
  ],
};

const POPULAR_PLAYERS: Record<string, { id: string; name: string; team?: string }[]> = {
  football: [
    { id: 'haaland', name: 'Erling Haaland', team: 'Manchester City' },
    { id: 'mbappe', name: 'Kylian Mbappé', team: 'Real Madrid' },
    { id: 'vinicius', name: 'Vinicius Jr', team: 'Real Madrid' },
    { id: 'salah', name: 'Mohamed Salah', team: 'Liverpool' },
    { id: 'bellingham', name: 'Jude Bellingham', team: 'Real Madrid' },
    { id: 'saka', name: 'Bukayo Saka', team: 'Arsenal' },
  ],
  basketball: [
    { id: 'lebron', name: 'LeBron James', team: 'LA Lakers' },
    { id: 'curry', name: 'Stephen Curry', team: 'Warriors' },
    { id: 'giannis', name: 'Giannis Antetokounmpo', team: 'Bucks' },
    { id: 'jokic', name: 'Nikola Jokic', team: 'Nuggets' },
  ],
};

export const Onboarding = ({ userId, onComplete }: OnboardingProps) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<{ id: string; name: string; sport: string }[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<{ id: string; name: string; sport: string }[]>([]);
  const [teamSearch, setTeamSearch] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const { toast } = useToast();

  const toggleSport = (sportId: string) => {
    setSelectedSports(prev => 
      prev.includes(sportId) 
        ? prev.filter(s => s !== sportId)
        : [...prev, sportId]
    );
  };

  const toggleTeam = (team: { id: string; name: string }, sport: string) => {
    setSelectedTeams(prev => {
      const exists = prev.find(t => t.id === team.id);
      if (exists) {
        return prev.filter(t => t.id !== team.id);
      }
      return [...prev, { ...team, sport }];
    });
  };

  const togglePlayer = (player: { id: string; name: string }, sport: string) => {
    setSelectedPlayers(prev => {
      const exists = prev.find(p => p.id === player.id);
      if (exists) {
        return prev.filter(p => p.id !== player.id);
      }
      return [...prev, { ...player, sport }];
    });
  };

  const getTeamsForSelectedSports = () => {
    const teams: { team: { id: string; name: string }; sport: string }[] = [];
    selectedSports.forEach(sport => {
      const sportTeams = POPULAR_TEAMS[sport] || [];
      sportTeams.forEach(team => {
        if (!teamSearch || team.name.toLowerCase().includes(teamSearch.toLowerCase())) {
          teams.push({ team, sport });
        }
      });
    });
    return teams;
  };

  const getPlayersForSelectedSports = () => {
    const players: { player: { id: string; name: string; team?: string }; sport: string }[] = [];
    selectedSports.forEach(sport => {
      const sportPlayers = POPULAR_PLAYERS[sport] || [];
      sportPlayers.forEach(player => {
        if (!playerSearch || player.name.toLowerCase().includes(playerSearch.toLowerCase())) {
          players.push({ player, sport });
        }
      });
    });
    return players;
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          favourite_sports: selectedSports,
          favourite_teams: selectedTeams,
          favourite_players: selectedPlayers,
          onboarding_completed: true,
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Welcome to RealScore!",
        description: "Your preferences have been saved",
      });
      onComplete();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save preferences",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ onboarding_completed: true })
        .eq('id', userId);

      if (error) throw error;
      onComplete();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to skip onboarding",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-3 h-3 rounded-full transition-colors ${
                  s === step ? 'bg-primary' : s < step ? 'bg-primary/50' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <CardTitle className="text-2xl">
            {step === 1 && "What sports do you follow?"}
            {step === 2 && "Pick your favourite teams"}
            {step === 3 && "Who are your favourite players?"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Select all the sports you're interested in"}
            {step === 2 && "We'll show you updates from these teams first"}
            {step === 3 && "Optional - skip if you'd like"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Sports Selection */}
          {step === 1 && (
            <div className="grid grid-cols-3 gap-3">
              {SPORTS.map((sport) => (
                <button
                  key={sport.id}
                  onClick={() => toggleSport(sport.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedSports.includes(sport.id)
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-3xl mb-2">{sport.icon}</div>
                  <div className="text-sm font-medium">{sport.name}</div>
                  {selectedSports.includes(sport.id) && (
                    <Check className="w-4 h-4 text-primary mx-auto mt-1" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Teams Selection */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search teams..."
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {selectedTeams.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTeams.map((team) => (
                    <Badge key={team.id} variant="secondary" className="gap-1">
                      {team.name}
                      <X 
                        className="w-3 h-3 cursor-pointer" 
                        onClick={() => toggleTeam(team, team.sport)}
                      />
                    </Badge>
                  ))}
                </div>
              )}

              <div className="max-h-64 overflow-y-auto space-y-2">
                {getTeamsForSelectedSports().map(({ team, sport }) => (
                  <button
                    key={`${sport}-${team.id}`}
                    onClick={() => toggleTeam(team, sport)}
                    className={`w-full p-3 rounded-lg border text-left flex items-center justify-between transition-all ${
                      selectedTeams.find(t => t.id === team.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{team.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">{sport}</div>
                    </div>
                    {selectedTeams.find(t => t.id === team.id) && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </button>
                ))}
                {getTeamsForSelectedSports().length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No teams found. Try selecting some sports first!
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Players Selection */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search players..."
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {selectedPlayers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedPlayers.map((player) => (
                    <Badge key={player.id} variant="secondary" className="gap-1">
                      {player.name}
                      <X 
                        className="w-3 h-3 cursor-pointer" 
                        onClick={() => togglePlayer(player, player.sport)}
                      />
                    </Badge>
                  ))}
                </div>
              )}

              <div className="max-h-64 overflow-y-auto space-y-2">
                {getPlayersForSelectedSports().map(({ player, sport }) => (
                  <button
                    key={`${sport}-${player.id}`}
                    onClick={() => togglePlayer(player, sport)}
                    className={`w-full p-3 rounded-lg border text-left flex items-center justify-between transition-all ${
                      selectedPlayers.find(p => p.id === player.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{player.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {player.team && `${player.team} • `}
                        <span className="capitalize">{sport}</span>
                      </div>
                    </div>
                    {selectedPlayers.find(p => p.id === player.id) && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </button>
                ))}
                {getPlayersForSelectedSports().length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No players found for your selected sports.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <div>
              {step > 1 ? (
                <Button variant="outline" onClick={() => setStep(s => s - 1)}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              ) : (
                <Button variant="ghost" onClick={handleSkip} disabled={isLoading}>
                  Skip for now
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              {step < 3 ? (
                <Button 
                  onClick={() => setStep(s => s + 1)}
                  disabled={step === 1 && selectedSports.length === 0}
                >
                  Continue
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleComplete} disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Get Started
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
