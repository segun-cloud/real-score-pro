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
    const { leagueId, season, last = 10 } = await req.json();

    if (!SPORTMONKS_API_KEY) {
      throw new Error('SPORTMONKS_API_KEY not configured');
    }

    console.log(`Fetching fixtures for league: ${leagueId}, season: ${season || 'current'}, last: ${last}`);

    // Get date range for fixtures (last 30 days to next 30 days)
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30);
    
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // Fetch fixtures from SportMonks by league
    const url = `https://api.sportmonks.com/v3/football/fixtures/between/${startStr}/${endStr}?api_token=${SPORTMONKS_API_KEY}&filters=fixtureLeagues:${leagueId}&include=participants;scores;league&per_page=${last * 2}`;
    
    console.log(`Calling SportMonks URL: ${url.replace(SPORTMONKS_API_KEY, 'HIDDEN')}`);
    
    const response = await fetch(url);
    const apiData = await response.json();

    console.log('SportMonks fixtures response:', JSON.stringify(apiData).substring(0, 500));

    if (!response.ok) {
      console.error('SportMonks error:', apiData);
      throw new Error('Failed to fetch fixtures from SportMonks');
    }

    const fixtures = (apiData.data || []).map((fixture: any) => {
      const homeTeam = fixture.participants?.find((p: any) => p.meta?.location === 'home');
      const awayTeam = fixture.participants?.find((p: any) => p.meta?.location === 'away');
      
      // Get scores from scores array
      const scores = fixture.scores || [];
      const homeScore = scores.find((s: any) => s.participant_id === homeTeam?.id && s.description === 'CURRENT')?.score?.goals ?? null;
      const awayScore = scores.find((s: any) => s.participant_id === awayTeam?.id && s.description === 'CURRENT')?.score?.goals ?? null;

      return {
        id: `sportmonks-football-${fixture.id}`,
        homeTeam: homeTeam?.name || 'Unknown',
        awayTeam: awayTeam?.name || 'Unknown',
        homeScore,
        awayScore,
        status: mapStatus(fixture.state_id),
        startTime: fixture.starting_at,
        league: fixture.league?.name || 'Unknown League',
        homeTeamLogo: homeTeam?.image_path || '',
        awayTeamLogo: awayTeam?.image_path || '',
        minute: fixture.minute || null,
      };
    });

    console.log(`Successfully fetched ${fixtures.length} fixtures`);

    return new Response(
      JSON.stringify({ fixtures }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-league-fixtures:', error);
    return new Response(
      JSON.stringify({ error: error.message, fixtures: [] }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function mapStatus(stateId: number): 'scheduled' | 'live' | 'finished' {
  // SportMonks state IDs
  // 1 = Not Started, 2 = Inplay, 3 = Finished, 4 = Extra Time, 5 = Penalties
  // 6 = Break, 7 = HT, 11 = Cancelled, 12 = Postponed, etc.
  const liveStates = [2, 4, 5, 6, 7]; // Inplay, Extra Time, Penalties, Break, HT
  const finishedStates = [3, 11, 12, 13, 14, 15, 16, 17, 21, 22]; // Finished, Cancelled, etc.
  
  if (liveStates.includes(stateId)) return 'live';
  if (finishedStates.includes(stateId)) return 'finished';
  return 'scheduled';
}
