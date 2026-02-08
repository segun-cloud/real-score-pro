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
    const { leagueId, season } = await req.json();

    if (!APISPORTS_KEY) {
      throw new Error('APISPORTS_KEY not configured');
    }

    const currentSeason = season || new Date().getFullYear();
    console.log(`Fetching top scorers for league: ${leagueId}, season: ${currentSeason}`);

    const url = `https://v3.football.api-sports.io/players/topscorers?league=${leagueId}&season=${currentSeason}`;
    console.log(`Calling API-Sports: ${url}`);

    const response = await fetch(url, {
      headers: { 'x-apisports-key': APISPORTS_KEY },
    });

    const apiData = await response.json();
    console.log('API-Sports top scorers response:', JSON.stringify(apiData).substring(0, 500));

    if (!response.ok) {
      console.error('API-Sports error:', apiData);
      throw new Error('Failed to fetch top scorers from API-Sports');
    }

    const players = apiData.response || [];

    const topScorers = players.slice(0, 20).map((entry: any) => {
      const player = entry.player;
      const stats = entry.statistics?.[0];
      return {
        name: player?.name || 'Unknown',
        team: stats?.team?.name || 'Unknown',
        goals: stats?.goals?.total || 0,
        assists: stats?.goals?.assists || 0,
        appearances: stats?.games?.appearences || 0,
        photo: player?.photo || '',
      };
    });

    console.log(`Successfully fetched ${topScorers.length} top scorers`);

    return new Response(
      JSON.stringify({ topScorers }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-league-top-scorers:', error);
    return new Response(
      JSON.stringify({ error: error.message, topScorers: [] }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
