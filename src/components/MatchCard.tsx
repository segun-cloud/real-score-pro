import { Match } from "@/types/sports";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Heart } from "lucide-react";
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
      className="p-1.5 hover:shadow-sm transition-all duration-200 cursor-pointer active:scale-[0.99] bg-card border-border"
      onClick={() => onClick(match)}
    >
      <div className="flex items-center gap-2">
        {/* Teams and scores in a row */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium truncate flex-1">{match.homeTeam}</span>
            <span className="font-bold w-5 text-center">{match.status === 'live' || match.status === 'finished' ? (match.homeScore ?? 0) : '-'}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium truncate flex-1">{match.awayTeam}</span>
            <span className="font-bold w-5 text-center">{match.status === 'live' || match.status === 'finished' ? (match.awayScore ?? 0) : '-'}</span>
          </div>
        </div>
        
        {/* Status */}
        <div className="flex flex-col items-center gap-0.5">
          {getStatusBadge()}
          {match.status === 'live' && match.minute && (
            <span className="text-[9px] text-live font-semibold">{match.minute}'</span>
          )}
        </div>
        
        {/* Favourite */}
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 p-0"
          onClick={handleFavouriteClick}
        >
          <Heart 
            className={`h-3 w-3 ${isFavourited('match', match.id) ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
          />
        </Button>
      </div>
    </Card>
  );
};