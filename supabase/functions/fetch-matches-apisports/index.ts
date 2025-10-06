import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApiSportsFootballFixture {
  fixture: {
    id: number;
    date: string;
    status: {
      short: string;
      elapsed: number | null;
    };
  };
  league: {
    name: string;
    country: string;
    logo: string;
  };
  teams: {
    home: {
      name: string;
      logo: string;
    };
    away: {
      name: string;
      logo: string;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

interface ApiSportsBasketballGame {
  id: number;
  date: string;
  time: string;
  status: {
    short: string;
  };
  league: {
    name: string;
    country: string;
    logo: string;
  };
  teams: {
    home: {
      name: string;
      logo: string;
    };
    away: {
      name: string;
      logo: string;
    };
  };
  scores: {
    home: {
      total: number | null;
    };
    away: {
      total: number | null;
    };
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sport, date, liveOnly } = await req.json();
    console.log(`Fetching ${sport} matches for ${date || 'live'}, liveOnly: ${liveOnly}`);

    const apiKey = Deno.env.get('APISPORTS_KEY');
    if (!apiKey) {
      throw new Error('APISPORTS_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let matches: any[] = [];

    if (sport === 'football') {
      matches = await fetchFootballMatches(apiKey, date, liveOnly);
    } else if (sport === 'basketball') {
      matches = await fetchBasketballMatches(apiKey, date, liveOnly);
    } else if (sport === 'tennis') {
      matches = await fetchTennisMatches(apiKey, date, liveOnly);
    } else if (sport === 'baseball') {
      matches = await fetchBaseballMatches(apiKey, date, liveOnly);
    }

    // Cache matches to database
    for (const match of matches) {
      await supabase.from('api_match_cache').upsert({
        api_match_id: match.id,
        sport: match.sport,
        home_team: match.homeTeam,
        away_team: match.awayTeam,
        home_score: match.homeScore,
        away_score: match.awayScore,
        status: match.status,
        match_date: match.startTime,
        league_name: match.league,
        minute: match.minute,
        raw_data: match,
        last_updated: new Date().toISOString(),
      }, { onConflict: 'api_match_id' });
    }

    // Log request
    await supabase.from('api_request_log').insert({
      endpoint: 'fetch-matches-apisports',
      sport,
      request_params: { date, liveOnly },
      response_status: 200,
      cached: false,
    });

    console.log(`Returning ${matches.length} ${sport} matches`);

    return new Response(JSON.stringify({ matches, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching matches:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchFootballMatches(apiKey: string, date: string | null, liveOnly: boolean) {
  const baseUrl = 'https://v3.football.api-sports.io';
  const endpoint = liveOnly ? '/fixtures?live=all' : `/fixtures?date=${date}`;
  
  console.log(`Calling API-Sports Football: ${baseUrl}${endpoint}`);
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      'x-apisports-key': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`API-Sports returned ${response.status}`);
  }

  const data = await response.json();
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

async function fetchBasketballMatches(apiKey: string, date: string | null, liveOnly: boolean) {
  const baseUrl = 'https://v1.basketball.api-sports.io';
  const endpoint = liveOnly ? '/games?live=all' : `/games?date=${date}`;
  
  console.log(`Calling API-Sports Basketball: ${baseUrl}${endpoint}`);
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      'x-apisports-key': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`API-Sports returned ${response.status}`);
  }

  const data = await response.json();
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

async function fetchTennisMatches(apiKey: string, date: string | null, liveOnly: boolean) {
  const baseUrl = 'https://v1.tennis.api-sports.io';
  const endpoint = liveOnly ? '/games?live=all' : `/games?date=${date}`;
  
  console.log(`Calling API-Sports Tennis: ${baseUrl}${endpoint}`);
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      'x-apisports-key': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`API-Sports returned ${response.status}`);
  }

  const data = await response.json();
  console.log(`API-Sports returned ${data.response?.length || 0} tennis matches`);

  return (data.response || []).map((game: any) => ({
    id: `apisports-tennis-${game.id}`,
    homeTeam: game.players[0]?.name || 'Player 1',
    awayTeam: game.players[1]?.name || 'Player 2',
    homeScore: game.scores[0]?.total || null,
    awayScore: game.scores[1]?.total || null,
    status: mapTennisStatus(game.status.short),
    startTime: game.date,
    sport: 'tennis',
    league: game.league.name,
  }));
}

async function fetchBaseballMatches(apiKey: string, date: string | null, liveOnly: boolean) {
  const baseUrl = 'https://v1.baseball.api-sports.io';
  const endpoint = liveOnly ? '/games?live=all' : `/games?date=${date}`;
  
  console.log(`Calling API-Sports Baseball: ${baseUrl}${endpoint}`);
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      'x-apisports-key': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`API-Sports returned ${response.status}`);
  }

  const data = await response.json();
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
