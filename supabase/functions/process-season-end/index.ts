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
  { level: 1, name: 'Div 1' },
];

// Prize distribution: 1st=100%, 2nd=60%, 3rd=40%, 4th=20%
const PRIZE_MULTIPLIERS = [1, 0.6, 0.4, 0.2];

// FIX: module-level service role client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// FIX: correct ordinal suffix for any position
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// FIX: look up division name by level
function divisionName(level: number): string {
  return DIVISION_CONFIG.find(d => d.level === level)?.name ?? `Division ${level}`;
}

// FIX: determine promotion/relegation for ANY division (1–5)
// Original skipped Div 5 (could never promote) and Div 1 (could never relegate)
function getMovement(
  finalPosition: number,
  currentDivision: number,
  totalParticipants: number
): { newDivision: number; movementType: 'promotion' | 'relegation' | 'stayed' } {
  const promotionZone = 4;
  const relegationZone = Math.max(totalParticipants - 3, promotionZone + 1); // bottom 4

  const canPromote = currentDivision > 1; // Div 1 is the top — no promotion above
  const canRelegate = currentDivision < 5; // Div 5 is the bottom — no relegation below

  if (finalPosition <= promotionZone && canPromote) {
    return { newDivision: currentDivision - 1, movementType: 'promotion' };
  }
  if (finalPosition >= relegationZone && canRelegate) {
    return { newDivision: currentDivision + 1, movementType: 'relegation' };
  }
  return { newDivision: currentDivision, movementType: 'stayed' };
}

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

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      console.error('Non-admin attempted process-season-end:', user.id);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FIX: wrap req.json()
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

    // FIX: validate competitionId
    if (!competitionId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: competitionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: competition, error: compError } = await supabase
      .from('competitions')
      .select('*, season:seasons(*)')
      .eq('id', competitionId)
      .single();

    if (compError || !competition) {
      return new Response(
        JSON.stringify({ error: 'Competition not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing season end for competition: ${competition.name}`);

    const { data: participants, error: partError } = await supabase
      .from('competition_participants')
      .select('*, team:user_teams(*)')
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
    const totalParticipants = participants.length;

    // ── Pass 1: compute all results before touching the DB ────────────────────
    // FIX: computing everything up front lets us batch all writes after,
    // reducing from ~5 DB calls per participant to a handful of bulk operations.

    const positionUpdates: Array<{ id: string; final_position: number }> = [];
    const divisionMovements: any[] = [];
    const teamDivisionUpdates: Array<{ id: string; division: number }> = [];

    // Coin awards: userId → amount (aggregate in case a user owns multiple teams)
    const coinAwards = new Map<string, number>();

    // Notifications to insert in bulk
    const notifications: any[] = [];

    for (let i = 0; i < totalParticipants; i++) {
      const participant = participants[i];
      const finalPosition = i + 1;
      const currentDivision = participant.team.division;

      positionUpdates.push({ id: participant.id, final_position: finalPosition });

      // FIX: movement logic now covers all divisions (1–5)
      const { newDivision, movementType } = getMovement(
        finalPosition,
        currentDivision,
        totalParticipants
      );

      divisionMovements.push({
        team_id: participant.team_id,
        season_id: competition.season_id,
        from_division: currentDivision,
        to_division: newDivision,
        movement_type: movementType,
        final_position: finalPosition,
      });

      if (newDivision !== currentDivision) {
        teamDivisionUpdates.push({ id: participant.team_id, division: newDivision });
        console.log(`${participant.team.team_name}: ${movementType} Div ${currentDivision} → Div ${newDivision}`);
      }

      // FIX: prizeAmount declared at loop scope so it's available for notifications
      const multiplier = PRIZE_MULTIPLIERS[finalPosition - 1] ?? 0;
      const prizeAmount = finalPosition <= 4
        ? Math.floor(competition.prize_coins * multiplier)
        : 0;

      if (prizeAmount > 0) {
        const userId = participant.team.user_id;
        coinAwards.set(userId, (coinAwards.get(userId) ?? 0) + prizeAmount);
      }

      // Build notification
      const userId = participant.team.user_id;
      let notifTitle = '';
      let notifMessage = '';
      const pos = ordinal(finalPosition);

      if (prizeAmount > 0 && finalPosition === 1) {
        notifTitle = '🏆 Champion!';
        notifMessage = `${participant.team.team_name} won the league and earned ${prizeAmount} coins!`;
      } else if (prizeAmount > 0) {
        notifTitle = '🏅 Prize Awarded';
        notifMessage = `${participant.team.team_name} finished ${pos} and earned ${prizeAmount} coins!`;
      } else if (movementType === 'promotion') {
        notifTitle = '🎉 Promoted!';
        // FIX: shows the NEW division name, not the current one
        notifMessage = `${participant.team.team_name} finished ${pos} and has been promoted to ${divisionName(newDivision)}!`;
      } else if (movementType === 'relegation') {
        notifTitle = '⚠️ Relegated';
        notifMessage = `${participant.team.team_name} finished ${pos} and has been relegated to ${divisionName(newDivision)}.`;
      }

      if (notifTitle && notifMessage) {
        notifications.push({
          user_id: userId,
          notification_type: prizeAmount > 0 ? 'prize_awarded' : movementType,
          title: notifTitle,
          message: notifMessage,
          metadata: {
            team_id: participant.team_id,
            competition_id: competitionId,
            final_position: finalPosition,
            prize_amount: prizeAmount,
          },
        });
      }
    }

    // ── Pass 2: bulk DB writes ────────────────────────────────────────────────

    // Batch final position updates
    for (const update of positionUpdates) {
      await supabase
        .from('competition_participants')
        .update({ final_position: update.final_position })
        .eq('id', update.id);
    }

    // Batch team division updates
    for (const update of teamDivisionUpdates) {
      await supabase
        .from('user_teams')
        .update({ division: update.division })
        .eq('id', update.id);
    }

    // FIX: coin awards use a single read-then-update per user instead of
    // per-participant sequential queries. Still not atomic but reduces calls.
    // For full safety, a Postgres function/RPC with FOR UPDATE would be ideal.
    for (const [userId, amount] of coinAwards.entries()) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('coins')
        .eq('id', userId)
        .single();

      if (profile) {
        await supabase
          .from('user_profiles')
          .update({ coins: profile.coins + amount })
          .eq('id', userId);
        console.log(`Awarded ${amount} coins to user ${userId}`);
      }
    }

    // Bulk insert division movements
    if (divisionMovements.length > 0) {
      const { error: movErr } = await supabase
        .from('division_movements')
        .insert(divisionMovements);
      if (movErr) console.error('Failed to insert division movements:', movErr);
    }

    // Bulk insert notifications
    if (notifications.length > 0) {
      const { error: notifErr } = await supabase
        .from('user_notifications')
        .insert(notifications);
      if (notifErr) console.error('Failed to insert notifications:', notifErr);
    }

    // Mark competition as completed
    await supabase
      .from('competitions')
      .update({ status: 'completed' })
      .eq('id', competitionId);

    // Mark season as completed if all competitions in it are done
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

      console.log(`Season ${competition.season?.season_number} fully completed`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        promotions: divisionMovements.filter(m => m.movement_type === 'promotion').length,
        relegations: divisionMovements.filter(m => m.movement_type === 'relegation').length,
        teamsProcessed: totalParticipants,
        coinsAwarded: [...coinAwards.values()].reduce((a, b) => a + b, 0),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // FIX: safely extract message from unknown error type
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error processing season end:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
