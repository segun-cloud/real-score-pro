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

async function logApiRequest(endpoint: string, sport: string, status: number, cached: boolean) {
  await supabase.from('api_request_log').insert({
    endpoint,
    sport,
    response_status: status,
    cached,
  });
}

async function fetchFromCache(sport: string, date: string) {
  const cacheExpiry = new Date(Date.now() - 60000).toISOString(); // 1 minute cache
  const { data } = await supabase
    .from('api_match_cache')
    .select('*')
    .eq('sport', sport)
    .gte('match_date', new Date(date).toISOString())
    .lt('match_date', new Date(new Date(date).getTime() + 86400000).toISOString())
    .gte('last_updated', cacheExpiry);
  return data;
}

async function fetchLiveFootballMatches() {
  console.log('Calling API-Sports for live football matches');
  const url = 'https://v3.football.api-sports.io/fixtures?live=all';
  
  const response = await fetch(url, {
    headers: { 'x-apisports-key': APISPORTS_KEY! },
  });
  
  await logApiRequest('apisports/fixtures/live', 'football', response.status, false);
  console.log(`API-Sports Response Status: ${response.status}`);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API-Sports Error: ${response.status} - ${errorText}`);
    throw new Error(`API error: ${response.status}`);
  }
  
  const data = await response.json();
  const fixtures = data.response || [];
  console.log(`Found ${fixtures.length} live football matches`);
  
  return fixtures.map((f: any) => ({
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
  }));
}

async function fetchScheduledFootballMatches(date: string) {
  console.log(`Calling API-Sports for football matches on ${date}`);
  const url = `https://v3.football.api-sports.io/fixtures?date=${date}`;
  
  const response = await fetch(url, {
    headers: { 'x-apisports-key': APISPORTS_KEY! },
  });
  
  await logApiRequest('apisports/fixtures/date', 'football', response.status, false);
  console.log(`API-Sports Response Status: ${response.status}`);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API-Sports Error: ${response.status} - ${errorText}`);
    throw new Error(`API error: ${response.status}`);
  }
  
  const data = await response.json();
  const fixtures = data.response || [];
  console.log(`Found ${fixtures.length} football matches for ${date}`);
  
  // Limit to top leagues to avoid timeout (top 200 matches)
  const limitedFixtures = fixtures.slice(0, 200);
  
  return limitedFixtures.map((f: any) => ({
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
  }));
}

async function saveToCache(matches: any[]) {
  // Batch upsert instead of one-by-one
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
    raw_data: m,
    last_updated: new Date().toISOString(),
  }));

  // Batch in chunks of 50
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
    const { sport, date, liveOnly } = await req.json();
    
    if (!APISPORTS_KEY) {
      console.error('APISPORTS_KEY not configured');
      throw new Error('API key not configured. Please add your API-Sports key.');
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    console.log(`Fetching ${sport} matches for ${targetDate}, liveOnly: ${liveOnly}`);

    // Check cache first (skip for live matches)
    if (!liveOnly) {
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
          homeTeamLogo: (match.raw_data as any)?.homeTeamLogo,
          awayTeamLogo: (match.raw_data as any)?.awayTeamLogo,
        }));
        
        return new Response(
          JSON.stringify({ matches: formattedMatches, cached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    let matches: any[] = [];
    
    if (sport === 'football') {
      if (liveOnly) {
        matches = await fetchLiveFootballMatches();
      } else {
        matches = await fetchScheduledFootballMatches(targetDate);
      }
    } else {
      // Other sports not yet covered - return empty
      console.log(`Sport ${sport} - returning empty for now`);
      matches = [];
    }

    // Save to cache (not for live)
    if (matches.length > 0 && !liveOnly) {
      await saveToCache(matches);
    }

    console.log(`Returning ${matches.length} matches from API-Sports`);

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
