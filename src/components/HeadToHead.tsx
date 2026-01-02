import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Calendar, Minus } from "lucide-react";
import { H2HRecord } from "@/types/sports";

interface HeadToHeadProps {
  h2h: H2HRecord | null;
  homeTeam: string;
  awayTeam: string;
  isLoading?: boolean;
}

export const HeadToHead = ({ h2h, homeTeam, awayTeam, isLoading }: HeadToHeadProps) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!h2h) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">No head-to-head data available for this fixture</p>
      </Card>
    );
  }

  const totalMatches = h2h.homeWins + h2h.draws + h2h.awayWins;
  const homeWinPercentage = totalMatches > 0 ? (h2h.homeWins / totalMatches) * 100 : 0;
  const drawPercentage = totalMatches > 0 ? (h2h.draws / totalMatches) * 100 : 0;
  const awayWinPercentage = totalMatches > 0 ? (h2h.awayWins / totalMatches) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Overall Record */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          Head-to-Head Record
        </h3>
        
        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground mb-1">
            {totalMatches} previous meetings
          </p>
        </div>
        
        {/* Win Distribution Bar */}
        <div className="mb-4">
          <div className="flex h-8 rounded-lg overflow-hidden">
            {homeWinPercentage > 0 && (
              <div 
                className="bg-green-500 flex items-center justify-center text-white text-xs font-bold transition-all"
                style={{ width: `${homeWinPercentage}%` }}
              >
                {h2h.homeWins}
              </div>
            )}
            {drawPercentage > 0 && (
              <div 
                className="bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold transition-all"
                style={{ width: `${drawPercentage}%` }}
              >
                {h2h.draws}
              </div>
            )}
            {awayWinPercentage > 0 && (
              <div 
                className="bg-blue-500 flex items-center justify-center text-white text-xs font-bold transition-all"
                style={{ width: `${awayWinPercentage}%` }}
              >
                {h2h.awayWins}
              </div>
            )}
          </div>
        </div>
        
        {/* Team Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-green-500">{h2h.homeWins}</p>
            <p className="text-xs text-muted-foreground truncate">{homeTeam}</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-muted-foreground">{h2h.draws}</p>
            <p className="text-xs text-muted-foreground">Draws</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-blue-500">{h2h.awayWins}</p>
            <p className="text-xs text-muted-foreground truncate">{awayTeam}</p>
          </div>
        </div>
      </Card>

      {/* Recent Meetings */}
      {h2h.recentMeetings && h2h.recentMeetings.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Recent Meetings
          </h3>
          
          <div className="space-y-2">
            {h2h.recentMeetings.map((meeting, index) => {
              const homeWon = meeting.homeScore > meeting.awayScore;
              const awayWon = meeting.awayScore > meeting.homeScore;
              const isDraw = meeting.homeScore === meeting.awayScore;
              
              return (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">
                      {new Date(meeting.date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                    {meeting.competition && (
                      <Badge variant="outline" className="text-[10px]">
                        {meeting.competition}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${homeWon ? 'text-green-500' : ''}`}>
                      {homeTeam.split(' ')[0]}
                    </span>
                    <div className={`px-3 py-1 rounded font-bold text-sm ${
                      isDraw 
                        ? 'bg-muted text-muted-foreground' 
                        : homeWon 
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-blue-500/10 text-blue-500'
                    }`}>
                      {meeting.homeScore} - {meeting.awayScore}
                    </div>
                    <span className={`text-sm font-medium ${awayWon ? 'text-blue-500' : ''}`}>
                      {awayTeam.split(' ')[0]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};
