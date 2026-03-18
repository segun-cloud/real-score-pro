import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GOALSERVE_BASE_URL = 'https://www.goalserve.com/getfeed';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOALSERVE_API_KEY = Deno.env.get('GOALSERVE_API_KEY');
    if (!GOALSERVE_API_KEY) {
      throw new Error('GOALSERVE_API_KEY is not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { matchId, goalserveMatchId } = await req.json();

    if (!matchId || !goalserveMatchId) {
      return new Response(
        JSON.stringify({ error: 'matchId and goalserveMatchId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch live match data from Goalserve
    const url = `${GOALSERVE_BASE_URL}/${GOALSERVE_API_KEY}/soccerlivescore/livescore?json=1`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Goalserve API call failed [${response.status}]: ${await response.text()}`);
    }

    const data = await response.json();

    // Parse Goalserve response to find the match
    let matchState = parseGoalserveMatch(data, goalserveMatchId);

    if (!matchState) {
      // If match not found in live feed, return default safe state
      matchState = {
        phase: 'safe',
        ball_x: 50,
        ball_y: 50,
        attacking_team: null,
        home_attacks: 0,
        home_dangerous_attacks: 0,
        away_attacks: 0,
        away_dangerous_attacks: 0,
        home_possession: 50,
        away_possession: 50,
      };
    }

    // Upsert into live_match_state table
    const { error: upsertError } = await supabase
      .from('live_match_state')
      .upsert({
        match_id: matchId,
        ...matchState,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'match_id' });

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      throw new Error(`Failed to upsert match state: ${upsertError.message}`);
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

function parseGoalserveMatch(data: any, goalserveMatchId: string) {
  try {
    // Goalserve structure: data.scores.category[].match[]
    const categories = data?.scores?.category || data?.categories?.category || [];
    const catArray = Array.isArray(categories) ? categories : [categories];

    for (const category of catArray) {
      const matches = category?.match || category?.matches?.match || [];
      const matchArray = Array.isArray(matches) ? matches : [matches];

      for (const match of matchArray) {
        if (String(match?.id) === String(goalserveMatchId) || String(match?.static_id) === String(goalserveMatchId)) {
          return extractMatchState(match);
        }
      }
    }
    return null;
  } catch (e) {
    console.error('Error parsing Goalserve data:', e);
    return null;
  }
}

function extractMatchState(match: any) {
  const homeAttacks = parseInt(match?.stats?.attacks?.home || match?.localteam?.attacks || '0', 10);
  const awayAttacks = parseInt(match?.stats?.attacks?.away || match?.visitorteam?.attacks || '0', 10);
  const homeDangerousAttacks = parseInt(match?.stats?.dangerous_attacks?.home || match?.localteam?.dangerous_attacks || '0', 10);
  const awayDangerousAttacks = parseInt(match?.stats?.dangerous_attacks?.away || match?.visitorteam?.dangerous_attacks || '0', 10);
  const homePossession = parseFloat(match?.stats?.possession?.home || match?.localteam?.possession || '50');
  const awayPossession = parseFloat(match?.stats?.possession?.away || match?.visitorteam?.possession || '50');

  // Determine phase from Goalserve's game state
  const gameState = (match?.game_state || match?.info?.gamestate || '').toLowerCase();
  const ballX = parseFloat(match?.ball?.x || '50');
  const ballY = parseFloat(match?.ball?.y || '50');

  let phase = 'safe';
  let attackingTeam: string | null = null;

  // Determine phase based on game state labels or ball position
  if (gameState.includes('dangerous') || gameState.includes('danger')) {
    phase = 'dangerous_attack';
    attackingTeam = ballX > 65 ? 'home' : ballX < 35 ? 'away' : null;
  } else if (gameState.includes('attack')) {
    phase = 'attack';
    attackingTeam = ballX > 55 ? 'home' : ballX < 45 ? 'away' : null;
  } else if (gameState.includes('corner') || gameState.includes('free kick')) {
    phase = 'setpiece';
    attackingTeam = ballX > 50 ? 'home' : 'away';
  } else if (gameState.includes('goal kick') || gameState.includes('safe')) {
    phase = 'safe';
  } else {
    // Infer from ball position if no explicit state
    if (ballX > 75) {
      phase = 'dangerous_attack';
      attackingTeam = 'home';
    } else if (ballX > 60) {
      phase = 'attack';
      attackingTeam = 'home';
    } else if (ballX < 25) {
      phase = 'dangerous_attack';
      attackingTeam = 'away';
    } else if (ballX < 40) {
      phase = 'attack';
      attackingTeam = 'away';
    } else {
      phase = 'safe';
    }
  }

  return {
    phase,
    ball_x: ballX,
    ball_y: ballY,
    attacking_team: attackingTeam,
    home_attacks: homeAttacks,
    home_dangerous_attacks: homeDangerousAttacks,
    away_attacks: awayAttacks,
    away_dangerous_attacks: awayDangerousAttacks,
    home_possession: homePossession,
    away_possession: awayPossession,
  };
}
