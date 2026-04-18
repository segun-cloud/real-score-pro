import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, Brain, Coins, FileText, Radio, BarChart3,
  Trophy, Users, Play, Swords, DollarSign
} from "lucide-react";
import { TabNavigation } from "@/components/TabNavigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MatchDetails as MatchDetailsType, Match, H2HRecord } from "@/types/sports";
import { getMockMatchDetails, mockUserProfile } from "@/data/mockData";
import { toast } from "sonner";
import { LiveMatchTracker } from "@/components/LiveMatchTracker";
import { supabase } from "@/integrations/supabase/client";
import { useMatchPhaseTracker } from "@/hooks/useMatchPhaseTracker";

// Tab sub-components
import { DetailsTab } from "./Tabs/DetailsTab";
import { StatisticsTab } from "./Tabs/StatisticsTab";
import { OddsTab } from "./Tabs/OddsTab";
import { StandingsTab } from "./Tabs/StandingsTab";
import { LineupsTab } from "./Tabs/LineupsTab";
import { MatchesTab } from "./Tabs/MatchesTab";
import { MediaTab } from "./Tabs/MediaTab";
import { PredictionTab } from "./Tabs/PredictionTab";

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
  const [standings, setStandings] = useState<any[]>([]);
  const [isLoadingStandings, setIsLoadingStandings] = useState(false);
  const [isCupCompetition, setIsCupCompetition] = useState(false);
  const [h2hData, setH2hData] = useState<H2HRecord | null>(null);
  const [isLoadingH2h, setIsLoadingH2h] = useState(false);

  // ─── Hook must be called unconditionally before any early returns ────────
  const matchPhase = useMatchPhaseTracker({
    matchId: matchDetails?.id || matchId,
    isLive: !!(matchDetails?.status === 'live' && matchDetails?.sport === 'football'),
    sportmonksFixtureId: (matchDetails as any)?.sportmonksFixtureId,
    statistics: matchDetails?.statistics,
  });

  // ─── Derived values declared here so renderTabContent can safely use them ─
  // FIX: these were declared AFTER renderTabContent in the original, causing
  // potential ReferenceError since const declarations are not hoisted.
  const isLiveMatch = matchDetails?.status === 'live';
  const isFootballMatch = matchDetails?.sport === 'football';

  const transformedEvents = (matchDetails?.events ?? []).map((event) => ({
    minute: event.minute,
    type: event.type as any,
    team: event.team,
    player: event.player,
    description: event.description,
  }));

  const getBallPosition = () => {
    if (!isLiveMatch) return { x: 50, y: 50 };
    if (matchPhase.ballX !== 50 || matchPhase.ballY !== 50) {
      return { x: matchPhase.ballX, y: matchPhase.ballY };
    }
    const minute = matchDetails?.minute || 0;
    return {
      x: 30 + Math.sin(minute * 0.5) * 40,
      y: 30 + Math.cos(minute * 0.3) * 20,
    };
  };

  const currentAction = isLiveMatch && matchPhase.phase !== 'safe'
    ? matchPhase.phase === 'dangerous_attack' ? 'Dangerous Attack'
      : matchPhase.phase === 'attack' ? 'Attack'
      : matchPhase.phase === 'setpiece' ? 'Set Piece'
      : undefined
    : undefined;

  // ─── Load match details ──────────────────────────────────────────────────
  useEffect(() => {
    const loadMatchDetails = async () => {
      try {
        const currentMatchId = match?.id || matchId;
        const isApiSportsMatch =
          currentMatchId.startsWith('apisports-') ||
          currentMatchId.startsWith('api-football-');

        if (isApiSportsMatch && match) {
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
          setMatchDetails({
            ...match,
            events: [],
            odds: { homeWin: 0, draw: 0, awayWin: 0, updated: new Date().toISOString() },
            lineups: undefined,
            statistics: {},
            commentary: [],
            media: { highlights: [], photos: [] },
          });
        } else {
          const { data: cachedMatch } = await supabase
            .from('api_match_cache')
            .select('*')
            .eq('api_match_id', matchId)
            .maybeSingle();

          if (cachedMatch) {
            const rawData = cachedMatch.raw_data as any;
            setMatchDetails({
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
            });
          } else {
            setMatchDetails(getMockMatchDetails(matchId));
          }
        }
      } catch (error) {
        console.error("Failed to load match details:", error);
        try {
          const details = match
            ? {
                ...match,
                events: [],
                odds: { homeWin: 0, draw: 0, awayWin: 0, updated: new Date().toISOString() },
                lineups: undefined,
                statistics: {},
                commentary: [],
                media: { highlights: [], photos: [] },
              }
            : getMockMatchDetails(matchId);
          setMatchDetails(details);
        } catch (e) {
          console.error("Failed to load mock data:", e);
        }
      }
    };
    loadMatchDetails();
  }, [matchId, match]);

  // ─── Load standings with abort on rapid tab switching ────────────────────
  useEffect(() => {
    if (activeTab !== 'standings' || !matchDetails?.league) return;

    const cupKeywords = ['cup', 'copa', 'coupe', 'pokal', 'coppa', 'fa cup', 'league cup',
      'super cup', 'champions league', 'europa league', 'conference league'];
    const leagueLower = matchDetails.league.toLowerCase();
    const isCup = cupKeywords.some(kw => leagueLower.includes(kw));
    setIsCupCompetition(isCup);
    if (isCup) return;

    let isMounted = true;
    setIsLoadingStandings(true);

    const load = async () => {
      try {
        const { data: league } = await supabase
          .from('leagues')
          .select('api_league_id')
          .ilike('name', `%${matchDetails.league.split(' ').slice(0, 2).join(' ')}%`)
          .single();

        if (!league?.api_league_id || !isMounted) return;

        const { data, error } = await supabase.functions.invoke('fetch-league-standings', {
          body: { leagueId: league.api_league_id },
        });
        if (!error && data?.standings && isMounted) {
          setStandings(data.standings);
        }
      } catch (error) {
        console.error('Error loading standings:', error);
      } finally {
        if (isMounted) setIsLoadingStandings(false);
      }
    };

    load();
    return () => { isMounted = false; };
  }, [activeTab, matchDetails?.league]);

  // ─── Coin balance — read from Supabase on mount ──────────────────────────
  useEffect(() => {
    const loadCoins = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('user_profiles')
        .select('coins, is_premium')
        .eq('id', user.id)
        .single();
      if (data) {
        setUserProfile(prev => ({ ...prev, coins: data.coins, isPremium: data.is_premium }));
      }
    };
    loadCoins();
  }, []);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleUnlockPrediction = async () => {
    if (userProfile.coins < 20) {
      toast.error("Insufficient Coins", { description: "You need 20 coins to unlock this prediction." });
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      setActiveTab("prediction");
      setIsLoadingPrediction(true);

      const { data, error } = await supabase.functions.invoke('generate-match-prediction', {
        body: { match: matchDetails },
      });
      if (error) throw error;

      // Deduct coins only after successful prediction generation
      const { error: coinsError } = await supabase
        .from('user_profiles')
        .update({ coins: userProfile.coins - 20 })
        .eq('id', user.id);

      if (coinsError) console.error('Failed to deduct coins:', coinsError);

      setUserProfile(prev => ({ ...prev, coins: prev.coins - 20 }));
      setAiPredictionUnlocked(true);
      setAiPrediction(data.prediction);
      toast.success("AI Prediction Ready!", { description: "Your match prediction has been generated." });
    } catch (error) {
      console.error('Error generating prediction:', error);
      toast.error("Prediction Error", {
        description: error instanceof Error
          ? error.message
          : "Failed to generate prediction. Your coins have not been deducted.",
      });
      setAiPredictionUnlocked(false);
    } finally {
      setIsLoadingPrediction(false);
    }
  };

  const handleWatchRewardedAd = () => {
    setUserProfile(prev => ({ ...prev, coins: prev.coins + 25 }));
    toast.success("Coins Earned!", { description: "You earned 25 coins for watching the ad!" });
  };

  // ─── Loading state ───────────────────────────────────────────────────────
  if (!matchDetails) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading match details...</p>
        </div>
      </div>
    );
  }

  // ─── Tab config ──────────────────────────────────────────────────────────
  const hasOdds = matchDetails.odds && (matchDetails.odds.homeWin > 0 || matchDetails.odds.awayWin > 0);

  const tabs = [
    { id: "details",    label: "Details",   icon: <FileText className="h-3.5 w-3.5" /> },
    { id: "tracker",    label: "Tracker",   icon: <Radio className="h-3.5 w-3.5" /> },
    { id: "statistics", label: "Stats",     icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { id: "standings",  label: "Standings", icon: <Trophy className="h-3.5 w-3.5" /> },
    { id: "lineups",    label: "Lineups",   icon: <Users className="h-3.5 w-3.5" /> },
    { id: "media",      label: "Media",     icon: <Play className="h-3.5 w-3.5" /> },
    ...(matchDetails.status !== 'finished'
      ? [{ id: "prediction", label: "AI", icon: <Brain className="h-3.5 w-3.5" /> }]
      : []),
    { id: "matches", label: "Matches", icon: <Swords className="h-3.5 w-3.5" /> },
    ...(hasOdds
      ? [{ id: "odds", label: "Odds", icon: <DollarSign className="h-3.5 w-3.5" /> }]
      : []),
  ];

  // ─── Tab renderer ────────────────────────────────────────────────────────
  const renderTabContent = () => {
    switch (activeTab) {
      case "details":
        return <DetailsTab matchDetails={matchDetails} />;

      case "tracker":
        if (isLiveMatch && isFootballMatch) {
          return (
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
              currentAction={currentAction}
              ballPosition={getBallPosition()}
              livePhase={matchPhase.phase}
              liveAttackingTeam={matchPhase.attackingTeam}
            />
          );
        }
        return (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📡</div>
            <p className="text-sm text-muted-foreground">Match tracker available during live matches</p>
          </div>
        );

      // FIX: single "statistics" case — duplicate removed, no more fallthrough to odds
      case "statistics":
        return <StatisticsTab matchDetails={matchDetails} />;

      case "odds":
        return <OddsTab matchDetails={matchDetails} />;

      case "prediction":
        return (
          <PredictionTab
            matchDetails={matchDetails}
            aiPredictionUnlocked={aiPredictionUnlocked}
            aiPrediction={aiPrediction}
            isLoadingPrediction={isLoadingPrediction}
            userCoins={userProfile.coins}
            isPremium={userProfile.isPremium}
            onUnlock={handleUnlockPrediction}
            onWatchAd={handleWatchRewardedAd}
          />
        );

      case "lineups":
        return <LineupsTab matchDetails={matchDetails} />;

      case "standings":
        return (
          <StandingsTab
            matchDetails={matchDetails}
            standings={standings}
            isLoading={isLoadingStandings}
            isCupCompetition={isCupCompetition}
          />
        );

      case "matches":
        return (
          <MatchesTab
            matchDetails={matchDetails}
            h2hData={h2hData}
            isLoadingH2h={isLoadingH2h}
          />
        );

      case "media":
        return <MediaTab />;

      default:
        return null;
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-background flex flex-col w-full max-w-full overflow-x-hidden">
      {/* Sticky header */}
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

        {/* Match header card */}
        <Card className="p-3 rounded-2xl mt-3">
          <div className="flex items-center justify-between mb-2">
            <Badge
              variant={matchDetails.status === 'live' ? 'destructive' : 'secondary'}
              className={matchDetails.status === 'live'
                ? 'gradient-live text-live-foreground text-xs px-2 py-1 border-0'
                : 'text-xs px-2 py-1 rounded-lg'}
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
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden w-full min-w-0">
        <div className="px-4 py-3 w-full">
          <TabNavigation
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            vertical={false}
          />
        </div>
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-4 w-full min-w-0">
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
};
