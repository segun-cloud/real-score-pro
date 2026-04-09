import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SPORTMONKS_BASE = 'https://api.sportmonks.com/v3/football';

// SportMonks statistic type IDs
const STAT_TYPES = {
  ATTACKS: 43,
  DANGEROUS_ATTACKS: 44,
  BALL_POSSESSION: 45,
  SHOTS_TOTAL: 86,
  SHOTS_ON_TARGET: 64,
  CORNERS: 34,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SPORTMONKS_API_KEY = Deno.env.get('SPORTMONKS_API_KEY');
    if (!SPORTMONKS_API_KEY) {
      throw new Error('SPORTMONKS_API_KEY is not configured');
    }

    const { matchId, sportmonksFixtureId } = await req.json();

    if (!matchId || !sportmonksFixtureId) {
      return new Response(
        JSON.stringify({ error: 'matchId and sportmonksFixtureId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch fixture with statistics include
    const url = `${SPORTMONKS_BASE}/fixtures/${sportmonksFixtureId}?api_token=${SPORTMONKS_API_KEY}&include=statistics`;
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`SportMonks API call failed [${response.status}]: ${text}`);
    }

    const data = await response.json();
    const fixture = data?.data;

    if (!fixture) {
      return new Response(
        JSON.stringify({ error: 'Fixture not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse statistics from the fixture
    const matchState = extractMatchState(fixture);

    // Upsert into live_match_state table
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error: upsertError } = await supabase
      .from('live_match_state')
      .upsert({
        match_id: matchId,
        ...matchState,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'match_id' });

    if (upsertError) {
      console.error('Upsert error:', upsertError);
    }

    return new Response(
      JSON.stringify({ success: true, state: matchState }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching live match state:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractMatchState(fixture: any) {
  const statistics = fixture.statistics || [];

  // Group stats by participant (team)
  const teamStats: Record<number, Record<number, any>> = {};
  for (const stat of statistics) {
    const pid = stat.participant_id;
    if (!teamStats[pid]) teamStats[pid] = {};
    teamStats[pid][stat.type_id] = stat.data?.value ?? stat.data ?? 0;
  }

  // Identify home and away participants
  const participants = fixture.participants || [];
  const homeParticipant = participants.find((p: any) => p.meta?.location === 'home');
  const awayParticipant = participants.find((p: any) => p.meta?.location === 'away');

  const homeId = homeParticipant?.id;
  const awayId = awayParticipant?.id;

  const getStat = (teamId: number | undefined, typeId: number): number => {
    if (!teamId || !teamStats[teamId]) return 0;
    const val = teamStats[teamId][typeId];
    return typeof val === 'number' ? val : parseFloat(val) || 0;
  };

  const homeAttacks = getStat(homeId, STAT_TYPES.ATTACKS);
  const awayAttacks = getStat(awayId, STAT_TYPES.ATTACKS);
  const homeDangerousAttacks = getStat(homeId, STAT_TYPES.DANGEROUS_ATTACKS);
  const awayDangerousAttacks = getStat(awayId, STAT_TYPES.DANGEROUS_ATTACKS);
  const homePossession = getStat(homeId, STAT_TYPES.BALL_POSSESSION) || 50;
  const awayPossession = getStat(awayId, STAT_TYPES.BALL_POSSESSION) || 50;
  const homeShotsOnTarget = getStat(homeId, STAT_TYPES.SHOTS_ON_TARGET);
  const awayShotsOnTarget = getStat(awayId, STAT_TYPES.SHOTS_ON_TARGET);
  const homeCorners = getStat(homeId, STAT_TYPES.CORNERS);
  const awayCorners = getStat(awayId, STAT_TYPES.CORNERS);

  // Determine phase based on real-time attack data
  let phase = 'safe';
  let attackingTeam: string | null = null;
  let ballX = 50;
  let ballY = 50;

  // Compare dangerous attacks to determine who's pressing
  const dangerousDiff = homeDangerousAttacks - awayDangerousAttacks;
  const attackDiff = homeAttacks - awayAttacks;

  // Use the state_id to check if match is in play
  const stateId = fixture.state_id;
  const isInPlay = [2, 3, 22, 23].includes(stateId); // 2=1H, 3=2H, 22=ET1H, 23=ET2H

  if (isInPlay) {
    // Determine phase from attack momentum
    if (homeDangerousAttacks > awayDangerousAttacks && homePossession > 55) {
      phase = 'dangerous_attack';
      attackingTeam = 'home';
      ballX = 80 + Math.random() * 8;
      ballY = 35 + Math.random() * 30;
    } else if (awayDangerousAttacks > homeDangerousAttacks && awayPossession > 55) {
      phase = 'dangerous_attack';
      attackingTeam = 'away';
      ballX = 12 + Math.random() * 8;
      ballY = 35 + Math.random() * 30;
    } else if (homeAttacks > awayAttacks && homePossession > 52) {
      phase = 'attack';
      attackingTeam = 'home';
      ballX = 62 + Math.random() * 10;
      ballY = 40 + Math.random() * 20;
    } else if (awayAttacks > homeAttacks && awayPossession > 52) {
      phase = 'attack';
      attackingTeam = 'away';
      ballX = 28 + Math.random() * 10;
      ballY = 40 + Math.random() * 20;
    } else {
      phase = 'safe';
      ballX = 45 + Math.random() * 10;
      ballY = 40 + Math.random() * 20;
    }
  }

  return {
    phase,
    ball_x: Math.round(ballX * 100) / 100,
    ball_y: Math.round(ballY * 100) / 100,
    attacking_team: attackingTeam,
    home_attacks: homeAttacks,
    home_dangerous_attacks: homeDangerousAttacks,
    away_attacks: awayAttacks,
    away_dangerous_attacks: awayDangerousAttacks,
    home_possession: homePossession,
    away_possession: awayPossession,
  };
}
