import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MatchDetails as MatchDetailsType } from "@/types/sports";

interface StatisticsTabProps {
  matchDetails: MatchDetailsType;
}

const StatRow = ({ label, home, away }: { label: string; home?: number; away?: number }) => {
  if (home === undefined || away === undefined) return null;
  return (
    <div className="flex justify-between items-center text-xs py-2 border-b">
      <span className="font-semibold text-primary w-12 text-center">{home}</span>
      <span className="text-muted-foreground flex-1 text-center">{label}</span>
      <span className="font-semibold text-primary w-12 text-center">{away}</span>
    </div>
  );
};

const PercentRow = ({ label, home, away }: { label: string; home?: number; away?: number }) => {
  if (home === undefined || away === undefined) return null;
  return (
    <div className="flex justify-between items-center text-xs py-2 border-b">
      <span className="font-semibold text-primary w-12 text-center">{home}%</span>
      <span className="text-muted-foreground flex-1 text-center">{label}</span>
      <span className="font-semibold text-primary w-12 text-center">{away}%</span>
    </div>
  );
};

export const StatisticsTab = ({ matchDetails }: StatisticsTabProps) => {
  const stats = matchDetails.statistics;

  if (!stats || Object.keys(stats).length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 text-sm">
        Statistics not available
      </div>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4 text-center">Match Statistics</h3>
      <div className="space-y-3">

        {matchDetails.sport === 'football' && (
          <>
            {stats.possession && (
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-semibold text-primary">{stats.possession.home}%</span>
                  <span className="text-muted-foreground">Possession</span>
                  <span className="font-semibold text-primary">{stats.possession.away}%</span>
                </div>
                <Progress value={stats.possession.home} className="h-2" />
              </div>
            )}
            <StatRow label="Shots" home={stats.shots?.home} away={stats.shots?.away} />
            <StatRow label="Shots on Target" home={stats.shotsOnTarget?.home} away={stats.shotsOnTarget?.away} />
            <StatRow label="Passes" home={stats.passes?.home} away={stats.passes?.away} />
            <StatRow label="Attacks" home={stats.attacks?.home} away={stats.attacks?.away} />
            <StatRow label="Dangerous Attacks" home={stats.dangerousAttacks?.home} away={stats.dangerousAttacks?.away} />
            <StatRow label="Big Chances" home={stats.bigChances?.home} away={stats.bigChances?.away} />
            <StatRow label="Corners" home={stats.corners?.home} away={stats.corners?.away} />
            <StatRow label="Free Kicks" home={stats.freeKicks?.home} away={stats.freeKicks?.away} />
            <StatRow label="Fouls" home={stats.fouls?.home} away={stats.fouls?.away} />
            <StatRow label="Penalties" home={stats.penalties?.home} away={stats.penalties?.away} />
          </>
        )}

        {matchDetails.sport === 'basketball' && (
          <>
            <PercentRow label="Field Goal %" home={stats.fieldGoalPercentage?.home} away={stats.fieldGoalPercentage?.away} />
            <PercentRow label="3-Point %" home={stats.threePointPercentage?.home} away={stats.threePointPercentage?.away} />
            <PercentRow label="Free Throw %" home={stats.freeThrowPercentage?.home} away={stats.freeThrowPercentage?.away} />
            <StatRow label="Rebounds" home={stats.rebounds?.home} away={stats.rebounds?.away} />
            <StatRow label="Assists" home={stats.assists?.home} away={stats.assists?.away} />
            <StatRow label="Steals" home={stats.steals?.home} away={stats.steals?.away} />
            <StatRow label="Blocks" home={stats.blocks?.home} away={stats.blocks?.away} />
            <StatRow label="Turnovers" home={stats.turnovers?.home} away={stats.turnovers?.away} />
            <StatRow label="Fouls" home={stats.fouls?.home} away={stats.fouls?.away} />
          </>
        )}

        {matchDetails.sport === 'tennis' && (
          <>
            <StatRow label="Aces" home={stats.aces?.home} away={stats.aces?.away} />
            <StatRow label="Double Faults" home={stats.doubleFaults?.home} away={stats.doubleFaults?.away} />
            <PercentRow label="First Serve %" home={stats.firstServePercentage?.home} away={stats.firstServePercentage?.away} />
            <StatRow label="Break Points Won" home={stats.breakPointsWon?.home} away={stats.breakPointsWon?.away} />
            <StatRow label="Winners" home={stats.winners?.home} away={stats.winners?.away} />
            <StatRow label="Unforced Errors" home={stats.unforcedErrors?.home} away={stats.unforcedErrors?.away} />
          </>
        )}

        {matchDetails.sport === 'baseball' && (
          <>
            <StatRow label="Hits" home={stats.hits?.home} away={stats.hits?.away} />
            <StatRow label="Runs" home={stats.runs?.home} away={stats.runs?.away} />
            <StatRow label="Errors" home={stats.errors?.home} away={stats.errors?.away} />
            <StatRow label="Home Runs" home={stats.homeRuns?.home} away={stats.homeRuns?.away} />
            <StatRow label="Strikeouts" home={stats.strikeouts?.home} away={stats.strikeouts?.away} />
            <StatRow label="Walks" home={stats.walks?.home} away={stats.walks?.away} />
          </>
        )}

        {matchDetails.sport === 'boxing' && (
          <>
            <StatRow label="Punches Thrown" home={stats.punchesThrown?.home} away={stats.punchesThrown?.away} />
            <StatRow label="Punches Landed" home={stats.punchesLanded?.home} away={stats.punchesLanded?.away} />
            <PercentRow label="Punch Accuracy" home={stats.punchAccuracy?.home} away={stats.punchAccuracy?.away} />
            <StatRow label="Power Punches" home={stats.powerPunches?.home} away={stats.powerPunches?.away} />
            <StatRow label="Jabs" home={stats.jabs?.home} away={stats.jabs?.away} />
            <StatRow label="Knockdowns" home={stats.knockdowns?.home} away={stats.knockdowns?.away} />
          </>
        )}

      </div>
    </Card>
  );
};
