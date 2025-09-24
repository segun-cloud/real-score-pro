import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { MatchCard } from "@/components/MatchCard";
import { NativeAd } from "@/components/NativeAd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, ArrowLeft } from "lucide-react";
import { Match } from "@/types/sports";
import { mockMatches, mockUserProfile } from "@/data/mockData";

interface HomeProps {
  onMatchClick: (match: Match) => void;
  onProfileClick: () => void;
  selectedSport: string;
}

export const Home = ({ onMatchClick, onProfileClick, selectedSport }: HomeProps) => {
  const [matches, setMatches] = useState<Match[]>(mockMatches);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>(mockMatches);
  const [searchQuery, setSearchQuery] = useState("");
  const [userProfile] = useState(mockUserProfile);

  const sports = ["all", "football", "basketball", "tennis", "baseball", "boxing"];

  useEffect(() => {
    let filtered = matches;
    
    if (selectedSport !== "all") {
      filtered = filtered.filter(match => match.sport === selectedSport);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(match => 
        match.homeTeam.toLowerCase().includes(searchQuery.toLowerCase()) ||
        match.awayTeam.toLowerCase().includes(searchQuery.toLowerCase()) ||
        match.league.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredMatches(filtered);
  }, [matches, selectedSport, searchQuery]);

  const getSportEmoji = (sport: string) => {
    const emojis: { [key: string]: string } = {
      all: "🏆",
      football: "⚽",
      basketball: "🏀",
      tennis: "🎾",
      baseball: "⚾",
      boxing: "🥊"
    };
    return emojis[sport] || "🏆";
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        coins={userProfile.coins} 
        onProfileClick={onProfileClick}
      />
      
      <div className="p-4 space-y-4">
        {/* Back Button */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-base font-semibold">Sports</h2>
        </div>
        
        {/* Search and Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search teams, leagues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {sports.map((sport) => (
              <Badge
                key={sport}
                variant={selectedSport === sport ? "default" : "outline"}
                className="flex items-center gap-2 whitespace-nowrap px-3 py-2"
              >
                <span>{getSportEmoji(sport)}</span>
                <span className="capitalize">{sport}</span>
              </Badge>
            ))}
          </div>
        </div>

        {/* Live Matches Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-base font-semibold">Live Matches</h2>
            <Badge variant="destructive" className="bg-live text-live-foreground animate-pulse">
              LIVE
            </Badge>
          </div>
          <div className="space-y-3">
            {filteredMatches
              .filter(match => match.status === 'live')
              .map((match, index) => (
                <div key={match.id}>
                  <MatchCard match={match} onClick={onMatchClick} />
                  {(index + 1) % 10 === 0 && <NativeAd />}
                </div>
              ))}
          </div>
        </div>

        {/* Upcoming Matches Section */}
        <div>
          <h2 className="text-base font-semibold mb-3">Upcoming Matches</h2>
          <div className="space-y-3">
            {filteredMatches
              .filter(match => match.status === 'scheduled')
              .map((match, index) => (
                <div key={match.id}>
                  <MatchCard match={match} onClick={onMatchClick} />
                  {(index + 1) % 10 === 0 && <NativeAd />}
                </div>
              ))}
          </div>
        </div>

        {/* Recent Results Section */}
        <div>
          <h2 className="text-base font-semibold mb-3">Recent Results</h2>
          <div className="space-y-3">
            {filteredMatches
              .filter(match => match.status === 'finished')
              .map((match, index) => (
                <div key={match.id}>
                  <MatchCard match={match} onClick={onMatchClick} />
                  {(index + 1) % 10 === 0 && <NativeAd />}
                </div>
              ))}
          </div>
        </div>

        {/* Show message if no matches found */}
        {filteredMatches.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No matches found for your search criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};