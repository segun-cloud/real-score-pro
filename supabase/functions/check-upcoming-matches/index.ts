import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const APISPORTS_KEY = Deno.env.get('APISPORTS_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fetchUpcomingFixtures(): Promise<any[]> {
  if (!APISPORTS_KEY) {
    console.log('No API-Sports key configured');
    return [];
  }

  try {
    // Get today's date in YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    const url = `https://v3.football.api-sports.io/fixtures?date=${today}&status=NS`;

    const response = await fetch(url, {
      headers: { 'x-apisports-key': APISPORTS_KEY },
    });

    if (!response.ok) {
      console.error('API-Sports error:', response.status);
      return [];
    }

    const data = await response.json();
    return data.response || [];
  } catch (error) {
    console.error('Error fetching upcoming fixtures:', error);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Checking upcoming matches for reminders...');

    const fixtures = await fetchUpcomingFixtures();
    const now = Date.now();
    let remindersSent = 0;

    // Filter fixtures starting within 60-75 minutes
    const upcomingFixtures = fixtures.filter((f: any) => {
      const kickoff = new Date(f.fixture.date).getTime();
      const diffMinutes = (kickoff - now) / (1000 * 60);
      return diffMinutes > 0 && diffMinutes <= 75;
    });

    console.log(`Found ${upcomingFixtures.length} fixtures starting within 75 minutes`);

    for (const fixture of upcomingFixtures) {
      const matchId = `apisports-football-${fixture.fixture.id}`;
      const homeTeam = fixture.teams.home.name;
      const awayTeam = fixture.teams.away.name;
      const leagueName = fixture.league.name;

      // Find affected users
      const userIds = new Set<string>();

      // Match favourites
      const { data: matchFavs } = await supabase
        .from('user_favourites')
        .select('user_id')
        .eq('entity_type', 'match')
        .eq('entity_id', matchId);
      matchFavs?.forEach(f => userIds.add(f.user_id));

      // Team favourites
      const { data: teamFavs } = await supabase
        .from('user_favourites')
        .select('user_id, entity_data')
        .eq('entity_type', 'team');
      teamFavs?.forEach(f => {
        const name = (f.entity_data as any)?.name;
        if (name && (name.toLowerCase() === homeTeam.toLowerCase() || name.toLowerCase() === awayTeam.toLowerCase())) {
          userIds.add(f.user_id);
        }
      });

      // League favourites
      const { data: leagueFavs } = await supabase
        .from('user_favourites')
        .select('user_id, entity_data')
        .eq('entity_type', 'league');
      leagueFavs?.forEach(f => {
        const name = (f.entity_data as any)?.name;
        if (name && name.toLowerCase() === leagueName.toLowerCase()) {
          userIds.add(f.user_id);
        }
      });

      if (userIds.size === 0) continue;

      // Check preferences and filter already-sent reminders
      const userIdArray = Array.from(userIds);

      const { data: alreadySent } = await supabase
        .from('reminder_sent_cache')
        .select('user_id')
        .eq('match_id', matchId)
        .in('user_id', userIdArray);

      const sentSet = new Set(alreadySent?.map(r => r.user_id) || []);
      const newUsers = userIdArray.filter(uid => !sentSet.has(uid));

      if (newUsers.length === 0) continue;

      // Check preferences
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('user_id, match_reminders')
        .in('user_id', newUsers);

      const prefsMap = new Map(prefs?.map(p => [p.user_id, p]) || []);
      const eligibleUsers = newUsers.filter(uid => {
        const p = prefsMap.get(uid);
        return !p || p.match_reminders !== false;
      });

      if (eligibleUsers.length === 0) continue;

      // Insert notifications
      const kickoffTime = new Date(fixture.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const notifications = eligibleUsers.map(uid => ({
        user_id: uid,
        notification_type: 'match_reminder',
        title: `⏰ Match Starting Soon`,
        message: `${homeTeam} vs ${awayTeam} kicks off at ${kickoffTime}`,
        metadata: { matchId, leagueName },
      }));

      await supabase.from('user_notifications').insert(notifications);

      // Record sent reminders
      const reminders = eligibleUsers.map(uid => ({
        match_id: matchId,
        user_id: uid,
      }));
      await supabase.from('reminder_sent_cache').upsert(reminders, { onConflict: 'match_id,user_id' });

      remindersSent += eligibleUsers.length;
    }

    // Cleanup old reminders (older than 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('reminder_sent_cache').delete().lt('sent_at', oneDayAgo);

    console.log(`Sent ${remindersSent} match reminders`);

    return new Response(
      JSON.stringify({ success: true, remindersSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-upcoming-matches:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
