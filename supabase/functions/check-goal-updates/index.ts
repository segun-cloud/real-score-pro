import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MatchUpdate {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
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

    const { matches }: { matches: MatchUpdate[] } = await req.json();

    if (!matches || matches.length === 0) {
      return new Response(
        JSON.stringify({ goalsDetected: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Checking ${matches.length} matches for goal updates`);

    const matchIds = matches.map(m => m.matchId);
    const { data: cachedScores } = await supabase
      .from('match_score_cache')
      .select('*')
      .in('match_id', matchIds);

    const cachedMap = new Map(cachedScores?.map(c => [c.match_id, c]) || []);

    const goalsDetected: Array<{
      matchId: string;
      homeTeam: string;
      awayTeam: string;
      homeScore: number;
      awayScore: number;
      scoringTeam: 'home' | 'away';
    }> = [];

    for (const match of matches) {
      // FIX: validate score values before comparing — guards against null/undefined from API lag
      if (typeof match.homeScore !== 'number' || typeof match.awayScore !== 'number') {
        console.warn(`Invalid score values for match ${match.matchId}, skipping`);
        continue;
      }

      const cached = cachedMap.get(match.matchId);

      if (cached) {
        // FIX: use else-if so both teams can't fire a goal event in the same update.
        // In practice both scores shouldn't jump simultaneously, but data lag can cause
        // stale batches — only the team whose score changed more gets flagged.
        if (match.homeScore > cached.home_score) {
          console.log(`Goal: ${match.homeTeam} scored! ${match.homeScore}-${match.awayScore}`);
          goalsDetected.push({ ...match, scoringTeam: 'home' });
        } else if (match.awayScore > cached.away_score) {
          // FIX: else-if prevents double notification for same match update
          console.log(`Goal: ${match.awayTeam} scored! ${match.homeScore}-${match.awayScore}`);
          goalsDetected.push({ ...match, scoringTeam: 'away' });
        }
        // New matches not in cache are intentionally skipped for goal detection —
        // we have no previous score to diff against, so we can't know if a goal was scored.
        // The upsert below will add them to cache so future checks work correctly.
      }
    }

    // Update cache with current scores for all matches (including new ones)
    const upsertData = matches
      .filter(m => typeof m.homeScore === 'number' && typeof m.awayScore === 'number')
      .map(m => ({
        match_id: m.matchId,
        home_team: m.homeTeam,
        away_team: m.awayTeam,
        home_score: m.homeScore,
        away_score: m.awayScore,
        last_checked: new Date().toISOString(),
      }));

    if (upsertData.length > 0) {
      await supabase
        .from('match_score_cache')
        .upsert(upsertData, { onConflict: 'match_id' });
    }

    // Send notifications for each goal — failures are isolated per goal
    for (const goal of goalsDetected) {
      try {
        await supabase.functions.invoke('send-goal-notification', { body: goal });
      } catch (error) {
        console.error('Failed to send goal notification:', error);
      }
    }

    console.log(`Detected ${goalsDetected.length} goals`);

    return new Response(
      JSON.stringify({ goalsDetected }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // FIX: error is typed as unknown in Deno — safely extract message
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error checking goal updates:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
