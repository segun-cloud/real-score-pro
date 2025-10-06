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

    console.log(`Fetching standings for league: ${leagueId}, season: ${season || 'current'}`);

    // Fetch standings from API-Sports
    const url = `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${season || new Date().getFullYear()}`;
    
    const response = await fetch(url, {
      headers: {
        'x-apisports-key': apiKey,
      },
    });

    const apiData = await response.json();

    if (!response.ok || apiData.errors?.length > 0) {
      console.error('API-Sports error:', apiData.errors);
      throw new Error('Failed to fetch standings from API-Sports');
    }

    const standings = apiData.response[0]?.league?.standings[0] || [];

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