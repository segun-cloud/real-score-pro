import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLSPORTS_API_KEY = Deno.env.get('API_SPORTS_KEY'); // Keeping same env var name for compatibility
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// AllSportsAPI base URL
const ALLSPORTS_BASE_URL = 'https://apiv2.allsportsapi.com';

// Status mapping from AllSportsAPI to our format
const mapStatus = (apiStatus: string): string => {
  const statusMap: Record<string, string> = {
    '': 'scheduled',
    'Finished': 'finished',
    'After Pen.': 'finished',
    'After ET': 'finished',
    'Postponed': 'postponed',
    'Cancelled': 'cancelled',
    'Halftime': 'live',
    'Playing': 'live',
  };
  return statusMap[apiStatus] || (apiStatus ? 'live' : 'scheduled');
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

async function fetchFootballMatches(date: string, liveOnly: boolean = false) {
  const method = liveOnly ? 'Livescore' : 'Fixtures';
  console.log(`Calling AllSportsAPI Football ${method} for date: ${date}`);
  
  let url = `${ALLSPORTS_BASE_URL}/football/?met=${method}&APIkey=${ALLSPORTS_API_KEY}`;
  if (!liveOnly) {
    url += `&from=${date}&to=${date}`;
  }
  
  const response = await fetch(url);

  await logApiRequest('football/fixtures', 'football', response.status, false);

  console.log(`API Response Status: ${response.status}`);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API Error: ${response.status} - ${errorText}`);
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`API Response sample:`, JSON.stringify(data).substring(0, 500));
  console.log(`Number of fixtures returned: ${data.result?.length || 0}`);
  
  if (!data.result || data.result.length === 0) {
    console.log('No matches found in API response');
    return [];
  }
  
  return data.result.map((match: any) => {
    // Parse scores from event_final_result like "2 - 1" or event_ft_result
    const finalResult = match.event_final_result || match.event_ft_result || '';
    const scores = finalResult.split(' - ');
    const homeScore = scores[0] ? parseInt(scores[0].trim()) : null;
    const awayScore = scores[1] ? parseInt(scores[1].trim()) : null;
    
    return {
      id: `api-football-${match.event_key}`,
      api_match_id: `football-${match.event_key}`,
      sport: 'football',
      homeTeam: match.event_home_team,
      awayTeam: match.event_away_team,
      homeScore: homeScore,
      awayScore: awayScore,
      status: mapStatus(match.event_status),
      startTime: `${match.event_date} ${match.event_time}`,
      league: match.league_name,
      homeTeamLogo: match.home_team_logo,
      awayTeamLogo: match.away_team_logo,
      minute: match.event_status.includes("'") ? parseInt(match.event_status.replace("'", '')) : null,
    };
  });
}

async function fetchBasketballMatches(date: string, liveOnly: boolean = false) {
  const method = liveOnly ? 'Livescore' : 'Fixtures';
  console.log(`Calling AllSportsAPI Basketball ${method} for date: ${date}`);
  
  let url = `${ALLSPORTS_BASE_URL}/basketball/?met=${method}&APIkey=${ALLSPORTS_API_KEY}`;
  if (!liveOnly) {
    url += `&from=${date}&to=${date}`;
  }
  
  const response = await fetch(url);

  await logApiRequest('basketball/fixtures', 'basketball', response.status, false);

  console.log(`API Response Status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API Error: ${response.status} - ${errorText}`);
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`API Response sample:`, JSON.stringify(data).substring(0, 500));
  console.log(`Number of games returned: ${data.result?.length || 0}`);
  
  if (!data.result || data.result.length === 0) {
    console.log('No games found in API response');
    return [];
  }
  
  return data.result.map((match: any) => {
    // Parse scores from event_final_result
    const finalResult = match.event_final_result || match.event_ft_result || '';
    const scores = finalResult.split(' - ');
    const homeScore = scores[0] ? parseInt(scores[0].trim()) : null;
    const awayScore = scores[1] ? parseInt(scores[1].trim()) : null;
    
    return {
      id: `api-basketball-${match.event_key}`,
      api_match_id: `basketball-${match.event_key}`,
      sport: 'basketball',
      homeTeam: match.event_home_team,
      awayTeam: match.event_away_team,
      homeScore: homeScore,
      awayScore: awayScore,
      status: mapStatus(match.event_status),
      startTime: `${match.event_date} ${match.event_time}`,
      league: match.league_name,
      homeTeamLogo: match.home_team_logo,
      awayTeamLogo: match.away_team_logo,
    };
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sport, date, liveOnly } = await req.json();
    
    if (!ALLSPORTS_API_KEY) {
      console.error('ALLSPORTS_API_KEY not configured');
      throw new Error('API key not configured. Please add your AllSportsAPI key.');
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
      matches = await fetchFootballMatches(targetDate, liveOnly);
    } else if (sport === 'basketball') {
      matches = await fetchBasketballMatches(targetDate, liveOnly);
    } else {
      // For other sports, return empty array for now
      console.log(`Sport ${sport} not yet implemented`);
      matches = [];
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
