import { useState, useEffect } from "react";
import { MatchCard } from "@/components/MatchCard";
import { NativeAd } from "@/components/NativeAd";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Search, CalendarIcon } from "lucide-react";
import { Match } from "@/types/sports";
import { mockMatches, mockUserProfile } from "@/data/mockData";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { Match as DBMatch } from "@/types/funhub";

interface HomeProps {
  onMatchClick: (match: Match) => void;
  selectedSport: string;
}

export const Home = ({ onMatchClick, selectedSport }: HomeProps) => {
  const [matches, setMatches] = useState<Match[]>(mockMatches);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>(mockMatches);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLiveOnly, setShowLiveOnly] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dbMatches, setDbMatches] = useState<any[]>([]);

  useEffect(() => {
    loadDbMatches();
  }, []);

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

  useEffect(() => {
    let filtered = matches;
    
    // Always filter by selected sport (no "all" option anymore)
    filtered = filtered.filter(match => match.sport === selectedSport);
    
    if (searchQuery) {
      filtered = filtered.filter(match => 
        match.homeTeam.toLowerCase().includes(searchQuery.toLowerCase()) ||
        match.awayTeam.toLowerCase().includes(searchQuery.toLowerCase()) ||
        match.league.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by selected date
    if (selectedDate) {
      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
      filtered = filtered.filter(match => {
        const matchDateStr = format(new Date(match.startTime), 'yyyy-MM-dd');
        return matchDateStr === selectedDateStr;
      });
    }

    // Filter by live only if toggle is on
    if (showLiveOnly) {
      filtered = filtered.filter(match => match.status === 'live');
    }
    
    setFilteredMatches(filtered);
  }, [matches, selectedSport, searchQuery, selectedDate, showLiveOnly]);

  // Group matches by league
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
        </div>

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
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Show matches grouped by status or league */}
        {showLiveOnly ? (
          /* Live Only Mode */
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
                    <MatchCard match={match} onClick={onMatchClick} />
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
          /* All Matches Grouped By League */
          <div className="space-y-6">
            {Object.entries(groupMatchesByLeague(filteredMatches)).map(([league, leagueMatches]) => (
              <div key={league}>
                <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                  {getSportEmoji(leagueMatches[0].sport)} {league}
                </h2>
                <div className="space-y-3">
                  {leagueMatches.map((match, index) => (
                    <div key={match.id}>
                      <MatchCard match={match} onClick={onMatchClick} />
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
      </div>
    </div>
  );
};