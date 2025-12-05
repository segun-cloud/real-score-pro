import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPORTMONKS_API_KEY = Deno.env.get('SPORTMONKS_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leagueId, season } = await req.json();

    if (!SPORTMONKS_API_KEY) {
      throw new Error('SPORTMONKS_API_KEY not configured');
    }

    console.log(`Fetching standings for league: ${leagueId}, season: ${season || 'current'}`);

    // Use the correct SportMonks endpoint - standings by league ID
    const url = `https://api.sportmonks.com/v3/football/standings/live/leagues/${leagueId}?api_token=${SPORTMONKS_API_KEY}&include=participant`;
    
    console.log(`Calling SportMonks URL: ${url.replace(SPORTMONKS_API_KEY, 'HIDDEN')}`);
    
    const response = await fetch(url);
    const apiData = await response.json();

    console.log('SportMonks standings response:', JSON.stringify(apiData).substring(0, 500));

    if (!response.ok) {
      console.error('SportMonks error:', apiData);
      throw new Error('Failed to fetch standings from SportMonks');
    }

    // Transform SportMonks data to our format
    const standings = (apiData.data || []).map((entry: any) => ({
      position: entry.position,
      team_name: entry.participant?.name || 'Unknown',
      team_logo: entry.participant?.image_path || '',
      team_id: entry.participant_id,
      points: entry.points || 0,
      played: entry.details?.find((d: any) => d.type_id === 129)?.value || 0,
      won: entry.details?.find((d: any) => d.type_id === 130)?.value || 0,
      drawn: entry.details?.find((d: any) => d.type_id === 131)?.value || 0,
      lost: entry.details?.find((d: any) => d.type_id === 132)?.value || 0,
      goals_for: entry.details?.find((d: any) => d.type_id === 133)?.value || 0,
      goals_against: entry.details?.find((d: any) => d.type_id === 134)?.value || 0,
      goal_difference: entry.details?.find((d: any) => d.type_id === 179)?.value || 
        ((entry.details?.find((d: any) => d.type_id === 133)?.value || 0) - 
         (entry.details?.find((d: any) => d.type_id === 134)?.value || 0)),
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
