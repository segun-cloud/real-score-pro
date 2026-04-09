import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MatchPhaseState {
  phase: 'safe' | 'attack' | 'dangerous_attack' | 'setpiece' | 'goal';
  ballX: number;
  ballY: number;
  attackingTeam: 'home' | 'away' | null;
  homeAttacks: number;
  homeDangerousAttacks: number;
  awayAttacks: number;
  awayDangerousAttacks: number;
  homePossession: number;
  awayPossession: number;
}

const DEFAULT_STATE: MatchPhaseState = {
  phase: 'safe',
  ballX: 50,
  ballY: 50,
  attackingTeam: null,
  homeAttacks: 0,
  homeDangerousAttacks: 0,
  awayAttacks: 0,
  awayDangerousAttacks: 0,
  homePossession: 50,
  awayPossession: 50,
};

interface StatPair {
  home: number;
  away: number;
}

interface MatchStatistics {
  possession?: StatPair;
  shots?: StatPair;
  shotsOnTarget?: StatPair;
  corners?: StatPair;
  fouls?: StatPair;
}

interface UseMatchPhaseTrackerProps {
  matchId: string;
  isLive: boolean;
  statistics?: MatchStatistics;
}

export const useMatchPhaseTracker = ({ matchId, isLive, statistics }: UseMatchPhaseTrackerProps) => {
  const [state, setState] = useState<MatchPhaseState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const prevStatsRef = useRef<MatchStatistics | null>(null);
  const decayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const inferPhase = useCallback((newStats: MatchStatistics, oldStats: MatchStatistics | null): Partial<MatchPhaseState> | null => {
    if (!oldStats) return null; // First poll, no delta yet

    const shotsDeltaHome = (newStats.shotsOnTarget?.home ?? 0) - (oldStats.shotsOnTarget?.home ?? 0);
    const shotsDeltaAway = (newStats.shotsOnTarget?.away ?? 0) - (oldStats.shotsOnTarget?.away ?? 0);
    const totalShotsDeltaHome = (newStats.shots?.home ?? 0) - (oldStats.shots?.home ?? 0);
    const totalShotsDeltaAway = (newStats.shots?.away ?? 0) - (oldStats.shots?.away ?? 0);
    const cornersDeltaHome = (newStats.corners?.home ?? 0) - (oldStats.corners?.home ?? 0);
    const cornersDeltaAway = (newStats.corners?.away ?? 0) - (oldStats.corners?.away ?? 0);

    // Shots on target → dangerous attack
    if (shotsDeltaHome > 0) {
      return { phase: 'dangerous_attack', attackingTeam: 'home', ballX: 82, ballY: 45 + Math.random() * 10 };
    }
    if (shotsDeltaAway > 0) {
      return { phase: 'dangerous_attack', attackingTeam: 'away', ballX: 18, ballY: 45 + Math.random() * 10 };
    }

    // Corners → setpiece
    if (cornersDeltaHome > 0) {
      return { phase: 'setpiece', attackingTeam: 'home', ballX: 92, ballY: 10 + Math.random() * 40 };
    }
    if (cornersDeltaAway > 0) {
      return { phase: 'setpiece', attackingTeam: 'away', ballX: 8, ballY: 10 + Math.random() * 40 };
    }

    // Total shots → attack
    if (totalShotsDeltaHome > 0) {
      return { phase: 'attack', attackingTeam: 'home', ballX: 68, ballY: 40 + Math.random() * 20 };
    }
    if (totalShotsDeltaAway > 0) {
      return { phase: 'attack', attackingTeam: 'away', ballX: 32, ballY: 40 + Math.random() * 20 };
    }

    // No stat delta — use possession to infer
    const homePoss = newStats.possession?.home ?? 50;
    const awayPoss = newStats.possession?.away ?? 50;

    if (homePoss > 60) {
      return { phase: 'attack', attackingTeam: 'home', ballX: 62, ballY: 50 };
    }
    if (awayPoss > 60) {
      return { phase: 'attack', attackingTeam: 'away', ballX: 38, ballY: 50 };
    }

    return null; // No change detected → will decay to safe
  }, []);

  const applyPhase = useCallback((update: Partial<MatchPhaseState>) => {
    // Clear any existing decay timer
    if (decayTimerRef.current) clearTimeout(decayTimerRef.current);

    setState(prev => ({
      ...prev,
      ...update,
    }));

    // Decay back to safe after 15 seconds
    decayTimerRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        phase: 'safe',
        attackingTeam: null,
        ballX: 50,
        ballY: 50,
      }));
    }, 15000);
  }, []);

  // React to statistics passed from parent (already-fetched data)
  useEffect(() => {
    if (!isLive || !statistics) return;

    const inferred = inferPhase(statistics, prevStatsRef.current);
    prevStatsRef.current = statistics;

    // Update possession stats always
    setState(prev => ({
      ...prev,
      homePossession: statistics.possession?.home ?? prev.homePossession,
      awayPossession: statistics.possession?.away ?? prev.awayPossession,
      homeAttacks: statistics.shots?.home ?? prev.homeAttacks,
      awayAttacks: statistics.shots?.away ?? prev.awayAttacks,
      homeDangerousAttacks: statistics.shotsOnTarget?.home ?? prev.homeDangerousAttacks,
      awayDangerousAttacks: statistics.shotsOnTarget?.away ?? prev.awayDangerousAttacks,
    }));

    if (inferred) {
      applyPhase(inferred);
    }
  }, [isLive, statistics, inferPhase, applyPhase]);

  // Poll API-Sports every 30s for fresh stats when live
  useEffect(() => {
    if (!isLive || !matchId) return;

    const poll = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase.functions.invoke('fetch-match-details-apisports', {
          body: { matchId },
        });

        if (error || !data?.statistics) return;

        const freshStats: MatchStatistics = data.statistics;
        const inferred = inferPhase(freshStats, prevStatsRef.current);
        prevStatsRef.current = freshStats;

        setState(prev => ({
          ...prev,
          homePossession: freshStats.possession?.home ?? prev.homePossession,
          awayPossession: freshStats.possession?.away ?? prev.awayPossession,
          homeAttacks: freshStats.shots?.home ?? prev.homeAttacks,
          awayAttacks: freshStats.shots?.away ?? prev.awayAttacks,
          homeDangerousAttacks: freshStats.shotsOnTarget?.home ?? prev.homeDangerousAttacks,
          awayDangerousAttacks: freshStats.shotsOnTarget?.away ?? prev.awayDangerousAttacks,
        }));

        if (inferred) {
          applyPhase(inferred);
        }
      } catch (err) {
        console.error('Error polling match stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    // Poll every 30 seconds
    poll();
    pollIntervalRef.current = setInterval(poll, 30000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (decayTimerRef.current) clearTimeout(decayTimerRef.current);
    };
  }, [matchId, isLive, inferPhase, applyPhase]);

  return { ...state, isLoading };
};
