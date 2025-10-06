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
    const { leagueId, season, last = 10 } = await req.json();
    const apiKey = Deno.env.get('APISPORTS_KEY');

    if (!apiKey) {
      throw new Error('APISPORTS_KEY not configured');
    }

    console.log(`Fetching fixtures for league: ${leagueId}, season: ${season || 'current'}, last: ${last}`);

    // Fetch recent and upcoming fixtures
    const url = `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season || new Date().getFullYear()}&last=${last}`;
    
    const response = await fetch(url, {
      headers: {
        'x-apisports-key': apiKey,
      },
    });

    const apiData = await response.json();

    if (!response.ok || apiData.errors?.length > 0) {
      console.error('API-Sports error:', apiData.errors);
      throw new Error('Failed to fetch fixtures from API-Sports');
    }

    const fixtures = apiData.response?.map((fixture: any) => ({
      id: `apisports-football-${fixture.fixture.id}`,
      homeTeam: fixture.teams.home.name,
      awayTeam: fixture.teams.away.name,
      homeScore: fixture.goals.home,
      awayScore: fixture.goals.away,
      status: mapStatus(fixture.fixture.status.short),
      startTime: fixture.fixture.date,
      league: fixture.league.name,
      homeTeamLogo: fixture.teams.home.logo,
      awayTeamLogo: fixture.teams.away.logo,
      minute: fixture.fixture.status.elapsed,
    })) || [];

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

function mapStatus(apiStatus: string): 'scheduled' | 'live' | 'finished' {
  const liveStatuses = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'];
  const finishedStatuses = ['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'AWD', 'WO'];
  
  if (liveStatuses.includes(apiStatus)) return 'live';
  if (finishedStatuses.includes(apiStatus)) return 'finished';
  return 'scheduled';
}