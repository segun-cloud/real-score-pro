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
import { SportTracker } from "@/components/SportTracker";

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
          <div className="space-y-3">
            <Card className="p-3">
              <h3 className="font-semibold mb-2 text-sm">Match Events</h3>
              <div className="space-y-2">
                {matchDetails.events.map((event, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-secondary/50 rounded text-xs">
                    <Badge variant="outline" className="text-xs px-1 py-0">{event.minute}'</Badge>
                    <span className="text-xs">{event.description}</span>
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
                <h4 className="font-medium mb-2">Prediction: Home Win (65%)</h4>
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
                  <p className="text-lg font-bold text-primary">2-1</p>
                </div>
              </div>
            </div>
          </Card>
        );

      case 'commentary':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Live Commentary</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {matchDetails.commentary.map((comment, index) => (
                <div key={index} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-xs font-mono bg-primary text-primary-foreground px-2 py-1 rounded">
                    {comment.minute}'
                  </span>
                  <p className="text-xs flex-1">{comment.text}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'lineups':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Team Lineups</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-center">{matchDetails.homeTeam}</h4>
                <div className="bg-emerald-50 dark:bg-emerald-950 p-3 rounded-lg">
                  <div className="text-center text-xs font-mono mb-2">4-3-3</div>
                  <div className="space-y-2">
                    <div className="text-center"><span className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs">1</span> <span className="text-xs">Courtois</span></div>
                    <div className="flex justify-between text-xs">
                      <span><span className="bg-primary text-primary-foreground px-1 rounded">2</span> Carvajal</span>
                      <span><span className="bg-primary text-primary-foreground px-1 rounded">3</span> Militao</span>
                      <span><span className="bg-primary text-primary-foreground px-1 rounded">4</span> Alaba</span>
                      <span><span className="bg-primary text-primary-foreground px-1 rounded">5</span> Mendy</span>
                    </div>
                    <div className="flex justify-center gap-8 text-xs">
                      <span><span className="bg-primary text-primary-foreground px-1 rounded">8</span> Kroos</span>
                      <span><span className="bg-primary text-primary-foreground px-1 rounded">14</span> Casemiro</span>
                      <span><span className="bg-primary text-primary-foreground px-1 rounded">10</span> Modric</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span><span className="bg-primary text-primary-foreground px-1 rounded">20</span> Vinicius</span>
                      <span><span className="bg-primary text-primary-foreground px-1 rounded">9</span> Benzema</span>
                      <span><span className="bg-primary text-primary-foreground px-1 rounded">7</span> Hazard</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-center">{matchDetails.awayTeam}</h4>
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                  <div className="text-center text-xs font-mono mb-2">4-3-3</div>
                  <div className="space-y-2">
                    <div className="text-center"><span className="bg-blue-600 text-white px-2 py-1 rounded text-xs">1</span> <span className="text-xs">ter Stegen</span></div>
                    <div className="flex justify-between text-xs">
                      <span><span className="bg-blue-600 text-white px-1 rounded">2</span> Dest</span>
                      <span><span className="bg-blue-600 text-white px-1 rounded">3</span> Pique</span>
                      <span><span className="bg-blue-600 text-white px-1 rounded">4</span> Araujo</span>
                      <span><span className="bg-blue-600 text-white px-1 rounded">18</span> Alba</span>
                    </div>
                    <div className="flex justify-center gap-8 text-xs">
                      <span><span className="bg-blue-600 text-white px-1 rounded">21</span> de Jong</span>
                      <span><span className="bg-blue-600 text-white px-1 rounded">5</span> Busquets</span>
                      <span><span className="bg-blue-600 text-white px-1 rounded">16</span> Pedri</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span><span className="bg-blue-600 text-white px-1 rounded">22</span> Raphinha</span>
                      <span><span className="bg-blue-600 text-white px-1 rounded">9</span> Lewandowski</span>
                      <span><span className="bg-blue-600 text-white px-1 rounded">7</span> Dembele</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'standings':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{matchDetails.league} Standings</h3>
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
                    <th className="text-center py-2 px-1">GF</th>
                    <th className="text-center py-2 px-1">GA</th>
                    <th className="text-center py-2 px-1">GD</th>
                    <th className="text-center py-2 px-1">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { pos: 1, team: "Real Madrid", p: 20, w: 15, d: 3, l: 2, gf: 45, ga: 18, pts: 48 },
                    { pos: 2, team: "Barcelona", p: 20, w: 14, d: 4, l: 2, gf: 42, ga: 15, pts: 46 },
                    { pos: 3, team: "Atletico Madrid", p: 20, w: 12, d: 5, l: 3, gf: 38, ga: 22, pts: 41 },
                    { pos: 4, team: "Real Sociedad", p: 20, w: 11, d: 4, l: 5, gf: 35, ga: 25, pts: 37 },
                    { pos: 5, team: "Villarreal", p: 20, w: 10, d: 4, l: 6, gf: 32, ga: 28, pts: 34 }
                  ].map((team) => (
                    <tr key={team.pos} className={`border-b hover:bg-muted/50 ${
                      team.team === matchDetails.homeTeam || team.team === matchDetails.awayTeam 
                        ? 'bg-primary/10' : ''
                    }`}>
                      <td className="py-2 px-1 font-medium">{team.pos}</td>
                      <td className="py-2 px-2 font-medium">{team.team}</td>
                      <td className="text-center py-2 px-1">{team.p}</td>
                      <td className="text-center py-2 px-1">{team.w}</td>
                      <td className="text-center py-2 px-1">{team.d}</td>
                      <td className="text-center py-2 px-1">{team.l}</td>
                      <td className="text-center py-2 px-1">{team.gf}</td>
                      <td className="text-center py-2 px-1">{team.ga}</td>
                      <td className="text-center py-2 px-1">{team.gf - team.ga}</td>
                      <td className="text-center py-2 px-1 font-bold">{team.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'fixtures':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Recent & Upcoming Fixtures</h3>
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">{matchDetails.homeTeam} Fixtures</h4>
                <div className="space-y-2">
                  {[
                    { date: "Jan 12", opponent: "vs Sevilla", result: "W 2-1", status: "finished" },
                    { date: "Jan 15", opponent: "vs Barcelona", result: "2-1", status: "live" },
                    { date: "Jan 18", opponent: "@ Valencia", result: "-", status: "scheduled" },
                    { date: "Jan 22", opponent: "vs Atletico", result: "-", status: "scheduled" }
                  ].map((fixture, i) => (
                    <div key={i} className="flex justify-between items-center p-2 bg-muted/50 rounded text-xs">
                      <span className="text-muted-foreground">{fixture.date}</span>
                      <span className="flex-1 text-center">{fixture.opponent}</span>
                      <span className={`font-medium ${
                        fixture.status === 'finished' 
                          ? fixture.result.startsWith('W') ? 'text-green-600' : 'text-red-600'
                          : fixture.status === 'live' ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {fixture.result}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">{matchDetails.awayTeam} Fixtures</h4>
                <div className="space-y-2">
                  {[
                    { date: "Jan 12", opponent: "vs Athletic", result: "W 3-0", status: "finished" },
                    { date: "Jan 15", opponent: "@ Real Madrid", result: "1-2", status: "live" },
                    { date: "Jan 19", opponent: "vs Getafe", result: "-", status: "scheduled" },
                    { date: "Jan 23", opponent: "@ Real Sociedad", result: "-", status: "scheduled" }
                  ].map((fixture, i) => (
                    <div key={i} className="flex justify-between items-center p-2 bg-muted/50 rounded text-xs">
                      <span className="text-muted-foreground">{fixture.date}</span>
                      <span className="flex-1 text-center">{fixture.opponent}</span>
                      <span className={`font-medium ${
                        fixture.status === 'finished' 
                          ? fixture.result.startsWith('W') ? 'text-green-600' : 'text-red-600'
                          : fixture.status === 'live' ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {fixture.result}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'media':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Match Media</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-medium mb-2">Match Highlights</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Benzema Goal (23')",
                    "Lewandowski Goal (67')",
                    "Vinicius Goal (78')",
                    "Best Saves"
                  ].map((highlight, i) => (
                    <div key={i} className="bg-muted p-3 rounded-lg cursor-pointer hover:bg-muted/80 transition-colors">
                      <div className="aspect-video bg-primary/20 rounded mb-2 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">▶️ Play</span>
                      </div>
                      <p className="text-xs font-medium">{highlight}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-medium mb-2">Match Photos</h4>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({length: 6}).map((_, i) => (
                    <div key={i} className="aspect-square bg-muted rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors">
                      <span className="text-xs text-muted-foreground">📷</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'tracker':
        return (
          <SportTracker
            match={{
              id: matchDetails.id,
              homeTeam: matchDetails.homeTeam,
              awayTeam: matchDetails.awayTeam,
              homeScore: matchDetails.homeScore,
              awayScore: matchDetails.awayScore,
              status: matchDetails.status,
              startTime: matchDetails.startTime,
              sport: matchDetails.sport,
              league: matchDetails.league,
              minute: matchDetails.minute,
            }}
          />
        );
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Fixed Header */}
      <div className="flex-shrink-0 p-4 border-b bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-sm font-semibold">Match Details</h1>
        </div>

        {/* Match Header */}
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <Badge 
              variant={matchDetails.status === 'live' ? 'destructive' : 'secondary'}
              className={matchDetails.status === 'live' ? 'bg-live text-live-foreground text-xs px-2 py-1' : 'text-xs px-2 py-1'}
            >
              {matchDetails.status === 'live' ? 'LIVE' : matchDetails.status.toUpperCase()}
            </Badge>
            <span className="text-xs text-muted-foreground">{matchDetails.league}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <div className="text-xs font-semibold">{matchDetails.homeTeam}</div>
              {(matchDetails.status === 'live' || matchDetails.status === 'finished') && (
                <div className="text-lg font-bold text-primary mt-1">{matchDetails.homeScore}</div>
              )}
            </div>
            
            <div className="mx-3 text-center">
              <div className="text-sm font-bold text-muted-foreground">VS</div>
              {matchDetails.status === 'live' && matchDetails.minute && (
                <div className="text-xs text-live font-semibold">{matchDetails.minute}'</div>
              )}
            </div>
            
            <div className="text-center flex-1">
              <div className="text-xs font-semibold">{matchDetails.awayTeam}</div>
              {(matchDetails.status === 'live' || matchDetails.status === 'finished') && (
                <div className="text-lg font-bold text-primary mt-1">{matchDetails.awayScore}</div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Main area with vertical tabs + content */}
      <div className="flex-1 min-h-0 px-4 py-3">
        <div className="h-full min-h-0 flex gap-3">
          <aside className="h-full w-36 sm:w-44 lg:w-56 shrink-0">
            <TabNavigation
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              vertical={true}
            />
          </aside>
          <main className="flex-1 overflow-y-auto">
            {renderTabContent()}
          </main>
        </div>
      </div>
    </div>
  );
};