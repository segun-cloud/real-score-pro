import { Match } from "@/types/sports";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar } from "lucide-react";

interface MatchCardProps {
  match: Match;
  onClick: (match: Match) => void;
}

export const MatchCard = ({ match, onClick }: MatchCardProps) => {
  const getStatusBadge = () => {
    switch (match.status) {
      case 'live':
        return <Badge variant="destructive" className="bg-live text-live-foreground text-xs">LIVE</Badge>;
      case 'finished':
        return <Badge variant="secondary" className="text-xs">FT</Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="text-xs">
          <Clock className="h-3 w-3 mr-1" />
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
      className="p-3 hover:shadow-medium transition-all duration-200 cursor-pointer active:scale-[0.98] bg-card border-border"
      onClick={() => onClick(match)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{getSportIcon()}</span>
          <span className="text-xs text-muted-foreground font-medium">{match.league}</span>
        </div>
        {getStatusBadge()}
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-semibold">
              {match.homeTeam.substring(0, 2).toUpperCase()}
            </div>
            <span className="text-sm font-medium">{match.homeTeam}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-secondary/50 rounded-full flex items-center justify-center text-secondary-foreground text-xs font-semibold">
              {match.awayTeam.substring(0, 2).toUpperCase()}
            </div>
            <span className="text-sm font-medium">{match.awayTeam}</span>
          </div>
        </div>
        
        <div className="text-right">
          {match.status === 'live' || match.status === 'finished' ? (
            <div className="text-base font-bold">
              <div>{match.homeScore ?? 0}</div>
              <div>{match.awayScore ?? 0}</div>
            </div>
          ) : (
            <div className="text-center">
              <Calendar className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
              <div className="text-xs text-muted-foreground">
                {new Date(match.startTime).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {match.status === 'live' && match.minute && (
        <div className="mt-2 text-center">
          <Badge variant="outline" className="bg-live/10 text-live border-live/20 text-xs">
            {match.minute}'
          </Badge>
        </div>
      )}
    </Card>
  );
};