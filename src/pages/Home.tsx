import { useState, useEffect } from "react";
import { MatchCard } from "@/components/MatchCard";
import { NativeAd } from "@/components/NativeAd";
import { GuestBanner } from "@/components/GuestBanner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Search, CalendarIcon, RefreshCw, Play, Wifi, WifiOff } from "lucide-react";
import { Match } from "@/types/sports";
import { mockMatches } from "@/data/mockData";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLiveScores } from "@/hooks/useLiveScores";

interface HomeProps {
  onMatchClick: (match: Match) => void;
  selectedSport: string;
  isGuest?: boolean;
  onGuestLogin?: () => void;
  onGuestSignup?: () => void;
}

export const Home = ({ onMatchClick, selectedSport, isGuest, onGuestLogin, onGuestSignup }: HomeProps) => {
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLiveOnly, setShowLiveOnly] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dbMatches, setDbMatches] = useState<any[]>([]);
  const [apiMatches, setApiMatches] = useState<Match[]>([]);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const { toast } = useToast();
  
  // Real-time score updates
  const { liveScores, isConnected, lastUpdate, getMatchScore, hasRecentScoreChange } = useLiveScores();

  useEffect(() => {
    loadDbMatches();
    loadApiMatches();
  }, []);

  useEffect(() => {
    loadApiMatches();
  }, [selectedSport, selectedDate]);

  const loadDbMatches = async () => {
    try {
      const { data } = await supabase
        .from('matches')
        .select(`
          *,
          competition:competitions(name, sport),
          home_team:user_teams!matches_home_team_id_fkey(team_name),
          away_team:user_teams!matches_away_team_id_fkey(team_name)
        `)
        .order('match_date', { ascending: false })
        .limit(10);

      if (data) {
        setDbMatches(data);
      }
    } catch (error) {
      console.error('Error loading matches:', error);
    }
  };

  const loadApiMatches = async () => {
    setIsLoadingApi(true);
    try {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      console.log('Fetching matches for date:', formattedDate, 'sport:', selectedSport);
      
      const { data, error } = await supabase.functions.invoke('fetch-live-matches', {
        body: {
          sport: selectedSport.toLowerCase(),
          date: formattedDate,
          liveOnly: showLiveOnly,
        },
      });

      if (error) throw error;

      const fetchedMatches = data.matches || [];
      
      if (fetchedMatches.length === 0) {
        const mockForSport = mockMatches.filter(m => 
          m.sport === selectedSport.toLowerCase()
        );
        setApiMatches(mockForSport);
        setIsCached(false);
        toast({
          title: "Showing sample matches",
          description: `No live ${selectedSport} matches found. Displaying sample data for testing.`,
        });
      } else {
        setApiMatches(fetchedMatches);
        setIsCached(data.cached || false);
      }
    } catch (error) {
      console.error('Error loading API matches:', error);
      toast({
        title: "Using mock data",
        description: "Unable to load live matches, showing sample data",
        variant: "destructive",
      });
      setApiMatches(mockMatches.filter(m => m.sport === selectedSport.toLowerCase()));
    } finally {
      setIsLoadingApi(false);
    }
  };

  // Merge API matches with real-time scores
  const getMergedMatches = (): Match[] => {
    return apiMatches.map(match => {
      const liveScore = getMatchScore(match.id);
      if (liveScore) {
        return {
          ...match,
          homeScore: liveScore.home_score,
          awayScore: liveScore.away_score,
          status: liveScore.status as Match['status'],
          minute: liveScore.minute,
        };
      }
      return match;
    });
  };

  useEffect(() => {
    let filtered = getMergedMatches();
    
    if (searchQuery) {
      filtered = filtered.filter(match => 
        match.homeTeam.toLowerCase().includes(searchQuery.toLowerCase()) ||
        match.awayTeam.toLowerCase().includes(searchQuery.toLowerCase()) ||
        match.league.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (showLiveOnly) {
      filtered = filtered.filter(match => match.status === 'live');
    }
    
    setFilteredMatches(filtered);
  }, [apiMatches, searchQuery, showLiveOnly, liveScores]);

  const groupMatchesByLeague = (matches: Match[]) => {
    const grouped: { [league: string]: Match[] } = {};
    matches.forEach(match => {
      if (!grouped[match.league]) {
        grouped[match.league] = [];
      }
      grouped[match.league].push(match);
    });
    return grouped;
  };

  const getSportEmoji = (sport: string) => {
    const emojis: { [key: string]: string } = {
      football: "⚽",
      basketball: "🏀",
      tennis: "🎾",
      baseball: "⚾",
      boxing: "🥊"
    };
    return emojis[sport] || "🏆";
  };

  return (
    <div className="space-y-6">
      <div className="px-4">
        {/* Guest Banner */}
        {isGuest && onGuestLogin && onGuestSignup && (
          <GuestBanner onLogin={onGuestLogin} onSignup={onGuestSignup} />
        )}
        
        {/* Calendar and Search Controls */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search matches..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => loadApiMatches()}
              disabled={isLoadingApi}
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingApi ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          {/* Live Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Show Live Only</span>
              <Badge variant={showLiveOnly ? "destructive" : "outline"} className={showLiveOnly ? "animate-pulse" : ""}>
                {showLiveOnly ? "LIVE" : "ALL"}
              </Badge>
            </div>
            <Switch checked={showLiveOnly} onCheckedChange={setShowLiveOnly} />
          </div>

          {selectedDate && (
            <p className="text-xs text-muted-foreground">
              Showing matches for {format(selectedDate, 'PPP')}
            </p>
          )}

          {/* Real-time connection status */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">Real-time connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-yellow-500" />
                  <span className="text-yellow-500">Connecting...</span>
                </>
              )}
              {lastUpdate && (
                <span>• Updated {formatDistanceToNow(lastUpdate, { addSuffix: true })}</span>
              )}
              {isCached && <span className="text-yellow-500">• Cached</span>}
            </div>
          </div>
        </div>

        {isLoadingApi ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Database Competition Matches */}
            {dbMatches.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-base font-semibold">Competition Matches</h2>
                  <Badge variant="secondary">Live</Badge>
                </div>
                <div className="space-y-3">
                  {dbMatches.map((match: any) => (
                    <div
                      key={match.id}
                      className="bg-card border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors"
                      onClick={() => {
                        const transformedMatch: Match = {
                          id: match.id,
                          homeTeam: match.home_team?.team_name || 'Home Team',
                          awayTeam: match.away_team?.team_name || 'Away Team',
                          homeScore: match.home_score ?? null,
                          awayScore: match.away_score ?? null,
                          homeTeamLogo: '/placeholder.svg',
                          awayTeamLogo: '/placeholder.svg',
                          status: match.status,
                          league: match.competition?.name || 'Competition',
                          startTime: match.match_date,
                          sport: match.competition?.sport || 'football',
                          minute: null
                        };
                        onMatchClick(transformedMatch);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">
                          {match.competition?.name || 'Competition'}
                        </span>
                        <Badge variant={match.status === 'completed' ? 'secondary' : 'default'}>
                          {match.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{match.home_team?.team_name || 'Home Team'}</p>
                        </div>
                        <div className="flex items-center gap-4 px-4">
                          <span className="text-2xl font-bold">
                            {match.home_score ?? '-'}
                          </span>
                          <span className="text-muted-foreground">:</span>
                          <span className="text-2xl font-bold">
                            {match.away_score ?? '-'}
                          </span>
                        </div>
                        <div className="flex-1 text-right">
                          <p className="font-medium">{match.away_team?.team_name || 'Away Team'}</p>
                        </div>
                      </div>
                      
                      {match.status === 'scheduled' && (
                        <div className="mt-3 pt-3 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              const transformedMatch: Match = {
                                id: match.id,
                                homeTeam: match.home_team?.team_name || 'Home Team',
                                awayTeam: match.away_team?.team_name || 'Away Team',
                                homeScore: match.home_score ?? null,
                                awayScore: match.away_score ?? null,
                                homeTeamLogo: '/placeholder.svg',
                                awayTeamLogo: '/placeholder.svg',
                                status: match.status,
                                league: match.competition?.name || 'Competition',
                                startTime: match.match_date,
                                sport: match.competition?.sport || 'football',
                                minute: null
                              };
                              onMatchClick(transformedMatch);
                            }}
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Simulate Match
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show matches grouped by status or league */}
            {showLiveOnly ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-base font-semibold">Live Matches</h2>
                  <Badge variant="destructive" className="bg-live text-live-foreground animate-pulse">
                    LIVE
                  </Badge>
                </div>
                <div className="space-y-3">
                  {filteredMatches.length > 0 ? (
                    filteredMatches.map((match, index) => (
                      <div key={match.id}>
                        <MatchCard 
                          match={match} 
                          onClick={onMatchClick}
                          hasHomeScoreChange={hasRecentScoreChange(match.id, 'home')}
                          hasAwayScoreChange={hasRecentScoreChange(match.id, 'away')}
                        />
                        {(index + 1) % 10 === 0 && <NativeAd />}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No live matches currently</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupMatchesByLeague(filteredMatches)).map(([league, leagueMatches]) => (
                  <div key={league}>
                    <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                      {getSportEmoji(leagueMatches[0].sport)} {league}
                    </h2>
                    <div className="space-y-3">
                      {leagueMatches.map((match, index) => (
                        <div key={match.id}>
                          <MatchCard 
                            match={match} 
                            onClick={onMatchClick}
                            hasHomeScoreChange={hasRecentScoreChange(match.id, 'home')}
                            hasAwayScoreChange={hasRecentScoreChange(match.id, 'away')}
                          />
                          {(index + 1) % 10 === 0 && <NativeAd />}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {filteredMatches.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No matches found for this date</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
