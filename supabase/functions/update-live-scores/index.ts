import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const APISPORTS_KEY = Deno.env.get('APISPORTS_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface LiveScore {
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
  fixture_id?: number;
}

interface MatchEvent {
  type: string;
  detail: string;
  player_name: string;
  team_name: string;
  minute: number;
}

function mapStatus(apiStatus: string): string {
  const liveStatuses = ['1H', '2H', 'HT', 'ET', 'P', 'LIVE', 'BT'];
  const finishedStatuses = ['FT', 'AET', 'PEN', 'FT_PEN', 'WO', 'AWD'];
  if (liveStatuses.includes(apiStatus)) return 'live';
  if (finishedStatuses.includes(apiStatus)) return 'finished';
  return 'scheduled';
}

function mapDetailedStatus(apiStatus: string): string {
  switch (apiStatus) {
    case '1H': return 'live_1h';
    case 'HT': return 'halftime';
    case '2H': return 'live_2h';
    case 'ET': return 'extra_time';
    case 'P': return 'penalties';
    case 'FT': case 'AET': case 'PEN': case 'FT_PEN': return 'finished';
    default: return 'scheduled';
  }
}

async function fetchLiveMatches(): Promise<LiveScore[]> {
  if (!APISPORTS_KEY) {
    console.log('No API-Sports key configured');
    return [];
  }

  try {
    const url = 'https://v3.football.api-sports.io/fixtures?live=all';
    console.log('Fetching live matches from API-Sports...');

    const response = await fetch(url, {
      headers: { 'x-apisports-key': APISPORTS_KEY },
    });

    if (!response.ok) {
      console.error('API-Sports error:', response.status, await response.text());
      return [];
    }

    const data = await response.json();
    const fixtures = data.response || [];
    console.log(`Found ${fixtures.length} live matches`);

    return fixtures.map((f: any) => ({
      match_id: `apisports-football-${f.fixture.id}`,
      home_team: f.teams.home.name,
      away_team: f.teams.away.name,
      home_score: f.goals.home ?? 0,
      away_score: f.goals.away ?? 0,
      status: mapStatus(f.fixture.status.short),
      minute: f.fixture.status.elapsed,
      league_name: f.league.name,
      home_team_logo: f.teams.home.logo,
      away_team_logo: f.teams.away.logo,
      sport: 'football',
      match_date: f.fixture.date,
      last_updated: new Date().toISOString(),
      fixture_id: f.fixture.id,
      _api_status: f.fixture.status.short,
    }));
  } catch (error) {
    console.error('Error fetching live matches:', error);
    return [];
  }
}

