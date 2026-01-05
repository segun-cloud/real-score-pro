import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { match } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Generating prediction for match:', match.id, match.sport);

    // Sport-specific analysis prompts
    const sportPrompts: Record<string, string> = {
      'football': `Analyze these football/soccer factors:
- Possession: ${match.statistics?.possession?.home}% vs ${match.statistics?.possession?.away}%
- Shots on target: ${match.statistics?.shotsOnTarget?.home} vs ${match.statistics?.shotsOnTarget?.away}
- Recent form and head-to-head history
- Home advantage impact
- Corner kicks: ${match.statistics?.corners?.home} vs ${match.statistics?.corners?.away}`,

      'basketball': `Analyze these basketball factors:
- Team pace and possessions per game
- Offensive/defensive efficiency ratings
- Three-point shooting percentages and points in paint
- Fast break points and second-chance points
- Recent scoring averages and trends (last 5 games)
- Back-to-back game scheduling factor
- Key player injury reports and minutes restrictions
- Home court advantage and crowd impact`,

      'tennis': `Analyze these tennis factors:
- Serve statistics and ace counts
- Break point conversion rates
- Head-to-head record
- Surface preference (hard court/clay/grass)
- Recent tournament performance`,

      'baseball': `Analyze these baseball factors:
- Pitching statistics and ERA
- Batting averages and on-base percentages
- Recent game results and win streaks
- Home field advantage
- Weather conditions impact`,

      'boxing': `Analyze these boxing factors:
- Weight class and reach advantage
- Knockout ratio and fighting style
- Previous bout results
- Age and experience level
- Training camp reports`,

      'cricket': `Analyze these cricket factors:
- Batting averages and strike rates
- Bowling averages and economy rates
- Recent match performance
- Pitch conditions and weather
- Team composition and all-rounders`,

      'ice-hockey': `Analyze these ice hockey factors:
- Goals per game average
- Power play efficiency
- Goaltender save percentage
- Recent form and win streaks
- Home ice advantage`,

      'rugby': `Analyze these rugby factors:
- Points scored and conceded
- Try conversion rates
- Possession and territory statistics
- Recent match results
- Home ground advantage`,

      'american-football': `Analyze these American football factors:
- Offensive and defensive statistics
- Turnover ratios
- Passing and rushing yards
- Recent performance trends
- Home field advantage`
    };

    const sportSpecificContext = sportPrompts[match.sport] || sportPrompts['football'];
    const isBasketball = match.sport === 'basketball';

    const systemPrompt = `You are an expert sports analyst specializing in ${match.sport}. 
Provide structured betting market predictions in JSON format only.
Return ONLY valid JSON, no additional text.`;

    const userPrompt = `Analyze this ${match.sport} match and provide betting market predictions:

**Teams:** ${match.homeTeam} vs ${match.awayTeam}
**Status:** ${match.status}
**League:** ${match.league}
${match.status === 'live' ? `**Current Score:** ${match.homeScore}-${match.awayScore} (${match.minute}')` : ''}

**Current Odds:**
- Home Win: ${match.odds.homeWin}
${match.odds.draw ? `- Draw: ${match.odds.draw}` : ''}
- Away Win: ${match.odds.awayWin}

${sportSpecificContext}

Return JSON with this exact structure:
${isBasketball ? `{
  "match_result": {
    "home_win": number (0-100),
    "away_win": number (0-100)
  },
  "odd_even": {
    "odd": number (0-100),
    "even": number (0-100)
  },
  "total_points": {
    "line": number (e.g., 220.5),
    "over": number (0-100),
    "under": number (0-100)
  },
  "half_time_over_under": {
    "line": number (e.g., 110.5),
    "over": number (0-100),
    "under": number (0-100)
  },
  "first_quarter_over_under": {
    "line": number (e.g., 55.5),
    "over": number (0-100),
    "under": number (0-100)
  },
  "half_time_result": {
    "home_leading": number (0-100),
    "tied": number (0-100),
    "away_leading": number (0-100)
  },
  "correct_score": {
    "prediction": "XXX-YYY",
    "probability": number (0-100)
  },
  "key_insights": ["insight1", "insight2", "insight3"],
  "confidence": "Low" | "Medium" | "High"
}` : `{
  "match_result": {
    "home_win": number (0-100),
    "draw": number (0-100) or null for sports without draws,
    "away_win": number (0-100)
  },
  "btts": {
    "yes": number (0-100),
    "no": number (0-100)
  },
  "over_under": {
    "over_2_5": number (0-100),
    "under_2_5": number (0-100)
  },
  "correct_score": {
    "prediction": "X-Y",
    "probability": number (0-100),
    "alternatives": [
      { "score": "X-Y", "probability": number }
    ]
  },
  "half_time_score": {
    "prediction": "X-Y",
    "home_leading": number (0-100),
    "draw": number (0-100),
    "away_leading": number (0-100)
  },
  "key_insights": ["insight1", "insight2", "insight3"],
  "confidence": "Low" | "Medium" | "High"
}`}`;

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
          { role: 'user', content: userPrompt }
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
    const predictionText = data.choices[0].message.content;

    console.log('Raw AI response:', predictionText);

    // Parse JSON from AI response
    let prediction;
    try {
      // Extract JSON if wrapped in markdown code blocks
      const jsonMatch = predictionText.match(/```json\n?([\s\S]*?)\n?```/) || 
                        predictionText.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : predictionText;
      prediction = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Return a fallback structure based on sport
      if (isBasketball) {
        prediction = {
          match_result: { home_win: 50, away_win: 50 },
          odd_even: { odd: 50, even: 50 },
          total_points: { line: 220.5, over: 50, under: 50 },
          half_time_over_under: { line: 110.5, over: 50, under: 50 },
          first_quarter_over_under: { line: 55.5, over: 50, under: 50 },
          half_time_result: { home_leading: 33, tied: 34, away_leading: 33 },
          correct_score: { prediction: "108-110", probability: 10 },
          key_insights: ["Analysis unavailable"],
          confidence: "Low"
        };
      } else {
        prediction = {
          match_result: { home_win: 50, draw: 25, away_win: 25 },
          btts: { yes: 50, no: 50 },
          over_under: { over_2_5: 50, under_2_5: 50 },
          correct_score: { prediction: "1-1", probability: 15, alternatives: [] },
          half_time_score: { prediction: "0-0", home_leading: 33, draw: 34, away_leading: 33 },
          key_insights: ["Analysis unavailable"],
          confidence: "Low"
        };
      }
    }

    console.log('Successfully generated prediction');

    return new Response(
      JSON.stringify({ 
        prediction,
        timestamp: new Date().toISOString(),
        sport: match.sport,
        matchId: match.id
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in generate-match-prediction:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to generate prediction'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
