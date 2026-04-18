import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APISPORTS_KEY = Deno.env.get('APISPORTS_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function mapFootballStatus(apiStatus: string): 'scheduled' | 'live' | 'finished' {
  const liveStatuses = ['1H', '2H', 'HT', 'ET', 'P', 'LIVE', 'BT'];
  const finishedStatuses = ['FT', 'AET', 'PEN', 'FT_PEN', 'WO', 'AWD', 'CANC', 'ABD', 'SUSP', 'INT'];
  if (liveStatuses.includes(apiStatus)) return 'live';
  if (finishedStatuses.includes(apiStatus)) return 'finished';
  return 'scheduled';
}

// FIX: shared mapper — fetchLiveFootballMatches and fetchScheduledFootballMatches
// had identical .map() logic duplicated. Now centralised here.
function mapFixture(f: any) {
  return {
    id: `apisports-football-${f.fixture.id}`,
    api_match_id: `apisports-football-${f.fixture.id}`,
    sport: 'football',
    homeTeam: f.teams.home.name,
    awayTeam: f.teams.away.name,
    homeScore: f.goals.home,
    awayScore: f.goals.away,
    status: mapFootballStatus(f.fixture.status.short),
    startTime: f.fixture.date,
    league: f.league.name,
    homeTeamLogo: f.teams.home.logo,
    awayTeamLogo: f.teams.away.logo,
    minute: f.fixture.status.elapsed,
    round: f.league.round || null,
  };
}

async function logApiRequest(endpoint: string, sport: string, status: number, cached: boolean) {
  // Fire-and-forget — logging failure should never block the response
  supabase.from('api_request_log').insert({
    endpoint,
    sport,
    response_status: status,
    cached,
  }).catch(err => console.error('Failed to log API request:', err));
}

async function fetchFromCache(sport: string, date: string) {
  const cacheExpiry = new Date(Date.now() - 60000).toISOString();
  const { data } = await supabase
    .from('api_match_cache')
    .select('*')
    .eq('sport', sport)
    .gte('match_date', new Date(date).toISOString())
    .lt('match_date', new Date(new Date(date).getTime() + 86400000).toISOString())
    .gte('last_updated', cacheExpiry);
  return data;
}

// FIX: single shared fetch function replaces two nearly-identical functions.
// liveOnly=true fetches live fixtures, liveOnly=false fetches by date.
async function fetchFootballMatches(date: string, liveOnly: boolean): Promise<any[]> {
  const url = new URL('https://v3.football.api-sports.io/fixtures');
  if (liveOnly) {
    url.searchParams.set('live', 'all');
    console.log('Calling API-Sports for live football matches');
  } else {
    url.searchParams.set('date', date);
    console.log(`Calling API-Sports for football matches on ${date}`);
  }

  const response = await fetch(url.toString(), {
    headers: { 'x-apisports-key': APISPORTS_KEY! },
  });

  logApiRequest(
    liveOnly ? 'apisports/fixtures/live' : 'apisports/fixtures/date',
    'football',
    response.status,
    false
  );

  console.log(`API-Sports Response Status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API-Sports Error: ${response.status} - ${errorText}`);
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const fixtures = data.response || [];
  console.log(`Found ${fixtures.length} football matches`);

  // Cap at 200 to avoid edge function timeout on busy days
  return fixtures.slice(0, 200).map(mapFixture);
}

async function saveToCache(matches: any[]) {
  const upsertData = matches.map(m => ({
    api_match_id: m.api_match_id,
    sport: m.sport,
    league_name: m.league,
    home_team: m.homeTeam,
    away_team: m.awayTeam,
    home_score: m.homeScore,
    away_score: m.awayScore,
    status: m.status,
    match_date: m.startTime,
    minute: m.minute,
    // FIX: store logos directly on raw_data so they can be read back without casting
    raw_data: {
      homeTeamLogo: m.homeTeamLogo,
      awayTeamLogo: m.awayTeamLogo,
    },
    last_updated: new Date().toISOString(),
  }));

  for (let i = 0; i < upsertData.length; i += 50) {
    const chunk = upsertData.slice(i, i + 50);
    const { error } = await supabase
      .from('api_match_cache')
      .upsert(chunk, { onConflict: 'api_match_id' });
    if (error) console.error('Cache upsert error:', error);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // FIX: verify Supabase JWT — prevents unauthorized quota consumption
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

    // FIX: wrap req.json() — malformed body returns clean 400
    let body: { sport?: string; date?: string; liveOnly?: boolean };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { sport, date, liveOnly } = body;

    // FIX: validate sport field — without this cache and API calls fire with sport=undefined
    if (!sport) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: sport' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!APISPORTS_KEY) {
      throw new Error('API key not configured. Please add your API-Sports key.');
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    console.log(`Fetching ${sport} matches for ${targetDate}, liveOnly: ${liveOnly}`);

    // Check cache first (skip for live matches — live data is always fresh)
    if (!liveOnly) {
      const cachedMatches = await fetchFromCache(sport, targetDate);
      if (cachedMatches && cachedMatches.length > 0) {
        console.log(`Returning ${cachedMatches.length} cached matches`);
        logApiRequest('cache-hit', sport, 200, true);

        const formattedMatches = cachedMatches.map((match: any) => ({
          id: match.api_match_id,
          sport: match.sport,
          homeTeam: match.home_team,
          awayTeam: match.away_team,
          homeScore: match.home_score,
          awayScore: match.away_score,
          status: match.status,
          startTime: match.match_date,
          league: match.league_name,
          minute: match.minute,
          // FIX: raw_data now has a consistent shape so no cast needed
          homeTeamLogo: match.raw_data?.homeTeamLogo,
          awayTeamLogo: match.raw_data?.awayTeamLogo,
        }));

        return new Response(
          JSON.stringify({ matches: formattedMatches, cached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    let matches: any[] = [];

    if (sport === 'football') {
      matches = await fetchFootballMatches(targetDate, !!liveOnly);
    } else {
      console.log(`Sport "${sport}" not yet supported — returning empty`);
    }

    if (matches.length > 0 && !liveOnly) {
      await saveToCache(matches);
    }

    console.log(`Returning ${matches.length} matches from API-Sports`);

    return new Response(
      JSON.stringify({ matches, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // FIX: safely extract message from unknown error type
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error in fetch-live-matches:', message);
    return new Response(
      JSON.stringify({ error: message, matches: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
