import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const APISPORTS_KEY = Deno.env.get('APISPORTS_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Max fixtures to process per run — prevents thundering herd on busy match days
const MAX_FIXTURES_PER_RUN = 30;

async function fetchUpcomingFixtures(): Promise<any[]> {
  if (!APISPORTS_KEY) {
    console.log('No API-Sports key configured');
    return [];
  }
  try {
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

    // FIX: window is now strictly 60–75 minutes so reminders don't fire multiple
    // times if this function runs every 15 minutes (e.g. at 70min AND at 55min)
    const upcomingFixtures = fixtures
      .filter((f: any) => {
        const kickoff = new Date(f.fixture.date).getTime();
        const diffMinutes = (kickoff - now) / (1000 * 60);
        return diffMinutes >= 60 && diffMinutes <= 75;
      })
      .slice(0, MAX_FIXTURES_PER_RUN); // FIX: cap batch size to prevent thundering herd

    console.log(`Found ${upcomingFixtures.length} fixtures starting in 60–75 minutes`);

    if (upcomingFixtures.length === 0) {
      return new Response(
        JSON.stringify({ success: true, remindersSent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── FIX: fetch all favourites ONCE before the loop ───────────────────────
    // Previously these were fetched per fixture, causing N×3 DB queries.
    // Now we load all favourites up front and filter in memory per fixture.

    const { data: allMatchFavs } = await supabase
      .from('user_favourites')
      .select('user_id, entity_id')
      .eq('entity_type', 'match');

    const { data: allTeamFavs } = await supabase
      .from('user_favourites')
      .select('user_id, entity_data')
      .eq('entity_type', 'team');

    const { data: allLeagueFavs } = await supabase
      .from('user_favourites')
      .select('user_id, entity_data')
      .eq('entity_type', 'league');

    // Pre-build match favourite lookup: matchId → Set<userId>
    const matchFavMap = new Map<string, Set<string>>();
    for (const f of allMatchFavs || []) {
      if (!matchFavMap.has(f.entity_id)) matchFavMap.set(f.entity_id, new Set());
      matchFavMap.get(f.entity_id)!.add(f.user_id);
    }

    // Pre-build notification preferences lookup: userId → prefs
    // Fetch all prefs once — filtered per user inside the loop
    const { data: allPrefs } = await supabase
      .from('notification_preferences')
      .select('user_id, match_reminders');
    const prefsMap = new Map(allPrefs?.map(p => [p.user_id, p]) || []);

    let remindersSent = 0;

    for (const fixture of upcomingFixtures) {
      const matchId = `apisports-football-${fixture.fixture.id}`;
      const homeTeam = fixture.teams.home.name;
      const awayTeam = fixture.teams.away.name;
      const leagueName = fixture.league.name;
      const homeTeamLower = homeTeam.toLowerCase();
      const awayTeamLower = awayTeam.toLowerCase();
      const leagueNameLower = leagueName.toLowerCase();

      const userIds = new Set<string>();

      // Match favourites — from pre-fetched map
      matchFavMap.get(matchId)?.forEach(uid => userIds.add(uid));

      // Team favourites — filter in memory from pre-fetched data
      for (const f of allTeamFavs || []) {
        const name = (f.entity_data as any)?.name?.toLowerCase();
        if (name && (name === homeTeamLower || name === awayTeamLower)) {
          userIds.add(f.user_id);
        }
      }

      // League favourites — filter in memory from pre-fetched data
      for (const f of allLeagueFavs || []) {
        const name = (f.entity_data as any)?.name?.toLowerCase();
        if (name && name === leagueNameLower) {
          userIds.add(f.user_id);
        }
      }

      if (userIds.size === 0) continue;

      const userIdArray = Array.from(userIds);

      // Check which users already received a reminder for this match
      const { data: alreadySent } = await supabase
        .from('reminder_sent_cache')
        .select('user_id')
        .eq('match_id', matchId)
        .in('user_id', userIdArray);

      const sentSet = new Set(alreadySent?.map(r => r.user_id) || []);
      const newUsers = userIdArray.filter(uid => !sentSet.has(uid));
      if (newUsers.length === 0) continue;

      // Filter by notification preferences (opt-out check) — from pre-fetched map
      const eligibleUsers = newUsers.filter(uid => {
        const p = prefsMap.get(uid);
        return !p || p.match_reminders !== false;
      });

      if (eligibleUsers.length === 0) continue;

      const kickoffTime = new Date(fixture.fixture.date).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      // Insert notifications for eligible users
      const notifications = eligibleUsers.map(uid => ({
        user_id: uid,
        notification_type: 'match_reminder',
        title: `⏰ Match Starting Soon`,
        message: `${homeTeam} vs ${awayTeam} kicks off at ${kickoffTime}`,
        metadata: { matchId, leagueName },
      }));

      await supabase.from('user_notifications').insert(notifications);

      // Record sent reminders to prevent duplicates
      const reminders = eligibleUsers.map(uid => ({
        match_id: matchId,
        user_id: uid,
      }));
      await supabase
        .from('reminder_sent_cache')
        .upsert(reminders, { onConflict: 'match_id,user_id' });

      remindersSent += eligibleUsers.length;
    }

    // Cleanup reminder cache entries older than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('reminder_sent_cache').delete().lt('sent_at', oneDayAgo);

    console.log(`Sent ${remindersSent} match reminders`);

    return new Response(
      JSON.stringify({ success: true, remindersSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // FIX: error typed as unknown in Deno — safely extract message
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error in check-upcoming-matches:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
