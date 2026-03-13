import { useState, useEffect } from "react";
import { ArrowLeft, Brain, Coins, Crown, Sparkles, TrendingUp, Target, BarChart3, Users, Trophy, ImageIcon } from "lucide-react";
import { TabNavigation } from "@/components/TabNavigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MatchDetails as MatchDetailsType, Match, H2HRecord } from "@/types/sports";
import { getMockMatchDetails, mockUserProfile } from "@/data/mockData";
import { toast } from "sonner";
import { FootballPitch } from "@/components/FootballPitch";
import { VideoPlayer } from "@/components/VideoPlayer";
import { HeadToHead } from "@/components/HeadToHead";
import { LiveMatchTracker } from "@/components/LiveMatchTracker";
import { supabase } from "@/integrations/supabase/client";

interface MatchDetailsProps {
  matchId: string;
  match?: Match;
  onBack: () => void;
  onFunHubClick: () => void;
}

export const MatchDetails = ({ matchId, match, onBack, onFunHubClick }: MatchDetailsProps) => {
  const [matchDetails, setMatchDetails] = useState<MatchDetailsType | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const [userProfile, setUserProfile] = useState(mockUserProfile);
  const [aiPredictionUnlocked, setAiPredictionUnlocked] = useState(false);
  const [aiPrediction, setAiPrediction] = useState<any>(null);
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; title: string } | null>(null);
  const [standings, setStandings] = useState<any[]>([]);
  const [isLoadingStandings, setIsLoadingStandings] = useState(false);
  const [isCupCompetition, setIsCupCompetition] = useState(false);
  const [h2hData, setH2hData] = useState<H2HRecord | null>(null);
  const [isLoadingH2h, setIsLoadingH2h] = useState(false);

  useEffect(() => {
    const loadMatchDetails = async () => {
      try {
        const currentMatchId = match?.id || matchId;
        
        // Check if this is an API-Sports match
        const isApiSportsMatch = currentMatchId.startsWith('apisports-') || currentMatchId.startsWith('api-football-');
        
        if (isApiSportsMatch && match) {
          // Fetch detailed data from API-Sports
          const { data, error } = await supabase.functions.invoke('fetch-match-details-apisports', {
            body: { matchId: currentMatchId },
          });

          if (error) throw error;

          if (data) {
            const details: MatchDetailsType = {
              ...match,
              events: data.events || [],
              odds: data.odds || { homeWin: 0, draw: 0, awayWin: 0, updated: new Date().toISOString() },
              lineups: data.lineups,
              statistics: data.statistics || {},
              commentary: [],
              media: { highlights: [], photos: [] },
              h2h: data.h2h,
            };
            setMatchDetails(details);
            if (data.h2h) setH2hData(data.h2h);
          } else {
            throw new Error('No detailed data returned');
          }
        } else if (match) {
          // Build match details from the provided match object
          const details: MatchDetailsType = {
            ...match,
            events: [],
            odds: { homeWin: 0, draw: 0, awayWin: 0, updated: new Date().toISOString() },
            lineups: undefined,
            statistics: {},
            commentary: [],
            media: { highlights: [], photos: [] },
          };
          setMatchDetails(details);
        } else {
          // Try to fetch from cache using api_match_id
          const { data: cachedMatch } = await supabase
            .from('api_match_cache')
            .select('*')
            .eq('api_match_id', matchId)
            .maybeSingle();
          
          if (cachedMatch) {
            const rawData = cachedMatch.raw_data as any;
            const details: MatchDetailsType = {
              id: cachedMatch.api_match_id,
              sport: cachedMatch.sport as any,
              homeTeam: cachedMatch.home_team,
              awayTeam: cachedMatch.away_team,
              homeScore: cachedMatch.home_score,
              awayScore: cachedMatch.away_score,
              status: cachedMatch.status as any,
              startTime: cachedMatch.match_date,
              league: cachedMatch.league_name,
              minute: cachedMatch.minute,
              homeTeamLogo: rawData?.homeTeamLogo,
              awayTeamLogo: rawData?.awayTeamLogo,
              events: [],
              odds: { homeWin: 0, draw: 0, awayWin: 0, updated: new Date().toISOString() },
              lineups: undefined,
              statistics: {},
              commentary: [],
              media: { highlights: [], photos: [] },
            };
            setMatchDetails(details);
          } else {
            // Fallback to mock data
            const details = getMockMatchDetails(matchId);
            setMatchDetails(details);
          }
        }
      } catch (error) {
        console.error("Failed to load match details:", error);
        // Fallback to mock data
        try {
          const details = match ? { 
            ...match, 
            events: [], 
            odds: { homeWin: 0, draw: 0, awayWin: 0, updated: new Date().toISOString() },
            lineups: undefined,
            statistics: {},
            commentary: [],
            media: { highlights: [], photos: [] },
          } : getMockMatchDetails(matchId);
          setMatchDetails(details);
        } catch (e) {
          console.error("Failed to load mock data:", e);
        }
      }
    };
    
    loadMatchDetails();
  }, [matchId, match]);

  // Load standings when tab changes to standings
  useEffect(() => {
    const loadStandings = async () => {
      if (activeTab !== 'standings' || !matchDetails?.league) return;
      
      // Check if it's a cup competition
      const cupKeywords = ['cup', 'copa', 'coupe', 'pokal', 'coppa', 'fa cup', 'league cup', 'super cup', 'champions league', 'europa league', 'conference league'];
      const leagueLower = matchDetails.league.toLowerCase();
      const isCup = cupKeywords.some(keyword => leagueLower.includes(keyword));
      setIsCupCompetition(isCup);
      
      if (isCup) return; // Don't fetch standings for cup competitions
      
      setIsLoadingStandings(true);
      try {
        // Find league ID from database
        const { data: league } = await supabase
          .from('leagues')
          .select('api_league_id')
          .ilike('name', `%${matchDetails.league.split(' ').slice(0, 2).join(' ')}%`)
          .single();
        
        if (league?.api_league_id) {
          const { data, error } = await supabase.functions.invoke('fetch-league-standings', {
            body: { leagueId: league.api_league_id }
          });
          
          if (!error && data?.standings) {
            setStandings(data.standings);
          }
        }
      } catch (error) {
        console.error('Error loading standings:', error);
      } finally {
        setIsLoadingStandings(false);
      }
    };
    
    loadStandings();
  }, [activeTab, matchDetails?.league]);

  // Filter tabs based on available data
  const hasLineups = matchDetails?.lineups && (matchDetails.lineups.home.length > 0 || matchDetails.lineups.away.length > 0);
  const hasOdds = matchDetails?.odds && (matchDetails.odds.homeWin > 0 || matchDetails.odds.awayWin > 0);
  const hasStats = matchDetails?.statistics && Object.keys(matchDetails.statistics).length > 0;

  const tabs = [
    { id: "details", label: "Details" },
    ...(hasStats ? [{ id: "statistics", label: "Stats" }] : []),
    ...(hasOdds ? [{ id: "odds", label: "Odds" }] : []),
    ...(hasLineups ? [{ id: "lineups", label: "Lineups" }] : []),
    { id: "h2h", label: "H2H" },
    { id: "standings", label: "Table" },
    { id: "media", label: "Media" },
    ...(matchDetails?.status !== 'finished' ? [{ id: "prediction", label: "AI Prediction" }] : []),
  ];

  const handleUnlockPrediction = async () => {
    if (userProfile.coins >= 20) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        
        // Show loading state first
        setActiveTab("prediction");
        setIsLoadingPrediction(true);

        // Generate prediction FIRST before deducting coins
        const { data, error } = await supabase.functions.invoke('generate-match-prediction', {
          body: { match: matchDetails }
        });
        
        if (error) throw error;
        
        // Only deduct coins AFTER successful prediction
        const { error: coinsError } = await supabase
          .from('user_profiles')
          .update({ coins: userProfile.coins - 20 })
          .eq('id', user.id);
        
        if (coinsError) {
          console.error('Failed to deduct coins:', coinsError);
          // Prediction succeeded but coin deduction failed - still show prediction
          // but log the error for investigation
        }
        
        // Update local state after successful prediction
        setUserProfile(prev => ({ ...prev, coins: prev.coins - 20 }));
        setAiPredictionUnlocked(true);
        setAiPrediction(data.prediction);
        
        toast.success("AI Prediction Ready!", {
          description: "Your match prediction has been generated.",
        });
      } catch (error) {
        console.error('Error generating prediction:', error);
        toast.error("Prediction Error", {
          description: error instanceof Error ? error.message : "Failed to generate prediction. Your coins have not been deducted.",
        });
        setAiPredictionUnlocked(false);
      } finally {
        setIsLoadingPrediction(false);
      }
    } else {
      toast.error("Insufficient Coins", {
        description: "You need 20 coins to unlock this prediction.",
      });
    }
  };

  const handleWatchRewardedAd = () => {
    // Simulate rewarded ad watch
    setUserProfile(prev => ({ ...prev, coins: prev.coins + 25 }));
    toast.success("Coins Earned!", {
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
            {/* Key Statistics Summary */}
            {matchDetails.statistics && Object.keys(matchDetails.statistics).length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Key Statistics</h3>
                <div className="space-y-4">
                  {/* Possession Bar (Football) */}
                  {matchDetails.statistics.possession && (
                    <div>
                      <div className="flex justify-between items-center text-sm mb-2">
                        <span className="font-semibold text-primary">{matchDetails.statistics.possession.home}%</span>
                        <span className="text-muted-foreground">Possession</span>
                        <span className="font-semibold text-primary">{matchDetails.statistics.possession.away}%</span>
                      </div>
                      <Progress value={matchDetails.statistics.possession.home} className="h-3" />
                    </div>
                  )}
                  
                  {/* Shots Comparison */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {matchDetails.statistics.shots && (
                      <div>
                        <p className="text-lg font-bold text-primary">{matchDetails.statistics.shots.home}</p>
                        <p className="text-[10px] text-muted-foreground">Shots</p>
                      </div>
                    )}
                    {matchDetails.statistics.shotsOnTarget && (
                      <div>
                        <p className="text-lg font-bold text-primary">{matchDetails.statistics.shotsOnTarget.home}</p>
                        <p className="text-[10px] text-muted-foreground">On Target</p>
                      </div>
                    )}
                    {matchDetails.statistics.corners && (
                      <div>
                        <p className="text-lg font-bold text-primary">{matchDetails.statistics.corners.home}</p>
                        <p className="text-[10px] text-muted-foreground">Corners</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {matchDetails.statistics.shots && (
                      <div>
                        <p className="text-lg font-bold text-primary">{matchDetails.statistics.shots.away}</p>
                      </div>
                    )}
                    {matchDetails.statistics.shotsOnTarget && (
                      <div>
                        <p className="text-lg font-bold text-primary">{matchDetails.statistics.shotsOnTarget.away}</p>
                      </div>
                    )}
                    {matchDetails.statistics.corners && (
                      <div>
                        <p className="text-lg font-bold text-primary">{matchDetails.statistics.corners.away}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}
            
            {/* Match Events */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Match Events</h3>
              {matchDetails.events.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No events recorded yet</p>
              ) : (
                <div className="space-y-2">
                  {matchDetails.events.map((event, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-secondary/50 rounded">
                      <Badge variant="outline" className="text-xs px-2 py-1">{event.minute}'</Badge>
                      <span className="text-sm flex-1">{event.description}</span>
                      {event.type === 'goal' && <span className="text-lg">⚽</span>}
                      {event.type === 'yellow_card' && <span className="text-lg">🟨</span>}
                      {event.type === 'red_card' && <span className="text-lg">🟥</span>}
                    </div>
                  ))}
                </div>
              )}
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
                <p className="text-2xl font-bold text-primary">{matchDetails.odds.awayWin}</p>
              </div>
            </div>
          </Card>
        );

      case "statistics":
        const renderStatRow = (label: string, homeStat?: number, awayStat?: number) => {
          if (homeStat === undefined || awayStat === undefined) return null;
          return (
            <div className="flex justify-between items-center text-xs py-2 border-b">
              <span className="font-semibold text-primary w-12 text-center">{homeStat}</span>
              <span className="text-muted-foreground flex-1 text-center">{label}</span>
              <span className="font-semibold text-primary w-12 text-center">{awayStat}</span>
            </div>
          );
        };

        const renderPercentageRow = (label: string, homePercent?: number, awayPercent?: number) => {
          if (homePercent === undefined || awayPercent === undefined) return null;
          return (
            <div className="flex justify-between items-center text-xs py-2 border-b">
              <span className="font-semibold text-primary w-12 text-center">{homePercent}%</span>
              <span className="text-muted-foreground flex-1 text-center">{label}</span>
              <span className="font-semibold text-primary w-12 text-center">{awayPercent}%</span>
            </div>
          );
        };

        return (
          <Card className="p-4">
            <h3 className="font-semibold mb-4 text-center">Match Statistics</h3>
            <div className="space-y-3">
              {/* Football/Soccer Stats */}
              {matchDetails.sport === 'football' && (
                <>
                  {matchDetails.statistics.possession && (
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-semibold text-primary">{matchDetails.statistics.possession.home}%</span>
                        <span className="text-muted-foreground">Possession</span>
                        <span className="font-semibold text-primary">{matchDetails.statistics.possession.away}%</span>
                      </div>
                      <Progress value={matchDetails.statistics.possession.home} className="h-2" />
                    </div>
                  )}
                  {renderStatRow("Shots", matchDetails.statistics.shots?.home, matchDetails.statistics.shots?.away)}
                  {renderStatRow("Shots on Target", matchDetails.statistics.shotsOnTarget?.home, matchDetails.statistics.shotsOnTarget?.away)}
                  {renderStatRow("Passes", matchDetails.statistics.passes?.home, matchDetails.statistics.passes?.away)}
                  {renderStatRow("Attacks", matchDetails.statistics.attacks?.home, matchDetails.statistics.attacks?.away)}
                  {renderStatRow("Dangerous Attacks", matchDetails.statistics.dangerousAttacks?.home, matchDetails.statistics.dangerousAttacks?.away)}
                  {renderStatRow("Big Chances", matchDetails.statistics.bigChances?.home, matchDetails.statistics.bigChances?.away)}
                  {renderStatRow("Corners", matchDetails.statistics.corners?.home, matchDetails.statistics.corners?.away)}
                  {renderStatRow("Free Kicks", matchDetails.statistics.freeKicks?.home, matchDetails.statistics.freeKicks?.away)}
                  {renderStatRow("Fouls", matchDetails.statistics.fouls?.home, matchDetails.statistics.fouls?.away)}
                  {renderStatRow("Penalties", matchDetails.statistics.penalties?.home, matchDetails.statistics.penalties?.away)}
                </>
              )}

              {/* Basketball Stats */}
              {matchDetails.sport === 'basketball' && (
                <>
                  {renderPercentageRow("Field Goal %", matchDetails.statistics.fieldGoalPercentage?.home, matchDetails.statistics.fieldGoalPercentage?.away)}
                  {renderPercentageRow("3-Point %", matchDetails.statistics.threePointPercentage?.home, matchDetails.statistics.threePointPercentage?.away)}
                  {renderPercentageRow("Free Throw %", matchDetails.statistics.freeThrowPercentage?.home, matchDetails.statistics.freeThrowPercentage?.away)}
                  {renderStatRow("Rebounds", matchDetails.statistics.rebounds?.home, matchDetails.statistics.rebounds?.away)}
                  {renderStatRow("Assists", matchDetails.statistics.assists?.home, matchDetails.statistics.assists?.away)}
                  {renderStatRow("Steals", matchDetails.statistics.steals?.home, matchDetails.statistics.steals?.away)}
                  {renderStatRow("Blocks", matchDetails.statistics.blocks?.home, matchDetails.statistics.blocks?.away)}
                  {renderStatRow("Turnovers", matchDetails.statistics.turnovers?.home, matchDetails.statistics.turnovers?.away)}
                  {renderStatRow("Fouls", matchDetails.statistics.fouls?.home, matchDetails.statistics.fouls?.away)}
                </>
              )}

              {/* Tennis Stats */}
              {matchDetails.sport === 'tennis' && (
                <>
                  {renderStatRow("Aces", matchDetails.statistics.aces?.home, matchDetails.statistics.aces?.away)}
                  {renderStatRow("Double Faults", matchDetails.statistics.doubleFaults?.home, matchDetails.statistics.doubleFaults?.away)}
                  {renderPercentageRow("First Serve %", matchDetails.statistics.firstServePercentage?.home, matchDetails.statistics.firstServePercentage?.away)}
                  {renderStatRow("Break Points Won", matchDetails.statistics.breakPointsWon?.home, matchDetails.statistics.breakPointsWon?.away)}
                  {renderStatRow("Winners", matchDetails.statistics.winners?.home, matchDetails.statistics.winners?.away)}
                  {renderStatRow("Unforced Errors", matchDetails.statistics.unforcedErrors?.home, matchDetails.statistics.unforcedErrors?.away)}
                </>
              )}

              {/* Baseball Stats */}
              {matchDetails.sport === 'baseball' && (
                <>
                  {renderStatRow("Hits", matchDetails.statistics.hits?.home, matchDetails.statistics.hits?.away)}
                  {renderStatRow("Runs", matchDetails.statistics.runs?.home, matchDetails.statistics.runs?.away)}
                  {renderStatRow("Errors", matchDetails.statistics.errors?.home, matchDetails.statistics.errors?.away)}
                  {renderStatRow("Home Runs", matchDetails.statistics.homeRuns?.home, matchDetails.statistics.homeRuns?.away)}
                  {renderStatRow("Strikeouts", matchDetails.statistics.strikeouts?.home, matchDetails.statistics.strikeouts?.away)}
                  {renderStatRow("Walks", matchDetails.statistics.walks?.home, matchDetails.statistics.walks?.away)}
                </>
              )}

              {/* Boxing Stats */}
              {matchDetails.sport === 'boxing' && (
                <>
                  {renderStatRow("Punches Thrown", matchDetails.statistics.punchesThrown?.home, matchDetails.statistics.punchesThrown?.away)}
                  {renderStatRow("Punches Landed", matchDetails.statistics.punchesLanded?.home, matchDetails.statistics.punchesLanded?.away)}
                  {renderPercentageRow("Punch Accuracy", matchDetails.statistics.punchAccuracy?.home, matchDetails.statistics.punchAccuracy?.away)}
                  {renderStatRow("Power Punches", matchDetails.statistics.powerPunches?.home, matchDetails.statistics.powerPunches?.away)}
                  {renderStatRow("Jabs", matchDetails.statistics.jabs?.home, matchDetails.statistics.jabs?.away)}
                  {renderStatRow("Knockdowns", matchDetails.statistics.knockdowns?.home, matchDetails.statistics.knockdowns?.away)}
                </>
              )}
            </div>
          </Card>
        );

      case "prediction":
        if (!aiPredictionUnlocked && !userProfile.isPremium) {
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
              
              {userProfile.coins >= 20 ? (
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
                        This will spend <span className="font-semibold text-coins">20 coins</span> from your balance to generate an AI-powered match prediction. You currently have <span className="font-semibold">{userProfile.coins} coins</span>.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleUnlockPrediction}>
                        <Coins className="h-4 w-4 mr-2" />
                        Spend 20 Coins
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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

            {/* 1x2 Match Result Bar */}
            <Card className="p-4 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold">Match Result</h4>
                </div>
                <div className="flex gap-1 h-12 rounded-lg overflow-hidden">
                  <div 
                    className="bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold transition-all hover:opacity-90"
                    style={{ width: `${aiPrediction.match_result.home_win}%` }}
                  >
                    {aiPrediction.match_result.home_win > 15 && `${aiPrediction.match_result.home_win}%`}
                  </div>
                  {aiPrediction.match_result.draw !== null && (
                    <div 
                      className="bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold transition-all hover:opacity-90"
                      style={{ width: `${aiPrediction.match_result.draw}%` }}
                    >
                      {aiPrediction.match_result.draw > 15 && `${aiPrediction.match_result.draw}%`}
                    </div>
                  )}
                  <div 
                    className="bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold transition-all hover:opacity-90"
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

            {/* Betting Markets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {match.sport === 'basketball' ? (
                <>
                  {/* Odd/Even */}
                  <Card className="p-4 bg-gradient-to-br from-orange-500/5 to-red-500/5">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-orange-500" />
                        <h4 className="font-semibold">Odd/Even Total Points</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className={`p-3 rounded-lg text-center transition-all ${
                          (aiPrediction as any).odd_even?.odd > (aiPrediction as any).odd_even?.even 
                            ? 'bg-green-500/20 border-2 border-green-500' 
                            : 'bg-muted'
                        }`}>
                          <div className="text-lg font-bold">{(aiPrediction as any).odd_even?.odd}%</div>
                          <div className="text-xs text-muted-foreground">ODD</div>
                        </div>
                        <div className={`p-3 rounded-lg text-center transition-all ${
                          (aiPrediction as any).odd_even?.even > (aiPrediction as any).odd_even?.odd 
                            ? 'bg-red-500/20 border-2 border-red-500' 
                            : 'bg-muted'
                        }`}>
                          <div className="text-lg font-bold">{(aiPrediction as any).odd_even?.even}%</div>
                          <div className="text-xs text-muted-foreground">EVEN</div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Total Points O/U */}
                  <Card className="p-4 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-purple-500" />
                        <h4 className="font-semibold">Total Points O/U {(aiPrediction as any).total_points?.line}</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className={`p-3 rounded-lg text-center transition-all ${
                          (aiPrediction as any).total_points?.over > (aiPrediction as any).total_points?.under 
                            ? 'bg-blue-500/20 border-2 border-blue-500' 
                            : 'bg-muted'
                        }`}>
                          <div className="text-lg font-bold">{(aiPrediction as any).total_points?.over}%</div>
                          <div className="text-xs text-muted-foreground">OVER</div>
                        </div>
                        <div className={`p-3 rounded-lg text-center transition-all ${
                          (aiPrediction as any).total_points?.under > (aiPrediction as any).total_points?.over 
                            ? 'bg-indigo-500/20 border-2 border-indigo-500' 
                            : 'bg-muted'
                        }`}>
                          <div className="text-lg font-bold">{(aiPrediction as any).total_points?.under}%</div>
                          <div className="text-xs text-muted-foreground">UNDER</div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Half-Time O/U */}
                  <Card className="p-4 bg-gradient-to-br from-cyan-500/5 to-blue-500/5">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-cyan-500" />
                        <h4 className="font-semibold">Half-Time O/U {(aiPrediction as any).half_time_over_under?.line}</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className={`p-3 rounded-lg text-center transition-all ${
                          (aiPrediction as any).half_time_over_under?.over > (aiPrediction as any).half_time_over_under?.under 
                            ? 'bg-blue-500/20 border-2 border-blue-500' 
                            : 'bg-muted'
                        }`}>
                          <div className="text-lg font-bold">{(aiPrediction as any).half_time_over_under?.over}%</div>
                          <div className="text-xs text-muted-foreground">OVER</div>
                        </div>
                        <div className={`p-3 rounded-lg text-center transition-all ${
                          (aiPrediction as any).half_time_over_under?.under > (aiPrediction as any).half_time_over_under?.over 
                            ? 'bg-indigo-500/20 border-2 border-indigo-500' 
                            : 'bg-muted'
                        }`}>
                          <div className="text-lg font-bold">{(aiPrediction as any).half_time_over_under?.under}%</div>
                          <div className="text-xs text-muted-foreground">UNDER</div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* First Quarter O/U */}
                  <Card className="p-4 bg-gradient-to-br from-teal-500/5 to-emerald-500/5">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-teal-500" />
                        <h4 className="font-semibold">1st Quarter O/U {(aiPrediction as any).first_quarter_over_under?.line}</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className={`p-3 rounded-lg text-center transition-all ${
                          (aiPrediction as any).first_quarter_over_under?.over > (aiPrediction as any).first_quarter_over_under?.under 
                            ? 'bg-blue-500/20 border-2 border-blue-500' 
                            : 'bg-muted'
                        }`}>
                          <div className="text-lg font-bold">{(aiPrediction as any).first_quarter_over_under?.over}%</div>
                          <div className="text-xs text-muted-foreground">OVER</div>
                        </div>
                        <div className={`p-3 rounded-lg text-center transition-all ${
                          (aiPrediction as any).first_quarter_over_under?.under > (aiPrediction as any).first_quarter_over_under?.over 
                            ? 'bg-indigo-500/20 border-2 border-indigo-500' 
                            : 'bg-muted'
                        }`}>
                          <div className="text-lg font-bold">{(aiPrediction as any).first_quarter_over_under?.under}%</div>
                          <div className="text-xs text-muted-foreground">UNDER</div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </>
              ) : (
                <>
                  {/* BTTS */}
                  <Card className="p-4 bg-gradient-to-br from-orange-500/5 to-red-500/5">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-orange-500" />
                        <h4 className="font-semibold">Both Teams to Score</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className={`p-3 rounded-lg text-center transition-all ${
                          (aiPrediction as any).btts?.yes > (aiPrediction as any).btts?.no 
                            ? 'bg-green-500/20 border-2 border-green-500' 
                            : 'bg-muted'
                        }`}>
                          <div className="text-lg font-bold">{(aiPrediction as any).btts?.yes}%</div>
                          <div className="text-xs text-muted-foreground">YES</div>
                        </div>
                        <div className={`p-3 rounded-lg text-center transition-all ${
                          (aiPrediction as any).btts?.no > (aiPrediction as any).btts?.yes 
                            ? 'bg-red-500/20 border-2 border-red-500' 
                            : 'bg-muted'
                        }`}>
                          <div className="text-lg font-bold">{(aiPrediction as any).btts?.no}%</div>
                          <div className="text-xs text-muted-foreground">NO</div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Over/Under */}
                  <Card className="p-4 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-purple-500" />
                        <h4 className="font-semibold">Over/Under 2.5</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className={`p-3 rounded-lg text-center transition-all ${
                          (aiPrediction as any).over_under?.over_2_5 > (aiPrediction as any).over_under?.under_2_5 
                            ? 'bg-blue-500/20 border-2 border-blue-500' 
                            : 'bg-muted'
                        }`}>
                          <div className="text-lg font-bold">{(aiPrediction as any).over_under?.over_2_5}%</div>
                          <div className="text-xs text-muted-foreground">OVER</div>
                        </div>
                        <div className={`p-3 rounded-lg text-center transition-all ${
                          (aiPrediction as any).over_under?.under_2_5 > (aiPrediction as any).over_under?.over_2_5 
                            ? 'bg-indigo-500/20 border-2 border-indigo-500' 
                            : 'bg-muted'
                        }`}>
                          <div className="text-lg font-bold">{(aiPrediction as any).over_under?.under_2_5}%</div>
                          <div className="text-xs text-muted-foreground">UNDER</div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </>
              )}
            </div>

            {/* Score Predictions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Correct Score */}
              <Card className="p-4 bg-gradient-to-br from-cyan-500/5 to-blue-500/5">
                <div className="space-y-3">
                  <h4 className="font-semibold">Correct Score</h4>
                  <div className="text-center p-4 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg">
                    <div className="text-2xl font-bold text-white mb-1">
                      {aiPrediction.correct_score.prediction}
                    </div>
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      {aiPrediction.correct_score.probability}% probability
                    </Badge>
                  </div>
                  {aiPrediction.correct_score.alternatives?.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Alternative scores:</div>
                      <div className="flex gap-2 flex-wrap">
                        {aiPrediction.correct_score.alternatives.map((alt: any, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {alt.score} ({alt.probability}%)
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Half-Time Result */}
              <Card className="p-4 bg-gradient-to-br from-teal-500/5 to-green-500/5">
                <div className="space-y-3">
                  <h4 className="font-semibold">{match.sport === 'basketball' ? 'Half-Time Result' : 'Half-Time Score'}</h4>
                  {match.sport === 'basketball' ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Home Leading</span>
                        <span className="font-semibold">{(aiPrediction as any).half_time_result?.home_leading}%</span>
                      </div>
                      <Progress value={(aiPrediction as any).half_time_result?.home_leading} className="h-2" />
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Tied</span>
                        <span className="font-semibold">{(aiPrediction as any).half_time_result?.tied}%</span>
                      </div>
                      <Progress value={(aiPrediction as any).half_time_result?.tied} className="h-2" />
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Away Leading</span>
                        <span className="font-semibold">{(aiPrediction as any).half_time_result?.away_leading}%</span>
                      </div>
                      <Progress value={(aiPrediction as any).half_time_result?.away_leading} className="h-2" />
                    </div>
                  ) : (
                    <>
                      <div className="text-center p-4 bg-gradient-to-br from-teal-500 to-green-500 rounded-lg">
                         <div className="text-2xl font-bold text-white mb-1">
                          {(aiPrediction as any).half_time_score?.prediction}
                        </div>
                        <div className="text-xs text-white/80">Predicted HT Result</div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Home Leading</span>
                          <span className="font-semibold">{(aiPrediction as any).half_time_score?.home_leading}%</span>
                        </div>
                        <Progress value={(aiPrediction as any).half_time_score?.home_leading} className="h-2" />
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Draw</span>
                          <span className="font-semibold">{(aiPrediction as any).half_time_score?.draw}%</span>
                        </div>
                        <Progress value={(aiPrediction as any).half_time_score?.draw} className="h-2" />
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Away Leading</span>
                          <span className="font-semibold">{(aiPrediction as any).half_time_score?.away_leading}%</span>
                        </div>
                        <Progress value={(aiPrediction as any).half_time_score?.away_leading} className="h-2" />
                      </div>
                    </>
                  )}
                </div>
              </Card>
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
        if (!matchDetails.lineups) {
          return <div className="text-center text-muted-foreground py-8">Lineups not available</div>;
        }
        
        const homeSubstitutes = matchDetails.lineups.home.filter(p => p.isSubstitute);
        const awaySubstitutes = matchDetails.lineups.away.filter(p => p.isSubstitute);
        
        return (
          <div className="space-y-6">
            {/* Formations Header */}
            <div className="text-center">
              <h3 className="text-lg font-bold mb-1">Team Formations</h3>
              <p className="text-sm text-muted-foreground">
                {matchDetails.homeTeam} ({matchDetails.lineups.homeFormation}) vs {matchDetails.awayTeam} ({matchDetails.lineups.awayFormation})
              </p>
            </div>

            {/* Visual Pitch Display */}
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

            {/* Substitutes Bench */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 justify-center">
                <Users className="w-5 h-5 text-muted-foreground" />
                <h3 className="text-lg font-bold">Substitutes Bench</h3>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* Home Substitutes */}
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

                {/* Away Substitutes */}
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

      case 'h2h':
        return (
          <HeadToHead 
            h2h={h2hData || matchDetails.h2h || null}
            homeTeam={matchDetails.homeTeam}
            awayTeam={matchDetails.awayTeam}
            isLoading={isLoadingH2h}
          />
        );

      case 'standings':
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
        
        if (isLoadingStandings) {
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
                    {standings.map((team: any) => (
                      <tr key={team.position} className={`border-b hover:bg-muted/50 ${
                        team.team_name?.toLowerCase().includes(matchDetails.homeTeam.toLowerCase().split(' ')[0]) ||
                        team.team_name?.toLowerCase().includes(matchDetails.awayTeam.toLowerCase().split(' ')[0])
                          ? 'bg-primary/10' : ''
                      }`}>
                        <td className="py-2 px-1 font-medium">{team.position}</td>
                        <td className="py-2 px-2 font-medium truncate max-w-[100px]">{team.team_name}</td>
                        <td className="text-center py-2 px-1">{team.played}</td>
                        <td className="text-center py-2 px-1">{team.won}</td>
                        <td className="text-center py-2 px-1">{team.drawn}</td>
                        <td className="text-center py-2 px-1">{team.lost}</td>
                        <td className="text-center py-2 px-1">{team.goal_difference}</td>
                        <td className="text-center py-2 px-1 font-bold">{team.points}</td>
                      </tr>
                    ))}
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

    }
  };

  // Transform events for LiveMatchTracker
  const transformedEvents = matchDetails.events.map((event) => ({
    minute: event.minute,
    type: event.type as any,
    team: event.team,
    player: event.player,
    description: event.description,
  }));

  // Determine ball position based on current minute and events
  const getBallPosition = () => {
    if (matchDetails.status !== 'live') return { x: 50, y: 50 };
    const minute = matchDetails.minute || 0;
    // Simulate some ball movement based on time
    const x = 30 + Math.sin(minute * 0.5) * 40;
    const y = 30 + Math.cos(minute * 0.3) * 20;
    return { x, y };
  };

  const isLiveMatch = matchDetails.status === 'live';
  const isFootballMatch = matchDetails.sport === 'football';

  return (
    <div className="h-screen bg-background flex flex-col w-full max-w-full overflow-x-hidden">
      {/* Fixed Header - compact for live tracker mode */}
      <div className="sticky top-0 z-20 flex-shrink-0 p-4 pb-2 border-b bg-background/95 backdrop-blur-sm w-full">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl hover-lift press-effect">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-sm font-bold">Match Details</h1>
            {matchDetails.league && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span>🏆</span> {matchDetails.league}
              </p>
            )}
          </div>
          {isLiveMatch && (
            <Badge className="gradient-live text-live-foreground border-0 animate-pulse">
              🔴 LIVE
            </Badge>
          )}
        </div>

        {/* Standard match header for non-live or non-football matches */}
        {!(isLiveMatch && isFootballMatch) && (
          <Card className="p-3 rounded-2xl mt-3">
            <div className="flex items-center justify-between mb-2">
              <Badge 
                variant={matchDetails.status === 'live' ? 'destructive' : 'secondary'}
                className={matchDetails.status === 'live' ? 'gradient-live text-live-foreground text-xs px-2 py-1 border-0' : 'text-xs px-2 py-1 rounded-lg'}
              >
                {matchDetails.status === 'live' ? 'LIVE' : matchDetails.status.toUpperCase()}
              </Badge>
              <span className="text-xs text-muted-foreground">{matchDetails.league}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                {matchDetails.homeTeamLogo && (
                  <img src={matchDetails.homeTeamLogo} alt="" className="w-8 h-8 object-contain mx-auto mb-1" />
                )}
                <div className="text-xs font-semibold">{matchDetails.homeTeam}</div>
                {(matchDetails.status === 'live' || matchDetails.status === 'finished') && (
                  <div className="text-xl font-bold mt-1">{matchDetails.homeScore ?? 0}</div>
                )}
              </div>
              
              <div className="mx-3 text-center">
                {matchDetails.status === 'live' || matchDetails.status === 'finished' ? (
                  <div className="text-xl font-bold text-muted-foreground">-</div>
                ) : (
                  <div className="text-sm font-bold text-muted-foreground">VS</div>
                )}
                {matchDetails.status === 'live' && matchDetails.minute && (
                  <Badge className="gradient-live text-live-foreground text-xs px-2 py-0.5 border-0 mt-1 animate-pulse">
                    {matchDetails.minute}'
                  </Badge>
                )}
              </div>
              
              <div className="text-center flex-1">
                {matchDetails.awayTeamLogo && (
                  <img src={matchDetails.awayTeamLogo} alt="" className="w-8 h-8 object-contain mx-auto mb-1" />
                )}
                <div className="text-xs font-semibold">{matchDetails.awayTeam}</div>
                {(matchDetails.status === 'live' || matchDetails.status === 'finished') && (
                  <div className="text-xl font-bold mt-1">{matchDetails.awayScore ?? 0}</div>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden w-full min-w-0">
        {/* LiveMatchTracker in scrollable area for live football */}
        {isLiveMatch && isFootballMatch && (
          <div className="px-4 pt-3 flex-shrink-0">
            <LiveMatchTracker
              homeTeam={matchDetails.homeTeam}
              awayTeam={matchDetails.awayTeam}
              homeTeamLogo={matchDetails.homeTeamLogo}
              awayTeamLogo={matchDetails.awayTeamLogo}
              homeScore={matchDetails.homeScore ?? 0}
              awayScore={matchDetails.awayScore ?? 0}
              minute={matchDetails.minute}
              status="live"
              events={transformedEvents}
              statistics={matchDetails.statistics ? {
                possession: matchDetails.statistics.possession,
                shots: matchDetails.statistics.shots,
                shotsOnTarget: matchDetails.statistics.shotsOnTarget,
                corners: matchDetails.statistics.corners,
                fouls: matchDetails.statistics.fouls,
              } : undefined}
              currentAction={matchDetails.minute && matchDetails.minute % 5 === 0 ? "Attack" : undefined}
              ballPosition={getBallPosition()}
            />
          </div>
        )}

        {/* Tabs */}
        <div className="px-4 py-3 w-full">
          <TabNavigation
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            vertical={false}
          />
        </div>
        
        {/* Tab content */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-4 w-full min-w-0">
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
};