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
    const { matchId } = await req.json();
    console.log(`Fetching match details for: ${matchId}`);

    if (!SPORTMONKS_API_KEY) {
      throw new Error('SPORTMONKS_API_KEY not configured');
    }

    // Parse match ID to extract fixture ID (format: sportmonks-football-123 or api-football-123)
    const parts = matchId.split('-');
    const fixtureId = parts[parts.length - 1];
    
    console.log(`Extracted fixture ID: ${fixtureId}`);

    // Fetch fixture with all details from SportMonks
    const url = `https://api.sportmonks.com/v3/football/fixtures/${fixtureId}?api_token=${SPORTMONKS_API_KEY}&include=events;lineups.player;statistics;participants;scores;odds.bookmaker`;
    
    console.log(`Calling SportMonks URL: ${url.replace(SPORTMONKS_API_KEY, 'HIDDEN')}`);
    
    const response = await fetch(url);
    const apiData = await response.json();

    console.log('SportMonks match details response:', JSON.stringify(apiData).substring(0, 500));

    if (!response.ok || !apiData.data) {
      console.error('SportMonks error:', apiData);
      throw new Error('Failed to fetch match details from SportMonks');
    }

    const fixture = apiData.data;
    const homeTeam = fixture.participants?.find((p: any) => p.meta?.location === 'home');
    const awayTeam = fixture.participants?.find((p: any) => p.meta?.location === 'away');

    // Map events
    const events = (fixture.events || []).map((event: any) => ({
      minute: event.minute || 0,
      type: mapEventType(event.type_id),
      player: event.player_name || 'Unknown',
      team: event.participant_id === homeTeam?.id ? 'home' : 'away',
      description: getEventDescription(event),
    }));

    // Map lineups
    let lineups = null;
    if (fixture.lineups && fixture.lineups.length > 0) {
      const homeLineup = fixture.lineups.filter((l: any) => l.team_id === homeTeam?.id);
      const awayLineup = fixture.lineups.filter((l: any) => l.team_id === awayTeam?.id);
      
      if (homeLineup.length > 0 || awayLineup.length > 0) {
        lineups = {
          home: homeLineup.filter((l: any) => l.type_id === 11).map((p: any) => ({ // type_id 11 = starting XI
            name: p.player?.display_name || p.player_name || 'Unknown',
            position: mapPosition(p.position_id),
            number: p.jersey_number || 0,
          })),
          away: awayLineup.filter((l: any) => l.type_id === 11).map((p: any) => ({
            name: p.player?.display_name || p.player_name || 'Unknown',
            position: mapPosition(p.position_id),
            number: p.jersey_number || 0,
          })),
          homeFormation: fixture.formations?.localteam_formation || '',
          awayFormation: fixture.formations?.visitorteam_formation || '',
          homeSubs: homeLineup.filter((l: any) => l.type_id === 12).map((p: any) => ({ // type_id 12 = subs
            name: p.player?.display_name || p.player_name || 'Unknown',
            position: mapPosition(p.position_id),
            number: p.jersey_number || 0,
          })),
          awaySubs: awayLineup.filter((l: any) => l.type_id === 12).map((p: any) => ({
            name: p.player?.display_name || p.player_name || 'Unknown',
            position: mapPosition(p.position_id),
            number: p.jersey_number || 0,
          })),
        };
      }
    }

    // Map statistics
    const statistics: any = {};
    if (fixture.statistics && fixture.statistics.length > 0) {
      const homeStats = fixture.statistics.filter((s: any) => s.participant_id === homeTeam?.id);
      const awayStats = fixture.statistics.filter((s: any) => s.participant_id === awayTeam?.id);
      
      const findStat = (stats: any[], typeId: number) => {
        const stat = stats.find((s: any) => s.type_id === typeId);
        return stat ? stat.data?.value || 0 : 0;
      };

      // Type IDs: 45=Ball Possession, 42=Shots Total, 86=Shots on Goal, 34=Corner Kicks, 56=Fouls, 41=Passes
      statistics.possession = {
        home: findStat(homeStats, 45),
        away: findStat(awayStats, 45),
      };
      statistics.shots = {
        home: findStat(homeStats, 42),
        away: findStat(awayStats, 42),
      };
      statistics.shotsOnTarget = {
        home: findStat(homeStats, 86),
        away: findStat(awayStats, 86),
      };
      statistics.corners = {
        home: findStat(homeStats, 34),
        away: findStat(awayStats, 34),
      };
      statistics.fouls = {
        home: findStat(homeStats, 56),
        away: findStat(awayStats, 56),
      };
      statistics.passes = {
        home: findStat(homeStats, 41),
        away: findStat(awayStats, 41),
      };
    }

    // Map odds
    let odds = null;
    if (fixture.odds && fixture.odds.length > 0) {
      // Find 1X2 odds (match winner)
      const matchWinnerOdds = fixture.odds.find((o: any) => o.market_id === 1);
      if (matchWinnerOdds) {
        odds = {
          homeWin: parseFloat(matchWinnerOdds.value || '0'),
          draw: 0,
          awayWin: 0,
          updated: new Date().toISOString(),
        };
      }
    }

    console.log(`Successfully fetched match details - Events: ${events.length}, Lineups: ${lineups ? 'yes' : 'no'}, Stats: ${Object.keys(statistics).length}`);

    return new Response(JSON.stringify({
      events,
      lineups,
      statistics,
      odds,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching match details:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      events: [],
      lineups: null,
      statistics: {},
      odds: null,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function mapEventType(typeId: number): 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'penalty' {
  // SportMonks event type IDs
  // 14 = Goal, 15 = Own Goal, 16 = Penalty, 17 = Missed Penalty
  // 18 = Yellow Card, 19 = Yellow/Red Card, 20 = Red Card
  // 21 = Substitution
  const typeMap: Record<number, any> = {
    14: 'goal',
    15: 'goal',
    16: 'penalty',
    17: 'penalty',
    18: 'yellow_card',
    19: 'red_card',
    20: 'red_card',
    21: 'substitution',
  };
  return typeMap[typeId] || 'goal';
}

function getEventDescription(event: any): string {
  const descriptions: Record<number, string> = {
    14: `Goal by ${event.player_name || 'Unknown'}`,
    15: `Own Goal by ${event.player_name || 'Unknown'}`,
    16: `Penalty scored by ${event.player_name || 'Unknown'}`,
    17: `Penalty missed by ${event.player_name || 'Unknown'}`,
    18: `Yellow card for ${event.player_name || 'Unknown'}`,
    19: `Second yellow for ${event.player_name || 'Unknown'}`,
    20: `Red card for ${event.player_name || 'Unknown'}`,
    21: `Substitution: ${event.related_player_name || 'Unknown'} for ${event.player_name || 'Unknown'}`,
  };
  return descriptions[event.type_id] || event.info || 'Match event';
}

function mapPosition(positionId: number): string {
  const positions: Record<number, string> = {
    24: 'G',  // Goalkeeper
    25: 'D',  // Defender
    26: 'M',  // Midfielder
    27: 'F',  // Forward/Attacker
  };
  return positions[positionId] || 'M';
}
