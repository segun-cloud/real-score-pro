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

    // Get cached scores for these matches
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

    // Check each match for score changes
    for (const match of matches) {
      const cached = cachedMap.get(match.matchId);
      
      if (cached) {
        // Check if home team scored
        if (match.homeScore > cached.home_score) {
          console.log(`Goal detected: ${match.homeTeam} scored! ${match.homeScore}-${match.awayScore}`);
          goalsDetected.push({
            ...match,
            scoringTeam: 'home'
          });
        }
        
        // Check if away team scored
        if (match.awayScore > cached.away_score) {
          console.log(`Goal detected: ${match.awayTeam} scored! ${match.homeScore}-${match.awayScore}`);
          goalsDetected.push({
            ...match,
            scoringTeam: 'away'
          });
        }
      }
    }

    // Update cache with current scores
    const upsertData = matches.map(m => ({
      match_id: m.matchId,
      home_team: m.homeTeam,
      away_team: m.awayTeam,
      home_score: m.homeScore,
      away_score: m.awayScore,
      last_checked: new Date().toISOString()
    }));

    await supabase
      .from('match_score_cache')
      .upsert(upsertData, { onConflict: 'match_id' });

    // Send notifications for each goal detected
    for (const goal of goalsDetected) {
      try {
        await supabase.functions.invoke('send-goal-notification', {
          body: goal
        });
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
    console.error('Error checking goal updates:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
