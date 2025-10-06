import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_SPORTS_KEY = Deno.env.get('API_SPORTS_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// API endpoints for different sports
const API_ENDPOINTS = {
  football: 'https://v3.football.api-sports.io/fixtures',
  basketball: 'https://v1.basketball.api-sports.io/games',
  tennis: 'https://v1.tennis.api-sports.io/games',
  baseball: 'https://v1.baseball.api-sports.io/games',
  boxing: 'https://v1.boxing.api-sports.io/fights',
};

// Status mapping from API to our format
const mapStatus = (apiStatus: string): string => {
  const statusMap: Record<string, string> = {
    'NS': 'scheduled',
    'LIVE': 'live',
    '1H': 'live',
    '2H': 'live',
    'HT': 'live',
    'FT': 'finished',
    'AET': 'finished',
    'PEN': 'finished',
    'CANC': 'cancelled',
    'PST': 'postponed',
  };
  return statusMap[apiStatus] || 'scheduled';
};

async function logApiRequest(endpoint: string, sport: string, status: number, cached: boolean) {
  await supabase.from('api_request_log').insert({
    endpoint,
    sport,
    response_status: status,
    cached,
  });
}

async function fetchFromCache(sport: string, date: string) {
  const cacheExpiry = new Date(Date.now() - 60000); // 1 minute cache
  
  const { data } = await supabase
    .from('api_match_cache')
    .select('*')
    .eq('sport', sport)
    .gte('match_date', new Date(date).toISOString())
    .lt('match_date', new Date(new Date(date).getTime() + 86400000).toISOString())
    .gte('last_updated', cacheExpiry.toISOString());
  
  return data;
}

async function saveToCache(matches: any[]) {
  for (const match of matches) {
    await supabase
      .from('api_match_cache')
      .upsert({
        api_match_id: match.api_match_id,
        sport: match.sport,
        league_name: match.league,
        home_team: match.homeTeam,
        away_team: match.awayTeam,
        home_score: match.homeScore,
        away_score: match.awayScore,
        status: match.status,
        match_date: match.startTime,
        minute: match.minute,
        raw_data: match,
        last_updated: new Date().toISOString(),
      }, { onConflict: 'api_match_id' });
  }
}

async function fetchFootballMatches(date: string) {
  const response = await fetch(`${API_ENDPOINTS.football}?date=${date}`, {
    headers: {
      'x-rapidapi-key': API_SPORTS_KEY!,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
  });

  await logApiRequest('fixtures', 'football', response.status, false);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  
  return data.response.map((fixture: any) => ({
    id: `api-football-${fixture.fixture.id}`,
    api_match_id: `football-${fixture.fixture.id}`,
    sport: 'football',
    homeTeam: fixture.teams.home.name,
    awayTeam: fixture.teams.away.name,
    homeScore: fixture.goals.home,
    awayScore: fixture.goals.away,
    status: mapStatus(fixture.fixture.status.short),
    startTime: fixture.fixture.date,
    league: fixture.league.name,
    homeTeamLogo: fixture.teams.home.logo,
    awayTeamLogo: fixture.teams.away.logo,
    minute: fixture.fixture.status.elapsed,
  }));
}

async function fetchBasketballMatches(date: string) {
  const response = await fetch(`${API_ENDPOINTS.basketball}?date=${date}`, {
    headers: {
      'x-rapidapi-key': API_SPORTS_KEY!,
      'x-rapidapi-host': 'v1.basketball.api-sports.io',
    },
  });

  await logApiRequest('games', 'basketball', response.status, false);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  
  return data.response.map((game: any) => ({
    id: `api-basketball-${game.id}`,
    api_match_id: `basketball-${game.id}`,
    sport: 'basketball',
    homeTeam: game.teams.home.name,
    awayTeam: game.teams.away.name,
    homeScore: game.scores.home.total,
    awayScore: game.scores.away.total,
    status: mapStatus(game.status.short),
    startTime: game.date,
    league: game.league.name,
    homeTeamLogo: game.teams.home.logo,
    awayTeamLogo: game.teams.away.logo,
  }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sport, date, liveOnly } = await req.json();
    
    if (!API_SPORTS_KEY) {
      throw new Error('API_SPORTS_KEY not configured');
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    console.log(`Fetching ${sport} matches for ${targetDate}, liveOnly: ${liveOnly}`);

    // Check cache first
    const cachedMatches = await fetchFromCache(sport, targetDate);
    if (cachedMatches && cachedMatches.length > 0) {
      console.log(`Returning ${cachedMatches.length} cached matches`);
      await logApiRequest('cache-hit', sport, 200, true);
      
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
      }));
      
      return new Response(
        JSON.stringify({ matches: formattedMatches, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch from API
    let matches = [];
    
    if (sport === 'football') {
      matches = await fetchFootballMatches(targetDate);
    } else if (sport === 'basketball') {
      matches = await fetchBasketballMatches(targetDate);
    } else {
      // For other sports, return empty array for now
      console.log(`Sport ${sport} not yet implemented`);
      matches = [];
    }

    // Filter live matches if requested
    if (liveOnly) {
      matches = matches.filter((match: any) => match.status === 'live');
    }

    // Save to cache
    if (matches.length > 0) {
      await saveToCache(matches);
    }

    console.log(`Returning ${matches.length} matches from API`);

    return new Response(
      JSON.stringify({ matches, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-live-matches:', error);
    return new Response(
      JSON.stringify({ error: error.message, matches: [] }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
