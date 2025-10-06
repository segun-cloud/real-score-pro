const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sport, homeTeamId, awayTeamId } = await req.json();
    console.log(`Fetching highlights for ${sport}: ${homeTeamId} vs ${awayTeamId}`);

    const apiKey = Deno.env.get('API_SPORTS_KEY'); // AllSportsAPI key
    if (!apiKey) {
      throw new Error('API_SPORTS_KEY not configured');
    }

    let highlights: any[] = [];

    if (sport === 'football') {
      highlights = await fetchFootballHighlights(apiKey, homeTeamId, awayTeamId);
    } else if (sport === 'basketball') {
      highlights = await fetchBasketballHighlights(apiKey, homeTeamId, awayTeamId);
    }

    console.log(`Found ${highlights.length} video highlights`);

    return new Response(JSON.stringify({ highlights }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching highlights:', error);
    return new Response(JSON.stringify({ error: error.message, highlights: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchFootballHighlights(apiKey: string, homeTeamId: string, awayTeamId: string) {
  const url = `https://apiv2.allsportsapi.com/football/?met=H2H&APIkey=${apiKey}&firstTeamId=${homeTeamId}&secondTeamId=${awayTeamId}`;
  
  console.log('Calling AllSportsAPI H2H endpoint for football');
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`AllSportsAPI returned ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.result || !data.result.H2H) {
    return [];
  }

  // Extract video URLs from H2H matches
  const videos = data.result.H2H
    .filter((match: any) => match.videos && match.videos.length > 0)
    .flatMap((match: any) => 
      match.videos.map((video: any) => ({
        title: `${match.event_home_team} vs ${match.event_away_team} - ${match.league_name}`,
        videoUrl: video.video,
        thumbnail: video.thumbnail || '',
        date: match.event_date,
        league: match.league_name,
        homeTeam: match.event_home_team,
        awayTeam: match.event_away_team,
      }))
    );

  return videos;
}

async function fetchBasketballHighlights(apiKey: string, homeTeamId: string, awayTeamId: string) {
  const url = `https://apiv2.allsportsapi.com/basketball/?met=H2H&APIkey=${apiKey}&firstTeamId=${homeTeamId}&secondTeamId=${awayTeamId}`;
  
  console.log('Calling AllSportsAPI H2H endpoint for basketball');
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`AllSportsAPI returned ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.result || !data.result.H2H) {
    return [];
  }

  const videos = data.result.H2H
    .filter((match: any) => match.videos && match.videos.length > 0)
    .flatMap((match: any) => 
      match.videos.map((video: any) => ({
        title: `${match.event_home_team} vs ${match.event_away_team} - ${match.league_name}`,
        videoUrl: video.video,
        thumbnail: video.thumbnail || '',
        date: match.event_date,
        league: match.league_name,
        homeTeam: match.event_home_team,
        awayTeam: match.event_away_team,
      }))
    );

  return videos;
}
