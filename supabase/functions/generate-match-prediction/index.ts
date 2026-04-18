import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sport-specific analysis prompts
const SPORT_PROMPTS: Record<string, (match: any) => string> = {
  football: (match) => `Analyze these football/soccer factors:
- Possession: ${match.statistics?.possession?.home ?? 'N/A'}% vs ${match.statistics?.possession?.away ?? 'N/A'}%
- Shots on target: ${match.statistics?.shotsOnTarget?.home ?? 'N/A'} vs ${match.statistics?.shotsOnTarget?.away ?? 'N/A'}
- Corner kicks: ${match.statistics?.corners?.home ?? 'N/A'} vs ${match.statistics?.corners?.away ?? 'N/A'}
- Recent form and head-to-head history
- Home advantage impact`,

  basketball: () => `Analyze these basketball factors:
- Team pace and possessions per game
- Offensive/defensive efficiency ratings
- Three-point shooting percentages and points in paint
- Fast break and second-chance points
- Recent scoring averages (last 5 games)
- Back-to-back scheduling, injuries, home court advantage`,

  tennis: () => `Analyze these tennis factors:
- Serve statistics and ace counts
- Break point conversion rates
- Head-to-head record
- Surface preference (hard/clay/grass)
- Recent tournament performance`,

  baseball: () => `Analyze these baseball factors:
- Pitching statistics and ERA
- Batting averages and on-base percentages
- Recent results and win streaks
- Home field advantage and weather conditions`,

  boxing: () => `Analyze these boxing factors:
- Weight class and reach advantage
- Knockout ratio and fighting style
- Previous bout results
- Age, experience, and training camp reports`,

  cricket: () => `Analyze these cricket factors:
- Batting averages and strike rates
- Bowling averages and economy rates
- Recent match performance
- Pitch conditions, weather, and team composition`,

  'ice-hockey': () => `Analyze these ice hockey factors:
- Goals per game average
- Power play efficiency
- Goaltender save percentage
- Recent form and home ice advantage`,

  rugby: () => `Analyze these rugby factors:
- Points scored and conceded
- Try conversion rates
- Possession and territory statistics
- Recent results and home ground advantage`,

  'american-football': () => `Analyze these American football factors:
- Offensive and defensive statistics
- Turnover ratios
- Passing and rushing yards
- Recent performance trends and home field advantage`,
};

const BASKETBALL_JSON_SCHEMA = `{
  "match_result": { "home_win": number, "away_win": number },
  "odd_even": { "odd": number, "even": number },
  "total_points": { "line": number, "over": number, "under": number },
  "half_time_over_under": { "line": number, "over": number, "under": number },
  "first_quarter_over_under": { "line": number, "over": number, "under": number },
  "half_time_result": { "home_leading": number, "tied": number, "away_leading": number },
  "correct_score": { "prediction": "XXX-YYY", "probability": number },
  "key_insights": ["insight1", "insight2", "insight3"],
  "confidence": "Low" | "Medium" | "High"
}`;

const DEFAULT_JSON_SCHEMA = `{
  "match_result": { "home_win": number, "draw": number | null, "away_win": number },
  "btts": { "yes": number, "no": number },
  "over_under": { "over_2_5": number, "under_2_5": number },
  "correct_score": { "prediction": "X-Y", "probability": number, "alternatives": [{ "score": "X-Y", "probability": number }] },
  "half_time_score": { "prediction": "X-Y", "home_leading": number, "draw": number, "away_leading": number },
  "key_insights": ["insight1", "insight2", "insight3"],
  "confidence": "Low" | "Medium" | "High"
}`;

const BASKETBALL_FALLBACK = {
  match_result: { home_win: 50, away_win: 50 },
  odd_even: { odd: 50, even: 50 },
  total_points: { line: 220.5, over: 50, under: 50 },
  half_time_over_under: { line: 110.5, over: 50, under: 50 },
  first_quarter_over_under: { line: 55.5, over: 50, under: 50 },
  half_time_result: { home_leading: 33, tied: 34, away_leading: 33 },
  correct_score: { prediction: "108-110", probability: 10 },
  key_insights: ["Analysis unavailable"],
  confidence: "Low",
};

const DEFAULT_FALLBACK = {
  match_result: { home_win: 50, draw: 25, away_win: 25 },
  btts: { yes: 50, no: 50 },
  over_under: { over_2_5: 50, under_2_5: 50 },
  correct_score: { prediction: "1-1", probability: 15, alternatives: [] },
  half_time_score: { prediction: "0-0", home_leading: 33, draw: 34, away_leading: 33 },
  key_insights: ["Analysis unavailable"],
  confidence: "Low",
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // FIX: verify Supabase JWT — prevents unauthenticated AI quota consumption
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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // FIX: wrap req.json() — malformed body returns clean 400
    let body: { match?: any };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { match } = body;

    // FIX: validate match object before building prompts
    if (!match || !match.homeTeam || !match.awayTeam || !match.sport) {
      return new Response(
        JSON.stringify({ error: 'Missing required match fields: homeTeam, awayTeam, sport' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FIX: validate odds exist before referencing them in the prompt
    // Accessing match.odds.homeWin on undefined would throw
    const hasOdds = match.odds && (match.odds.homeWin || match.odds.awayWin);

    console.log('Generating prediction for match:', match.id, match.sport);

    const isBasketball = match.sport === 'basketball';

    // FIX: sport prompt is now a function that receives match for stat interpolation
    const sportContext = (SPORT_PROMPTS[match.sport] ?? SPORT_PROMPTS['football'])(match);

    const systemPrompt = `You are an expert sports analyst specialising in ${match.sport}. 
Provide structured betting market predictions in JSON format only.
Return ONLY valid JSON, no additional text or markdown.`;

    const userPrompt = `Analyse this ${match.sport} match and provide betting market predictions:

Teams: ${match.homeTeam} vs ${match.awayTeam}
Status: ${match.status}
League: ${match.league ?? 'Unknown'}
${match.status === 'live' ? `Current Score: ${match.homeScore}-${match.awayScore} (${match.minute}')` : ''}
${hasOdds ? `
Current Odds:
- Home Win: ${match.odds.homeWin}
${match.odds.draw ? `- Draw: ${match.odds.draw}` : ''}
- Away Win: ${match.odds.awayWin}` : ''}

${sportContext}

Return JSON with this exact structure:
${isBasketball ? BASKETBALL_JSON_SCHEMA : DEFAULT_JSON_SCHEMA}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service quota exceeded. Please contact support.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI Gateway returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const predictionText = data.choices?.[0]?.message?.content;

    // FIX: guard against missing content in AI response
    if (!predictionText) {
      console.error('AI response missing content:', JSON.stringify(data));
      throw new Error('AI returned an empty response');
    }

    console.log('Raw AI response:', predictionText);

    let prediction: any;
    try {
      // Strip markdown code fences if present
      const jsonMatch =
        predictionText.match(/```json\n?([\s\S]*?)\n?```/) ||
        predictionText.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : predictionText;
      prediction = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // FIX: fallback constants extracted to top-level so they're easy to maintain
      prediction = isBasketball ? BASKETBALL_FALLBACK : DEFAULT_FALLBACK;
    }

    console.log('Successfully generated prediction');

    return new Response(
      JSON.stringify({
        prediction,
        timestamp: new Date().toISOString(),
        sport: match.sport,
        matchId: match.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // FIX: safely extract message from unknown error type
    const message = error instanceof Error ? error.message : 'Failed to generate prediction';
    console.error('Error in generate-match-prediction:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
