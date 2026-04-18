import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy } from "lucide-react";
import { MatchDetails as MatchDetailsType } from "@/types/sports";

interface StandingsTabProps {
  matchDetails: MatchDetailsType;
  standings: any[];
  isLoading: boolean;
  isCupCompetition: boolean;
}

export const StandingsTab = ({ matchDetails, standings, isLoading, isCupCompetition }: StandingsTabProps) => {
  if (isCupCompetition) {
    return (
      <Card className="p-6 text-center">
        <Trophy className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-semibold mb-2">Cup Competition</h3>
        <p className="text-sm text-muted-foreground">
          {matchDetails.league} is a knockout competition without league standings.
        </p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">{matchDetails.league} Standings</h3>
      {standings.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-1">#</th>
                <th className="text-left py-2 px-2">Team</th>
                <th className="text-center py-2 px-1">P</th>
                <th className="text-center py-2 px-1">W</th>
                <th className="text-center py-2 px-1">D</th>
                <th className="text-center py-2 px-1">L</th>
                <th className="text-center py-2 px-1">GD</th>
                <th className="text-center py-2 px-1">Pts</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team: any) => {
                const homeSlug = matchDetails.homeTeam.toLowerCase().split(' ')[0];
                const awaySlug = matchDetails.awayTeam.toLowerCase().split(' ')[0];
                const isHighlighted =
                  team.team_name?.toLowerCase().includes(homeSlug) ||
                  team.team_name?.toLowerCase().includes(awaySlug);
                return (
                  <tr
                    key={team.position}
                    className={`border-b hover:bg-muted/50 ${isHighlighted ? 'bg-primary/10' : ''}`}
                  >
                    <td className="py-2 px-1 font-medium">{team.position}</td>
                    <td className="py-2 px-2 font-medium truncate max-w-[100px]">{team.team_name}</td>
                    <td className="text-center py-2 px-1">{team.played}</td>
                    <td className="text-center py-2 px-1">{team.won}</td>
                    <td className="text-center py-2 px-1">{team.drawn}</td>
                    <td className="text-center py-2 px-1">{team.lost}</td>
                    <td className="text-center py-2 px-1">{team.goal_difference}</td>
                    <td className="text-center py-2 px-1 font-bold">{team.points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Standings not available for this competition</p>
        </Card>
      )}
    </div>
  );
};
