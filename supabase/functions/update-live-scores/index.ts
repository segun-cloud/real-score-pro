import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const APISPORTS_KEY = Deno.env.get('APISPORTS_KEY');
const CRON_SECRET = Deno.env.get('CRON_SECRET'); // FIX: add a shared secret for cron protection

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// ── Types ─────────────────────────────────────────────────────────────────────

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
  // FIX: api_status is now part of the type, not a hidden duck-typed field
  api_status: string;
}

interface MatchEvent {
  type: string;
  detail: string;
  player_name: string;
  team_name: string;
  minute: number;
}

// ── Status mapping ────────────────────────────────────────────────────────────

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
    case 'P':  return 'penalties';
    case 'FT': case 'AET': case 'PEN': case 'FT_PEN': return 'finished';
    default: return 'scheduled';
  }
}

// ── API fetch helpers ─────────────────────────────────────────────────────────

async function fetchLiveMatches(): Promise<LiveScore[]> {
  if (!APISPORTS_KEY) {
    console.log('No API-Sports key configured — early exit.');
    return [];
  }
  try {
    const response = await fetch('https://v3.football.api-sports.io/fixtures?live=all', {
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
      api_status: f.fixture.status.short,
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
    return (data.response || []).map((e: any) => ({
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

// FIX: hash now prefixes with length so an empty array hashes differently
// from a first-run with no cached hash — prevents missing initial event detection
function hashEvents(events: MatchEvent[]): string {
  if (events.length === 0) return 'empty';
  return `${events.length}:` + events
    .map(e => `${e.type}-${e.detail}-${e.minute}-${e.player_name}`)
    .join('|');
}

// ── Favourites & preferences (fetched ONCE per run, not per match) ────────────

interface FavouritesIndex {
  byMatch: Map<string, Set<string>>;   // matchId → userIds
  teamFavs: Array<{ user_id: string; name: string }>;
  leagueFavs: Array<{ user_id: string; name: string }>;
}

async function loadFavouritesIndex(): Promise<FavouritesIndex> {
  // FIX: fetch all three favourite types once before the match loop
  // Previously fetched inside detectEventsAndNotify = N×3 full-table scans
  const [{ data: matchFavs }, { data: teamFavs }, { data: leagueFavs }] = await Promise.all([
    supabase.from('user_favourites').select('user_id, entity_id').eq('entity_type', 'match'),
    supabase.from('user_favourites').select('user_id, entity_data').eq('entity_type', 'team'),
    supabase.from('user_favourites').select('user_id, entity_data').eq('entity_type', 'league'),
  ]);

  const byMatch = new Map<string, Set<string>>();
  for (const f of matchFavs || []) {
    if (!byMatch.has(f.entity_id)) byMatch.set(f.entity_id, new Set());
    byMatch.get(f.entity_id)!.add(f.user_id);
  }

  return {
    byMatch,
    teamFavs: (teamFavs || []).map(f => ({ user_id: f.user_id, name: (f.entity_data as any)?.name?.toLowerCase() || '' })),
    leagueFavs: (leagueFavs || []).map(f => ({ user_id: f.user_id, name: (f.entity_data as any)?.name?.toLowerCase() || '' })),
  };
}

function getAffectedUsers(
  index: FavouritesIndex,
  matchId: string,
  homeTeam: string,
  awayTeam: string,
  leagueName: string
): string[] {
  const userIds = new Set<string>();
  index.byMatch.get(matchId)?.forEach(uid => userIds.add(uid));
  const homeLower = homeTeam.toLowerCase();
  const awayLower = awayTeam.toLowerCase();
  const leagueLower = leagueName.toLowerCase();
  for (const f of index.teamFavs) {
    if (f.name === homeLower || f.name === awayLower) userIds.add(f.user_id);
  }
  for (const f of index.leagueFavs) {
    if (f.name === leagueLower) userIds.add(f.user_id);
  }
  return Array.from(userIds);
}

async function loadPreferences(userIds: string[]): Promise<Map<string, any>> {
  const { data } = await supabase
    .from('notification_preferences')
    .select('*')
    .in('user_id', userIds);

  const map = new Map<string, any>();
  for (const uid of userIds) {
    map.set(uid, {
      match_kickoff: true, goals: true, cards: true,
      penalties: true, match_end: true,
    });
  }
  data?.forEach(p => map.set(p.user_id, p));
  return map;
}

async function bulkInsertNotifications(
  notifications: Array<{ user_id: string; notification_type: string; title: string; message: string; metadata: any }>
) {
  if (notifications.length === 0) return;
  const { error } = await supabase.from('user_notifications').insert(notifications);
  if (error) console.error('Error inserting notifications:', error);
  else console.log(`Inserted ${notifications.length} notifications`);
}

// ── Event detection & notification (per match) ────────────────────────────────

async function detectAndNotify(
  score: LiveScore,
  cached: { home_score: number; away_score: number; status: string; events_hash: string } | null,
  events: MatchEvent[],
  affectedUsers: string[],
  prefs: Map<string, any>
) {
  if (affectedUsers.length === 0) return;

  const matchLabel = `${score.home_team} ${score.home_score} - ${score.away_score} ${score.away_team}`;
  const detailedStatus = mapDetailedStatus(score.api_status);
  const cachedStatus = cached?.status || 'scheduled';
  const metadata = { matchId: score.match_id };

  const notifications: Array<{
    user_id: string; notification_type: string; title: string; message: string; metadata: any;
  }> = [];

  // FIX: fetch preferences ONCE per match instead of once per notification type
  function addNotifications(type: string, title: string, message: string, prefKey: string) {
    for (const uid of affectedUsers) {
      const p = prefs.get(uid);
      if (p?.[prefKey] !== false) {
        notifications.push({ user_id: uid, notification_type: type, title, message, metadata });
      }
    }
  }

  // Status transitions
  if (cachedStatus === 'scheduled' && detailedStatus.startsWith('live')) {
    addNotifications('match_kickoff', `🟢 Kick Off!`, `${score.home_team} vs ${score.away_team} has kicked off!`, 'match_kickoff');
  }
  if (cachedStatus !== 'halftime' && detailedStatus === 'halftime') {
    addNotifications('halftime', `⏸️ Half Time`, `HT: ${matchLabel}`, 'match_end');
  }
  if (cachedStatus !== 'finished' && detailedStatus === 'finished') {
    addNotifications('match_ended', `🏁 Full Time`, `FT: ${matchLabel}`, 'match_end');
  }

  // Goal detection
  if (cached) {
    if (score.home_score > cached.home_score) {
      addNotifications('goal', `⚽ GOAL! ${score.home_team}`, matchLabel, 'goals');
    // FIX: else-if prevents both teams firing a goal notification in the same update
    } else if (score.away_score > cached.away_score) {
      addNotifications('goal', `⚽ GOAL! ${score.away_team}`, matchLabel, 'goals');
    }
  }

  // Card/penalty events — only process events not seen before
  const oldHash = cached?.events_hash || 'empty';
  const newHash = hashEvents(events);

  if (newHash !== oldHash && events.length > 0) {
    const oldEventSet = new Set((oldHash === 'empty' ? '' : oldHash.split(':')[1] || '').split('|'));
    for (const event of events) {
      const eventKey = `${event.type}-${event.detail}-${event.minute}-${event.player_name}`;
      if (oldEventSet.has(eventKey)) continue;

      if (event.type === 'card' && event.detail === 'red card') {
        addNotifications('red_card', `🟥 Red Card!`, `${event.player_name} (${event.team_name}) - ${event.minute}'`, 'cards');
      } else if (event.type === 'card' && event.detail === 'yellow card') {
        addNotifications('yellow_card', `🟨 Yellow Card`, `${event.player_name} (${event.team_name}) - ${event.minute}'`, 'cards');
      } else if (event.detail?.includes('penalty')) {
        addNotifications('penalty', `⚡ Penalty!`, `${event.player_name} (${event.team_name}) - ${event.minute}'`, 'penalties');
      }
    }
  }

  await bulkInsertNotifications(notifications);
}

// ── Main score update loop ────────────────────────────────────────────────────

async function updateLiveScores(scores: LiveScore[]): Promise<{ updated: number; inserted: number }> {
  let updated = 0;
  let inserted = 0;

  const matchIds = scores.map(s => s.match_id);

  // FIX: fetch all cached scores, live scores, favourites, and events in parallel before loop
  const [{ data: cachedScores }, { data: existingLive }, favouritesIndex] = await Promise.all([
    supabase.from('match_score_cache').select('match_id, home_score, away_score, status, events_hash').in('match_id', matchIds),
    supabase.from('live_scores').select('match_id, home_score, away_score, minute, status').in('match_id', matchIds),
    loadFavouritesIndex(),
  ]);

  const cachedMap = new Map(cachedScores?.map(c => [c.match_id, c]) || []);
  const existingLiveMap = new Map(existingLive?.map(e => [e.match_id, e]) || []);

  // FIX: fetch events for all fixtures in parallel (was sequential per match)
  const fixtureIds = scores.filter(s => s.fixture_id).map(s => s.fixture_id!);
  const eventsMap = new Map<number, MatchEvent[]>();
  await Promise.all(
    fixtureIds.map(async (id) => {
      eventsMap.set(id, await fetchMatchEvents(id));
    })
  );

  // Collect all affected user IDs across all matches for a single prefs fetch
  const allAffectedUsers = new Set<string>();
  const affectedByMatch = new Map<string, string[]>();
  for (const score of scores) {
    const users = getAffectedUsers(favouritesIndex, score.match_id, score.home_team, score.away_team, score.league_name);
    affectedByMatch.set(score.match_id, users);
    users.forEach(uid => allAffectedUsers.add(uid));
  }

  // FIX: load all preferences in one query instead of per-notification-type
  const prefs = allAffectedUsers.size > 0
    ? await loadPreferences(Array.from(allAffectedUsers))
    : new Map<string, any>();

  // Process each match
  for (const score of scores) {
    const cached = cachedMap.get(score.match_id) || null;
    const events = score.fixture_id ? (eventsMap.get(score.fixture_id) || []) : [];
    const affectedUsers = affectedByMatch.get(score.match_id) || [];
    const detailedStatus = mapDetailedStatus(score.api_status);

    // Detect events and send notifications
    await detectAndNotify(score, cached, events, affectedUsers, prefs);

    // Update match_score_cache
    await supabase.from('match_score_cache').upsert({
      match_id: score.match_id,
      home_team: score.home_team,
      away_team: score.away_team,
      home_score: score.home_score,
      away_score: score.away_score,
      status: detailedStatus,
      // FIX: events_hash computed from already-fetched events — no second API call
      events_hash: hashEvents(events),
      last_checked: new Date().toISOString(),
    }, { onConflict: 'match_id' });

    // Update or insert live_scores
    const existing = existingLiveMap.get(score.match_id);
    if (existing) {
      if (
        existing.home_score !== score.home_score ||
        existing.away_score !== score.away_score ||
        existing.minute !== score.minute ||
        existing.status !== score.status
      ) {
        const { error } = await supabase
          .from('live_scores')
          .update({ home_score: score.home_score, away_score: score.away_score, minute: score.minute, status: score.status, last_updated: score.last_updated })
          .eq('match_id', score.match_id);
        if (!error) updated++;
        else console.error('Error updating score:', error);
      }
    } else {
      const { error } = await supabase.from('live_scores').insert({
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

  // Cleanup finished matches older than 2 hours
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  await supabase.from('live_scores').delete().eq('status', 'finished').lt('last_updated', twoHoursAgo);

  return { updated, inserted };
}

// ── Request handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // FIX: cron secret check — prevents external callers from triggering mass notifications
  // Set CRON_SECRET env var and pass it as Authorization: Bearer <secret> from your scheduler
  if (CRON_SECRET) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  try {
    console.log('Starting live score update...');
    const liveScores = await fetchLiveMatches();

    if (liveScores.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No live matches', updated: 0, inserted: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { updated, inserted } = await updateLiveScores(liveScores);
    console.log(`Done — Updated: ${updated}, Inserted: ${inserted}`);

    return new Response(
      JSON.stringify({ success: true, liveMatches: liveScores.length, updated, inserted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // FIX: safely extract message from unknown error type
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error in update-live-scores:', message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
