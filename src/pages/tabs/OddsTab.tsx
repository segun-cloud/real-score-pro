import { Card } from "@/components/ui/card";
import { MatchDetails as MatchDetailsType } from "@/types/sports";

interface OddsTabProps {
  matchDetails: MatchDetailsType;
}

export const OddsTab = ({ matchDetails }: OddsTabProps) => (
  <Card className="p-4">
    <h3 className="font-semibold mb-3">Match Odds</h3>
    <div className="grid grid-cols-3 gap-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Home Win</p>
        <p className="text-lg font-bold text-primary">{matchDetails.odds.homeWin}</p>
      </div>
      {matchDetails.odds.draw && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Draw</p>
          <p className="text-lg font-bold text-primary">{matchDetails.odds.draw}</p>
        </div>
      )}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Away Win</p>
        <p className="text-lg font-bold text-primary">{matchDetails.odds.awayWin}</p>
      </div>
    </div>
  </Card>
);
