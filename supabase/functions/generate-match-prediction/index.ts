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
- Points per game trends
- Shooting percentages and three-point efficiency
- Rebounds and assists statistics
- Recent performance and injury reports
- Home court advantage`,

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

    const systemPrompt = `You are an expert sports analyst specializing in ${match.sport}. 
Provide a data-driven match prediction with win probabilities, predicted score, and key factors.
Be concise but insightful. Consider current statistics, recent form, and sport-specific factors.`;

    const userPrompt = `Analyze this ${match.sport} match:

**Teams:** ${match.homeTeam} vs ${match.awayTeam}
**Status:** ${match.status}
**League:** ${match.league}
${match.status === 'live' ? `**Current Score:** ${match.homeScore}-${match.awayScore} (${match.minute}')` : ''}

**Current Odds:**
- Home Win: ${match.odds.homeWin}
${match.odds.draw ? `- Draw: ${match.odds.draw}` : ''}
- Away Win: ${match.odds.awayWin}

${sportSpecificContext}

Provide:
1. Win probability for each team (percentage)
2. Predicted final score
3. 3-4 key factors influencing the outcome
4. Brief analysis (2-3 sentences)
5. Confidence level (Low/Medium/High)`;

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
        temperature: 0.7,
        max_tokens: 1000,
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
    const prediction = data.choices[0].message.content;

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
