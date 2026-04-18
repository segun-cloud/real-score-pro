import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPPORTED_SPORTS = ['football', 'basketball'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // FIX: verify Supabase JWT — without this anyone can call this function
    // and drain your AllSportsAPI quota
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

    // FIX: wrap req.json() — malformed body would otherwise produce a cryptic 500
    let body: { sport?: string; homeTeamId?: string; awayTeamId?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { sport, homeTeamId, awayTeamId } = body;

    // FIX: validate required fields before making any API calls
    if (!sport || !homeTeamId || !awayTeamId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: sport, homeTeamId, awayTeamId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!SUPPORTED_SPORTS.includes(sport)) {
      return new Response(
        JSON.stringify({ highlights: [], message: `Highlights not available for sport: ${sport}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('API_SPORTS_KEY');
    if (!apiKey) {
      throw new Error('API_SPORTS_KEY not configured');
    }

    console.log(`Fetching highlights for ${sport}: ${homeTeamId} vs ${awayTeamId}`);

    // FIX: deduplicated — single shared function handles both sports
    // previously fetchFootballHighlights and fetchBasketballHighlights were identical
    const highlights = await fetchHighlights(apiKey, sport, homeTeamId, awayTeamId);

    console.log(`Found ${highlights.length} video highlights`);

    return new Response(
      JSON.stringify({ highlights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // FIX: error typed as unknown in Deno — safely extract message
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error fetching highlights:', message);
    return new Response(
      JSON.stringify({ error: message, highlights: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// FIX: single shared function replaces the two identical sport-specific functions.
// Only difference was the sport path in the URL — now parameterised.
async function fetchHighlights(
  apiKey: string,
  sport: string,
  homeTeamId: string,
  awayTeamId: string
) {
  // NOTE: AllSportsAPI requires the key as a query param — it does not support
  // header-based auth. The key will appear in server logs. Consider proxying
  // through a backend that strips it before logging if this is a concern.
  const url = new URL(`https://apiv2.allsportsapi.com/${sport}/`);
  url.searchParams.set('met', 'H2H');
  url.searchParams.set('APIkey', apiKey);
  url.searchParams.set('firstTeamId', homeTeamId);
  url.searchParams.set('secondTeamId', awayTeamId);

  console.log(`Calling AllSportsAPI H2H endpoint for ${sport}`);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`AllSportsAPI returned ${response.status}`);
  }

  const data = await response.json();

  if (!data.result || !data.result.H2H) {
    return [];
  }

  return data.result.H2H
    .filter((match: any) => match.videos && match.videos.length > 0)
    .flatMap((match: any) =>
      match.videos.map((video: any) => ({
        title: `${match.event_home_team} vs ${match.event_away_team} - ${match.league_name}`,
        videoUrl: video.video,
        thumbnail: video.thumbnail || '',
        date: match.event_date,
        league: match.league_name,
        homeTeam: match.event_home_team,
        awayTeam: match.event_away_team,
      }))
    );
}
