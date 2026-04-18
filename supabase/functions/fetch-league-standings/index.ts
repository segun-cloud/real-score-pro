import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APISPORTS_KEY = Deno.env.get('APISPORTS_KEY');

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
    let body: { leagueId?: string; season?: number };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { leagueId, season } = body;

    // FIX: validate required field — without this API fires with league=undefined
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
    console.log(`Fetching standings for league: ${leagueId}, season: ${currentSeason}`);

    // FIX: build URL with searchParams — key passed in header not query string
    const url = new URL('https://v3.football.api-sports.io/standings');
    url.searchParams.set('league', leagueId);
    url.searchParams.set('season', String(currentSeason));

    // FIX: log URL without API key — key is in the header, not the URL
    console.log(`Calling API-Sports: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: { 'x-apisports-key': APISPORTS_KEY },
    });

    // FIX: check response.ok BEFORE parsing JSON — non-JSON error bodies
    // (e.g. 429 rate limit HTML) would throw before reaching the error check
    if (!response.ok) {
      console.warn('API-Sports HTTP error:', response.status);
      return new Response(
        JSON.stringify({ standings: [], message: 'Standings not available for this league' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiData = await response.json();
    console.log('API-Sports standings response:', JSON.stringify(apiData).substring(0, 500));

    // FIX: API-Sports returns errors as an object {}, not an array — length check
    // on an object always returns undefined. Use Object.keys() instead.
    const hasErrors = apiData.errors && Object.keys(apiData.errors).length > 0;
    if (hasErrors) {
      console.warn('API-Sports returned errors:', apiData.errors);
      return new Response(
        JSON.stringify({ standings: [], message: 'Standings not available for this league' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // API-Sports returns standings in response[0].league.standings[0]
    const leagueData = apiData.response?.[0]?.league;
    const standingsArr = leagueData?.standings?.[0] || [];

    const standings = standingsArr.map((entry: any) => ({
      position: entry.rank,
      team_name: entry.team?.name || 'Unknown',
      team_logo: entry.team?.logo || '',
      team_id: entry.team?.id,
      points: entry.points || 0,
      played: entry.all?.played || 0,
      won: entry.all?.win || 0,
      drawn: entry.all?.draw || 0,
      lost: entry.all?.lose || 0,
      goals_for: entry.all?.goals?.for || 0,
      goals_against: entry.all?.goals?.against || 0,
      goal_difference: entry.goalsDiff || 0,
    }));

    console.log(`Successfully fetched ${standings.length} standings entries`);

    return new Response(
      JSON.stringify({ standings }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // FIX: safely extract message from unknown error type
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error in fetch-league-standings:', message);
    return new Response(
      JSON.stringify({ error: message, standings: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
