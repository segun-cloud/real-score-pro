import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FIX: Supabase client created once at module level, not per request
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const VALID_FEED_TYPES = ['highlights', 'updates', 'news', 'transfers'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // FIX: verify Supabase JWT — this endpoint reads DB data, should be authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FIX: wrap req.json() — malformed body returns clean 400
    let body: { sport?: string; feedType?: string; limit?: number };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { sport, feedType, limit = 20 } = body;

    // FIX: validate required fields
    if (!sport) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: sport' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!feedType) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: feedType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FIX: validate feedType to prevent unexpected DB queries on unknown types
    if (!VALID_FEED_TYPES.includes(feedType)) {
      return new Response(
        JSON.stringify({ error: `Invalid feedType. Must be one of: ${VALID_FEED_TYPES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FIX: cap limit to prevent accidental or malicious large queries
    const safeLimit = Math.min(Number(limit) || 20, 100);

    console.log(`Fetching ${feedType} feeds for ${sport}, limit: ${safeLimit}`);

    let feeds: any[] = [];

    if (feedType === 'highlights') {
      const { data: matches, error } = await supabase
        .from('api_match_cache')
        .select('*')
        .eq('sport', sport)
        .eq('status', 'finished')
        .not('video_url', 'is', null)
        .order('match_date', { ascending: false })
        .limit(safeLimit);

      // FIX: log DB errors instead of silently returning empty array
      if (error) console.error('DB error fetching highlights:', error);

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
      const today = new Date().toISOString().split('T')[0];
      const { data: matches, error } = await supabase
        .from('api_match_cache')
        .select('*')
        .eq('sport', sport)
        .gte('match_date', today)
        .order('match_date', { ascending: true })
        .limit(safeLimit);

      if (error) console.error('DB error fetching updates:', error);

      feeds = (matches || []).map((match: any) => ({
        type: 'updates',
        title: `Upcoming: ${match.home_team} vs ${match.away_team}`,
        description: `${match.league_name} - ${new Date(match.match_date).toLocaleString()}`,
        sport: match.sport,
        timestamp: match.match_date,
        matchId: match.api_match_id,
      }));

    } else if (feedType === 'news') {
      // Placeholder — real news integration pending
      feeds = [{
        type: 'news',
        title: 'News Coming Soon',
        description: 'We are working on integrating real-time sports news',
        sport,
        timestamp: new Date().toISOString(),
      }];

    } else if (feedType === 'transfers') {
      // Placeholder — transfer feed integration pending
      feeds = [{
        type: 'transfers',
        title: 'Transfer Updates Coming Soon',
        description: 'Stay tuned for the latest transfer news',
        sport,
        timestamp: new Date().toISOString(),
      }];
    }

    console.log(`Returning ${feeds.length} feed items`);

    return new Response(JSON.stringify({ feeds }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // FIX: safely extract message from unknown error type
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error fetching feeds:', message);
    return new Response(JSON.stringify({ error: message, feeds: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
