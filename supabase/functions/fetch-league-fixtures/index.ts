import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APISPORTS_KEY = Deno.env.get('APISPORTS_KEY');

function mapStatus(apiStatus: string): 'scheduled' | 'live' | 'finished' {
  const liveStatuses = ['1H', '2H', 'HT', 'ET', 'P', 'LIVE', 'BT'];
  const finishedStatuses = ['FT', 'AET', 'PEN', 'FT_PEN', 'WO', 'AWD', 'CANC', 'ABD'];
  if (liveStatuses.includes(apiStatus)) return 'live';
  if (finishedStatuses.includes(apiStatus)) return 'finished';
  return 'scheduled';
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

    // FIX: wrap req.json() — malformed body returns clean 400 instead of cryptic 500
    let body: { leagueId?: string; season?: number; last?: number };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { leagueId, season, last = 10 } = body;

    // FIX: validate required field — without this, API call fires with league=undefined
    if (!leagueId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: leagueId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!APISPORTS_KEY) {
      throw new Error('APISPORTS_KEY not configured');
    }

    const currentSeason = season || new Date().getFullYear();
    console.log(`Fetching fixtures for league: ${leagueId}, season: ${currentSeason}, last: ${last}`);

    // Over-fetch by 2x to account for filtering, then trim to requested count
    const url = new URL('https://v3.football.api-sports.io/fixtures');
    url.searchParams.set('league', leagueId);
    url.searchParams.set('season', String(currentSeason));
    url.searchParams.set('last', String(last * 2));

    // FIX: log URL without exposing the API key
    console.log(`Calling API-Sports: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: { 'x-apisports-key': APISPORTS_KEY },
    });

    // FIX: check response.ok BEFORE parsing JSON
    // If API returns a non-JSON error (e.g. 429 rate limit HTML), parsing first throws
    if (!response.ok) {
      console.error('API-Sports error status:', response.status);
      throw new Error(`API-Sports returned ${response.status}`);
    }

    const apiData = await response.json();
    console.log('API-Sports response sample:', JSON.stringify(apiData).substring(0, 500));

    const rawFixtures = apiData.response || [];

    const fixtures = rawFixtures
      .map((f: any) => ({
        id: `apisports-football-${f.fixture.id}`,
        homeTeam: f.teams.home.name,
        awayTeam: f.teams.away.name,
        homeScore: f.goals.home,
        awayScore: f.goals.away,
        status: mapStatus(f.fixture.status.short),
        startTime: f.fixture.date,
        league: f.league.name,
        homeTeamLogo: f.teams.home.logo,
        awayTeamLogo: f.teams.away.logo,
        minute: f.fixture.status.elapsed,
      }))
      // FIX: trim back to requested count — previously returned last*2 results
      .slice(0, last);

    console.log(`Successfully fetched ${fixtures.length} fixtures`);

    return new Response(
      JSON.stringify({ fixtures }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // FIX: safely extract message from unknown error type
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error in fetch-league-fixtures:', message);
    return new Response(
      JSON.stringify({ error: message, fixtures: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
