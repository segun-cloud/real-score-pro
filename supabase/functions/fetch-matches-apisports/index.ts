import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FIX: Supabase client created once at module level, not per request
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface ApiSportsFootballFixture {
  fixture: {
    id: number;
    date: string;
    status: { short: string; elapsed: number | null };
  };
  league: { name: string; country: string; logo: string };
  teams: {
    home: { name: string; logo: string };
    away: { name: string; logo: string };
  };
  goals: { home: number | null; away: number | null };
}

interface ApiSportsBasketballGame {
  id: number;
  date: string;
  time: string;
  status: { short: string };
  league: { name: string; country: string; logo: string };
  teams: {
    home: { name: string; logo: string };
    away: { name: string; logo: string };
  };
  scores: {
    home: { total: number | null };
    away: { total: number | null };
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // FIX: verify Supabase JWT — prevents unauthorized API quota consumption
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

    // FIX: validate sport field
    if (!sport) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: sport' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('APISPORTS_KEY');
    if (!apiKey) {
      throw new Error('APISPORTS_KEY not configured');
    }

    console.log(`Fetching ${sport} matches for ${date || 'live'}, liveOnly: ${liveOnly}`);

    let matches: any[] = [];

    if (sport === 'football') {
      matches = await fetchFootballMatches(apiKey, date ?? null, !!liveOnly);
    } else if (sport === 'basketball') {
      matches = await fetchBasketballMatches(apiKey, date ?? null, !!liveOnly);
    } else if (sport === 'tennis') {
      matches = await fetchTennisMatches(apiKey, date ?? null, !!liveOnly);
    } else if (sport === 'baseball') {
      matches = await fetchBaseballMatches(apiKey, date ?? null, !!liveOnly);
    } else {
      return new Response(
        JSON.stringify({ error: `Unsupported sport: ${sport}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FIX: batch cache upsert instead of one DB call per match
    // Previously N sequential awaits — now chunked in batches of 50
    if (matches.length > 0) {
      const upsertData = matches.map(m => ({
        api_match_id: m.id,
        sport: m.sport,
        home_team: m.homeTeam,
        away_team: m.awayTeam,
        home_score: m.homeScore,
        away_score: m.awayScore,
        status: m.status,
        match_date: m.startTime,
        league_name: m.league,
        minute: m.minute ?? null,
        // FIX: store logos explicitly so they can be read without casting raw_data
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

    // FIX: fire-and-forget log — logging failure should never block the response
    supabase.from('api_request_log').insert({
      endpoint: 'fetch-matches-apisports',
      sport,
      request_params: { date, liveOnly },
      response_status: 200,
      cached: false,
    }).catch(err => console.error('Failed to log API request:', err));

    console.log(`Returning ${matches.length} ${sport} matches`);

    return new Response(JSON.stringify({ matches, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // FIX: safely extract message from unknown error type
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error fetching matches:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ── Shared fetch helper ───────────────────────────────────────────────────────

// FIX: shared fetch helper — all 4 sport functions had identical fetch + ok-check logic
async function apiFetch(url: string, apiKey: string): Promise<any> {
  const response = await fetch(url, { headers: { 'x-apisports-key': apiKey } });
  if (!response.ok) {
    throw new Error(`API-Sports returned ${response.status} for ${url}`);
  }
  return response.json();
}

// ── Football ──────────────────────────────────────────────────────────────────

async function fetchFootballMatches(apiKey: string, date: string | null, liveOnly: boolean) {
  const url = liveOnly
    ? 'https://v3.football.api-sports.io/fixtures?live=all'
    : `https://v3.football.api-sports.io/fixtures?date=${date}`;

  console.log(`Calling API-Sports Football: ${liveOnly ? 'live' : date}`);
  const data = await apiFetch(url, apiKey);
  console.log(`API-Sports returned ${data.response?.length || 0} football fixtures`);

  return (data.response || []).map((fixture: ApiSportsFootballFixture) => ({
    id: `apisports-football-${fixture.fixture.id}`,
    homeTeam: fixture.teams.home.name,
    awayTeam: fixture.teams.away.name,
    homeScore: fixture.goals.home,
    awayScore: fixture.goals.away,
    status: mapFootballStatus(fixture.fixture.status.short),
    startTime: fixture.fixture.date,
    sport: 'football',
    league: fixture.league.name,
    minute: fixture.fixture.status.elapsed,
    homeTeamLogo: fixture.teams.home.logo,
    awayTeamLogo: fixture.teams.away.logo,
  }));
}

// ── Basketball ────────────────────────────────────────────────────────────────

async function fetchBasketballMatches(apiKey: string, date: string | null, liveOnly: boolean) {
  const url = liveOnly
    ? 'https://v1.basketball.api-sports.io/games?live=all'
    : `https://v1.basketball.api-sports.io/games?date=${date}`;

  console.log(`Calling API-Sports Basketball: ${liveOnly ? 'live' : date}`);
  const data = await apiFetch(url, apiKey);
  console.log(`API-Sports returned ${data.response?.length || 0} basketball games`);

  return (data.response || []).map((game: ApiSportsBasketballGame) => ({
    id: `apisports-basketball-${game.id}`,
    homeTeam: game.teams.home.name,
    awayTeam: game.teams.away.name,
    homeScore: game.scores.home.total,
    awayScore: game.scores.away.total,
    status: mapBasketballStatus(game.status.short),
    startTime: `${game.date}T${game.time}`,
    sport: 'basketball',
    league: game.league.name,
    homeTeamLogo: game.teams.home.logo,
    awayTeamLogo: game.teams.away.logo,
  }));
}

// ── Tennis ────────────────────────────────────────────────────────────────────

async function fetchTennisMatches(apiKey: string, date: string | null, liveOnly: boolean) {
  const url = liveOnly
    ? 'https://v1.tennis.api-sports.io/games?live=all'
    : `https://v1.tennis.api-sports.io/games?date=${date}`;

  console.log(`Calling API-Sports Tennis: ${liveOnly ? 'live' : date}`);
  const data = await apiFetch(url, apiKey);
  console.log(`API-Sports returned ${data.response?.length || 0} tennis matches`);

  return (data.response || []).map((game: any) => ({
    id: `apisports-tennis-${game.id}`,
    homeTeam: game.players?.[0]?.name || 'Player 1',
    awayTeam: game.players?.[1]?.name || 'Player 2',
    homeScore: game.scores?.[0]?.total ?? null,
    awayScore: game.scores?.[1]?.total ?? null,
    status: mapTennisStatus(game.status.short),
    startTime: game.date,
    sport: 'tennis',
    league: game.league.name,
  }));
}

// ── Baseball ──────────────────────────────────────────────────────────────────

async function fetchBaseballMatches(apiKey: string, date: string | null, liveOnly: boolean) {
  const url = liveOnly
    ? 'https://v1.baseball.api-sports.io/games?live=all'
    : `https://v1.baseball.api-sports.io/games?date=${date}`;

  console.log(`Calling API-Sports Baseball: ${liveOnly ? 'live' : date}`);
  const data = await apiFetch(url, apiKey);
  console.log(`API-Sports returned ${data.response?.length || 0} baseball games`);

  return (data.response || []).map((game: any) => ({
    id: `apisports-baseball-${game.id}`,
    homeTeam: game.teams.home.name,
    awayTeam: game.teams.away.name,
    homeScore: game.scores.home.total,
    awayScore: game.scores.away.total,
    status: mapBaseballStatus(game.status.short),
    startTime: `${game.date}T${game.time}`,
    sport: 'baseball',
    league: game.league.name,
    homeTeamLogo: game.teams.home.logo,
    awayTeamLogo: game.teams.away.logo,
  }));
}

// ── Status mappers ────────────────────────────────────────────────────────────

function mapFootballStatus(apiStatus: string): 'scheduled' | 'live' | 'finished' {
  const liveStatuses = ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'];
  const finishedStatuses = ['FT', 'AET', 'PEN', 'FT_PEN'];
  if (liveStatuses.includes(apiStatus)) return 'live';
  if (finishedStatuses.includes(apiStatus)) return 'finished';
  return 'scheduled';
}

function mapBasketballStatus(apiStatus: string): 'scheduled' | 'live' | 'finished' {
  if (apiStatus === 'LIVE' || apiStatus.includes('Q')) return 'live';
  if (apiStatus === 'FT' || apiStatus === 'AOT') return 'finished';
  return 'scheduled';
}

function mapTennisStatus(apiStatus: string): 'scheduled' | 'live' | 'finished' {
  if (apiStatus === 'LIVE') return 'live';
  if (apiStatus === 'FT') return 'finished';
  return 'scheduled';
}

function mapBaseballStatus(apiStatus: string): 'scheduled' | 'live' | 'finished' {
  if (apiStatus === 'LIVE' || apiStatus.includes('I')) return 'live';
  if (apiStatus === 'FT') return 'finished';
  return 'scheduled';
}
