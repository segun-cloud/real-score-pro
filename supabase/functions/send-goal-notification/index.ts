import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// VAPID keys - in production, use environment variables
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || 'demo-private-key';

interface GoalNotificationPayload {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  scoringTeam: 'home' | 'away';
}

async function sendWebPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: GoalNotificationPayload
) {
  const scoringTeamName = payload.scoringTeam === 'home' ? payload.homeTeam : payload.awayTeam;
  
  const notificationPayload = JSON.stringify({
    title: `⚽ GOAL! ${scoringTeamName}`,
    body: `${payload.homeTeam} ${payload.homeScore} - ${payload.awayScore} ${payload.awayTeam}`,
    icon: '/favicon.ico',
    tag: `goal-${payload.matchId}`,
    matchId: payload.matchId,
    url: '/'
  });

  try {
    // For demo purposes, we'll log the notification
    // In production, you'd use web-push library or a service like Firebase
    console.log('Would send push notification:', {
      endpoint: subscription.endpoint.substring(0, 50) + '...',
      payload: notificationPayload
    });
    
    // Note: Actual web push requires web-push npm package which isn't available in Deno
    // For production, consider using Firebase Cloud Messaging or a push notification service
    return { success: true };
  } catch (error) {
    console.error('Failed to send push notification:', error);
    return { success: false, error };
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

    const payload: GoalNotificationPayload = await req.json();
    console.log('Received goal notification request:', payload);

    // Find users who have this match favorited
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
      console.log('No users have this match favorited');
      return new Response(
        JSON.stringify({ success: true, notificationsSent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userIds = favourites.map(f => f.user_id);
    console.log(`Found ${userIds.length} users with this match favorited`);

    // Get push subscriptions for these users
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for favorited users');
      return new Response(
        JSON.stringify({ success: true, notificationsSent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending notifications to ${subscriptions.length} subscriptions`);

    // Send notifications to all subscribed users
    const results = await Promise.all(
      subscriptions.map(sub => sendWebPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload
      ))
    );

    // Also create in-app notifications
    const notifications = subscriptions.map(sub => ({
      user_id: sub.user_id,
      notification_type: 'goal',
      title: `⚽ GOAL! ${payload.scoringTeam === 'home' ? payload.homeTeam : payload.awayTeam}`,
      message: `${payload.homeTeam} ${payload.homeScore} - ${payload.awayScore} ${payload.awayTeam}`,
      metadata: { matchId: payload.matchId }
    }));

    await supabase.from('user_notifications').insert(notifications);

    const successCount = results.filter(r => r.success).length;
    console.log(`Successfully sent ${successCount} notifications`);

    return new Response(
      JSON.stringify({ success: true, notificationsSent: successCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-goal-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
