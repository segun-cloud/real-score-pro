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

// Generate events for the match based on sport type
function generateMatchEvents(sport: string, homeStrength: number, awayStrength: number): Array<{minute: number, type: string, team: 'home' | 'away'}> {
  const events: Array<{minute: number, type: string, team: 'home' | 'away'}> = [];
  const totalStrength = homeStrength + awayStrength;
  const homeAdvantage = 1.05;
  const adjustedHomeStr = homeStrength * homeAdvantage;
  
  switch (sport) {
    case 'football': {
      const totalGoals = Math.floor(Math.random() * 5) + 1;
      for (let i = 0; i < totalGoals; i++) {
        const minute = Math.floor(Math.random() * 90) + 1;
        const isHome = Math.random() * (adjustedHomeStr + awayStrength) < adjustedHomeStr;
        events.push({ minute, type: 'goal', team: isHome ? 'home' : 'away' });
      }
      break;
    }
    case 'basketball': {
      const totalBaskets = Math.floor(Math.random() * 30) + 50;
      for (let i = 0; i < totalBaskets; i++) {
        const minute = Math.floor(Math.random() * 48) + 1;
        const isHome = Math.random() * (adjustedHomeStr + awayStrength) < adjustedHomeStr;
        events.push({ minute, type: 'basket', team: isHome ? 'home' : 'away' });
      }
      break;
    }
    case 'tennis': {
      const sets = Math.floor(Math.random() * 2) + 2;
      for (let i = 1; i <= sets; i++) {
        const minute = i * 20;
        const isHome = Math.random() * (adjustedHomeStr + awayStrength) < adjustedHomeStr;
        events.push({ minute, type: 'set', team: isHome ? 'home' : 'away' });
      }
      break;
    }
    case 'baseball': {
      const totalRuns = Math.floor(Math.random() * 8) + 2;
      for (let i = 0; i < totalRuns; i++) {
        const minute = Math.floor(Math.random() * 90) + 1;
        const isHome = Math.random() * (adjustedHomeStr + awayStrength) < adjustedHomeStr;
        events.push({ minute, type: 'run', team: isHome ? 'home' : 'away' });
      }
      break;
    }
    case 'boxing': {
      const rounds = 12;
      for (let i = 1; i <= rounds; i++) {
        const minute = i * 3;
        const isHome = Math.random() * (adjustedHomeStr + awayStrength) < adjustedHomeStr;
        events.push({ minute, type: 'round', team: isHome ? 'home' : 'away' });
      }
      break;
    }
    default: {
      const totalGoals = Math.floor(Math.random() * 5) + 1;
      for (let i = 0; i < totalGoals; i++) {
        const minute = Math.floor(Math.random() * 90) + 1;
        const isHome = Math.random() * (adjustedHomeStr + awayStrength) < adjustedHomeStr;
        events.push({ minute, type: 'goal', team: isHome ? 'home' : 'away' });
      }
    }
  }
  
  return events.sort((a, b) => a.minute - b.minute);
}

// Calculate final scores from events
function calculateScoresFromEvents(events: Array<{minute: number, type: string, team: 'home' | 'away'}>, sport: string): { homeScore: number, awayScore: number } {
  let homeScore = 0;
  let awayScore = 0;
  
  for (const event of events) {
    if (event.type === 'goal' || event.type === 'run' || event.type === 'set') {
      if (event.team === 'home') homeScore++;
      else awayScore++;
    } else if (event.type === 'basket') {
      const points = Math.random() > 0.7 ? 3 : 2;
      if (event.team === 'home') homeScore += points;
      else awayScore += points;
    } else if (event.type === 'round') {
      const points = Math.floor(Math.random() * 3) + 1;
      if (event.team === 'home') homeScore += points;
      else awayScore += points;
    }
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

    const { matchId } = await req.json();

    if (!matchId) {
      return new Response(
        JSON.stringify({ error: 'Match ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get match details with team info and competition
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
      console.error('Match fetch error:', matchError);
      return new Response(
        JSON.stringify({ error: 'Match not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns one of the teams
    const userOwnsTeam = match.home_team?.user_id === user.id || match.away_team?.user_id === user.id;
    if (!userOwnsTeam) {
      return new Response(
        JSON.stringify({ error: 'You can only simulate matches for your own teams' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check match is scheduled
    if (match.status === 'completed') {
      return new Response(
        JSON.stringify({ error: 'Match already completed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check match date is today or earlier
    const matchDate = new Date(match.match_date);
    const now = new Date();
    if (matchDate > now) {
      return new Response(
        JSON.stringify({ error: 'Cannot simulate future matches' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check competition is active
    if (match.competitions?.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Competition is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sport = match.competitions.sport;

    // Calculate team strengths
    const homeStrength = await calculateTeamStrength(supabase, match.home_team_id);
    const awayStrength = await calculateTeamStrength(supabase, match.away_team_id);

    console.log(`Team strengths - Home: ${homeStrength}, Away: ${awayStrength}`);

    // Generate match events
    const events = generateMatchEvents(sport, homeStrength, awayStrength);
    
    // Calculate final scores from events
    const { homeScore, awayScore } = calculateScoresFromEvents(events, sport);

    console.log(`Match result: ${match.home_team?.team_name} ${homeScore} - ${awayScore} ${match.away_team?.team_name}`);

    // Update match with result
    const { error: updateMatchError } = await supabase
      .from('matches')
      .update({
        home_score: homeScore,
        away_score: awayScore,
        status: 'completed'
      })
      .eq('id', matchId);

    if (updateMatchError) {
      console.error('Update match error:', updateMatchError);
      throw updateMatchError;
    }

    // Determine points and results
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

    // Update home team participant stats
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
          matches_played: (homeParticipant.matches_played || 0) + 1,
          wins: (homeParticipant.wins || 0) + (homeResult === 'wins' ? 1 : 0),
          draws: (homeParticipant.draws || 0) + (homeResult === 'draws' ? 1 : 0),
          losses: (homeParticipant.losses || 0) + (homeResult === 'losses' ? 1 : 0),
          goals_for: (homeParticipant.goals_for || 0) + homeScore,
          goals_against: (homeParticipant.goals_against || 0) + awayScore,
          points_earned: (homeParticipant.points_earned || 0) + homePoints
        })
        .eq('id', homeParticipant.id);
    }

    // Update away team participant stats
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
          matches_played: (awayParticipant.matches_played || 0) + 1,
          wins: (awayParticipant.wins || 0) + (awayResult === 'wins' ? 1 : 0),
          draws: (awayParticipant.draws || 0) + (awayResult === 'draws' ? 1 : 0),
          losses: (awayParticipant.losses || 0) + (awayResult === 'losses' ? 1 : 0),
          goals_for: (awayParticipant.goals_for || 0) + awayScore,
          goals_against: (awayParticipant.goals_against || 0) + homeScore,
          points_earned: (awayParticipant.points_earned || 0) + awayPoints
        })
        .eq('id', awayParticipant.id);
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
          sport
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
