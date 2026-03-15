import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface MatchNotificationPayload {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  type: string; // goal, red_card, yellow_card, penalty, match_kickoff, halftime, match_ended, match_reminder
  detail?: string;
  playerName?: string;
  teamName?: string;
}

function buildNotificationContent(payload: MatchNotificationPayload): { title: string; body: string } {
  const scoreLabel = payload.homeScore !== undefined
    ? `${payload.homeTeam} ${payload.homeScore} - ${payload.awayScore} ${payload.awayTeam}`
    : `${payload.homeTeam} vs ${payload.awayTeam}`;

  switch (payload.type) {
    case 'goal':
      return {
        title: `⚽ GOAL! ${payload.teamName || ''}`,
        body: scoreLabel,
      };
    case 'red_card':
      return {
        title: `🟥 Red Card!`,
        body: `${payload.playerName} (${payload.teamName}) - ${scoreLabel}`,
      };
    case 'yellow_card':
      return {
        title: `🟨 Yellow Card`,
        body: `${payload.playerName} (${payload.teamName})`,
      };
    case 'penalty':
      return {
        title: `⚡ Penalty!`,
        body: `${payload.playerName} (${payload.teamName}) - ${scoreLabel}`,
      };
    case 'match_kickoff':
      return {
        title: `🟢 Kick Off!`,
        body: `${payload.homeTeam} vs ${payload.awayTeam} has started`,
      };
    case 'halftime':
      return {
        title: `⏸️ Half Time`,
        body: `HT: ${scoreLabel}`,
      };
    case 'match_ended':
      return {
        title: `🏁 Full Time`,
        body: `FT: ${scoreLabel}`,
      };
    case 'match_reminder':
      return {
        title: `⏰ Match Starting Soon`,
        body: `${payload.homeTeam} vs ${payload.awayTeam} kicks off soon`,
      };
    default:
      return {
        title: `📢 Match Update`,
        body: scoreLabel,
      };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: MatchNotificationPayload = await req.json();
    console.log('Received match notification request:', payload);

    const { title, body } = buildNotificationContent(payload);

    // Find users who have this match/teams/league favorited
    const { data: favourites } = await supabase
      .from('user_favourites')
      .select('user_id')
      .or(`and(entity_type.eq.match,entity_id.eq.${payload.matchId})`);

    const userIds = new Set<string>();
    favourites?.forEach(f => userIds.add(f.user_id));

    if (userIds.size === 0) {
      return new Response(
        JSON.stringify({ success: true, notificationsSent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userIdArray = Array.from(userIds);

    // Get push subscriptions
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIdArray);

    // Log push notifications (actual web push not implemented)
    let pushCount = 0;
    if (subscriptions && subscriptions.length > 0) {
      for (const sub of subscriptions) {
        console.log('Would send push:', { endpoint: sub.endpoint.substring(0, 50), title, body });
        pushCount++;
      }
    }

    // Create in-app notifications
    const notifications = userIdArray.map(uid => ({
      user_id: uid,
      notification_type: payload.type,
      title,
      message: body,
      metadata: { matchId: payload.matchId },
    }));

    await supabase.from('user_notifications').insert(notifications);

    console.log(`Sent ${pushCount} push + ${userIdArray.length} in-app notifications`);

    return new Response(
      JSON.stringify({ success: true, notificationsSent: userIdArray.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-match-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
