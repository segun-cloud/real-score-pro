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

    const { sport } = await req.json();
    
    // Get the latest season number for this sport
    const { data: lastSeason } = await supabase
      .from('seasons')
      .select('season_number')
      .eq('sport', sport)
      .order('season_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const newSeasonNumber = (lastSeason?.season_number || 0) + 1;

    // Create new season (4 weeks duration)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 2); // Start in 2 days
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 28); // 4 weeks

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

    console.log(`Created season ${newSeasonNumber} for ${sport}`);

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
          match_generation_status: 'pending'
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