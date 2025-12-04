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
    const { leagueId, seasonId } = await req.json();

    if (!SPORTMONKS_API_KEY) {
      throw new Error('SPORTMONKS_API_KEY not configured');
    }

    console.log(`Fetching top scorers for league: ${leagueId}, seasonId: ${seasonId || 'current'}`);

    // First, get the current season for this league if not provided
    let currentSeasonId = seasonId;
    
    if (!currentSeasonId) {
      const leagueUrl = `https://api.sportmonks.com/v3/football/leagues/${leagueId}?api_token=${SPORTMONKS_API_KEY}&include=currentSeason`;
      const leagueResponse = await fetch(leagueUrl);
      const leagueData = await leagueResponse.json();
      
      console.log('League data:', JSON.stringify(leagueData).substring(0, 300));
      
      currentSeasonId = leagueData.data?.current_season_id;
      
      if (!currentSeasonId) {
        console.log('No current season found for league');
        return new Response(
          JSON.stringify({ topScorers: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch top scorers from SportMonks
    const url = `https://api.sportmonks.com/v3/football/topscorers/seasons/${currentSeasonId}?api_token=${SPORTMONKS_API_KEY}&include=player;participant`;
    
    console.log(`Calling SportMonks URL: ${url.replace(SPORTMONKS_API_KEY, 'HIDDEN')}`);
    
    const response = await fetch(url);
    const apiData = await response.json();

    console.log('SportMonks top scorers response:', JSON.stringify(apiData).substring(0, 500));

    if (!response.ok) {
      console.error('SportMonks error:', apiData);
      throw new Error('Failed to fetch top scorers from SportMonks');
    }

    const topScorers = (apiData.data || []).slice(0, 20).map((entry: any) => ({
      name: entry.player?.display_name || entry.player?.name || 'Unknown',
      team: entry.participant?.name || 'Unknown',
      goals: entry.total || 0,
      assists: entry.assists || 0,
      appearances: entry.appearances || 0,
      photo: entry.player?.image_path || '',
    }));

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
