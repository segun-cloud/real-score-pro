import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sport, feedType, limit = 20 } = await req.json();
    console.log(`Fetching ${feedType} feeds for ${sport}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let feeds: any[] = [];

    if (feedType === 'highlights') {
      // Fetch recent matches with videos from cache
      const { data: matches } = await supabase
        .from('api_match_cache')
        .select('*')
        .eq('sport', sport)
        .eq('status', 'finished')
        .not('video_url', 'is', null)
        .order('match_date', { ascending: false })
        .limit(limit);

      feeds = (matches || []).map((match: any) => ({
        type: 'highlights',
        title: `${match.home_team} vs ${match.away_team} - Highlights`,
        description: `Watch the highlights from ${match.league_name}`,
        sport: match.sport,
        videoUrl: match.video_url,
        timestamp: match.match_date,
        matchId: match.api_match_id,
      }));
    } else if (feedType === 'updates') {
      // Fetch upcoming matches
      const today = new Date().toISOString().split('T')[0];
      const { data: matches } = await supabase
        .from('api_match_cache')
        .select('*')
        .eq('sport', sport)
        .gte('match_date', today)
        .order('match_date', { ascending: true })
        .limit(limit);

      feeds = (matches || []).map((match: any) => ({
        type: 'updates',
        title: `Upcoming: ${match.home_team} vs ${match.away_team}`,
        description: `${match.league_name} - ${new Date(match.match_date).toLocaleString()}`,
        sport: match.sport,
        timestamp: match.match_date,
        matchId: match.api_match_id,
      }));
    } else if (feedType === 'news') {
      // Placeholder for news integration
      feeds = [
        {
          type: 'news',
          title: 'News Coming Soon',
          description: 'We are working on integrating real-time sports news',
          sport,
          timestamp: new Date().toISOString(),
        },
      ];
    } else if (feedType === 'transfers') {
      // Placeholder for transfers
      feeds = [
        {
          type: 'transfers',
          title: 'Transfer Updates Coming Soon',
          description: 'Stay tuned for the latest transfer news',
          sport,
          timestamp: new Date().toISOString(),
        },
      ];
    }

    console.log(`Returning ${feeds.length} feed items`);

    return new Response(JSON.stringify({ feeds }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching feeds:', error);
    return new Response(JSON.stringify({ error: error.message, feeds: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
