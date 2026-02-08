const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APISPORTS_KEY = Deno.env.get('APISPORTS_KEY');

function mapStatus(apiStatus: string): 'scheduled' | 'live' | 'finished' {
  const liveStatuses = ['1H', '2H', 'HT', 'ET', 'P', 'LIVE', 'BT'];
  const finishedStatuses = ['FT', 'AET', 'PEN', 'FT_PEN', 'WO', 'AWD', 'CANC', 'ABD'];
  if (liveStatuses.includes(apiStatus)) return 'live';
  if (finishedStatuses.includes(apiStatus)) return 'finished';
  return 'scheduled';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leagueId, season, last = 10 } = await req.json();

    if (!APISPORTS_KEY) {
      throw new Error('APISPORTS_KEY not configured');
    }

    const currentSeason = season || new Date().getFullYear();
    console.log(`Fetching fixtures for league: ${leagueId}, season: ${currentSeason}, last: ${last}`);

    // Fetch last N fixtures for this league
    const url = `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${currentSeason}&last=${last * 2}`;
    console.log(`Calling API-Sports: ${url}`);

    const response = await fetch(url, {
      headers: { 'x-apisports-key': APISPORTS_KEY },
    });

    const apiData = await response.json();
    console.log('API-Sports fixtures response:', JSON.stringify(apiData).substring(0, 500));

    if (!response.ok) {
      console.error('API-Sports error:', apiData);
      throw new Error('Failed to fetch fixtures from API-Sports');
    }

    const rawFixtures = apiData.response || [];
    
    const fixtures = rawFixtures.map((f: any) => ({
      id: `apisports-football-${f.fixture.id}`,
      homeTeam: f.teams.home.name,
      awayTeam: f.teams.away.name,
      homeScore: f.goals.home,
      awayScore: f.goals.away,
      status: mapStatus(f.fixture.status.short),
      startTime: f.fixture.date,
      league: f.league.name,
      homeTeamLogo: f.teams.home.logo,
      awayTeamLogo: f.teams.away.logo,
      minute: f.fixture.status.elapsed,
    }));

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
