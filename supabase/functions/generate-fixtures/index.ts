import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Round-robin algorithm for generating fixtures
function generateRoundRobinFixtures(teamIds: string[]) {
  const fixtures: Array<{ home: string; away: string; matchDay: number }> = [];
  const teams = [...teamIds];
  
  // If odd number of teams, add a "bye" team
  if (teams.length % 2 !== 0) {
    teams.push('BYE');
  }

  const numTeams = teams.length;
  const numRounds = numTeams - 1;
  const matchesPerRound = numTeams / 2;

  for (let round = 0; round < numRounds; round++) {
    for (let match = 0; match < matchesPerRound; match++) {
      const home = teams[match];
      const away = teams[numTeams - 1 - match];
      
      // Skip matches involving the "bye" team
      if (home !== 'BYE' && away !== 'BYE') {
        fixtures.push({
          home: home,
          away: away,
          matchDay: round + 1
        });
      }
    }
    
    // Rotate teams (keep first team fixed)
    teams.splice(1, 0, teams.pop()!);
  }

  return fixtures;
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

    const { competitionId } = await req.json();

    // Get competition details
    const { data: competition, error: compError } = await supabase
      .from('competitions')
      .select('*')
      .eq('id', competitionId)
      .single();

    if (compError) throw compError;

    // Get all participants
    const { data: participants, error: partError } = await supabase
      .from('competition_participants')
      .select('team_id')
      .eq('competition_id', competitionId);

    if (partError) throw partError;

    if (!participants || participants.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Not enough participants to generate fixtures' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const teamIds = participants.map(p => p.team_id);
    
    // Generate round-robin fixtures
    const fixtures = generateRoundRobinFixtures(teamIds);

    console.log(`Generated ${fixtures.length} fixtures for competition ${competitionId}`);

    // Calculate match dates (distribute across season duration)
    const startDate = new Date(competition.start_date);
    const endDate = new Date(competition.end_date);
    const seasonDuration = endDate.getTime() - startDate.getTime();
    const numMatchDays = Math.max(...fixtures.map(f => f.matchDay));
    const daysBetweenMatches = Math.floor(seasonDuration / (1000 * 60 * 60 * 24) / numMatchDays);

    // Insert matches
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
        away_score: null
      };
    });

    const { error: insertError } = await supabase
      .from('matches')
      .insert(matches);

    if (insertError) throw insertError;

    // Update competition status
    await supabase
      .from('competitions')
      .update({ 
        match_generation_status: 'completed',
        status: 'active'
      })
      .eq('id', competitionId);

    console.log(`Successfully generated ${matches.length} matches`);

    return new Response(
      JSON.stringify({
        success: true,
        matchesGenerated: matches.length,
        matchDays: numMatchDays
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating fixtures:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