async function fetchMatchEvents(fixtureId: number): Promise<MatchEvent[]> {
  if (!APISPORTS_KEY) return [];

  try {
    const response = await fetch(
      `https://v3.football.api-sports.io/fixtures/events?fixture=${fixtureId}`,
      { headers: { 'x-apisports-key': APISPORTS_KEY } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const events = data.response || [];

    return events.map((e: any) => ({
      type: e.type?.toLowerCase() || '',
      detail: e.detail?.toLowerCase() || '',
      player_name: e.player?.name || 'Unknown',
      team_name: e.team?.name || 'Unknown',
      minute: e.time?.elapsed || 0,
    }));
  } catch (error) {
    console.error(`Error fetching events for fixture ${fixtureId}:`, error);
    return [];
  }
}

function hashEvents(events: MatchEvent[]): string {
  return events.map(e => `${e.type}-${e.detail}-${e.minute}-${e.player_name}`).join('|');
}

async function findAffectedUsers(matchId: string, homeTeam: string, awayTeam: string, leagueName: string): Promise<string[]> {
  const userIds = new Set<string>();

  // Users who favourited this match
  const { data: matchFavs } = await supabase
    .from('user_favourites')
    .select('user_id')
    .eq('entity_type', 'match')
    .eq('entity_id', matchId);

  matchFavs?.forEach(f => userIds.add(f.user_id));

  // Users who favourited either team (by name match in entity_data)
  const { data: allTeamFavs } = await supabase
    .from('user_favourites')
    .select('user_id, entity_data')
    .eq('entity_type', 'team');

  allTeamFavs?.forEach(f => {
    const name = (f.entity_data as any)?.name;
    if (name && (name.toLowerCase() === homeTeam.toLowerCase() || name.toLowerCase() === awayTeam.toLowerCase())) {
      userIds.add(f.user_id);
    }
  });

  // Users who favourited this league
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

  return Array.from(userIds);
}

async function getUserPreferences(userIds: string[]): Promise<Map<string, any>> {
  const { data } = await supabase
    .from('notification_preferences')
    .select('*')
    .in('user_id', userIds);

  const map = new Map<string, any>();
  // Default all prefs to true
  for (const uid of userIds) {
    map.set(uid, {
      match_reminders: true, match_kickoff: true, goals: true,
      cards: true, penalties: true, match_end: true, news_updates: true,
    });
  }
  data?.forEach(p => map.set(p.user_id, p));
  return map;
}

async function insertNotifications(
  userIds: string[],
  type: string,
  title: string,
  message: string,
  metadata: any,
  prefKey: string
) {
  if (userIds.length === 0) return;

  const prefs = await getUserPreferences(userIds);
  const filtered = userIds.filter(uid => {
    const p = prefs.get(uid);
    return p?.[prefKey] !== false;
  });

  if (filtered.length === 0) return;

  const notifications = filtered.map(uid => ({
    user_id: uid,
    notification_type: type,
    title,
    message,
    metadata,
  }));

  const { error } = await supabase.from('user_notifications').insert(notifications);
  if (error) console.error('Error inserting notifications:', error);
  else console.log(`Inserted ${filtered.length} ${type} notifications`);
}

async function detectEventsAndNotify(
  score: LiveScore & { _api_status?: string },
  cached: { home_score: number; away_score: number; status: string; events_hash: string } | null
) {
  const matchLabel = `${score.home_team} ${score.home_score} - ${score.away_score} ${score.away_team}`;
  const detailedStatus = mapDetailedStatus(score._api_status || '');
  const cachedStatus = cached?.status || 'scheduled';
  const metadata = { matchId: score.match_id };

  const affectedUsers = await findAffectedUsers(score.match_id, score.home_team, score.away_team, score.league_name);
  if (affectedUsers.length === 0) return;

  // Status transition notifications
  if (cachedStatus === 'scheduled' && detailedStatus.startsWith('live')) {
    await insertNotifications(affectedUsers, 'match_kickoff',
      `🟢 Kick Off!`, `${score.home_team} vs ${score.away_team} has kicked off!`, metadata, 'match_kickoff');
  }

  if (cachedStatus !== 'halftime' && detailedStatus === 'halftime') {
    await insertNotifications(affectedUsers, 'halftime',
      `⏸️ Half Time`, `HT: ${matchLabel}`, metadata, 'match_end');
  }

  if (cachedStatus !== 'finished' && detailedStatus === 'finished') {
    await insertNotifications(affectedUsers, 'match_ended',
      `🏁 Full Time`, `FT: ${matchLabel}`, metadata, 'match_end');
  }

  // Score change (goal) notifications
  if (cached) {
    if (score.home_score > cached.home_score) {
      await insertNotifications(affectedUsers, 'goal',
        `⚽ GOAL! ${score.home_team}`, matchLabel, metadata, 'goals');
    }
    if (score.away_score > cached.away_score) {
      await insertNotifications(affectedUsers, 'goal',
        `⚽ GOAL! ${score.away_team}`, matchLabel, metadata, 'goals');
    }
  }

  // Fetch and check match events for cards, penalties, substitutions
  if (score.fixture_id) {
    const events = await fetchMatchEvents(score.fixture_id);
    const newHash = hashEvents(events);
    const oldHash = cached?.events_hash || '';

    if (newHash !== oldHash && events.length > 0) {
      // Find new events by comparing hashes - process events not in old set
      const oldEventSet = new Set((oldHash || '').split('|'));

      for (const event of events) {
        const eventKey = `${event.type}-${event.detail}-${event.minute}-${event.player_name}`;
        if (oldEventSet.has(eventKey)) continue;

        if (event.type === 'card' && event.detail === 'red card') {
          await insertNotifications(affectedUsers, 'red_card',
            `🟥 Red Card!`, `${event.player_name} (${event.team_name}) - ${event.minute}'`, metadata, 'cards');
        } else if (event.type === 'card' && event.detail === 'yellow card') {
          await insertNotifications(affectedUsers, 'yellow_card',
            `🟨 Yellow Card`, `${event.player_name} (${event.team_name}) - ${event.minute}'`, metadata, 'cards');
        } else if (event.detail?.includes('penalty')) {
          await insertNotifications(affectedUsers, 'penalty',
            `⚡ Penalty!`, `${event.player_name} (${event.team_name}) - ${event.minute}'`, metadata, 'penalties');
        }
      }
    }
  }
}

async function updateLiveScores(scores: (LiveScore & { _api_status?: string })[]): Promise<{ updated: number; inserted: number }> {
  let updated = 0;
  let inserted = 0;

  // Get cached data for event detection
  const matchIds = scores.map(s => s.match_id);
  const { data: cachedScores } = await supabase
    .from('match_score_cache')
    .select('match_id, home_score, away_score, status, events_hash')
    .in('match_id', matchIds);

  const cachedMap = new Map(cachedScores?.map(c => [c.match_id, c]) || []);

  for (const score of scores) {
    const cached = cachedMap.get(score.match_id);
    const detailedStatus = mapDetailedStatus(score._api_status || '');

    // Detect events and send notifications
    await detectEventsAndNotify(score, cached || null);

    // Update match_score_cache
    await supabase.from('match_score_cache').upsert({
      match_id: score.match_id,
      home_team: score.home_team,
      away_team: score.away_team,
      home_score: score.home_score,
      away_score: score.away_score,
      status: detailedStatus,
      events_hash: score.fixture_id
        ? hashEvents(await fetchMatchEvents(score.fixture_id))
        : '',
      last_checked: new Date().toISOString(),
    }, { onConflict: 'match_id' });

    // Update live_scores table
    const { data: existing } = await supabase
      .from('live_scores')
      .select('home_score, away_score, minute, status')
      .eq('match_id', score.match_id)
      .maybeSingle();

    if (existing) {
      if (
        existing.home_score !== score.home_score ||
        existing.away_score !== score.away_score ||
        existing.minute !== score.minute ||
        existing.status !== score.status
      ) {
        const { error } = await supabase
          .from('live_scores')
          .update({
            home_score: score.home_score,
            away_score: score.away_score,
            minute: score.minute,
            status: score.status,
            last_updated: score.last_updated,
          })
          .eq('match_id', score.match_id);

        if (!error) updated++;
        else console.error('Error updating score:', error);
      }
    } else {
      const { error } = await supabase
        .from('live_scores')
        .insert({
          match_id: score.match_id,
          home_team: score.home_team,
          away_team: score.away_team,
          home_score: score.home_score,
          away_score: score.away_score,
          status: score.status,
          minute: score.minute,
          league_name: score.league_name,
          home_team_logo: score.home_team_logo,
          away_team_logo: score.away_team_logo,
          sport: score.sport,
          match_date: score.match_date,
          last_updated: score.last_updated,
        });

      if (!error) inserted++;
      else console.error('Error inserting score:', error);
    }
  }

  // Clean up finished matches older than 2 hours
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  await supabase
    .from('live_scores')
    .delete()
    .eq('status', 'finished')
    .lt('last_updated', twoHoursAgo);

  return { updated, inserted };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting live score update...');

    const liveScores = await fetchLiveMatches();

    if (liveScores.length === 0) {
      console.log('No live matches found');
      return new Response(
        JSON.stringify({ success: true, message: 'No live matches', updated: 0, inserted: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { updated, inserted } = await updateLiveScores(liveScores);

    console.log(`Live scores updated - Updated: ${updated}, Inserted: ${inserted}`);

    return new Response(
      JSON.stringify({
        success: true,
        liveMatches: liveScores.length,
        updated,
        inserted
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in update-live-scores:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
