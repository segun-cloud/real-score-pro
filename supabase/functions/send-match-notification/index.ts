import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// FIX: module-level service role client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const VALID_NOTIFICATION_TYPES = [
  'goal', 'red_card', 'yellow_card', 'penalty',
  'match_kickoff', 'halftime', 'match_ended', 'match_reminder',
];

interface MatchNotificationPayload {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  type: string;
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
        title: `⚽ GOAL! ${payload.teamName || ''}`.trim(),
        body: scoreLabel,
      };
    case 'red_card':
      return {
        title: `🟥 Red Card!`,
        body: `${payload.playerName ?? 'Unknown'} (${payload.teamName ?? ''}) - ${scoreLabel}`,
      };
    case 'yellow_card':
      return {
        title: `🟨 Yellow Card`,
        body: `${payload.playerName ?? 'Unknown'} (${payload.teamName ?? ''})`,
      };
    case 'penalty':
      return {
        title: `⚡ Penalty!`,
        body: `${payload.playerName ?? 'Unknown'} (${payload.teamName ?? ''}) - ${scoreLabel}`,
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
    // FIX: auth check — without this anyone can spam all users who favour a match
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FIX: wrap req.json()
    let payload: MatchNotificationPayload;
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FIX: validate required fields
    if (!payload.matchId || !payload.homeTeam || !payload.awayTeam || !payload.type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: matchId, homeTeam, awayTeam, type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FIX: validate notification type — unknown types still build a notification via
    // the default case, but logging an unknown type helps catch integration bugs early
    if (!VALID_NOTIFICATION_TYPES.includes(payload.type)) {
      console.warn(`Unknown notification type: "${payload.type}" — using default content`);
    }

    console.log('Received match notification request:', payload.matchId, payload.type);

    const { title, body } = buildNotificationContent(payload);

    // Find users who have this match favourited
    // FIX: removed the redundant `.or()` wrapper — the original used
    // `or(and(...))` which is equivalent to just the inner filter directly
    const { data: favourites, error: favError } = await supabase
      .from('user_favourites')
      .select('user_id')
      .eq('entity_type', 'match')
      .eq('entity_id', payload.matchId);

    if (favError) {
      console.error('Error fetching favourites:', favError);
      throw favError;
    }

    if (!favourites || favourites.length === 0) {
      console.log('No users have this match favourited');
      return new Response(
        JSON.stringify({ success: true, notificationsSent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduplicate user IDs
    const userIdArray = [...new Set(favourites.map(f => f.user_id))];
    console.log(`Found ${userIdArray.length} users with this match favourited`);

    // Get push subscriptions — logged but not yet delivered (web push not implemented)
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('endpoint')
      .in('user_id', userIdArray);

    if (subError) console.error('Error fetching push subscriptions:', subError);

    // FIX: pushCount reflects subscriptions found, not notifications "sent"
    // since web push is not yet implemented — honest logging
    const pushCount = subscriptions?.length ?? 0;
    if (pushCount > 0) {
      console.log(`Web push stub: would deliver to ${pushCount} subscription(s) — not yet implemented`);
    }

    // Create in-app notifications (one per user, not per subscription)
    const notifications = userIdArray.map(uid => ({
      user_id: uid,
      notification_type: payload.type,
      title,
      message: body,
      metadata: {
        matchId: payload.matchId,
        ...(payload.playerName && { playerName: payload.playerName }),
        ...(payload.teamName && { teamName: payload.teamName }),
      },
    }));

    // FIX: log insert error instead of silently swallowing it
    const { error: notifError } = await supabase
      .from('user_notifications')
      .insert(notifications);

    if (notifError) {
      console.error('Failed to insert in-app notifications:', notifError);
    }

    const inAppCount = notifError ? 0 : notifications.length;
    console.log(`In-app notifications sent: ${inAppCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        inAppNotificationsSent: inAppCount,
        pushSubscriptionsFound: pushCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // FIX: safely extract message from unknown error type
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error in send-match-notification:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
