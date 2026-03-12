import { useState, useEffect, useRef, useCallback } from "react";
import { MatchCard } from "@/components/MatchCard";
import { NativeAd } from "@/components/NativeAd";
import { GuestBanner } from "@/components/GuestBanner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Search, CalendarIcon, RefreshCw, Wifi, WifiOff, ArrowDownCircle } from "lucide-react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Match } from "@/types/sports";
import { mockMatches } from "@/data/mockData";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLiveScores } from "@/hooks/useLiveScores";
import { cn } from "@/lib/utils";

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
  const [apiMatches, setApiMatches] = useState<Match[]>([]);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const { toast } = useToast();
  
  // Real-time score updates
  const { liveScores, isConnected, lastUpdate, getMatchScore, hasRecentScoreChange } = useLiveScores();
  
  // Track if we've already auto-toggled to live mode
  const hasAutoToggledLive = useRef(false);

  
  // Auto-toggle to live mode when live matches are available (only on initial load)
  useEffect(() => {
    if (!hasAutoToggledLive.current && apiMatches.length > 0) {
      const hasLiveMatches = apiMatches.some(match => match.status === 'live');
      if (hasLiveMatches) {
        setShowLiveOnly(true);
        hasAutoToggledLive.current = true;
        console.log('[Home] Auto-toggled to live mode - live matches detected');
      }
    }
  }, [apiMatches]);

  useEffect(() => {
    loadApiMatches();
  }, [selectedSport, selectedDate]);

  const loadApiMatches = async () => {
    setIsLoadingApi(true);
    try {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      
      
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
    <div className="space-y-4 animate-fade-in">
      <div className="px-4">
        {/* Guest Banner */}
        {isGuest && onGuestLogin && onGuestSignup && (
          <GuestBanner onLogin={onGuestLogin} onSignup={onGuestSignup} />
        )}
        
        {/* Calendar and Search Controls */}
        <div className="mb-3 space-y-2">
          <div className="flex items-center justify-between gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
              <Input
                type="text"
                placeholder="Search matches..."
                className="pl-8 h-8 text-xs rounded-lg border-border/50 bg-secondary/30 focus:bg-background transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-border/50 hover-lift press-effect">
                  <CalendarIcon className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 glass-strong rounded-xl border-border/50" align="end">
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
              className="h-8 w-8 rounded-lg border-border/50 hover-lift press-effect"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingApi ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          {/* Live Toggle */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-border/30">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium">Show Live Only</span>
              <Badge 
                className={cn(
                  "transition-all duration-300",
                  showLiveOnly 
                    ? "gradient-live text-live-foreground border-0 glow-live animate-pulse" 
                    : "bg-secondary text-secondary-foreground"
                )}
              >
                {showLiveOnly ? "🔴 LIVE" : "ALL"}
              </Badge>
            </div>
            <Switch checked={showLiveOnly} onCheckedChange={setShowLiveOnly} />
          </div>

          {selectedDate && (
            <p className="text-[10px] text-muted-foreground px-0.5">
              📅 {format(selectedDate, 'PPP')}
            </p>
          )}

          {/* Real-time connection status */}
          <div className="flex items-center justify-between px-0.5">
            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
              {isConnected ? (
                <div className="flex items-center gap-1.5 text-success">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <Wifi className="h-3 w-3" />
                  <span>Live connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-warning">
                  <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                  <WifiOff className="h-3 w-3" />
                  <span>Connecting...</span>
                </div>
              )}
              {lastUpdate && (
                <span className="text-muted-foreground/70">• {formatDistanceToNow(lastUpdate, { addSuffix: true })}</span>
              )}
              {isCached && <span className="text-warning">• Cached</span>}
            </div>
          </div>
        </div>

        {isLoadingApi ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-primary/10 animate-pulse" />
              </div>
            </div>
            <span className="text-sm text-muted-foreground">Loading matches...</span>
          </div>
        ) : (
          <>
            {/* Show matches grouped by status or league */}
            {showLiveOnly ? (
              <div className="animate-fade-up">
              <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-5 h-5 rounded-md gradient-live flex items-center justify-center shadow-sm">
                    <span className="text-xs">🔴</span>
                  </div>
                  <h2 className="text-sm font-bold">Live Matches</h2>
                  <Badge className="text-[10px] gradient-live text-live-foreground border-0 animate-pulse">
                    {filteredMatches.length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {filteredMatches.length > 0 ? (
                    filteredMatches.map((match, index) => (
                      <div key={match.id} className="animate-fade-up" style={{ animationDelay: `${index * 50}ms` }}>
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
                    <div className="text-center py-12 px-4">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary/50 flex items-center justify-center">
                        <span className="text-3xl opacity-50">📺</span>
                      </div>
                      <p className="text-muted-foreground font-medium">No live matches currently</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">Check back later for live action!</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupMatchesByLeague(filteredMatches)).map(([league, leagueMatches], groupIndex) => (
                  <div key={league} className="animate-fade-up" style={{ animationDelay: `${groupIndex * 100}ms` }}>
                    <div className="flex items-center gap-1.5 mb-2 sticky top-0 py-1.5 bg-background/80 backdrop-blur-sm z-10">
                      <div className="w-5 h-5 rounded-md bg-secondary/80 flex items-center justify-center text-xs shadow-soft">
                        {getSportEmoji(leagueMatches[0].sport)}
                      </div>
                      <h2 className="text-xs font-bold flex-1 truncate">{league}</h2>
                      <Badge variant="outline" className="text-[10px] rounded">
                        {leagueMatches.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
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
                  <div className="text-center py-12 px-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary/50 flex items-center justify-center">
                      <span className="text-3xl opacity-50">🏟️</span>
                    </div>
                    <p className="text-muted-foreground font-medium">No matches found for this date</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Try selecting a different date</p>
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
