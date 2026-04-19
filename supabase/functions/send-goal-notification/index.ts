import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FIX: both VAPID keys from env vars — hardcoding the public key in source is a bad habit
// even if the public key is technically safe to expose, keeping it in env keeps config consistent
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');

// FIX: module-level service role client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface GoalNotificationPayload {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  scoringTeam: 'home' | 'away';
}

// NOTE: Deno does not have access to the `web-push` npm package natively.
// Real web push requires VAPID signing + encrypted payload via the Web Push Protocol.
// Until a Deno-compatible push library is integrated (e.g. via esm.sh or a service
// like Firebase Cloud Messaging), this function delivers in-app notifications only.
// The push subscription data is stored and ready for when push is implemented.
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  title: string,
  body: string,
  matchId: string
): Promise<{ success: boolean; error?: string }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('VAPID keys not configured — skipping web push for endpoint:', subscription.endpoint.substring(0, 40));
    return { success: false, error: 'VAPID keys not configured' };
  }

  // TODO: replace this stub with a real Web Push Protocol implementation.
  // Recommended approach: use a Deno-compatible VAPID library or proxy through
  // a Firebase Cloud Messaging edge function.
  console.log('Web push stub — endpoint:', subscription.endpoint.substring(0, 50) + '...');
  console.log('Push payload:', { title, body, matchId });

  // Return false so successCount accurately reflects that no push was delivered
  // FIX: was returning { success: true } making successCount always lie
  return { success: false, error: 'Web push not yet implemented — in-app notification sent instead' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // FIX: auth check — this function sends notifications to real users.
    // Without this, anyone can call it and spam all users who favourite a match.
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
    let payload: GoalNotificationPayload;
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FIX: validate required payload fields
    if (
      !payload.matchId ||
      !payload.homeTeam ||
      !payload.awayTeam ||
      !payload.scoringTeam ||
      typeof payload.homeScore !== 'number' ||
      typeof payload.awayScore !== 'number'
    ) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid payload fields: matchId, homeTeam, awayTeam, homeScore, awayScore, scoringTeam required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Received goal notification request:', payload.matchId);

    const scoringTeamName = payload.scoringTeam === 'home' ? payload.homeTeam : payload.awayTeam;
    const notifTitle = `⚽ GOAL! ${scoringTeamName}`;
    const notifBody = `${payload.homeTeam} ${payload.homeScore} - ${payload.awayScore} ${payload.awayTeam}`;

    // Find users who have this match favourited
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

    const userIds = [...new Set(favourites.map(f => f.user_id))];
    console.log(`Found ${userIds.length} users with this match favourited`);

    // Get push subscriptions for these users
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    // Attempt web push for each subscription
    let pushSuccessCount = 0;
    if (subscriptions && subscriptions.length > 0) {
      const pushResults = await Promise.all(
        subscriptions.map(sub =>
          sendWebPush(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            notifTitle,
            notifBody,
            payload.matchId
          )
        )
      );
      pushSuccessCount = pushResults.filter(r => r.success).length;
    }

    // FIX: deduplicate in-app notifications by user_id
    // Previously mapped over subscriptions — a user with 3 devices got 3 notifications
    const inAppNotifications = userIds.map(userId => ({
      user_id: userId,
      notification_type: 'goal',
      title: notifTitle,
      message: notifBody,
      metadata: { matchId: payload.matchId },
    }));

    // FIX: log insert error instead of silently swallowing it
    const { error: notifError } = await supabase
      .from('user_notifications')
      .insert(inAppNotifications);

    if (notifError) {
      console.error('Failed to insert in-app notifications:', notifError);
    }

    const inAppCount = notifError ? 0 : inAppNotifications.length;
    console.log(`Push: ${pushSuccessCount} sent | In-app: ${inAppCount} sent`);

    return new Response(
      JSON.stringify({
        success: true,
        pushNotificationsSent: pushSuccessCount,
        inAppNotificationsSent: inAppCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // FIX: safely extract message from unknown error type
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error in send-goal-notification:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
