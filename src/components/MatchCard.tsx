import { Match } from "@/types/sports";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Heart, Zap } from "lucide-react";
import { useFavourites } from "@/hooks/useFavourites";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface MatchCardProps {
  match: Match;
  onClick: (match: Match) => void;
  hasHomeScoreChange?: boolean;
  hasAwayScoreChange?: boolean;
}

export const MatchCard = ({ match, onClick, hasHomeScoreChange, hasAwayScoreChange }: MatchCardProps) => {
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

  const isLive = match.status === 'live';
  const isFinished = match.status === 'finished';

  const getStatusBadge = () => {
    switch (match.status) {
      case 'live':
        return (
          <Badge className="gradient-live text-live-foreground text-[9px] px-1.5 py-0 rounded-md border-0 shadow-sm glow-live animate-pulse">
            <Zap className="h-2 w-2 mr-0.5" />
            LIVE
          </Badge>
        );
      case 'finished':
        return (
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 rounded-md bg-secondary/80">
            FT
          </Badge>
        );
      case 'scheduled':
        return (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded-md border-border/50 bg-background/50">
            <Clock className="h-2 w-2 mr-0.5" />
            {new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Badge>
        );
    }
  };

  return (
    <Card 
      className={cn(
        "group p-1.5 transition-all duration-300 cursor-pointer hover-lift press-effect overflow-hidden relative",
        isLive 
          ? "bg-gradient-to-r from-live/5 via-card to-card border-l-3 border-l-live shadow-sm glow-live" 
          : "bg-card border-border/50 hover:border-primary/30 hover:shadow-sm"
      )}
      onClick={() => onClick(match)}
    >
      {isLive && (
        <div className="absolute inset-0 animate-shimmer pointer-events-none" />
      )}
      
      <div className="flex items-center gap-1 relative">
        <div className="flex-1 min-w-0 space-y-0.5">
          {/* Home Team */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              {match.homeTeamLogo ? (
                <img 
                  src={match.homeTeamLogo} 
                  alt="" 
                  className="w-3.5 h-3.5 object-contain flex-shrink-0 rounded bg-secondary/30 p-[1px]" 
                />
              ) : (
                <div className="w-3.5 h-3.5 bg-gradient-to-br from-primary/20 to-primary/10 rounded flex-shrink-0 flex items-center justify-center">
                  <span className="text-[7px] font-bold text-primary/60">
                    {match.homeTeam.charAt(0)}
                  </span>
                </div>
              )}
              <span className={cn(
                "text-[10px] font-medium truncate transition-colors",
                isLive && "text-foreground"
              )}>
                {match.homeTeam}
              </span>
            </div>
            <span 
              className={cn(
                "text-xs font-bold w-5 text-right flex-shrink-0 transition-all duration-500",
                hasHomeScoreChange && "text-success scale-125 glow-primary",
                isLive && "text-foreground"
              )}
            >
              {isLive || isFinished ? (match.homeScore ?? 0) : '-'}
            </span>
          </div>
          
          {/* Away Team */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              {match.awayTeamLogo ? (
                <img 
                  src={match.awayTeamLogo} 
                  alt="" 
                  className="w-3.5 h-3.5 object-contain flex-shrink-0 rounded bg-secondary/30 p-[1px]" 
                />
              ) : (
                <div className="w-3.5 h-3.5 bg-gradient-to-br from-secondary to-secondary/50 rounded flex-shrink-0 flex items-center justify-center">
                  <span className="text-[7px] font-bold text-muted-foreground">
                    {match.awayTeam.charAt(0)}
                  </span>
                </div>
              )}
              <span className={cn(
                "text-[10px] font-medium truncate transition-colors",
                isLive && "text-foreground"
              )}>
                {match.awayTeam}
              </span>
            </div>
            <span 
              className={cn(
                "text-xs font-bold w-5 text-right flex-shrink-0 transition-all duration-500",
                hasAwayScoreChange && "text-success scale-125 glow-primary",
                isLive && "text-foreground"
              )}
            >
              {isLive || isFinished ? (match.awayScore ?? 0) : '-'}
            </span>
          </div>
        </div>
        
        {/* Status & Actions */}
        <div className="flex flex-col items-center gap-0.5 pl-1 border-l border-border/30">
          {getStatusBadge()}
          
          {isLive && match.minute && (
            <span className="text-[9px] font-bold text-live tabular-nums">
              {match.minute}'
            </span>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-5 w-5 rounded transition-all duration-300",
              isFavourited('match', match.id) 
                ? "text-primary bg-primary/10 hover:bg-primary/20" 
                : "text-muted-foreground hover:text-primary hover:bg-primary/10"
            )}
            onClick={handleFavouriteClick}
          >
            <Heart 
              className={cn(
                "h-2.5 w-2.5 transition-all duration-300",
                isFavourited('match', match.id) && "fill-primary scale-110"
              )}
            />
          </Button>
        </div>
      </div>
    </Card>
  );
};
