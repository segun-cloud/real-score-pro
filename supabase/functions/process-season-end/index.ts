import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DIVISION_CONFIG = [
  { level: 5, name: 'Div 5' },
  { level: 4, name: 'Div 4' },
  { level: 3, name: 'Div 3' },
  { level: 2, name: 'Div 2' },
  { level: 1, name: 'Div 1' }
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

    const { competitionId } = await req.json();

    // Get competition details
    const { data: competition, error: compError } = await supabase
      .from('competitions')
      .select('*, season:seasons(*)')
      .eq('id', competitionId)
      .single();

    if (compError) throw compError;

    console.log(`Processing season end for competition: ${competition.name}`);

    // Get all participants ordered by points, then goal difference, then goals scored
    const { data: participants, error: partError } = await supabase
      .from('competition_participants')
      .select(`
        *,
        team:user_teams(*)
      `)
      .eq('competition_id', competitionId)
      .order('points_earned', { ascending: false })
      .order('goal_difference', { ascending: false })
      .order('goals_for', { ascending: false });

    if (partError) throw partError;

    if (!participants || participants.length === 0) {
      console.log('No participants to process');
      return new Response(
        JSON.stringify({ success: true, message: 'No participants' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const division = competition.division;
    const divisionMovements = [];
    const teamUpdates = [];
    const divisionConfig = DIVISION_CONFIG.find(d => d.level === division);

    // Process each team's final position
    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      const finalPosition = i + 1;
      const currentDivision = participant.team.division;

      // Update final position
      await supabase
        .from('competition_participants')
        .update({ final_position: finalPosition })
        .eq('id', participant.id);

      // Determine promotion/relegation
      let newDivision = currentDivision;
      let movementType: 'promotion' | 'relegation' | 'stayed' = 'stayed';

      // Division movement logic
      if (division > 1 && division <= 4) {
        // Div 4-1: Top 4 promote (if not already in Div 1)
        if (finalPosition <= 4 && currentDivision > 1) {
          newDivision = currentDivision - 1;
          movementType = 'promotion';
        }
        // Bottom 4 relegate (positions 17-20)
        else if (finalPosition >= 17 && finalPosition <= 20) {
          newDivision = currentDivision + 1;
          movementType = 'relegation';
        }
      }
      
      // For Div 1, top 4 stay in Div 1 (no promotion above)
      if (division === 1 && finalPosition <= 4) {
        movementType = 'stayed';
      }

      // Record division movement
      divisionMovements.push({
        team_id: participant.team_id,
        season_id: competition.season_id,
        from_division: currentDivision,
        to_division: newDivision,
        movement_type: movementType,
        final_position: finalPosition
      });

      // Update team division if changed
      if (newDivision !== currentDivision) {
        teamUpdates.push({
          id: participant.team_id,
          division: newDivision
        });

        console.log(`Team ${participant.team.team_name}: ${movementType} from Div ${currentDivision} to Div ${newDivision}`);
      }

      // Award prize coins to top finishers (top 4 get prizes)
      if (finalPosition <= 4) {
        const prizes = [
          competition.prize_coins,                      // 1st: 100%
          Math.floor(competition.prize_coins * 0.6),   // 2nd: 60%
          Math.floor(competition.prize_coins * 0.4),   // 3rd: 40%
          Math.floor(competition.prize_coins * 0.2)    // 4th: 20%
        ];
        const prizeAmount = prizes[finalPosition - 1] || 0;

        if (prizeAmount > 0) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('coins')
            .eq('id', participant.team.user_id)
            .single();

          if (profile) {
            await supabase
              .from('user_profiles')
              .update({ coins: profile.coins + prizeAmount })
              .eq('id', participant.team.user_id);

            console.log(`Awarded ${prizeAmount} coins to team ${participant.team.team_name} (position ${finalPosition})`);
          }
        }
      }

      // Create notification for each affected team
      const { data: teamProfile } = await supabase
        .from('user_teams')
        .select('user_id')
        .eq('id', participant.team_id)
        .single();

      if (teamProfile && (movementType === 'promotion' || movementType === 'relegation' || finalPosition <= 4)) {
        let notifTitle = '';
        let notifMessage = '';

        if (movementType === 'promotion') {
          notifTitle = '🎉 Promoted!';
          notifMessage = `Congratulations! ${participant.team.team_name} finished ${finalPosition}${finalPosition === 1 ? 'st' : finalPosition === 2 ? 'nd' : finalPosition === 3 ? 'rd' : 'th'} and has been promoted to ${divisionConfig?.name || `Division ${newDivision}`}!`;
        } else if (movementType === 'relegation') {
          notifTitle = '⚠️ Relegated';
          notifMessage = `${participant.team.team_name} finished ${finalPosition}${finalPosition === 17 ? 'th' : finalPosition === 18 ? 'th' : finalPosition === 19 ? 'th' : 'th'} and has been relegated to ${divisionConfig?.name || `Division ${newDivision}`}.`;
        }

        if (prizeAmount > 0) {
          notifTitle = finalPosition === 1 ? '🏆 Champion!' : `${notifTitle || '🏅 Prize Awarded'}`;
          notifMessage = `${participant.team.team_name} finished ${finalPosition}${finalPosition === 1 ? 'st' : finalPosition === 2 ? 'nd' : finalPosition === 3 ? 'rd' : 'th'} and won ${prizeAmount} coins!`;
        }

        if (notifTitle && notifMessage) {
          await supabase
            .from('user_notifications')
            .insert({
              user_id: teamProfile.user_id,
              notification_type: prizeAmount > 0 ? 'prize_awarded' : movementType,
              title: notifTitle,
              message: notifMessage,
              metadata: {
                team_id: participant.team_id,
                competition_id: competitionId,
                final_position: finalPosition,
                prize_amount: prizeAmount
              }
            });
        }
      }
    }

    // Insert division movements
    if (divisionMovements.length > 0) {
      await supabase
        .from('division_movements')
        .insert(divisionMovements);
    }

    // Update team divisions
    for (const update of teamUpdates) {
      await supabase
        .from('user_teams')
        .update({ division: update.division })
        .eq('id', update.id);
    }

    // Mark competition as completed
    await supabase
      .from('competitions')
      .update({ status: 'completed' })
      .eq('id', competitionId);

    // Mark season as completed if all competitions are done
    const { data: remainingComps } = await supabase
      .from('competitions')
      .select('id')
      .eq('season_id', competition.season_id)
      .neq('status', 'completed');

    if (!remainingComps || remainingComps.length === 0) {
      await supabase
        .from('seasons')
        .update({ status: 'completed' })
        .eq('id', competition.season_id);

      console.log(`Season ${competition.season.season_number} completed`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        promotions: divisionMovements.filter(m => m.movement_type === 'promotion').length,
        relegations: divisionMovements.filter(m => m.movement_type === 'relegation').length,
        teamsProcessed: participants.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing season end:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});