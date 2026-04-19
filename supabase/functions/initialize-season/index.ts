import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_SPORTS = [
  'football', 'basketball', 'tennis', 'baseball',
  'boxing', 'cricket', 'ice-hockey', 'rugby', 'american-football',
];

const VALID_FORMATS = ['single_round_robin', 'double_round_robin'];

const DIVISION_CONFIG = [
  { level: 5, name: 'Div 5', entryFee: 50,   prize: 200,  maxPlayers: null },
  { level: 4, name: 'Div 4', entryFee: 100,  prize: 500,  maxPlayers: 20 },
  { level: 3, name: 'Div 3', entryFee: 200,  prize: 1000, maxPlayers: 20 },
  { level: 2, name: 'Div 2', entryFee: 500,  prize: 2500, maxPlayers: 20 },
  { level: 1, name: 'Div 1', entryFee: 1000, prize: 5000, maxPlayers: 20 },
];

// FIX: service role client at module level — not recreated per request
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // FIX: use anon client + auth header pattern (consistent with all other functions)
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

    // Admin check via service role client
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      console.error('Non-admin user attempted season initialisation:', user.id);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FIX: wrap req.json() — malformed body returns clean 400
    let body: { sport?: string; format?: string; registrationDeadline?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { sport, format = 'single_round_robin', registrationDeadline: customDeadline } = body;

    // FIX: validate sport — SPORTS array was defined but never used for validation
    if (!sport || !VALID_SPORTS.includes(sport)) {
      return new Response(
        JSON.stringify({ error: `Invalid or missing sport. Must be one of: ${VALID_SPORTS.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FIX: validate format
    if (!VALID_FORMATS.includes(format)) {
      return new Response(
        JSON.stringify({ error: 'Invalid format. Must be single_round_robin or double_round_robin' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FIX: validate customDeadline if provided — new Date('garbage') produces Invalid Date silently
    if (customDeadline) {
      const parsed = new Date(customDeadline);
      if (isNaN(parsed.getTime())) {
        return new Response(
          JSON.stringify({ error: 'Invalid registrationDeadline date format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // FIX: check for an already active/upcoming season for this sport
    // Prevents duplicate overlapping seasons if admin calls this twice
    const { data: activeSeason } = await supabase
      .from('seasons')
      .select('id, season_number, status')
      .eq('sport', sport)
      .in('status', ['upcoming', 'active'])
      .maybeSingle();

    if (activeSeason) {
      return new Response(
        JSON.stringify({
          error: `An active or upcoming season already exists for ${sport} (Season ${activeSeason.season_number})`,
          existingSeasonId: activeSeason.id,
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get latest season number
    const { data: lastSeason } = await supabase
      .from('seasons')
      .select('season_number, id')
      .eq('sport', sport)
      .order('season_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const newSeasonNumber = (lastSeason?.season_number || 0) + 1;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 2);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (format === 'double_round_robin' ? 42 : 28));

    const registrationDeadline = customDeadline
      ? new Date(customDeadline)
      : (() => {
          const d = new Date(startDate);
          d.setDate(d.getDate() - 2);
          return d;
        })();

    // Create new season
    const { data: newSeason, error: seasonError } = await supabase
      .from('seasons')
      .insert({
        sport,
        season_number: newSeasonNumber,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'upcoming',
      })
      .select()
      .single();

    if (seasonError) throw seasonError;

    console.log(`Created season ${newSeasonNumber} for ${sport} (${format})`);

    // Create competitions for all divisions
    const competitions = [];
    const failedDivisions: string[] = [];

    for (const divConfig of DIVISION_CONFIG) {
      const { data: competition, error: compError } = await supabase
        .from('competitions')
        .insert({
          sport,
          division: divConfig.level,
          season_id: newSeason.id,
          name: `${sport.charAt(0).toUpperCase() + sport.slice(1)} ${divConfig.name} - Season ${newSeasonNumber}`,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          status: 'upcoming',
          prize_coins: divConfig.prize,
          entry_fee: divConfig.entryFee,
          max_participants: divConfig.maxPlayers,
          match_generation_status: 'pending',
          format,
          registration_deadline: registrationDeadline.toISOString(),
          min_participants: 4,
        })
        .select()
        .single();

      if (compError) {
        console.error(`Failed to create competition for ${divConfig.name}:`, compError);
        failedDivisions.push(divConfig.name);
        continue;
      }

      competitions.push(competition);
      console.log(`Created competition: ${competition.name}`);
    }

    // FIX: only mark previous season as completed if ALL competitions were created successfully.
    // Previously this ran regardless of how many division inserts failed, leaving orphaned seasons.
    if (failedDivisions.length === 0 && lastSeason) {
      const { error: updateError } = await supabase
        .from('seasons')
        .update({ status: 'completed' })
        .eq('id', lastSeason.id);

      if (updateError) {
        console.error('Failed to mark previous season as completed:', updateError);
      }
    } else if (failedDivisions.length > 0) {
      console.warn(`${failedDivisions.length} division(s) failed to create: ${failedDivisions.join(', ')}`);
    }

    // FIX: surface partial failures in response instead of always returning success: true
    const allSucceeded = failedDivisions.length === 0;

    return new Response(
      JSON.stringify({
        success: allSucceeded,
        ...(failedDivisions.length > 0 && {
          warning: `${failedDivisions.length} division(s) failed to create: ${failedDivisions.join(', ')}`,
        }),
        season: newSeason,
        competitions,
      }),
      {
        status: allSucceeded ? 200 : 207, // 207 Multi-Status for partial success
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    // FIX: safely extract message from unknown error type
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error initialising season:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
