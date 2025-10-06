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
    const { matchId } = await req.json();
    console.log(`Fetching match details for: ${matchId}`);

    const apiKey = Deno.env.get('APISPORTS_KEY');
    if (!apiKey) {
      throw new Error('APISPORTS_KEY not configured');
    }

    // Parse match ID to extract sport and fixture ID
    const [, sport, fixtureId] = matchId.split('-');
    
    let matchDetails: any = {};

    if (sport === 'football') {
      matchDetails = await fetchFootballDetails(apiKey, fixtureId);
    } else if (sport === 'basketball') {
      matchDetails = await fetchBasketballDetails(apiKey, fixtureId);
    } else if (sport === 'tennis') {
      matchDetails = await fetchTennisDetails(apiKey, fixtureId);
    } else if (sport === 'baseball') {
      matchDetails = await fetchBaseballDetails(apiKey, fixtureId);
    }

    console.log(`Successfully fetched ${sport} match details`);

    return new Response(JSON.stringify(matchDetails), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching match details:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchFootballDetails(apiKey: string, fixtureId: string) {
  const baseUrl = 'https://v3.football.api-sports.io';
  
  // Fetch events
  const eventsResponse = await fetch(`${baseUrl}/fixtures/events?fixture=${fixtureId}`, {
    headers: { 'x-apisports-key': apiKey },
  });
  const eventsData = await eventsResponse.json();
  
  // Fetch lineups
  const lineupsResponse = await fetch(`${baseUrl}/fixtures/lineups?fixture=${fixtureId}`, {
    headers: { 'x-apisports-key': apiKey },
  });
  const lineupsData = await lineupsResponse.json();
  
  // Fetch statistics
  const statsResponse = await fetch(`${baseUrl}/fixtures/statistics?fixture=${fixtureId}`, {
    headers: { 'x-apisports-key': apiKey },
  });
  const statsData = await statsResponse.json();
  
  // Fetch odds (optional)
  let oddsData = null;
  try {
    const oddsResponse = await fetch(`${baseUrl}/odds?fixture=${fixtureId}`, {
      headers: { 'x-apisports-key': apiKey },
    });
    oddsData = await oddsResponse.json();
  } catch (error) {
    console.log('Odds not available for this match');
  }

  // Map events
  const events = (eventsData.response || []).map((event: any) => ({
    minute: event.time.elapsed,
    type: mapEventType(event.type),
    player: event.player.name,
    team: event.team.id === event.fixture?.teams?.home?.id ? 'home' : 'away',
    description: event.detail,
  }));

  // Map lineups
  let lineups = null;
  if (lineupsData.response && lineupsData.response.length >= 2) {
    lineups = {
      home: lineupsData.response[0].startXI.map((p: any) => ({
        name: p.player.name,
        position: p.player.pos,
        number: p.player.number,
      })),
      away: lineupsData.response[1].startXI.map((p: any) => ({
        name: p.player.name,
        position: p.player.pos,
        number: p.player.number,
      })),
      homeFormation: lineupsData.response[0].formation,
      awayFormation: lineupsData.response[1].formation,
    };
  }

  // Map statistics
  const statistics: any = {};
  if (statsData.response && statsData.response.length >= 2) {
    const homeStats = statsData.response[0].statistics;
    const awayStats = statsData.response[1].statistics;
    
    const findStat = (stats: any[], type: string) => {
      const stat = stats.find((s: any) => s.type === type);
      return stat ? parseInt(stat.value) || 0 : 0;
    };

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
  }

  // Map odds
  let odds = null;
  if (oddsData?.response && oddsData.response.length > 0) {
    const bookmaker = oddsData.response[0].bookmakers[0];
    const matchWinner = bookmaker.bets.find((b: any) => b.name === 'Match Winner');
    if (matchWinner) {
      odds = {
        homeWin: parseFloat(matchWinner.values[0].odd),
        draw: parseFloat(matchWinner.values[1]?.odd || '0'),
        awayWin: parseFloat(matchWinner.values[2]?.odd || matchWinner.values[1]?.odd),
        updated: bookmaker.last_update,
      };
    }
  }

  return {
    events,
    lineups,
    statistics,
    odds,
  };
}

async function fetchBasketballDetails(apiKey: string, gameId: string) {
  const baseUrl = 'https://v1.basketball.api-sports.io';
  
  // Fetch statistics
  const statsResponse = await fetch(`${baseUrl}/games/statistics?id=${gameId}`, {
    headers: { 'x-apisports-key': apiKey },
  });
  const statsData = await statsResponse.json();
  
  // Fetch events
  const eventsResponse = await fetch(`${baseUrl}/games/events?id=${gameId}`, {
    headers: { 'x-apisports-key': apiKey },
  });
  const eventsData = await eventsResponse.json();

  const events = (eventsData.response || []).map((event: any) => ({
    minute: parseInt(event.time),
    type: 'goal',
    player: event.player,
    team: event.team,
    description: event.detail,
  }));

  const statistics: any = {};
  if (statsData.response && statsData.response.length >= 2) {
    const homeStats = statsData.response[0].statistics[0];
    const awayStats = statsData.response[1].statistics[0];
    
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

  return {
    events,
    statistics,
    lineups: null,
    odds: null,
  };
}

async function fetchTennisDetails(apiKey: string, gameId: string) {
  const baseUrl = 'https://v1.tennis.api-sports.io';
  
  const statsResponse = await fetch(`${baseUrl}/games/statistics?id=${gameId}`, {
    headers: { 'x-apisports-key': apiKey },
  });
  const statsData = await statsResponse.json();

  const statistics: any = {};
  if (statsData.response && statsData.response.length > 0) {
    const player1Stats = statsData.response[0];
    const player2Stats = statsData.response[1];
    
    statistics.aces = {
      home: parseInt(player1Stats?.aces || '0'),
      away: parseInt(player2Stats?.aces || '0'),
    };
    statistics.doubleFaults = {
      home: parseInt(player1Stats?.doubleFaults || '0'),
      away: parseInt(player2Stats?.doubleFaults || '0'),
    };
    statistics.firstServePercentage = {
      home: parseFloat(player1Stats?.firstServePercentage || '0'),
      away: parseFloat(player2Stats?.firstServePercentage || '0'),
    };
  }

  return {
    events: [],
    statistics,
    lineups: null,
    odds: null,
  };
}

async function fetchBaseballDetails(apiKey: string, gameId: string) {
  const baseUrl = 'https://v1.baseball.api-sports.io';
  
  const statsResponse = await fetch(`${baseUrl}/games/statistics?id=${gameId}`, {
    headers: { 'x-apisports-key': apiKey },
  });
  const statsData = await statsResponse.json();

  const eventsResponse = await fetch(`${baseUrl}/games/events?id=${gameId}`, {
    headers: { 'x-apisports-key': apiKey },
  });
  const eventsData = await eventsResponse.json();

  const events = (eventsData.response || []).map((event: any) => ({
    minute: parseInt(event.inning),
    type: 'goal',
    player: event.player,
    team: event.team,
    description: event.type,
  }));

  const statistics: any = {};
  if (statsData.response && statsData.response.length >= 2) {
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

  return {
    events,
    statistics,
    lineups: null,
    odds: null,
  };
}

function mapEventType(apiType: string): 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'penalty' {
  const typeMap: Record<string, any> = {
    'Goal': 'goal',
    'Card': 'yellow_card',
    'subst': 'substitution',
  };
  return typeMap[apiType] || 'goal';
}
