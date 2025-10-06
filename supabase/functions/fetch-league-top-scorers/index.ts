import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leagueId, season } = await req.json();
    const apiKey = Deno.env.get('APISPORTS_KEY');

    if (!apiKey) {
      throw new Error('APISPORTS_KEY not configured');
    }

    console.log(`Fetching top scorers for league: ${leagueId}, season: ${season || 'current'}`);

    // Fetch top scorers from API-Sports
    const url = `https://v3.football.api-sports.io/players/topscorers?league=${leagueId}&season=${season || new Date().getFullYear()}`;
    
    const response = await fetch(url, {
      headers: {
        'x-apisports-key': apiKey,
      },
    });

    const apiData = await response.json();

    if (!response.ok || apiData.errors?.length > 0) {
      console.error('API-Sports error:', apiData.errors);
      throw new Error('Failed to fetch top scorers from API-Sports');
    }

    const topScorers = apiData.response?.slice(0, 20).map((player: any) => ({
      name: player.player.name,
      team: player.statistics[0].team.name,
      goals: player.statistics[0].goals.total,
      assists: player.statistics[0].goals.assists,
      appearances: player.statistics[0].games.appearences,
      photo: player.player.photo,
    })) || [];

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