import { useState, useEffect, useCallback, useRef } from 'react';
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

interface UseMatchPhaseTrackerProps {
  matchId: string;
  isLive: boolean;
  sportmonksFixtureId?: string;
  statistics?: any;
}

export const useMatchPhaseTracker = ({ matchId, isLive, sportmonksFixtureId, statistics }: UseMatchPhaseTrackerProps) => {
  const [state, setState] = useState<MatchPhaseState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevStatsRef = useRef<any>(null);
  const decayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // If we have a SportMonks fixture ID, use the dedicated edge function + realtime
  useEffect(() => {
    if (!isLive || !matchId || !sportmonksFixtureId) return;

    // Subscribe to realtime updates from live_match_state table
    const channel = supabase
      .channel(`match-state-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_match_state',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          if (payload.new) {
            setState(mapDbToState(payload.new));
          }
        }
      )
      .subscribe();

    // Poll SportMonks via edge function every 10 seconds
    const poll = async () => {
      try {
        setIsLoading(true);
        const { data } = await supabase.functions.invoke('fetch-live-match-state', {
          body: { matchId, sportmonksFixtureId },
        });
        if (data?.state) {
          setState(mapApiToState(data.state));
        }
      } catch (error) {
        console.error('Error polling SportMonks match state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    poll();
    pollIntervalRef.current = setInterval(poll, 10000);

    return () => {
      supabase.removeChannel(channel);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [matchId, isLive, sportmonksFixtureId]);

  // Fallback: infer phases from API-Sports statistics when no SportMonks fixture ID
  useEffect(() => {
    if (!isLive || !matchId || sportmonksFixtureId) return;
    if (!statistics) return;

    const inferred = inferPhaseFromStats(statistics, prevStatsRef.current);
    prevStatsRef.current = { ...statistics };

    // Always update possession/attack counts
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
      if (decayTimerRef.current) clearTimeout(decayTimerRef.current);
      setState(prev => ({ ...prev, ...inferred }));
      decayTimerRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, phase: 'safe', attackingTeam: null, ballX: 50, ballY: 50 }));
      }, 15000);
    }
  }, [isLive, matchId, sportmonksFixtureId, statistics]);

  // Fallback polling for API-Sports stats when no SportMonks ID
  useEffect(() => {
    if (!isLive || !matchId || sportmonksFixtureId) return;

    const poll = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase.functions.invoke('fetch-match-details-apisports', {
          body: { matchId },
        });
        if (error || !data?.statistics) return;

        const freshStats = data.statistics;
        const inferred = inferPhaseFromStats(freshStats, prevStatsRef.current);
        prevStatsRef.current = { ...freshStats };

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
          if (decayTimerRef.current) clearTimeout(decayTimerRef.current);
          setState(prev => ({ ...prev, ...inferred }));
          decayTimerRef.current = setTimeout(() => {
            setState(prev => ({ ...prev, phase: 'safe', attackingTeam: null, ballX: 50, ballY: 50 }));
          }, 15000);
        }
      } catch (err) {
        console.error('Error polling match stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    poll();
    pollIntervalRef.current = setInterval(poll, 30000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (decayTimerRef.current) clearTimeout(decayTimerRef.current);
    };
  }, [matchId, isLive, sportmonksFixtureId]);

  return { ...state, isLoading };
};

function mapDbToState(row: any): MatchPhaseState {
  return {
    phase: row.phase || 'safe',
    ballX: Number(row.ball_x) || 50,
    ballY: Number(row.ball_y) || 50,
    attackingTeam: row.attacking_team || null,
    homeAttacks: row.home_attacks || 0,
    homeDangerousAttacks: row.home_dangerous_attacks || 0,
    awayAttacks: row.away_attacks || 0,
    awayDangerousAttacks: row.away_dangerous_attacks || 0,
    homePossession: Number(row.home_possession) || 50,
    awayPossession: Number(row.away_possession) || 50,
  };
}

function mapApiToState(s: any): MatchPhaseState {
  return {
    phase: s.phase || 'safe',
    ballX: s.ball_x ?? 50,
    ballY: s.ball_y ?? 50,
    attackingTeam: s.attacking_team || null,
    homeAttacks: s.home_attacks || 0,
    homeDangerousAttacks: s.home_dangerous_attacks || 0,
    awayAttacks: s.away_attacks || 0,
    awayDangerousAttacks: s.away_dangerous_attacks || 0,
    homePossession: s.home_possession ?? 50,
    awayPossession: s.away_possession ?? 50,
  };
}

function inferPhaseFromStats(newStats: any, oldStats: any): Partial<MatchPhaseState> | null {
  if (!oldStats) return null;

  const sotDeltaHome = (newStats.shotsOnTarget?.home ?? 0) - (oldStats.shotsOnTarget?.home ?? 0);
  const sotDeltaAway = (newStats.shotsOnTarget?.away ?? 0) - (oldStats.shotsOnTarget?.away ?? 0);
  const shotsDeltaHome = (newStats.shots?.home ?? 0) - (oldStats.shots?.home ?? 0);
  const shotsDeltaAway = (newStats.shots?.away ?? 0) - (oldStats.shots?.away ?? 0);
  const cornersDeltaHome = (newStats.corners?.home ?? 0) - (oldStats.corners?.home ?? 0);
  const cornersDeltaAway = (newStats.corners?.away ?? 0) - (oldStats.corners?.away ?? 0);

  if (sotDeltaHome > 0) return { phase: 'dangerous_attack', attackingTeam: 'home', ballX: 82, ballY: 45 + Math.random() * 10 };
  if (sotDeltaAway > 0) return { phase: 'dangerous_attack', attackingTeam: 'away', ballX: 18, ballY: 45 + Math.random() * 10 };
  if (cornersDeltaHome > 0) return { phase: 'setpiece', attackingTeam: 'home', ballX: 92, ballY: 15 };
  if (cornersDeltaAway > 0) return { phase: 'setpiece', attackingTeam: 'away', ballX: 8, ballY: 15 };
  if (shotsDeltaHome > 0) return { phase: 'attack', attackingTeam: 'home', ballX: 68, ballY: 50 };
  if (shotsDeltaAway > 0) return { phase: 'attack', attackingTeam: 'away', ballX: 32, ballY: 50 };

  const homePoss = newStats.possession?.home ?? 50;
  if (homePoss > 60) return { phase: 'attack', attackingTeam: 'home', ballX: 62, ballY: 50 };
  if (homePoss < 40) return { phase: 'attack', attackingTeam: 'away', ballX: 38, ballY: 50 };

  return null;
}
