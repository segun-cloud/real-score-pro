import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPORTMONKS_API_KEY = Deno.env.get('SPORTMONKS_API_KEY');
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

function mapStatus(fixture: any): string {
  const statusId = fixture.state_id;
  const statusName = fixture.state?.name?.toLowerCase() || '';
  
  // Live statuses
  if ([2, 3, 4, 5].includes(statusId) || 
      ['live', 'inplay', 'playing', '1st half', '2nd half', 'halftime', 'extra time', 'penalties'].includes(statusName)) {
    return 'live';
  }
  
  // Finished statuses
  if ([5, 6, 7, 8, 9, 10, 11].includes(statusId) || 
      ['finished', 'ft', 'aet', 'pen', 'ended', 'full time'].includes(statusName)) {
    return 'finished';
  }
  
  return 'scheduled';
}

function getCurrentMinute(fixture: any): number | null {
  if (fixture.minute) return fixture.minute;
  if (fixture.time?.minute) return fixture.time.minute;
  if (fixture.periods) {
    const periods = fixture.periods;
    if (periods.length > 0) {
      const lastPeriod = periods[periods.length - 1];
      if (lastPeriod.minutes) return lastPeriod.minutes;
    }
  }
  return null;
}

function parseScores(fixture: any): { homeScore: number; awayScore: number } {
  let homeScore = 0;
  let awayScore = 0;

  if (fixture.scores) {
    const scores = fixture.scores;
    if (Array.isArray(scores)) {
      const ftScore = scores.find((s: any) => s.description === 'CURRENT' || s.description === '2ND_HALF');
      if (ftScore) {
        homeScore = ftScore.score?.participant === 'home' ? ftScore.score.goals : homeScore;
        awayScore = ftScore.score?.participant === 'away' ? ftScore.score.goals : awayScore;
      }
      scores.forEach((s: any) => {
        if (s.score?.participant === 'home') homeScore = Math.max(homeScore, s.score.goals || 0);
        if (s.score?.participant === 'away') awayScore = Math.max(awayScore, s.score.goals || 0);
      });
    }
  }

  if (fixture.score) {
    if (typeof fixture.score === 'string') {
      const parts = fixture.score.split('-');
      if (parts.length === 2) {
        homeScore = parseInt(parts[0].trim()) || 0;
        awayScore = parseInt(parts[1].trim()) || 0;
      }
    }
  }

  if (fixture.result_info) {
    const match = fixture.result_info.match(/(\d+)-(\d+)/);
    if (match) {
      homeScore = parseInt(match[1]) || 0;
      awayScore = parseInt(match[2]) || 0;
    }
  }

  return { homeScore, awayScore };
}

async function fetchLiveMatches(): Promise<LiveScore[]> {
  if (!SPORTMONKS_API_KEY) {
    console.log('No SportMonks API key configured');
    return [];
  }

  try {
    const url = `https://api.sportmonks.com/v3/football/livescores/inplay?api_token=${SPORTMONKS_API_KEY}&include=participants;league;scores;state`;
    console.log('Fetching live matches from SportMonks...');
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('SportMonks API error:', response.status, await response.text());
      return [];
    }

    const data = await response.json();
    const fixtures = data.data || [];
    console.log(`Found ${fixtures.length} live matches`);

    return fixtures.map((fixture: any) => {
      const participants = fixture.participants || [];
      const homeTeam = participants.find((p: any) => p.meta?.location === 'home');
      const awayTeam = participants.find((p: any) => p.meta?.location === 'away');
      const { homeScore, awayScore } = parseScores(fixture);

      return {
        match_id: String(fixture.id),
        home_team: homeTeam?.name || 'Home Team',
        away_team: awayTeam?.name || 'Away Team',
        home_score: homeScore,
        away_score: awayScore,
        status: mapStatus(fixture),
        minute: getCurrentMinute(fixture),
        league_name: fixture.league?.name || 'Unknown League',
        home_team_logo: homeTeam?.image_path || null,
        away_team_logo: awayTeam?.image_path || null,
        sport: 'football',
        match_date: fixture.starting_at || null,
        last_updated: new Date().toISOString(),
      };
    });
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
      .single();

    // Only update if something changed
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

serve(async (req) => {
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
