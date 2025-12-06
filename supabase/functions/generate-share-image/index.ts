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

    const characterDescription = isNice 
      ? "a cute happy elf character with rosy cheeks, pointy ears, and a red & green Christmas outfit with a Santa hat, looking cheerful and innocent"
      : "a cute mischievous little devil/imp character with tiny horns, rosy cheeks, wearing a Santa hat tilted playfully, looking cheeky but adorable";

    const prompt = `Create an elegant Christmas-themed judgment card with this EXACT design:

BACKGROUND & FRAME:
- Dark maroon/burgundy gradient background (#3a0d0d to #1a0505)
- Elegant rectangular card in the center with rounded corners
- Card has a thin gold/bronze border frame
- Soft glowing orbs scattered in background (subtle white/cream dots)
- ⭐ Gold star decorations in top left and top right corners
- 🎄 Small Christmas tree emojis in bottom left and bottom right corners

CARD CONTENT (from top to bottom, centered):
1. Header: "❄️ NAUGHTY OR NICE WRAPPED — 2025 ❄️" in gold/yellow text, small elegant font
2. A cute circular avatar showing ${characterDescription} - this should be adorable and festive!
3. Small ${emoji} emoji overlapping the character circle at bottom-right
4. Username "@${username}" in white bold text below the character
5. Large circular progress ring:
   - Thick ${verdictColor} glowing ring (bright green if nice, bright red if naughty)
   - Ring shows ${score}% completion (partial circle)
   - Gray/dark track behind the colored portion
   - Soft glow effect around the ring
6. Inside the ring center:
   - "${score}%" in LARGE bold ${verdictColor} gradient text
   - "${verdict}" label below in smaller ${verdictColor} text with gold accent
7. Badge pill below ring: "✨ ${badge}" in a rounded ${verdictColor} pill/button with sparkle
8. Two stat columns at bottom:
   - Left: "${nicePoints.toLocaleString()}" in large green text, "nice moments" label below in gray
   - Right: "${naughtyPoints}" in large red text, "naughty moments" label below in gray
9. Footer at very bottom: "Made with ❄️ by @uniquebeing404" in small gray/muted text

STYLE REQUIREMENTS:
- Rich, warm Christmas colors - burgundy, gold, ${verdictColor}
- The character avatar should be CUTE, 3D-style, and festive like a Pixar/Disney character
- Elegant, luxurious aesthetic matching Spotify Wrapped style
- The ${verdictColor} elements should GLOW subtly
- Professional social media share card quality
- Square format 1080x1080 pixels

This should look like a premium, shareable Christmas verdict card with an adorable character.`;

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
