import { Card } from "@/components/ui/card";
import { HeadToHead } from "@/components/HeadToHead";
import { MatchDetails as MatchDetailsType } from "@/types/sports";
import { H2HRecord } from "@/types/sports";

interface MatchesTabProps {
  matchDetails: MatchDetailsType;
  h2hData: H2HRecord | null;
  isLoadingH2h: boolean;
}

export const MatchesTab = ({ matchDetails, h2hData, isLoadingH2h }: MatchesTabProps) => (
  <div className="space-y-4">
    <HeadToHead
      h2h={h2hData || matchDetails.h2h || null}
      homeTeam={matchDetails.homeTeam}
      awayTeam={matchDetails.awayTeam}
      isLoading={isLoadingH2h}
    />

    {/* Recent fixtures â€” only shown when real data is available */}
    {!h2hData && !matchDetails.h2h && !isLoadingH2h && (
      <Card className="p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Recent fixtures not available for this match
        </p>
      </Card>
    )}
  </div>
);
