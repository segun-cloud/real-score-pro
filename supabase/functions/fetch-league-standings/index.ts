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
    console.log(`Fetching standings for league: ${leagueId}, season: ${currentSeason}`);

    const url = `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${currentSeason}`;
    console.log(`Calling API-Sports: ${url}`);

    const response = await fetch(url, {
      headers: { 'x-apisports-key': APISPORTS_KEY },
    });

    const apiData = await response.json();
    console.log('API-Sports standings response:', JSON.stringify(apiData).substring(0, 500));

    if (!response.ok || apiData.errors?.length > 0) {
      console.warn('API-Sports error or no data:', apiData.errors || 'Unknown error');
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
    console.error('Error in fetch-league-standings:', error);
    return new Response(
      JSON.stringify({ error: error.message, standings: [] }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
