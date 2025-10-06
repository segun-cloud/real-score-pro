import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, Coins } from "lucide-react";
import { Competition } from "@/types/funhub";
import { SPORT_CONFIG, DIVISION_CONFIG } from "@/types/funhub";
import { formatDistanceToNow } from "date-fns";

interface CompetitionCardProps {
  competition: Competition;
  onViewStandings: () => void;
  onPlayMatch: () => void;
}

export const CompetitionCard = ({ competition, onViewStandings, onPlayMatch }: CompetitionCardProps) => {
  const sportConfig = SPORT_CONFIG[competition.sport];
  const divisionConfig = DIVISION_CONFIG.find(d => d.level === competition.division);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{sportConfig.icon}</span>
            <div>
              <CardTitle className="text-lg">{sportConfig.name}</CardTitle>
              <CardDescription>Division {competition.division} - {divisionConfig?.name}</CardDescription>
            </div>
          </div>
          <Badge variant={competition.status === 'active' ? 'default' : 'secondary'}>
            {competition.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <span className="text-muted-foreground">Prize:</span>
            <span className="font-bold">{competition.prize_coins}</span>
          </div>
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Entry:</span>
            <span className="font-bold">{competition.entry_fee}</span>
          </div>
        </div>
        
        {competition.status === 'active' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Ends {formatDistanceToNow(new Date(competition.end_date), { addSuffix: true })}</span>
          </div>
        )}
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={onViewStandings} className="flex-1">
            View Standings
          </Button>
          {competition.status === 'active' && (
            <Button onClick={onPlayMatch} className="flex-1">
              Play Match
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
