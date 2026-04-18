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
    // FIX: verify Supabase JWT
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

    // FIX: wrap req.json()
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

    // FIX: validate required field
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
    console.log(`Fetching top scorers for league: ${leagueId}, season: ${currentSeason}`);

    // FIX: build URL with searchParams — key in header not query string
    const url = new URL('https://v3.football.api-sports.io/players/topscorers');
    url.searchParams.set('league', leagueId);
    url.searchParams.set('season', String(currentSeason));

    // FIX: log URL without API key
    console.log(`Calling API-Sports: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: { 'x-apisports-key': APISPORTS_KEY },
    });

    // FIX: check response.ok BEFORE parsing JSON
    if (!response.ok) {
      console.error('API-Sports HTTP error:', response.status);
      throw new Error(`API-Sports returned ${response.status}`);
    }

    const apiData = await response.json();
    console.log('API-Sports top scorers response:', JSON.stringify(apiData).substring(0, 500));

    const players = apiData.response || [];

    const topScorers = players.slice(0, 20).map((entry: any) => {
      const player = entry.player;
      const stats = entry.statistics?.[0];
      return {
        name: player?.name || 'Unknown',
        team: stats?.team?.name || 'Unknown',
        goals: stats?.goals?.total || 0,
        assists: stats?.goals?.assists || 0,
        // FIX: typo — was 'appearences', correct API-Sports field is 'appearances'
        // the typo caused this to always return 0 silently
        appearances: stats?.games?.appearances || 0,
        photo: player?.photo || '',
      };
    });

    console.log(`Successfully fetched ${topScorers.length} top scorers`);

    return new Response(
      JSON.stringify({ topScorers }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // FIX: safely extract message from unknown error type
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error in fetch-league-top-scorers:', message);
    return new Response(
      JSON.stringify({ error: message, topScorers: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
