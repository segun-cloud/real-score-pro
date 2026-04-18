import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // FIX: verify Supabase JWT — prevents unauthorized API quota consumption
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

    const apiKey = Deno.env.get('APISPORTS_KEY');
    if (!apiKey) {
      throw new Error('APISPORTS_KEY not configured');
    }

    // FIX: wrap req.json() — malformed body returns clean 400
    let body: { matchId?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { matchId } = body;

    if (!matchId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: matchId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching match details for: ${matchId}`);

    // FIX: fragile split — matchId format is "apisports-football-12345"
    // splitting on '-' gives ['apisports', 'football', '12345'] which works for
    // simple IDs, but slice(2).join('-') handles fixture IDs that contain dashes
    const parts = matchId.split('-');
    const sport = parts[1];
    const fixtureId = parts.slice(2).join('-');

    if (!sport || !fixtureId) {
      return new Response(
        JSON.stringify({ error: 'Invalid matchId format. Expected: apisports-{sport}-{id}' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let matchDetails: any = {};

    if (sport === 'football') {
      matchDetails = await fetchFootballDetails(apiKey, fixtureId);
    } else if (sport === 'basketball') {
      matchDetails = await fetchBasketballDetails(apiKey, fixtureId);
    } else if (sport === 'tennis') {
      matchDetails = await fetchTennisDetails(apiKey, fixtureId);
    } else if (sport === 'baseball') {
      matchDetails = await fetchBaseballDetails(apiKey, fixtureId);
    } else {
      return new Response(
        JSON.stringify({ error: `Unsupported sport: ${sport}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully fetched ${sport} match details`);

    return new Response(JSON.stringify(matchDetails), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // FIX: safely extract message from unknown error type
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error fetching match details:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function safeFetch(url: string, headers: Record<string, string>): Promise<any> {
  const response = await fetch(url, { headers });
  // FIX: check response.ok before parsing JSON on every fetch call
  if (!response.ok) {
    console.warn(`API call failed [${response.status}]: ${url}`);
    return { response: [] };
  }
  return response.json();
}

// FIX: findStat now strips '%' before parsing — possession values like "45%"
// were causing parseInt to return NaN silently, always falling back to 0
function findStat(stats: any[], type: string): number {
  const stat = stats.find((s: any) => s.type === type);
  if (!stat || stat.value === null) return 0;
  const cleaned = String(stat.value).replace('%', '');
  return parseFloat(cleaned) || 0;
}

// FIX: red card now correctly mapped — original mapped both Card types to 'yellow_card'
function mapEventType(apiType: string, detail: string): 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'penalty' {
  if (apiType === 'subst') return 'substitution';
  if (apiType === 'Goal') return detail === 'Penalty' ? 'penalty' : 'goal';
  if (apiType === 'Card') {
    if (detail === 'Red Card' || detail === 'Second Yellow card') return 'red_card';
    return 'yellow_card';
  }
  return 'goal';
}

// ── Football ──────────────────────────────────────────────────────────────────

async function fetchFootballDetails(apiKey: string, fixtureId: string) {
  const baseUrl = 'https://v3.football.api-sports.io';
  const headers = { 'x-apisports-key': apiKey };

  // FIX: run all 3 required fetches in parallel instead of sequentially
  // Previously 4 sequential awaits added unnecessary latency
  const [eventsData, lineupsData, statsData] = await Promise.all([
    safeFetch(`${baseUrl}/fixtures/events?fixture=${fixtureId}`, headers),
    safeFetch(`${baseUrl}/fixtures/lineups?fixture=${fixtureId}`, headers),
    safeFetch(`${baseUrl}/fixtures/statistics?fixture=${fixtureId}`, headers),
  ]);

  // Odds fetched separately since failure is acceptable
  let oddsData: any = null;
  try {
    oddsData = await safeFetch(`${baseUrl}/odds?fixture=${fixtureId}`, headers);
  } catch {
    console.log('Odds not available for this match');
  }

  // Determine home team ID for correct team assignment on events
  const homeTeamId = lineupsData.response?.[0]?.team?.id;

  // FIX: pass detail to mapEventType so red/yellow cards are distinguished
  // FIX: team resolved from homeTeamId — event.fixture.teams doesn't exist on event objects
  const events = (eventsData.response || []).map((event: any) => ({
    minute: event.time.elapsed,
    type: mapEventType(event.type, event.detail),
    player: event.player?.name,
    assistedBy: event.assist?.name || undefined,
    team: homeTeamId && event.team?.id === homeTeamId ? 'home' : 'away',
    description: event.detail,
  }));

  // Map lineups
  let lineups = null;
  if (lineupsData.response?.length >= 2) {
    const mapPlayer = (p: any) => ({
      name: p.player.name,
      position: p.player.pos,
      number: p.player.number,
      isSubstitute: false,
    });
    const mapSub = (p: any) => ({
      name: p.player.name,
      position: p.player.pos,
      number: p.player.number,
      isSubstitute: true,
    });
    lineups = {
      home: [
        ...lineupsData.response[0].startXI.map(mapPlayer),
        ...(lineupsData.response[0].substitutes || []).map(mapSub),
      ],
      away: [
        ...lineupsData.response[1].startXI.map(mapPlayer),
        ...(lineupsData.response[1].substitutes || []).map(mapSub),
      ],
      homeFormation: lineupsData.response[0].formation,
      awayFormation: lineupsData.response[1].formation,
    };
  }

  // Map statistics
  const statistics: any = {};
  if (statsData.response?.length >= 2) {
    const homeStats = statsData.response[0].statistics;
    const awayStats = statsData.response[1].statistics;

    statistics.possession = {
      home: findStat(homeStats, 'Ball Possession'),
      away: findStat(awayStats, 'Ball Possession'),
    };
    statistics.shots = {
      home: findStat(homeStats, 'Total Shots'),
      away: findStat(awayStats, 'Total Shots'),
    };
    statistics.shotsOnTarget = {
      home: findStat(homeStats, 'Shots on Goal'),
      away: findStat(awayStats, 'Shots on Goal'),
    };
    statistics.corners = {
      home: findStat(homeStats, 'Corner Kicks'),
      away: findStat(awayStats, 'Corner Kicks'),
    };
    statistics.fouls = {
      home: findStat(homeStats, 'Fouls'),
      away: findStat(awayStats, 'Fouls'),
    };
    statistics.passes = {
      home: findStat(homeStats, 'Total passes'),
      away: findStat(awayStats, 'Total passes'),
    };
    statistics.yellowCards = {
      home: findStat(homeStats, 'Yellow Cards'),
      away: findStat(awayStats, 'Yellow Cards'),
    };
    statistics.redCards = {
      home: findStat(homeStats, 'Red Cards'),
      away: findStat(awayStats, 'Red Cards'),
    };
  }

  // Map odds
  let odds = null;
  if (oddsData?.response?.length > 0) {
    const bookmaker = oddsData.response[0].bookmakers?.[0];
    const matchWinner = bookmaker?.bets?.find((b: any) => b.name === 'Match Winner');
    if (matchWinner) {
      odds = {
        homeWin: parseFloat(matchWinner.values[0]?.odd || '0'),
        draw: parseFloat(matchWinner.values[1]?.odd || '0'),
        awayWin: parseFloat(matchWinner.values[2]?.odd || '0'),
        updated: bookmaker.last_update,
      };
    }
  }

  return { events, lineups, statistics, odds };
}

// ── Basketball ────────────────────────────────────────────────────────────────

async function fetchBasketballDetails(apiKey: string, gameId: string) {
  const baseUrl = 'https://v1.basketball.api-sports.io';
  const headers = { 'x-apisports-key': apiKey };

  // FIX: parallel fetches
  const [statsData, eventsData] = await Promise.all([
    safeFetch(`${baseUrl}/games/statistics?id=${gameId}`, headers),
    safeFetch(`${baseUrl}/games/events?id=${gameId}`, headers),
  ]);

  const events = (eventsData.response || []).map((event: any) => ({
    minute: parseInt(event.time),
    type: 'goal',
    player: event.player,
    team: event.team,
    description: event.detail,
  }));

  const statistics: any = {};
  if (statsData.response?.length >= 2) {
    const homeStats = statsData.response[0].statistics?.[0];
    const awayStats = statsData.response[1].statistics?.[0];

    statistics.fieldGoalPercentage = {
      home: parseFloat(homeStats?.fieldGoalsPercentage || '0'),
      away: parseFloat(awayStats?.fieldGoalsPercentage || '0'),
    };
    statistics.threePointPercentage = {
      home: parseFloat(homeStats?.threePointsPercentage || '0'),
      away: parseFloat(awayStats?.threePointsPercentage || '0'),
    };
    statistics.rebounds = {
      home: parseInt(homeStats?.rebounds || '0'),
      away: parseInt(awayStats?.rebounds || '0'),
    };
    statistics.assists = {
      home: parseInt(homeStats?.assists || '0'),
      away: parseInt(awayStats?.assists || '0'),
    };
  }

  return { events, statistics, lineups: null, odds: null };
}

// ── Tennis ────────────────────────────────────────────────────────────────────

async function fetchTennisDetails(apiKey: string, gameId: string) {
  const baseUrl = 'https://v1.tennis.api-sports.io';
  const statsData = await safeFetch(
    `${baseUrl}/games/statistics?id=${gameId}`,
    { 'x-apisports-key': apiKey }
  );

  const statistics: any = {};
  if (statsData.response?.length >= 2) {
    const p1 = statsData.response[0];
    const p2 = statsData.response[1];

    statistics.aces = {
      home: parseInt(p1?.aces || '0'),
      away: parseInt(p2?.aces || '0'),
    };
    statistics.doubleFaults = {
      home: parseInt(p1?.doubleFaults || '0'),
      away: parseInt(p2?.doubleFaults || '0'),
    };
    statistics.firstServePercentage = {
      home: parseFloat(p1?.firstServePercentage || '0'),
      away: parseFloat(p2?.firstServePercentage || '0'),
    };
  }

  return { events: [], statistics, lineups: null, odds: null };
}

// ── Baseball ──────────────────────────────────────────────────────────────────

async function fetchBaseballDetails(apiKey: string, gameId: string) {
  const baseUrl = 'https://v1.baseball.api-sports.io';
  const headers = { 'x-apisports-key': apiKey };

  // FIX: parallel fetches
  const [statsData, eventsData] = await Promise.all([
    safeFetch(`${baseUrl}/games/statistics?id=${gameId}`, headers),
    safeFetch(`${baseUrl}/games/events?id=${gameId}`, headers),
  ]);

  const events = (eventsData.response || []).map((event: any) => ({
    minute: parseInt(event.inning),
    type: 'goal',
    player: event.player,
    team: event.team,
    description: event.type,
  }));

  const statistics: any = {};
  if (statsData.response?.length >= 2) {
    const homeStats = statsData.response[0];
    const awayStats = statsData.response[1];

    statistics.hits = {
      home: parseInt(homeStats?.hits || '0'),
      away: parseInt(awayStats?.hits || '0'),
    };
    statistics.runs = {
      home: parseInt(homeStats?.runs || '0'),
      away: parseInt(awayStats?.runs || '0'),
    };
    statistics.errors = {
      home: parseInt(homeStats?.errors || '0'),
      away: parseInt(awayStats?.errors || '0'),
    };
  }

  return { events, statistics, lineups: null, odds: null };
}
