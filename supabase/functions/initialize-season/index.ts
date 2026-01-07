import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPORTS = ['football', 'basketball', 'tennis', 'baseball', 'boxing', 'cricket', 'ice-hockey', 'rugby', 'american-football'];

const DIVISION_CONFIG = [
  { level: 5, name: 'Div 5', entryFee: 50, prize: 200, maxPlayers: null },
  { level: 4, name: 'Div 4', entryFee: 100, prize: 500, maxPlayers: 20 },
  { level: 3, name: 'Div 3', entryFee: 200, prize: 1000, maxPlayers: 20 },
  { level: 2, name: 'Div 2', entryFee: 500, prize: 2500, maxPlayers: 20 },
  { level: 1, name: 'Div 1', entryFee: 1000, prize: 5000, maxPlayers: 20 }
];

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

    const { sport, format = 'single_round_robin' } = await req.json();
    
    // Validate format
    const validFormats = ['single_round_robin', 'double_round_robin'];
    if (!validFormats.includes(format)) {
      return new Response(
        JSON.stringify({ error: 'Invalid format. Must be single_round_robin or double_round_robin' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get the latest season number for this sport
    const { data: lastSeason } = await supabase
      .from('seasons')
      .select('season_number')
      .eq('sport', sport)
      .order('season_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const newSeasonNumber = (lastSeason?.season_number || 0) + 1;

    // Create new season (4 weeks for single, 6 weeks for double round-robin)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 2); // Start in 2 days
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (format === 'double_round_robin' ? 42 : 28)); // 6 weeks for double, 4 for single

    const { data: newSeason, error: seasonError } = await supabase
      .from('seasons')
      .insert({
        sport,
        season_number: newSeasonNumber,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'upcoming'
      })
      .select()
      .single();

    if (seasonError) throw seasonError;

    console.log(`Created season ${newSeasonNumber} for ${sport} with ${format} format`);

    // Calculate registration deadline (2 days before start)
    const registrationDeadline = new Date(startDate);
    registrationDeadline.setDate(registrationDeadline.getDate() - 2);

    // Create competitions for each division
    const competitions = [];
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
          format: format,
          registration_deadline: registrationDeadline.toISOString(),
          min_participants: 4
        })
        .select()
        .single();

      if (compError) {
        console.error(`Error creating competition for ${divConfig.name}:`, compError);
        continue;
      }

      competitions.push(competition);
      console.log(`Created competition: ${competition.name}`);
    }

    // Mark previous season as completed
    if (lastSeason) {
      await supabase
        .from('seasons')
        .update({ status: 'completed' })
        .eq('sport', sport)
        .eq('season_number', lastSeason.season_number);
    }

    return new Response(
      JSON.stringify({
        success: true,
        season: newSeason,
        competitions: competitions
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error initializing season:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});