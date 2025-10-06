import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, TrendingUp } from "lucide-react";
import { UserTeam } from "@/types/funhub";
import { SPORT_CONFIG, DIVISION_CONFIG } from "@/types/funhub";

interface MyTeamsTabProps {
  teams: UserTeam[];
  onViewTeam: (teamId: string) => void;
  onTrainPlayers: (teamId: string) => void;
  onCustomizeKit: (teamId: string) => void;
}

export const MyTeamsTab = ({ teams, onViewTeam, onTrainPlayers, onCustomizeKit }: MyTeamsTabProps) => {
  if (teams.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">You don't have any teams yet</p>
        <p className="text-sm text-muted-foreground">Create your first team to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {teams.map((team) => {
        const sportConfig = SPORT_CONFIG[team.sport];
        const divisionConfig = DIVISION_CONFIG.find(d => d.level === team.division);
        
        return (
          <Card key={team.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{sportConfig.icon}</span>
                  <div>
                    <CardTitle className="text-lg">{team.team_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{sportConfig.name}</p>
                  </div>
                </div>
                <Badge variant="secondary">{divisionConfig?.name}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Team Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-500">{team.wins || 0}</div>
                  <div className="text-xs text-muted-foreground">Wins</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-500">{team.draws || 0}</div>
                  <div className="text-xs text-muted-foreground">Draws</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-500">{team.losses || 0}</div>
                  <div className="text-xs text-muted-foreground">Losses</div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Points</span>
                </div>
                <span className="font-bold">{team.points || 0}</span>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onViewTeam(team.id)}
                  className="flex flex-col h-auto py-2"
                >
                  <Users className="h-4 w-4 mb-1" />
                  <span className="text-xs">View Team</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onTrainPlayers(team.id)}
                  className="flex flex-col h-auto py-2"
                >
                  <TrendingUp className="h-4 w-4 mb-1" />
                  <span className="text-xs">Train</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onCustomizeKit(team.id)}
                  className="flex flex-col h-auto py-2"
                >
                  <span className="text-lg mb-1">👕</span>
                  <span className="text-xs">Customize</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
