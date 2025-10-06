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