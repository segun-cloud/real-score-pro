import { Brain, Coins, Crown, Sparkles, TrendingUp, Target, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MatchDetails as MatchDetailsType } from "@/types/sports";

interface PredictionTabProps {
  matchDetails: MatchDetailsType;
  aiPredictionUnlocked: boolean;
  aiPrediction: any;
  isLoadingPrediction: boolean;
  userCoins: number;
  isPremium: boolean;
  onUnlock: () => void;
  onWatchAd: () => void;
}

export const PredictionTab = ({
  matchDetails,
  aiPredictionUnlocked,
  aiPrediction,
  isLoadingPrediction,
  userCoins,
  isPremium,
  onUnlock,
  onWatchAd,
}: PredictionTabProps) => {
  // FIX: use matchDetails.sport instead of match.sport (match prop can be undefined)
  const isBasketball = matchDetails.sport === 'basketball';

  if (!aiPredictionUnlocked && !isPremium) {
    return (
      <Card className="p-4 text-center">
        <Brain className="h-8 w-8 mx-auto mb-3 text-primary" />
        <h3 className="font-semibold text-sm mb-1.5">AI Match Prediction</h3>
        <p className="text-muted-foreground text-xs mb-3">
          Unlock AI-powered predictions and insights for this match
        </p>
        <div className="flex items-center justify-center gap-2 mb-4">
          <Coins className="h-4 w-4 text-coins" />
          <span className="font-semibold">20 Coins Required</span>
        </div>

        {userCoins >= 20 ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="w-full mb-3" disabled={isLoadingPrediction}>
                {isLoadingPrediction ? "Generating..." : "Unlock for 20 Coins"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Unlock AI Prediction
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will spend <span className="font-semibold text-coins">20 coins</span> to generate a prediction. You currently have <span className="font-semibold">{userCoins} coins</span>.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onUnlock}>
                  <Coins className="h-4 w-4 mr-2" />
                  Spend 20 Coins
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-destructive">Insufficient coins</p>
            <Button onClick={onWatchAd} variant="secondary" className="w-full">
              Watch Ad for Free Coins
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Premium
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Premium Subscription</DialogTitle>
                </DialogHeader>
                <div className="text-center py-4">
                  <Crown className="h-12 w-12 mx-auto mb-4 text-coins" />
                  <h3 className="font-semibold mb-2">$0.99/month</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                    <li>✓ Ad-free experience</li>
                    <li>✓ Unlimited AI predictions</li>
                    <li>✓ Premium insights</li>
                  </ul>
                  <Button className="w-full">Subscribe Now</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </Card>
    );
  }

  if (isLoadingPrediction) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!aiPrediction) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-muted-foreground">Prediction data unavailable</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Confidence Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold">AI Prediction</h3>
        </div>
        <Badge variant={
          aiPrediction.confidence === "High" ? "default" :
          aiPrediction.confidence === "Medium" ? "secondary" :
          "outline"
        }>
          {aiPrediction.confidence} Confidence
        </Badge>
      </div>

      {/* Match Result Bar */}
      <Card className="p-4 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h4 className="font-semibold">Match Result</h4>
          </div>
          <div className="flex gap-1 h-12 rounded-lg overflow-hidden">
            <div
              className="bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold transition-all"
              style={{ width: `${aiPrediction.match_result.home_win}%` }}
            >
              {aiPrediction.match_result.home_win > 15 && `${aiPrediction.match_result.home_win}%`}
            </div>
            {aiPrediction.match_result.draw !== null && (
              <div
                className="bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold transition-all"
                style={{ width: `${aiPrediction.match_result.draw}%` }}
              >
                {aiPrediction.match_result.draw > 15 && `${aiPrediction.match_result.draw}%`}
              </div>
            )}
            <div
              className="bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold transition-all"
              style={{ width: `${aiPrediction.match_result.away_win}%` }}
            >
              {aiPrediction.match_result.away_win > 15 && `${aiPrediction.match_result.away_win}%`}
            </div>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Home Win</span>
            {aiPrediction.match_result.draw !== null && <span>Draw</span>}
            <span>Away Win</span>
          </div>
        </div>
      </Card>

      {/* Betting Markets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isBasketball ? (
          <>
            <OddEvenCard prediction={aiPrediction} />
            <TotalPointsCard prediction={aiPrediction} />
            <HalfTimeOUCard prediction={aiPrediction} />
            <FirstQuarterOUCard prediction={aiPrediction} />
          </>
        ) : (
          <>
            <BTTSCard prediction={aiPrediction} />
            <OverUnderCard prediction={aiPrediction} />
          </>
        )}
      </div>

      {/* Score Predictions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CorrectScoreCard prediction={aiPrediction} />
        <HalfTimeCard prediction={aiPrediction} isBasketball={isBasketball} />
      </div>

      {/* Key Insights */}
      <Card className="p-4 bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
        <h4 className="font-semibold mb-3">Key Insights</h4>
        <ul className="space-y-2">
          {aiPrediction.key_insights.map((insight: string, idx: number) => (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <span className="text-primary mt-1">•</span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};

// ── Betting market sub-cards ─────────────────────────────────────────────────

const MarketGrid = ({ yes, no, yesLabel, noLabel, highlight }: {
  yes: number; no: number; yesLabel: string; noLabel: string; highlight: 'yes' | 'no';
}) => (
  <div className="grid grid-cols-2 gap-2">
    <div className={`p-3 rounded-lg text-center transition-all ${highlight === 'yes' ? 'bg-green-500/20 border-2 border-green-500' : 'bg-muted'}`}>
      <div className="text-lg font-bold">{yes}%</div>
      <div className="text-xs text-muted-foreground">{yesLabel}</div>
    </div>
    <div className={`p-3 rounded-lg text-center transition-all ${highlight === 'no' ? 'bg-red-500/20 border-2 border-red-500' : 'bg-muted'}`}>
      <div className="text-lg font-bold">{no}%</div>
      <div className="text-xs text-muted-foreground">{noLabel}</div>
    </div>
  </div>
);

const BTTSCard = ({ prediction }: { prediction: any }) => (
  <Card className="p-4 bg-gradient-to-br from-orange-500/5 to-red-500/5">
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-orange-500" />
        <h4 className="font-semibold">Both Teams to Score</h4>
      </div>
      <MarketGrid
        yes={prediction.btts?.yes} no={prediction.btts?.no}
        yesLabel="YES" noLabel="NO"
        highlight={prediction.btts?.yes > prediction.btts?.no ? 'yes' : 'no'}
      />
    </div>
  </Card>
);

const OverUnderCard = ({ prediction }: { prediction: any }) => (
  <Card className="p-4 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-purple-500" />
        <h4 className="font-semibold">Over/Under 2.5</h4>
      </div>
      <MarketGrid
        yes={prediction.over_under?.over_2_5} no={prediction.over_under?.under_2_5}
        yesLabel="OVER" noLabel="UNDER"
        highlight={prediction.over_under?.over_2_5 > prediction.over_under?.under_2_5 ? 'yes' : 'no'}
      />
    </div>
  </Card>
);

const OddEvenCard = ({ prediction }: { prediction: any }) => (
  <Card className="p-4 bg-gradient-to-br from-orange-500/5 to-red-500/5">
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-orange-500" />
        <h4 className="font-semibold">Odd/Even Total Points</h4>
      </div>
      <MarketGrid
        yes={prediction.odd_even?.odd} no={prediction.odd_even?.even}
        yesLabel="ODD" noLabel="EVEN"
        highlight={prediction.odd_even?.odd > prediction.odd_even?.even ? 'yes' : 'no'}
      />
    </div>
  </Card>
);

const TotalPointsCard = ({ prediction }: { prediction: any }) => (
  <Card className="p-4 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-purple-500" />
        <h4 className="font-semibold">Total Points O/U {prediction.total_points?.line}</h4>
      </div>
      <MarketGrid
        yes={prediction.total_points?.over} no={prediction.total_points?.under}
        yesLabel="OVER" noLabel="UNDER"
        highlight={prediction.total_points?.over > prediction.total_points?.under ? 'yes' : 'no'}
      />
    </div>
  </Card>
);

const HalfTimeOUCard = ({ prediction }: { prediction: any }) => (
  <Card className="p-4 bg-gradient-to-br from-cyan-500/5 to-blue-500/5">
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-cyan-500" />
        <h4 className="font-semibold">Half-Time O/U {prediction.half_time_over_under?.line}</h4>
      </div>
      <MarketGrid
        yes={prediction.half_time_over_under?.over} no={prediction.half_time_over_under?.under}
        yesLabel="OVER" noLabel="UNDER"
        highlight={prediction.half_time_over_under?.over > prediction.half_time_over_under?.under ? 'yes' : 'no'}
      />
    </div>
  </Card>
);

const FirstQuarterOUCard = ({ prediction }: { prediction: any }) => (
  <Card className="p-4 bg-gradient-to-br from-teal-500/5 to-emerald-500/5">
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-teal-500" />
        <h4 className="font-semibold">1st Quarter O/U {prediction.first_quarter_over_under?.line}</h4>
      </div>
      <MarketGrid
        yes={prediction.first_quarter_over_under?.over} no={prediction.first_quarter_over_under?.under}
        yesLabel="OVER" noLabel="UNDER"
        highlight={prediction.first_quarter_over_under?.over > prediction.first_quarter_over_under?.under ? 'yes' : 'no'}
      />
    </div>
  </Card>
);

const CorrectScoreCard = ({ prediction }: { prediction: any }) => (
  <Card className="p-4 bg-gradient-to-br from-cyan-500/5 to-blue-500/5">
    <div className="space-y-3">
      <h4 className="font-semibold">Correct Score</h4>
      <div className="text-center p-4 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg">
        <div className="text-2xl font-bold text-white mb-1">{prediction.correct_score.prediction}</div>
        <Badge variant="secondary" className="bg-white/20 text-white">
          {prediction.correct_score.probability}% probability
        </Badge>
      </div>
      {prediction.correct_score.alternatives?.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Alternative scores:</div>
          <div className="flex gap-2 flex-wrap">
            {prediction.correct_score.alternatives.map((alt: any, idx: number) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {alt.score} ({alt.probability}%)
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  </Card>
);

const HalfTimeCard = ({ prediction, isBasketball }: { prediction: any; isBasketball: boolean }) => (
  <Card className="p-4 bg-gradient-to-br from-teal-500/5 to-green-500/5">
    <div className="space-y-3">
      <h4 className="font-semibold">{isBasketball ? 'Half-Time Result' : 'Half-Time Score'}</h4>
      {isBasketball ? (
        <div className="space-y-2">
          {[
            { label: "Home Leading", value: prediction.half_time_result?.home_leading },
            { label: "Tied", value: prediction.half_time_result?.tied },
            { label: "Away Leading", value: prediction.half_time_result?.away_leading },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="flex justify-between items-center text-sm mb-1">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold">{value}%</span>
              </div>
              <Progress value={value} className="h-2" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="text-center p-4 bg-gradient-to-br from-teal-500 to-green-500 rounded-lg">
            <div className="text-2xl font-bold text-white mb-1">{prediction.half_time_score?.prediction}</div>
            <div className="text-xs text-white/80">Predicted HT Result</div>
          </div>
          <div className="space-y-2">
            {[
              { label: "Home Leading", value: prediction.half_time_score?.home_leading },
              { label: "Draw", value: prediction.half_time_score?.draw },
              { label: "Away Leading", value: prediction.half_time_score?.away_leading },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-semibold">{value}%</span>
                </div>
                <Progress value={value} className="h-2" />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  </Card>
);
