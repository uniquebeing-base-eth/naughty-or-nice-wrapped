import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sourceImage, userAddress, userFid } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Plain background colors for NFT style
    const backgrounds = [
      "plain solid black background",
      "plain solid navy blue background",
      "plain solid soft pink background",
      "plain solid emerald green background"
    ];
    const randomBackground = backgrounds[Math.floor(Math.random() * backgrounds.length)];

    // ALL Bloomers are cute kawaii fox-cat spirit creatures - CONSISTENT design
    const creatureDescription = `adorable kawaii fox-cat spirit creature standing upright on two legs facing forward, with fluffy fur, large sparkly anime eyes, small cute fairy wings on back, wearing ornate magical jewelry (necklaces, earrings, crown/tiara, bracelets), magical gems embedded in accessories`;

    // Build the message content with image analysis
    let messageContent: any[];
    
    if (sourceImage && !sourceImage.includes('dicebear')) {
      // Use the source image to analyze and extract traits
      console.log("Using source image for trait extraction:", sourceImage.substring(0, 100));
      
      messageContent = [
        {
          type: "text",
          text: `Analyze this profile picture and extract the dominant colors and mood.

Create a ${creatureDescription}.

CRITICAL REQUIREMENTS:
1. POSE: Standing upright on two legs, facing forward toward the viewer (like a character portrait)
2. CREATURE: Must be a cute fox-cat hybrid with small fairy wings - NOT an owl, horse, or any other animal
3. BACKGROUND: ${randomBackground} - completely plain, no scenery, no effects, just solid color
4. COLORS: Use the dominant colors from the analyzed image for the creature's fur, accessories, and magical glow effects

Style:
- Big sparkly anime eyes with cute expression
- Fluffy fur with the color palette from the image
- Ornate magical jewelry (crown/tiara, necklace, earrings, arm bands)
- Glowing magical gems in accessories
- Small cute fairy wings on the back
- Soft magical glow around the character

This is for an NFT collection - the creature should be centered, professional quality, highly detailed anime art style.
Ultra high resolution digital art.`
        },
        {
          type: "image_url",
          image_url: {
            url: sourceImage
          }
        }
      ];
    } else {
      // Fallback to random generation without image reference
      console.log("No valid source image, using random generation");
      
      const colorPalettes = [
        "royal purples and golds",
        "ocean blues and teals",
        "sunset oranges and pinks", 
        "forest greens and emeralds",
        "crimson reds and golds",
        "icy blues and silvers",
        "pastel rainbow colors",
        "midnight blues with silver stars"
      ];
      const randomColors = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];

      messageContent = [
        {
          type: "text",
          text: `Create a ${creatureDescription}.

CRITICAL REQUIREMENTS:
1. POSE: Standing upright on two legs, facing forward toward the viewer (like a character portrait)
2. CREATURE: Must be a cute fox-cat hybrid with small fairy wings - NOT an owl, horse, or any other animal
3. BACKGROUND: ${randomBackground} - completely plain, no scenery, no effects, just solid color
4. COLORS: ${randomColors} for fur and accessories

Style:
- Big sparkly anime eyes with cute expression
- Fluffy fur in ${randomColors}
- Ornate magical jewelry (crown/tiara, necklace, earrings, arm bands)
- Glowing magical gems in accessories
- Small cute fairy wings on the back
- Soft magical glow around the character

This is for an NFT collection - the creature should be centered, professional quality, highly detailed anime art style.
Ultra high resolution digital art.`
        }
      ];
    }

    console.log("Generating Bloomer with background:", randomBackground);
    console.log("Creature type: fox-cat spirit with wings");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: messageContent
          }
        ],
        modalities: ["image", "text"]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");

    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      console.error("No image in response:", JSON.stringify(data));
      throw new Error("No image generated");
    }

    // Upload to Supabase storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Convert base64 to blob
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    const fileName = `bloomer_${userAddress || 'anon'}_${Date.now()}.png`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("bloomers")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        upsert: false
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      // Return the base64 image directly if upload fails
      return new Response(
        JSON.stringify({ imageUrl: imageData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: publicUrl } = supabase.storage
      .from("bloomers")
      .getPublicUrl(fileName);

    console.log("Bloomer uploaded:", publicUrl.publicUrl);

    // Save to pending_bloomers table for persistence before mint
    if (userAddress) {
      // Delete any previous pending bloomer for this user
      await supabase
        .from("minted_bloomers")
        .delete()
        .eq("user_address", userAddress.toLowerCase())
        .is("tx_hash", null);
      
      // Insert the new pending bloomer (tx_hash is null = not minted yet)
      const { error: insertError } = await supabase
        .from("minted_bloomers")
        .insert({
          user_address: userAddress.toLowerCase(),
          image_url: publicUrl.publicUrl,
          tx_hash: null,  // null means pending, not minted
          fid: userFid || null
        });
      
      if (insertError) {
        console.error("Failed to save pending bloomer:", insertError);
      } else {
        console.log("Saved pending bloomer for user:", userAddress);
      }
    }

    return new Response(
      JSON.stringify({ imageUrl: publicUrl.publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error generating bloomer:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
