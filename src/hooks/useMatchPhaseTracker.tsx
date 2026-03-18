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
  goalserveMatchId?: string;
}

export const useMatchPhaseTracker = ({ matchId, isLive, goalserveMatchId }: UseMatchPhaseTrackerProps) => {
  const [state, setState] = useState<MatchPhaseState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to realtime updates from live_match_state table
  useEffect(() => {
    if (!isLive || !matchId) return;

    // First, fetch current state
    const fetchCurrentState = async () => {
      const { data } = await supabase
        .from('live_match_state' as any)
        .select('*')
        .eq('match_id', matchId)
        .maybeSingle();

      if (data) {
        setState(mapDbToState(data));
      }
    };

    fetchCurrentState();

    // Subscribe to realtime changes
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, isLive]);

  // Poll the edge function to refresh Goalserve data
  useEffect(() => {
    if (!isLive || !matchId || !goalserveMatchId) return;

    const poll = async () => {
      try {
        setIsLoading(true);
        await supabase.functions.invoke('fetch-live-match-state', {
          body: { matchId, goalserveMatchId },
        });
      } catch (error) {
        console.error('Error polling match state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Poll immediately, then every 5 seconds
    poll();
    pollIntervalRef.current = setInterval(poll, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [matchId, isLive, goalserveMatchId]);

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
