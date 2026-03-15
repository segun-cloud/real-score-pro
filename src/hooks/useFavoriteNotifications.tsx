import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FavoriteTeam {
  id: string;
  name: string;
  sport?: string;
}

interface FavoriteLeague {
  id: string;
  name: string;
}

const notificationStyles: Record<string, { icon: string; style?: 'success' | 'error' | 'info' | 'warning' }> = {
  goal: { icon: '⚽', style: 'success' },
  red_card: { icon: '🟥', style: 'error' },
  yellow_card: { icon: '🟨', style: 'warning' },
  penalty: { icon: '⚡', style: 'warning' },
  match_kickoff: { icon: '🟢', style: 'info' },
  halftime: { icon: '⏸️', style: 'info' },
  match_ended: { icon: '🏁', style: 'info' },
  match_reminder: { icon: '⏰', style: 'info' },
  news: { icon: '📰', style: 'info' },
};

export function useFavoriteNotifications(userId: string | undefined) {
  const favoriteTeams = useRef<FavoriteTeam[]>([]);
  const favoriteLeagues = useRef<FavoriteLeague[]>([]);
  const favoriteMatchIds = useRef<Set<string>>(new Set());

  const loadFavorites = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('user_favourites')
        .select('entity_type, entity_id, entity_data')
        .eq('user_id', userId);

      if (error) throw error;

      const teams: FavoriteTeam[] = [];
      const leagues: FavoriteLeague[] = [];
      const matchIds = new Set<string>();

      (data || []).forEach((fav) => {
        if (fav.entity_type === 'team') {
          teams.push({
            id: fav.entity_id,
            name: (fav.entity_data as any)?.name || 'Unknown Team',
            sport: (fav.entity_data as any)?.sport,
          });
        } else if (fav.entity_type === 'league') {
          leagues.push({
            id: fav.entity_id,
            name: (fav.entity_data as any)?.name || 'Unknown League',
          });
        } else if (fav.entity_type === 'match') {
          matchIds.add(fav.entity_id);
        }
      });

      favoriteTeams.current = teams;
      favoriteLeagues.current = leagues;
      favoriteMatchIds.current = matchIds;
    } catch (error) {
      console.error('Error loading favorites for notifications:', error);
    }
  }, [userId]);

  const isRelevantUpdate = useCallback((
    matchId: string,
    homeTeam: string,
    awayTeam: string,
    leagueName: string
  ): { relevant: boolean; reason: string } => {
    if (favoriteMatchIds.current.has(matchId)) {
      return { relevant: true, reason: 'Favorite match' };
    }

    const homeTeamFav = favoriteTeams.current.find(
      (t) => t.name.toLowerCase() === homeTeam.toLowerCase()
    );
    if (homeTeamFav) {
      return { relevant: true, reason: `Your team ${homeTeamFav.name}` };
    }

    const awayTeamFav = favoriteTeams.current.find(
      (t) => t.name.toLowerCase() === awayTeam.toLowerCase()
    );
    if (awayTeamFav) {
      return { relevant: true, reason: `Your team ${awayTeamFav.name}` };
    }

    const leagueFav = favoriteLeagues.current.find(
      (l) => l.name.toLowerCase() === leagueName.toLowerCase()
    );
    if (leagueFav) {
      return { relevant: true, reason: `${leagueFav.name}` };
    }

    return { relevant: false, reason: '' };
  }, []);

  useEffect(() => {
    if (!userId) return;

    loadFavorites();

    // Subscribe to live_scores changes (real-time score updates)
    const channel = supabase
      .channel('favorite-score-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_scores',
        },
        (payload) => {
          const newScore = payload.new as {
            match_id: string;
            home_team: string;
            away_team: string;
            home_score: number;
            away_score: number;
            league_name: string;
            status: string;
          };

          const oldScore = payload.old as {
            home_score: number;
            away_score: number;
          };

          if (
            newScore.home_score === oldScore.home_score &&
            newScore.away_score === oldScore.away_score
          ) {
            return;
          }

          const { relevant, reason } = isRelevantUpdate(
            newScore.match_id,
            newScore.home_team,
            newScore.away_team,
            newScore.league_name
          );

          if (relevant) {
            const scoringTeam =
              newScore.home_score > (oldScore.home_score || 0)
                ? newScore.home_team
                : newScore.away_team;

            toast.success(
              `⚽ GOAL! ${scoringTeam} scores!\n${newScore.home_team} ${newScore.home_score} - ${newScore.away_score} ${newScore.away_team}`,
              {
                description: reason,
                duration: 5000,
              }
            );

            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`⚽ GOAL! ${scoringTeam}`, {
                body: `${newScore.home_team} ${newScore.home_score} - ${newScore.away_score} ${newScore.away_team}\n${reason}`,
                icon: '/favicon.ico',
                tag: `goal-${newScore.match_id}`,
              });
            }
          }
        }
      )
      .subscribe();

    // Subscribe to user_notifications INSERT for all notification types
    const notifChannel = supabase
      .channel('user-notifications-insert')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notif = payload.new as {
            notification_type: string;
            title: string;
            message: string;
          };

          const style = notificationStyles[notif.notification_type];

          if (style?.style === 'success') {
            toast.success(notif.title, { description: notif.message, duration: 5000 });
          } else if (style?.style === 'error') {
            toast.error(notif.title, { description: notif.message, duration: 5000 });
          } else if (style?.style === 'warning') {
            toast.warning(notif.title, { description: notif.message, duration: 4000 });
          } else {
            toast.info(notif.title, { description: notif.message, duration: 4000 });
          }

          // Browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notif.title, {
              body: notif.message,
              icon: '/favicon.ico',
            });
          }
        }
      )
      .subscribe();

    // Re-load favorites when they change
    const favChannel = supabase
      .channel('favorites-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_favourites',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadFavorites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(favChannel);
    };
  }, [userId, loadFavorites, isRelevantUpdate]);

  return { loadFavorites };
}
