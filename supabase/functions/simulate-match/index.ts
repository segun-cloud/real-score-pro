import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FIX: module-level service role client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// ── Team strength ─────────────────────────────────────────────────────────────

async function calculateTeamStrength(teamId: string): Promise<number> {
  const { data: players } = await supabase
    .from('team_players')
    .select('overall_rating')
    .eq('team_id', teamId);

  if (!players || players.length === 0) return 50;
  return players.reduce((sum: number, p: any) => sum + (p.overall_rating || 50), 0) / players.length;
}

// ── Match simulation ──────────────────────────────────────────────────────────

function simulateMatchResult(homeStrength: number, awayStrength: number): { homeScore: number; awayScore: number } {
  const adjustedHomeStrength = homeStrength * 1.05; // home advantage
  const totalStrength = adjustedHomeStrength + awayStrength;
  const homeWinProb = adjustedHomeStrength / totalStrength;
  const drawProbability = 0.25;

  const random = Math.random();
  let result: 'home' | 'away' | 'draw';

  if (random < drawProbability) {
    result = 'draw';
  } else if (random < drawProbability + homeWinProb * (1 - drawProbability)) {
    result = 'home';
  } else {
    result = 'away';
  }

  const homeAttack = homeStrength / 20;
  const awayAttack = awayStrength / 20;

  let homeScore: number;
  let awayScore: number;

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

  // FIX: ensure scores are never negative (low-rated teams + 0.5 multiplier can floor to -1)
  return { homeScore: Math.max(0, homeScore), awayScore: Math.max(0, awayScore) };
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // FIX: use anon client + auth header pattern
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin check
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      console.error('Non-admin attempted simulate-scheduled-matches:', user.id);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FIX: wrap req.json()
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

    // FIX: validate matchId
    if (!matchId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: matchId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    // FIX: return 404 instead of throwing on missing match
    if (matchError || !match) {
      return new Response(
        JSON.stringify({ error: 'Match not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (match.status === 'completed') {
      return new Response(
        JSON.stringify({ error: 'Match already completed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FIX: fetch both team strengths in parallel
    const [homeStrength, awayStrength] = await Promise.all([
      calculateTeamStrength(match.home_team_id),
      calculateTeamStrength(match.away_team_id),
    ]);

    const { homeScore, awayScore } = simulateMatchResult(homeStrength, awayStrength);
    console.log(`Simulated: ${match.home_team_id} ${homeScore} - ${awayScore} ${match.away_team_id}`);

    // Update match result
    const { error: updateError } = await supabase
      .from('matches')
      .update({ home_score: homeScore, away_score: awayScore, status: 'completed' })
      .eq('id', matchId);

    // FIX: throw if match update fails — previously silently continued
    if (updateError) throw updateError;

    // Determine outcome
    const homeWon = homeScore > awayScore;
    const draw = homeScore === awayScore;
    const homePoints = homeWon ? 3 : draw ? 1 : 0;
    const awayPoints = homeWon ? 0 : draw ? 1 : 3;
    const goalDiffHome = homeScore - awayScore;

    // FIX: fetch both participants in parallel with competition_id scoped query
    const [{ data: homeParticipant }, { data: awayParticipant }] = await Promise.all([
      supabase
        .from('competition_participants')
        .select('*')
        .eq('competition_id', match.competition_id)
        .eq('team_id', match.home_team_id)
        .single(),
      supabase
        .from('competition_participants')
        .select('*')
        .eq('competition_id', match.competition_id)
        .eq('team_id', match.away_team_id)
        .single(),
    ]);

    const participantUpdates: Promise<any>[] = [];

    if (homeParticipant) {
      participantUpdates.push(
        supabase
          .from('competition_participants')
          .update({
            matches_played:  (homeParticipant.matches_played || 0) + 1,
            wins:            (homeParticipant.wins || 0) + (homeWon ? 1 : 0),
            draws:           (homeParticipant.draws || 0) + (draw ? 1 : 0),
            losses:          (homeParticipant.losses || 0) + (!homeWon && !draw ? 1 : 0),
            goals_for:       (homeParticipant.goals_for || 0) + homeScore,
            goals_against:   (homeParticipant.goals_against || 0) + awayScore,
            // FIX: goal_difference updated — was missing, breaking standings tiebreakers
            goal_difference: (homeParticipant.goal_difference || 0) + goalDiffHome,
            points_earned:   (homeParticipant.points_earned || 0) + homePoints,
          })
          .eq('id', homeParticipant.id)
      );
    }

    if (awayParticipant) {
      participantUpdates.push(
        supabase
          .from('competition_participants')
          .update({
            matches_played:  (awayParticipant.matches_played || 0) + 1,
            wins:            (awayParticipant.wins || 0) + (!homeWon && !draw ? 1 : 0),
            draws:           (awayParticipant.draws || 0) + (draw ? 1 : 0),
            losses:          (awayParticipant.losses || 0) + (homeWon ? 1 : 0),
            goals_for:       (awayParticipant.goals_for || 0) + awayScore,
            goals_against:   (awayParticipant.goals_against || 0) + homeScore,
            // FIX: away goal difference is the inverse of home
            goal_difference: (awayParticipant.goal_difference || 0) - goalDiffHome,
            points_earned:   (awayParticipant.points_earned || 0) + awayPoints,
          })
          .eq('id', awayParticipant.id)
      );
    }

    // FIX: run both updates in parallel
    const updateResults = await Promise.all(participantUpdates);
    for (const { error } of updateResults) {
      if (error) console.error('Participant update error:', error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        result: {
          homeTeam: match.home_team_id,
          awayTeam: match.away_team_id,
          homeScore,
          awayScore,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // FIX: safely extract message from unknown error type
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error simulating match:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
