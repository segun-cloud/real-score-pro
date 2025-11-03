import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Calculate team strength based on player ratings
async function calculateTeamStrength(supabase: any, teamId: string): Promise<number> {
  const { data: players } = await supabase
    .from('team_players')
    .select('overall_rating')
    .eq('team_id', teamId);

  if (!players || players.length === 0) return 50; // Default strength

  const avgRating = players.reduce((sum: number, p: any) => sum + (p.overall_rating || 50), 0) / players.length;
  return avgRating;
}

// Simulate match result
function simulateMatchResult(homeStrength: number, awayStrength: number) {
  // Add home advantage (5% boost)
  const adjustedHomeStrength = homeStrength * 1.05;
  
  // Calculate win probabilities
  const totalStrength = adjustedHomeStrength + awayStrength;
  const homeWinProb = adjustedHomeStrength / totalStrength;
  
  // Add some randomness
  const random = Math.random();
  const drawProbability = 0.25;
  
  let result: 'home' | 'away' | 'draw';
  if (random < drawProbability) {
    result = 'draw';
  } else if (random < drawProbability + (homeWinProb * (1 - drawProbability))) {
    result = 'home';
  } else {
    result = 'away';
  }
  
  // Generate scores based on team strength
  const homeAttack = homeStrength / 20;
  const awayAttack = awayStrength / 20;
  
  let homeScore: number, awayScore: number;
  
  if (result === 'home') {
    homeScore = Math.floor(homeAttack + Math.random() * 2 + 1);
    awayScore = Math.floor(awayAttack * 0.5 + Math.random() * 2);
  } else if (result === 'away') {
    awayScore = Math.floor(awayAttack + Math.random() * 2 + 1);
    homeScore = Math.floor(homeAttack * 0.5 + Math.random() * 2);
  } else {
    const baseScore = Math.floor((homeAttack + awayAttack) / 2 + Math.random() * 2);
    homeScore = baseScore;
    awayScore = baseScore;
  }
  
  return { homeScore, awayScore };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { matchId } = await req.json();

    // Get match details
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (matchError) throw matchError;

    if (match.status === 'completed') {
      return new Response(
        JSON.stringify({ error: 'Match already completed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate team strengths
    const homeStrength = await calculateTeamStrength(supabase, match.home_team_id);
    const awayStrength = await calculateTeamStrength(supabase, match.away_team_id);

    // Simulate match result
    const { homeScore, awayScore } = simulateMatchResult(homeStrength, awayStrength);

    console.log(`Match simulated: ${match.home_team_id} ${homeScore} - ${awayScore} ${match.away_team_id}`);

    // Update match with result
    await supabase
      .from('matches')
      .update({
        home_score: homeScore,
        away_score: awayScore,
        status: 'completed'
      })
      .eq('id', matchId);

    // Determine points
    let homePoints = 0, awayPoints = 0;
    let homeResult: 'wins' | 'draws' | 'losses';
    let awayResult: 'wins' | 'draws' | 'losses';

    if (homeScore > awayScore) {
      homePoints = 3;
      awayPoints = 0;
      homeResult = 'wins';
      awayResult = 'losses';
    } else if (homeScore < awayScore) {
      homePoints = 0;
      awayPoints = 3;
      homeResult = 'losses';
      awayResult = 'wins';
    } else {
      homePoints = 1;
      awayPoints = 1;
      homeResult = 'draws';
      awayResult = 'draws';
    }

    // Update home team stats
    const { data: homeParticipant } = await supabase
      .from('competition_participants')
      .select('*')
      .eq('competition_id', match.competition_id)
      .eq('team_id', match.home_team_id)
      .single();

    if (homeParticipant) {
      await supabase
        .from('competition_participants')
        .update({
          matches_played: homeParticipant.matches_played + 1,
          wins: homeParticipant.wins + (homeResult === 'wins' ? 1 : 0),
          draws: homeParticipant.draws + (homeResult === 'draws' ? 1 : 0),
          losses: homeParticipant.losses + (homeResult === 'losses' ? 1 : 0),
          goals_for: homeParticipant.goals_for + homeScore,
          goals_against: homeParticipant.goals_against + awayScore,
          points_earned: homeParticipant.points_earned + homePoints
        })
        .eq('id', homeParticipant.id);
    }

    // Update away team stats
    const { data: awayParticipant } = await supabase
      .from('competition_participants')
      .select('*')
      .eq('competition_id', match.competition_id)
      .eq('team_id', match.away_team_id)
      .single();

    if (awayParticipant) {
      await supabase
        .from('competition_participants')
        .update({
          matches_played: awayParticipant.matches_played + 1,
          wins: awayParticipant.wins + (awayResult === 'wins' ? 1 : 0),
          draws: awayParticipant.draws + (awayResult === 'draws' ? 1 : 0),
          losses: awayParticipant.losses + (awayResult === 'losses' ? 1 : 0),
          goals_for: awayParticipant.goals_for + awayScore,
          goals_against: awayParticipant.goals_against + homeScore,
          points_earned: awayParticipant.points_earned + awayPoints
        })
        .eq('id', awayParticipant.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        result: {
          homeTeam: match.home_team_id,
          awayTeam: match.away_team_id,
          homeScore,
          awayScore
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error simulating match:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});