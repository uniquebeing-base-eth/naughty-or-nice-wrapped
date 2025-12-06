import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    console.log('Generating share image for:', { username, score, isNice, badge });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const verdict = isNice ? 'NICE' : 'NAUGHTY';
    const emoji = isNice ? '😇' : '😈';
    const verdictColor = isNice ? 'green' : 'red';

    const prompt = `Create a festive Christmas-themed social media share card with these EXACT specifications:

LAYOUT & DESIGN:
- Square format (1080x1080 pixels)
- Dark navy/purple gradient background (#1a1a2e to #16213e)
- Subtle falling snowflakes scattered across the background
- Decorative Christmas stars in top corners (gold/yellow color)
- Small Christmas trees in bottom corners

CONTENT (centered, top to bottom):
1. Title at top: "❄️ Naughty or Nice Wrapped — 2025 ❄️" in elegant gold text
2. A circular profile picture placeholder with gold border (for @${username})
3. Username "@${username}" below the profile in white text
4. Large circular progress ring showing ${score}% with ${verdictColor} gradient fill
5. Inside the ring: "${score}%" in large bold text, with "${verdict}" label below
6. Badge pill: "${badge}" in a rounded ${verdictColor} gradient pill with sparkle icon
7. Two stat boxes at bottom:
   - Left: "${nicePoints.toLocaleString()} nice moments" with green accent
   - Right: "${naughtyPoints} naughty moments" with red accent
8. Footer: "Made with ❄️ by @uniquebeing404"

STYLE:
- Luxurious, festive Christmas aesthetic
- Rich ${verdictColor} and gold color accents throughout
- Glowing effects around the score ring
- Professional, shareable social media quality
- Vibrant but elegant color palette

Generate a single, complete image matching this exact layout.`;

    console.log('Calling AI Gateway to generate image...');

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
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI Gateway response received');
    
    const imageDataUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageDataUrl) {
      console.error('No image in response:', JSON.stringify(data));
      throw new Error('No image generated');
    }

    // Extract base64 data from data URL
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `share-cards/${username}-${timestamp}.png`;

    console.log('Uploading image to storage:', filename);

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('share-images')
      .upload(filename, imageBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('share-images')
      .getPublicUrl(filename);

    const publicUrl = urlData.publicUrl;
    console.log('Image uploaded successfully:', publicUrl);

    return new Response(JSON.stringify({ imageUrl: publicUrl }), {
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
