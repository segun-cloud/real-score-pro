import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APISPORTS_KEY = Deno.env.get('APISPORTS_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface LiveScore {
  match_id: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  status: string;
  minute: number | null;
  league_name: string;
  home_team_logo: string | null;
  away_team_logo: string | null;
  sport: string;
  match_date: string | null;
  last_updated: string;
}

function mapStatus(apiStatus: string): string {
  const liveStatuses = ['1H', '2H', 'HT', 'ET', 'P', 'LIVE', 'BT'];
  const finishedStatuses = ['FT', 'AET', 'PEN', 'FT_PEN', 'WO', 'AWD'];
  if (liveStatuses.includes(apiStatus)) return 'live';
  if (finishedStatuses.includes(apiStatus)) return 'finished';
  return 'scheduled';
}

async function fetchLiveMatches(): Promise<LiveScore[]> {
  if (!APISPORTS_KEY) {
    console.log('No API-Sports key configured');
    return [];
  }

  try {
    const url = 'https://v3.football.api-sports.io/fixtures?live=all';
    console.log('Fetching live matches from API-Sports...');
    
    const response = await fetch(url, {
      headers: { 'x-apisports-key': APISPORTS_KEY },
    });
    
    if (!response.ok) {
      console.error('API-Sports error:', response.status, await response.text());
      return [];
    }

    const data = await response.json();
    const fixtures = data.response || [];
    console.log(`Found ${fixtures.length} live matches`);

    return fixtures.map((f: any) => ({
      match_id: `apisports-football-${f.fixture.id}`,
      home_team: f.teams.home.name,
      away_team: f.teams.away.name,
      home_score: f.goals.home ?? 0,
      away_score: f.goals.away ?? 0,
      status: mapStatus(f.fixture.status.short),
      minute: f.fixture.status.elapsed,
      league_name: f.league.name,
      home_team_logo: f.teams.home.logo,
      away_team_logo: f.teams.away.logo,
      sport: 'football',
      match_date: f.fixture.date,
      last_updated: new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching live matches:', error);
    return [];
  }
}

async function updateLiveScores(scores: LiveScore[]): Promise<{ updated: number; inserted: number }> {
  let updated = 0;
  let inserted = 0;

  for (const score of scores) {
    const { data: existing } = await supabase
      .from('live_scores')
      .select('home_score, away_score, minute, status')
      .eq('match_id', score.match_id)
      .maybeSingle();

    if (existing) {
      if (
        existing.home_score !== score.home_score ||
        existing.away_score !== score.away_score ||
        existing.minute !== score.minute ||
        existing.status !== score.status
      ) {
        const { error } = await supabase
          .from('live_scores')
          .update({
            home_score: score.home_score,
            away_score: score.away_score,
            minute: score.minute,
            status: score.status,
            last_updated: score.last_updated,
          })
          .eq('match_id', score.match_id);

        if (!error) updated++;
        else console.error('Error updating score:', error);
      }
    } else {
      const { error } = await supabase
        .from('live_scores')
        .insert(score);

      if (!error) inserted++;
      else console.error('Error inserting score:', error);
    }
  }

  // Clean up finished matches older than 2 hours
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  await supabase
    .from('live_scores')
    .delete()
    .eq('status', 'finished')
    .lt('last_updated', twoHoursAgo);

  return { updated, inserted };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting live score update...');
    
    const liveScores = await fetchLiveMatches();
    
    if (liveScores.length === 0) {
      console.log('No live matches found');
      return new Response(
        JSON.stringify({ success: true, message: 'No live matches', updated: 0, inserted: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { updated, inserted } = await updateLiveScores(liveScores);
    
    console.log(`Live scores updated - Updated: ${updated}, Inserted: ${inserted}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        liveMatches: liveScores.length,
        updated,
        inserted
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in update-live-scores:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
