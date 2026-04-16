import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";
import { FootballPitch } from "@/components/FootballPitch";
import { MatchDetails as MatchDetailsType } from "@/types/sports";

interface LineupsTabProps {
  matchDetails: MatchDetailsType;
}

export const LineupsTab = ({ matchDetails }: LineupsTabProps) => {
  if (!matchDetails.lineups) {
    return <div className="text-center text-muted-foreground py-8">Lineups not available</div>;
  }

  const homeSubstitutes = matchDetails.lineups.home.filter(p => p.isSubstitute);
  const awaySubstitutes = matchDetails.lineups.away.filter(p => p.isSubstitute);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-bold mb-1">Team Formations</h3>
        <p className="text-sm text-muted-foreground">
          {matchDetails.homeTeam} ({matchDetails.lineups.homeFormation}) vs {matchDetails.awayTeam} ({matchDetails.lineups.awayFormation})
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <FootballPitch
          players={matchDetails.lineups.home}
          formation={matchDetails.lineups.homeFormation || "4-3-3"}
          teamName={matchDetails.homeTeam}
          isHome={true}
        />
        <FootballPitch
          players={matchDetails.lineups.away}
          formation={matchDetails.lineups.awayFormation || "4-3-3"}
          teamName={matchDetails.awayTeam}
          isHome={false}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 justify-center">
          <Users className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-bold">Substitutes Bench</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
            <h4 className="font-semibold text-sm mb-3 text-center text-emerald-700 dark:text-emerald-400">
              {matchDetails.homeTeam}
            </h4>
            <div className="space-y-2">
              {homeSubstitutes.map((player) => (
                <div
                  key={player.number}
                  className="flex items-center gap-3 p-2 rounded-lg bg-background/50 border border-emerald-200/50 dark:border-emerald-900/50 hover:bg-background/80 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                    {player.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{player.name}</p>
                    <p className="text-xs text-muted-foreground">{player.position}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <h4 className="font-semibold text-sm mb-3 text-center text-blue-700 dark:text-blue-400">
              {matchDetails.awayTeam}
            </h4>
            <div className="space-y-2">
              {awaySubstitutes.map((player) => (
                <div
                  key={player.number}
                  className="flex items-center gap-3 p-2 rounded-lg bg-background/50 border border-blue-200/50 dark:border-blue-900/50 hover:bg-background/80 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                    {player.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{player.name}</p>
                    <p className="text-xs text-muted-foreground">{player.position}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
