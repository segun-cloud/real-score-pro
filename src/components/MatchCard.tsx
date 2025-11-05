import { Match } from "@/types/sports";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, Heart } from "lucide-react";
import { useFavourites } from "@/hooks/useFavourites";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface MatchCardProps {
  match: Match;
  onClick: (match: Match) => void;
}

export const MatchCard = ({ match, onClick }: MatchCardProps) => {
  const [userId, setUserId] = useState<string | undefined>();
  const { isFavourited, toggleFavourite } = useFavourites(userId);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });
  }, []);

  const handleFavouriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavourite('match', match.id, match);
  };

  const getStatusBadge = () => {
    switch (match.status) {
      case 'live':
        return <Badge variant="destructive" className="bg-live text-live-foreground text-[10px] px-1 py-0">LIVE</Badge>;
      case 'finished':
        return <Badge variant="secondary" className="text-[10px] px-1 py-0">FT</Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="text-[10px] px-1 py-0">
          <Clock className="h-2 w-2 mr-0.5" />
          {new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Badge>;
    }
  };

  const getSportIcon = () => {
    const sportEmojis = {
      football: '⚽',
      basketball: '🏀',
      tennis: '🎾',
      baseball: '⚾',
      boxing: '🥊'
    };
    return sportEmojis[match.sport];
  };

  return (
    <Card 
      className="p-2 hover:shadow-medium transition-all duration-200 cursor-pointer active:scale-[0.98] bg-card border-border"
      onClick={() => onClick(match)}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <span className="text-xs">{getSportIcon()}</span>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              // This will be implemented to navigate to league details
            }}
            className="text-[10px] text-muted-foreground font-medium hover:text-primary transition-colors truncate"
          >
            {match.league}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleFavouriteClick}
          >
            <Heart 
              className={`h-3 w-3 ${isFavourited('match', match.id) ? 'fill-primary text-primary' : ''}`}
            />
          </Button>
          {getStatusBadge()}
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-1 mb-0.5">
            <div className="w-4 h-4 bg-primary/10 rounded-full flex items-center justify-center text-primary text-[8px] font-semibold">
              {match.homeTeam.substring(0, 2).toUpperCase()}
            </div>
            <span className="text-xs font-medium">{match.homeTeam}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-secondary/50 rounded-full flex items-center justify-center text-secondary-foreground text-[8px] font-semibold">
              {match.awayTeam.substring(0, 2).toUpperCase()}
            </div>
            <span className="text-xs font-medium">{match.awayTeam}</span>
          </div>
        </div>
        
        <div className="text-right">
          {match.status === 'live' || match.status === 'finished' ? (
            <div className="text-sm font-bold">
              <div>{match.homeScore ?? 0}</div>
              <div>{match.awayScore ?? 0}</div>
            </div>
          ) : (
            <div className="text-center">
              <Calendar className="h-3 w-3 text-muted-foreground mx-auto mb-0.5" />
              <div className="text-[10px] text-muted-foreground">
                {new Date(match.startTime).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {match.status === 'live' && match.minute && (
        <div className="mt-1 text-center">
          <Badge variant="outline" className="bg-live/10 text-live border-live/20 text-[10px] px-1 py-0">
            {match.minute}'
          </Badge>
        </div>
      )}
    </Card>
  );
};