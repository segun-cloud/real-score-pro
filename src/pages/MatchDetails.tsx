import { useState, useEffect } from "react";
import { ArrowLeft, Brain, Coins, Crown } from "lucide-react";
import { Header } from "@/components/Header";
import { TabNavigation } from "@/components/TabNavigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MatchDetails as MatchDetailsType } from "@/types/sports";
import { getMockMatchDetails, mockUserProfile } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

interface MatchDetailsProps {
  matchId: string;
  onBack: () => void;
  onProfileClick: () => void;
}

export const MatchDetails = ({ matchId, onBack, onProfileClick }: MatchDetailsProps) => {
  const [matchDetails, setMatchDetails] = useState<MatchDetailsType | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const [userProfile, setUserProfile] = useState(mockUserProfile);
  const [aiPredictionUnlocked, setAiPredictionUnlocked] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const details = getMockMatchDetails(matchId);
      setMatchDetails(details);
    } catch (error) {
      console.error("Failed to load match details:", error);
    }
  }, [matchId]);

  const tabs = [
    { id: "details", label: "Details" },
    { id: "odds", label: "Odds" },
    { id: "lineups", label: "Lineups" },
    { id: "statistics", label: "Stats" },
    { id: "commentary", label: "Commentary" },
    { id: "standings", label: "Standings" },
    { id: "fixtures", label: "Fixtures" },
    { id: "media", label: "Media" },
    { id: "prediction", label: "AI Prediction", icon: <Brain className="h-4 w-4" /> },
    { id: "tracker", label: "Live Tracker" },
  ];

  const handleUnlockPrediction = () => {
    if (userProfile.coins >= 20) {
      setUserProfile(prev => ({ ...prev, coins: prev.coins - 20 }));
      setAiPredictionUnlocked(true);
      setActiveTab("prediction");
      toast({
        title: "Prediction Unlocked!",
        description: "AI prediction has been unlocked for 20 coins.",
      });
    } else {
      toast({
        title: "Insufficient Coins",
        description: "You need 20 coins to unlock this prediction.",
        variant: "destructive",
      });
    }
  };

  const handleWatchRewardedAd = () => {
    // Simulate rewarded ad watch
    setUserProfile(prev => ({ ...prev, coins: prev.coins + 25 }));
    toast({
      title: "Coins Earned!",
      description: "You earned 25 coins for watching the ad!",
    });
  };

  if (!matchDetails) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading match details...</p>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "details":
        return (
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Match Events</h3>
              <div className="space-y-2">
                {matchDetails.events.map((event, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-secondary/50 rounded">
                    <Badge variant="outline">{event.minute}'</Badge>
                    <span className="text-sm">{event.description}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        );

      case "odds":
        return (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Match Odds</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Home Win</p>
                <p className="text-2xl font-bold text-primary">{matchDetails.odds.homeWin}</p>
              </div>
              {matchDetails.odds.draw && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Draw</p>
                  <p className="text-2xl font-bold text-primary">{matchDetails.odds.draw}</p>
                </div>
              )}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Away Win</p>
                <p className="text-2xl font-bold text-primary">{matchDetails.odds.awayWin}</p>
              </div>
            </div>
          </Card>
        );

      case "statistics":
        return (
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Match Statistics</h3>
            <div className="space-y-4">
              {matchDetails.statistics.possession && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Possession</span>
                    <span>{matchDetails.statistics.possession.home}% - {matchDetails.statistics.possession.away}%</span>
                  </div>
                  <Progress value={matchDetails.statistics.possession.home} className="h-2" />
                </div>
              )}
              {matchDetails.statistics.shots && (
                <div className="flex justify-between">
                  <span className="text-sm">Shots</span>
                  <span className="font-semibold">{matchDetails.statistics.shots.home} - {matchDetails.statistics.shots.away}</span>
                </div>
              )}
              {matchDetails.statistics.shotsOnTarget && (
                <div className="flex justify-between">
                  <span className="text-sm">Shots on Target</span>
                  <span className="font-semibold">{matchDetails.statistics.shotsOnTarget.home} - {matchDetails.statistics.shotsOnTarget.away}</span>
                </div>
              )}
              {matchDetails.statistics.corners && (
                <div className="flex justify-between">
                  <span className="text-sm">Corners</span>
                  <span className="font-semibold">{matchDetails.statistics.corners.home} - {matchDetails.statistics.corners.away}</span>
                </div>
              )}
            </div>
          </Card>
        );

      case "prediction":
        if (!aiPredictionUnlocked && !userProfile.isPremium) {
          return (
            <Card className="p-6 text-center">
              <Brain className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">AI Match Prediction</h3>
              <p className="text-muted-foreground mb-4">
                Unlock AI-powered predictions and insights for this match
              </p>
              <div className="flex items-center justify-center gap-2 mb-4">
                <Coins className="h-4 w-4 text-coins" />
                <span className="font-semibold">20 Coins Required</span>
              </div>
              
              {userProfile.coins >= 20 ? (
                <Button onClick={handleUnlockPrediction} className="w-full mb-3">
                  Unlock for 20 Coins
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-destructive">Insufficient coins</p>
                  <Button onClick={handleWatchRewardedAd} variant="secondary" className="w-full">
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

        return (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">AI Match Prediction</h3>
            </div>
            <div className="space-y-4">
              <div className="bg-gradient-primary/10 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Prediction: Home Win (65%)</h4>
                <p className="text-sm text-muted-foreground">
                  Based on recent form, head-to-head records, and statistical analysis, 
                  Real Madrid has a 65% chance of winning this match.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium mb-2">Key Factors</h5>
                  <ul className="text-sm space-y-1">
                    <li>• Home advantage</li>
                    <li>• Better recent form</li>
                    <li>• Head-to-head dominance</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium mb-2">Predicted Score</h5>
                  <p className="text-2xl font-bold text-primary">2-1</p>
                </div>
              </div>
            </div>
          </Card>
        );

      default:
        return (
          <Card className="p-4 text-center">
            <p className="text-muted-foreground">Content for {activeTab} tab coming soon...</p>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        coins={userProfile.coins} 
        onProfileClick={onProfileClick}
      />
      
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Match Details</h1>
        </div>

        {/* Match Header */}
        <Card className="p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <Badge 
              variant={matchDetails.status === 'live' ? 'destructive' : 'secondary'}
              className={matchDetails.status === 'live' ? 'bg-live text-live-foreground' : ''}
            >
              {matchDetails.status === 'live' ? 'LIVE' : matchDetails.status.toUpperCase()}
            </Badge>
            <span className="text-sm text-muted-foreground">{matchDetails.league}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <div className="text-lg font-semibold">{matchDetails.homeTeam}</div>
              {(matchDetails.status === 'live' || matchDetails.status === 'finished') && (
                <div className="text-3xl font-bold text-primary mt-2">{matchDetails.homeScore}</div>
              )}
            </div>
            
            <div className="mx-4 text-center">
              <div className="text-2xl font-bold text-muted-foreground">VS</div>
              {matchDetails.status === 'live' && matchDetails.minute && (
                <div className="text-sm text-live font-semibold mt-1">{matchDetails.minute}'</div>
              )}
            </div>
            
            <div className="text-center flex-1">
              <div className="text-lg font-semibold">{matchDetails.awayTeam}</div>
              {(matchDetails.status === 'live' || matchDetails.status === 'finished') && (
                <div className="text-3xl font-bold text-primary mt-2">{matchDetails.awayScore}</div>
              )}
            </div>
          </div>
        </Card>

        {/* Vertical Tab Navigation */}
        <div className="flex gap-4">
          <div className="w-1/3">
            <TabNavigation
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              vertical={true}
            />
          </div>
          
          <div className="flex-1">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};