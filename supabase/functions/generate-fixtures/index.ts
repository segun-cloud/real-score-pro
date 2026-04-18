import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FIX: Supabase service role client created once at module level
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Round-robin fixture generator
function generateRoundRobinFixtures(
  teamIds: string[],
  doubleRoundRobin = false
): Array<{ home: string; away: string; matchDay: number }> {
  const fixtures: Array<{ home: string; away: string; matchDay: number }> = [];
  const teams = [...teamIds];

  if (teams.length % 2 !== 0) teams.push('BYE');

  const numTeams = teams.length;
  const numRounds = numTeams - 1;
  const matchesPerRound = numTeams / 2;

  for (let round = 0; round < numRounds; round++) {
    for (let match = 0; match < matchesPerRound; match++) {
      const home = teams[match];
      const away = teams[numTeams - 1 - match];
      if (home !== 'BYE' && away !== 'BYE') {
        fixtures.push({ home, away, matchDay: round + 1 });
      }
    }
    teams.splice(1, 0, teams.pop()!);
  }

  if (doubleRoundRobin) {
    const firstHalfLength = fixtures.length;
    for (let i = 0; i < firstHalfLength; i++) {
      fixtures.push({
        home: fixtures[i].away,
        away: fixtures[i].home,
        matchDay: fixtures[i].matchDay + numRounds,
      });
    }
  }

  return fixtures;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth — use anon client to verify JWT, service role client for DB writes
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FIX: use createClient with auth header rather than extracting token manually
    // Extracting and passing the raw token to getUser() is fragile — this is safer
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

    // Admin check via service role client
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      console.error('Non-admin user attempted fixture generation:', user.id);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FIX: wrap req.json() — malformed body returns clean 400
    let body: { competitionId?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { competitionId } = body;

    if (!competitionId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: competitionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating fixtures for competition:', competitionId);

    // Fetch competition
    const { data: competition, error: compError } = await supabase
      .from('competitions')
      .select('*')
      .eq('id', competitionId)
      .single();

    if (compError || !competition) {
      return new Response(
        JSON.stringify({ error: 'Competition not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FIX: guard against missing start/end dates before doing date math
    if (!competition.start_date || !competition.end_date) {
      return new Response(
        JSON.stringify({ error: 'Competition is missing start_date or end_date' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate registration deadline
    if (competition.registration_deadline) {
      const deadline = new Date(competition.registration_deadline);
      if (new Date() < deadline) {
        return new Response(
          JSON.stringify({
            error: 'Registration deadline has not passed yet',
            deadline: competition.registration_deadline,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // FIX: check if fixtures already generated to prevent duplicate generation
    const { count: existingCount } = await supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .eq('competition_id', competitionId);

    if (existingCount && existingCount > 0) {
      return new Response(
        JSON.stringify({ error: 'Fixtures have already been generated for this competition' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch participants
    const { data: participants, error: partError } = await supabase
      .from('competition_participants')
      .select('team_id')
      .eq('competition_id', competitionId);

    if (partError) throw partError;

    const minParticipants = competition.min_participants || 4;
    if (!participants || participants.length < minParticipants) {
      return new Response(
        JSON.stringify({
          error: `Not enough participants. Need at least ${minParticipants}, have ${participants?.length || 0}`,
          required: minParticipants,
          current: participants?.length || 0,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const teamIds = participants.map(p => p.team_id);
    const isDoubleRoundRobin = competition.format === 'double_round_robin';
    const fixtures = generateRoundRobinFixtures(teamIds, isDoubleRoundRobin);

    console.log(`Generated ${fixtures.length} fixtures (format: ${competition.format || 'single_round_robin'})`);

    // Distribute matches across season duration
    const startDate = new Date(competition.start_date);
    const endDate = new Date(competition.end_date);
    const seasonDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const numMatchDays = Math.max(...fixtures.map(f => f.matchDay));

    // FIX: guard against zero/negative season duration
    if (seasonDays <= 0) {
      return new Response(
        JSON.stringify({ error: 'end_date must be after start_date' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const daysBetweenMatches = Math.max(1, Math.floor(seasonDays / numMatchDays));

    const matches = fixtures.map(fixture => {
      const matchDate = new Date(startDate);
      matchDate.setDate(matchDate.getDate() + (fixture.matchDay - 1) * daysBetweenMatches);
      return {
        competition_id: competitionId,
        home_team_id: fixture.home,
        away_team_id: fixture.away,
        match_date: matchDate.toISOString(),
        match_day: fixture.matchDay,
        status: 'scheduled' as const,
        home_score: null,
        away_score: null,
      };
    });

    const { error: insertError } = await supabase.from('matches').insert(matches);
    if (insertError) throw insertError;

    // Update competition status — log but don't throw if this fails
    const { error: updateError } = await supabase
      .from('competitions')
      .update({ match_generation_status: 'completed', status: 'active' })
      .eq('id', competitionId);

    if (updateError) console.error('Competition status update failed:', updateError);

    // Notify team owners — fire-and-forget, failure should not block success response
    supabase
      .from('user_teams')
      .select('user_id, team_name')
      .in('id', teamIds)
      .then(({ data: teamOwners }) => {
        if (!teamOwners || teamOwners.length === 0) return;
        const notifications = teamOwners.map(owner => ({
          user_id: owner.user_id,
          title: 'Competition Started!',
          message: `Fixtures have been generated for ${competition.name}. Your first match is coming up!`,
          notification_type: 'competition_start',
          metadata: { competition_id: competitionId },
        }));
        return supabase.from('user_notifications').insert(notifications);
      })
      .catch(err => console.error('Failed to send notifications:', err));

    console.log(`Successfully inserted ${matches.length} matches across ${numMatchDays} match days`);

    return new Response(
      JSON.stringify({
        success: true,
        matchesGenerated: matches.length,
        matchDays: numMatchDays,
        format: competition.format || 'single_round_robin',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // FIX: safely extract message from unknown error type
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error generating fixtures:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
