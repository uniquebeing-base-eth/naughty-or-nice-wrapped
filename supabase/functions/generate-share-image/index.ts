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
    const { username, pfp, score, isNice, badge, nicePoints, naughtyPoints } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const verdict = isNice ? 'NICE' : 'NAUGHTY';
    const emoji = isNice ? '😇' : '😈';
    const verdictColor = isNice ? 'green' : 'red';

    const prompt = `Create a Christmas-themed social media share card image with these exact specifications:
- Dark festive background with subtle snowflakes and Christmas decorations
- Title at top: "Naughty or Nice Wrapped 2025" with snowflake emojis
- Large circular profile picture placeholder in the center
- Username "@${username}" below the profile picture
- A large circular progress ring showing ${score}% with ${verdictColor} gradient
- Text "${verdict}" prominently displayed with ${emoji} emoji
- Badge text: "${badge}" in a pill-shaped badge
- Stats at bottom: "${nicePoints.toLocaleString()} nice moments" and "${naughtyPoints} naughty moments"
- Christmas stars in corners, Christmas trees at bottom corners
- Rich ${verdictColor} and gold color accents
- Overall aesthetic: festive, celebratory, social-media ready
- Dimensions: Square format (1:1 aspect ratio)
- High quality, vibrant colors, professional design`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error('No image generated');
    }

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error generating share image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});