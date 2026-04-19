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

// ── Event generation ──────────────────────────────────────────────────────────

type MatchEvent = { minute: number; type: string; team: 'home' | 'away' };

function pickTeam(homeStr: number, awayStr: number): 'home' | 'away' {
  const homeAdj = homeStr * 1.05; // home advantage
  return Math.random() * (homeAdj + awayStr) < homeAdj ? 'home' : 'away';
}

function generateMatchEvents(sport: string, homeStr: number, awayStr: number): MatchEvent[] {
  const events: MatchEvent[] = [];

  switch (sport) {
    case 'football': {
      const totalGoals = Math.floor(Math.random() * 5) + 1;
      for (let i = 0; i < totalGoals; i++) {
        events.push({ minute: Math.floor(Math.random() * 90) + 1, type: 'goal', team: pickTeam(homeStr, awayStr) });
      }
      break;
    }
    case 'basketball': {
      const totalBaskets = Math.floor(Math.random() * 30) + 50;
      for (let i = 0; i < totalBaskets; i++) {
        events.push({ minute: Math.floor(Math.random() * 48) + 1, type: 'basket', team: pickTeam(homeStr, awayStr) });
      }
      break;
    }
    case 'tennis': {
      const sets = Math.floor(Math.random() * 2) + 2;
      for (let i = 1; i <= sets; i++) {
        events.push({ minute: i * 20, type: 'set', team: pickTeam(homeStr, awayStr) });
      }
      break;
    }
    case 'baseball': {
      const totalRuns = Math.floor(Math.random() * 8) + 2;
      for (let i = 0; i < totalRuns; i++) {
        events.push({ minute: Math.floor(Math.random() * 90) + 1, type: 'run', team: pickTeam(homeStr, awayStr) });
      }
      break;
    }
    case 'boxing': {
      for (let i = 1; i <= 12; i++) {
        events.push({ minute: i * 3, type: 'round', team: pickTeam(homeStr, awayStr) });
      }
      break;
    }
    default: {
      const totalGoals = Math.floor(Math.random() * 5) + 1;
      for (let i = 0; i < totalGoals; i++) {
        events.push({ minute: Math.floor(Math.random() * 90) + 1, type: 'goal', team: pickTeam(homeStr, awayStr) });
      }
    }
  }

  return events.sort((a, b) => a.minute - b.minute);
}

// ── Score calculation ─────────────────────────────────────────────────────────

function calculateScores(events: MatchEvent[]): { homeScore: number; awayScore: number } {
  let homeScore = 0;
  let awayScore = 0;

  for (const event of events) {
    let points = 1;
    if (event.type === 'basket') points = Math.random() > 0.7 ? 3 : 2;
    if (event.type === 'round') points = Math.floor(Math.random() * 3) + 1;

    if (['goal', 'run', 'set', 'basket', 'round'].includes(event.type)) {
      if (event.team === 'home') homeScore += points;
      else awayScore += points;
    }
  }

  return { homeScore, awayScore };
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
    if (!matchId) {
      return new Response(
        JSON.stringify({ error: 'Match ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch match with team and competition info
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select(`
        *,
        home_team:user_teams!matches_home_team_id_fkey(id, user_id, team_name),
        away_team:user_teams!matches_away_team_id_fkey(id, user_id, team_name),
        competitions(id, sport, status)
      `)
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return new Response(
        JSON.stringify({ error: 'Match not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns one of the teams
    if (match.home_team?.user_id !== user.id && match.away_team?.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'You can only simulate matches for your own teams' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (match.status === 'completed') {
      return new Response(
        JSON.stringify({ error: 'Match already completed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (new Date(match.match_date) > new Date()) {
      return new Response(
        JSON.stringify({ error: 'Cannot simulate future matches' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (match.competitions?.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Competition is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sport = match.competitions.sport;

    // FIX: fetch both team strengths in parallel
    const [homeStrength, awayStrength] = await Promise.all([
      calculateTeamStrength(match.home_team_id),
      calculateTeamStrength(match.away_team_id),
    ]);

    console.log(`Team strengths — Home: ${homeStrength.toFixed(1)}, Away: ${awayStrength.toFixed(1)}`);

    const events = generateMatchEvents(sport, homeStrength, awayStrength);
    const { homeScore, awayScore } = calculateScores(events);

    console.log(`Result: ${match.home_team?.team_name} ${homeScore} - ${awayScore} ${match.away_team?.team_name}`);

    // Update match result
    const { error: updateMatchError } = await supabase
      .from('matches')
      .update({ home_score: homeScore, away_score: awayScore, status: 'completed' })
      .eq('id', matchId);

    if (updateMatchError) throw updateMatchError;

    // Determine points and results
    const homeWon = homeScore > awayScore;
    const draw = homeScore === awayScore;
    const homePoints = homeWon ? 3 : draw ? 1 : 0;
    const awayPoints = homeWon ? 0 : draw ? 1 : 3;
    const goalDiffHome = homeScore - awayScore;

    // FIX: fetch both participants in parallel with competition_id filter
    // to avoid .single() throwing when a team appears in multiple competitions
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

    // FIX: use Supabase RPC for atomic stat increments to avoid race conditions.
    // If no RPC is available, the update below is the best we can do client-side
    // but note it is not safe for concurrent match completions on the same team.
    const participantUpdates: Promise<any>[] = [];

    if (homeParticipant) {
      participantUpdates.push(
        supabase
          .from('competition_participants')
          .update({
            matches_played: (homeParticipant.matches_played || 0) + 1,
            wins:           (homeParticipant.wins || 0) + (homeWon ? 1 : 0),
            draws:          (homeParticipant.draws || 0) + (draw ? 1 : 0),
            losses:         (homeParticipant.losses || 0) + (!homeWon && !draw ? 1 : 0),
            goals_for:      (homeParticipant.goals_for || 0) + homeScore,
            goals_against:  (homeParticipant.goals_against || 0) + awayScore,
            // FIX: goal_difference now updated — primary standings tiebreaker
            goal_difference: (homeParticipant.goal_difference || 0) + goalDiffHome,
            points_earned:  (homeParticipant.points_earned || 0) + homePoints,
          })
          .eq('id', homeParticipant.id)
      );
    }

    if (awayParticipant) {
      participantUpdates.push(
        supabase
          .from('competition_participants')
          .update({
            matches_played: (awayParticipant.matches_played || 0) + 1,
            wins:           (awayParticipant.wins || 0) + (!homeWon && !draw ? 1 : 0),
            draws:          (awayParticipant.draws || 0) + (draw ? 1 : 0),
            losses:         (awayParticipant.losses || 0) + (homeWon ? 1 : 0),
            goals_for:      (awayParticipant.goals_for || 0) + awayScore,
            goals_against:  (awayParticipant.goals_against || 0) + homeScore,
            // FIX: goal_difference for away team is the inverse
            goal_difference: (awayParticipant.goal_difference || 0) - goalDiffHome,
            points_earned:  (awayParticipant.points_earned || 0) + awayPoints,
          })
          .eq('id', awayParticipant.id)
      );
    }

    // FIX: run both participant updates in parallel
    const updateResults = await Promise.all(participantUpdates);
    for (const { error } of updateResults) {
      if (error) console.error('Participant update error:', error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        result: {
          homeTeamId: match.home_team_id,
          awayTeamId: match.away_team_id,
          homeTeamName: match.home_team?.team_name,
          awayTeamName: match.away_team?.team_name,
          homeScore,
          awayScore,
          events,
          sport,
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
