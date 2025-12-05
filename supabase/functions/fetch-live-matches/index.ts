import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPORTMONKS_API_KEY = Deno.env.get('SPORTMONKS_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const SPORTMONKS_BASE_URL = 'https://api.sportmonks.com/v3';

// Status mapping from SportMonks to our format
const mapStatus = (stateId: number, stateName: string): string => {
  // SportMonks state IDs: 1=NS (Not Started), 2=LIVE, 3=HT, 4=FT, 5=FT_PEN, etc.
  const liveStates = [2, 3, 21, 22, 23, 24, 25]; // Live, HT, Break, etc.
  const finishedStates = [4, 5, 6, 7, 8, 9, 10, 11]; // FT, AET, PEN, etc.
  
  if (liveStates.includes(stateId)) return 'live';
  if (finishedStates.includes(stateId)) return 'finished';
  if (stateId === 1) return 'scheduled';
  
  // Fallback based on state name
  if (stateName?.toLowerCase().includes('live') || stateName === 'HT') return 'live';
  if (stateName === 'FT' || stateName?.toLowerCase().includes('finish')) return 'finished';
  
  return 'scheduled';
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

// Parse participant scores from SportMonks response
function parseScores(fixture: any) {
  let homeScore = null;
  let awayScore = null;
  
  // Method 1: Get scores from the scores array (newest format)
  if (fixture.scores && Array.isArray(fixture.scores) && fixture.scores.length > 0) {
    // Look for CURRENT or FT scores
    for (const s of fixture.scores) {
      if (s.participant === 'home' && (s.description === 'CURRENT' || s.description === 'FT' || s.description === '2ND_HALF')) {
        homeScore = s.score?.goals ?? null;
      }
      if (s.participant === 'away' && (s.description === 'CURRENT' || s.description === 'FT' || s.description === '2ND_HALF')) {
        awayScore = s.score?.goals ?? null;
      }
    }
  }
  
  // Method 2: Try participants array meta (backup)
  if ((homeScore === null || awayScore === null) && fixture.participants) {
    const homeTeam = fixture.participants.find((p: any) => p.meta?.location === 'home');
    const awayTeam = fixture.participants.find((p: any) => p.meta?.location === 'away');
    
    // Some responses have score directly on participant
    if (homeTeam?.meta?.winner !== undefined) {
      // Try to calculate from aggregate score if available
      const homeAgg = fixture.aggregate?.home_score;
      const awayAgg = fixture.aggregate?.away_score;
      if (homeAgg !== undefined) homeScore = homeAgg;
      if (awayAgg !== undefined) awayScore = awayAgg;
    }
  }
  
  // Method 3: Try result_info parsing for finished matches (last resort)
  if ((homeScore === null || awayScore === null) && fixture.result_info) {
    const resultMatch = fixture.result_info.match(/(\d+)-(\d+)/);
    if (resultMatch) {
      homeScore = parseInt(resultMatch[1]);
      awayScore = parseInt(resultMatch[2]);
    }
  }
  
  return { homeScore, awayScore };
}

// Get team names from participants
function getTeamNames(fixture: any) {
  let homeTeam = 'Home Team';
  let awayTeam = 'Away Team';
  let homeTeamLogo = null;
  let awayTeamLogo = null;
  
  if (fixture.participants && Array.isArray(fixture.participants)) {
    const home = fixture.participants.find((p: any) => p.meta?.location === 'home');
    const away = fixture.participants.find((p: any) => p.meta?.location === 'away');
    
    if (home) {
      homeTeam = home.name || homeTeam;
      homeTeamLogo = home.image_path || null;
    }
    if (away) {
      awayTeam = away.name || awayTeam;
      awayTeamLogo = away.image_path || null;
    }
  }
  
  return { homeTeam, awayTeam, homeTeamLogo, awayTeamLogo };
}

// Get current minute from periods
function getCurrentMinute(fixture: any): number | null {
  if (fixture.periods && Array.isArray(fixture.periods)) {
    const activePeriod = fixture.periods.find((p: any) => p.ticking === true);
    if (activePeriod) {
      return activePeriod.minutes || null;
    }
  }
  
  // Try to get from state info
  if (fixture.state?.short_name === 'HT') {
    return 45;
  }
  
  return fixture.minute || null;
}

async function fetchLiveFootballMatches() {
  console.log('Calling SportMonks API for live football matches');
  
  const url = `${SPORTMONKS_BASE_URL}/football/livescores/inplay?api_token=${SPORTMONKS_API_KEY}&include=participants;scores;periods;events;league.country;round`;
  
  const response = await fetch(url);
  
  await logApiRequest('sportmonks/livescores/inplay', 'football', response.status, false);
  
  console.log(`SportMonks API Response Status: ${response.status}`);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`SportMonks API Error: ${response.status} - ${errorText}`);
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  console.log(`SportMonks Response sample:`, JSON.stringify(data).substring(0, 500));
  console.log(`Number of live fixtures: ${data.data?.length || 0}`);
  
  if (!data.data || data.data.length === 0) {
    console.log('No live matches found');
    return [];
  }
  
  return data.data.map((fixture: any) => {
    const { homeTeam, awayTeam, homeTeamLogo, awayTeamLogo } = getTeamNames(fixture);
    const { homeScore, awayScore } = parseScores(fixture);
    const minute = getCurrentMinute(fixture);
    const status = mapStatus(fixture.state_id, fixture.state?.short_name);
    
    // Get league name
    const leagueName = fixture.league?.name || fixture.league_id?.toString() || 'Unknown League';
    
    return {
      id: `api-football-${fixture.id}`,
      api_match_id: `sportmonks-football-${fixture.id}`,
      sport: 'football',
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      status,
      startTime: fixture.starting_at || new Date().toISOString(),
      league: leagueName,
      homeTeamLogo,
      awayTeamLogo,
      minute,
      round: fixture.round?.name || null,
      events: fixture.events || [],
    };
  });
}

async function fetchScheduledFootballMatches(date: string) {
  console.log(`Calling SportMonks API for scheduled football matches on ${date}`);
  
  const url = `${SPORTMONKS_BASE_URL}/football/fixtures/date/${date}?api_token=${SPORTMONKS_API_KEY}&include=participants;scores;league.country;round`;
  
  const response = await fetch(url);
  
  await logApiRequest('sportmonks/fixtures/date', 'football', response.status, false);
  
  console.log(`SportMonks API Response Status: ${response.status}`);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`SportMonks API Error: ${response.status} - ${errorText}`);
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  console.log(`SportMonks Response sample:`, JSON.stringify(data).substring(0, 500));
  console.log(`Number of fixtures: ${data.data?.length || 0}`);
  
  if (!data.data || data.data.length === 0) {
    console.log('No matches found for date');
    return [];
  }
  
  return data.data.map((fixture: any) => {
    const { homeTeam, awayTeam, homeTeamLogo, awayTeamLogo } = getTeamNames(fixture);
    const { homeScore, awayScore } = parseScores(fixture);
    const status = mapStatus(fixture.state_id, fixture.state?.short_name);
    const leagueName = fixture.league?.name || fixture.league_id?.toString() || 'Unknown League';
    
    return {
      id: `api-football-${fixture.id}`,
      api_match_id: `sportmonks-football-${fixture.id}`,
      sport: 'football',
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      status,
      startTime: fixture.starting_at || new Date().toISOString(),
      league: leagueName,
      homeTeamLogo,
      awayTeamLogo,
      minute: null,
      round: fixture.round?.name || null,
    };
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sport, date, liveOnly } = await req.json();
    
    if (!SPORTMONKS_API_KEY) {
      console.error('SPORTMONKS_API_KEY not configured');
      throw new Error('API key not configured. Please add your SportMonks API key.');
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    console.log(`Fetching ${sport} matches for ${targetDate}, liveOnly: ${liveOnly}`);

    // Check cache first (skip for live matches to get real-time data)
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
        }));
        
        return new Response(
          JSON.stringify({ matches: formattedMatches, cached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch from SportMonks API
    let matches = [];
    
    if (sport === 'football') {
      if (liveOnly) {
        matches = await fetchLiveFootballMatches();
      } else {
        matches = await fetchScheduledFootballMatches(targetDate);
      }
    } else {
      // SportMonks primarily covers football - other sports not yet implemented
      console.log(`Sport ${sport} not yet implemented with SportMonks`);
      matches = [];
    }

    // Save to cache (not for live matches)
    if (matches.length > 0 && !liveOnly) {
      await saveToCache(matches);
    }

    console.log(`Returning ${matches.length} matches from SportMonks API`);

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
