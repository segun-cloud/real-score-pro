import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LiveScore {
  id: string;
  match_id: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  status: string;
  minute: number | null;
  league_name: string;
  home_team_logo: string | null;
  away_team_logo: string | null;
  sport: string;
  match_date: string | null;
  last_updated: string;
}

interface ScoreChange {
  matchId: string;
  team: 'home' | 'away';
  newScore: number;
  oldScore: number;
}

export function useLiveScores() {
  const [liveScores, setLiveScores] = useState<Map<string, LiveScore>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [scoreChanges, setScoreChanges] = useState<ScoreChange[]>([]);
  const previousScores = useRef<Map<string, { home: number; away: number }>>(new Map());

  // Trigger background update
  const triggerUpdate = useCallback(async () => {
    try {
      await supabase.functions.invoke('update-live-scores');
    } catch (error) {
      console.error('Error triggering live score update:', error);
    }
  }, []);

  // Fetch initial live scores
  const fetchLiveScores = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('live_scores')
        .select('*')
        .in('status', ['live', 'scheduled']);

      if (error) throw error;

      const scoresMap = new Map<string, LiveScore>();
      (data || []).forEach((score: LiveScore) => {
        scoresMap.set(score.match_id, score);
        previousScores.current.set(score.match_id, {
          home: score.home_score,
          away: score.away_score,
        });
      });
      setLiveScores(scoresMap);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching live scores:', error);
    }
  }, []);

  // Handle realtime updates
  useEffect(() => {
    fetchLiveScores();
    triggerUpdate();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('live-scores-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_scores',
        },
        (payload) => {
          
          if (payload.eventType === 'DELETE') {
            setLiveScores((prev) => {
              const next = new Map(prev);
              const oldRecord = payload.old as { match_id?: string };
              if (oldRecord.match_id) {
                next.delete(oldRecord.match_id);
              }
              return next;
            });
          } else {
            const newScore = payload.new as LiveScore;
            
            // Check for score changes
            const prevScore = previousScores.current.get(newScore.match_id);
            if (prevScore) {
              const changes: ScoreChange[] = [];
              
              if (newScore.home_score > prevScore.home) {
                changes.push({
                  matchId: newScore.match_id,
                  team: 'home',
                  newScore: newScore.home_score,
                  oldScore: prevScore.home,
                });
                toast.success(`⚽ GOAL! ${newScore.home_team} ${newScore.home_score} - ${newScore.away_score} ${newScore.away_team}`);
              }
              
              if (newScore.away_score > prevScore.away) {
                changes.push({
                  matchId: newScore.match_id,
                  team: 'away',
                  newScore: newScore.away_score,
                  oldScore: prevScore.away,
                });
                toast.success(`⚽ GOAL! ${newScore.home_team} ${newScore.home_score} - ${newScore.away_score} ${newScore.away_team}`);
              }

              if (changes.length > 0) {
                setScoreChanges(changes);
                // Clear changes after animation
                setTimeout(() => setScoreChanges([]), 2000);
              }
            }

            // Update previous scores
            previousScores.current.set(newScore.match_id, {
              home: newScore.home_score,
              away: newScore.away_score,
            });

            setLiveScores((prev) => {
              const next = new Map(prev);
              next.set(newScore.match_id, newScore);
              return next;
            });
            setLastUpdate(new Date());
          }
        }
      )
      .subscribe((status) => {
        
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Poll for updates every 10 seconds to keep data fresh
    const pollInterval = setInterval(() => {
      triggerUpdate();
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [fetchLiveScores, triggerUpdate]);

  // Get score for a specific match
  const getMatchScore = useCallback((matchId: string) => {
    return liveScores.get(matchId);
  }, [liveScores]);

  // Check if a match has a recent score change
  const hasRecentScoreChange = useCallback((matchId: string, team: 'home' | 'away') => {
    return scoreChanges.some(c => c.matchId === matchId && c.team === team);
  }, [scoreChanges]);

  return {
    liveScores,
    isConnected,
    lastUpdate,
    getMatchScore,
    hasRecentScoreChange,
    triggerUpdate,
  };
}
