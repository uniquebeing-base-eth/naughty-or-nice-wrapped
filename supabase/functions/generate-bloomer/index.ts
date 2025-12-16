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
    const { sourceImage, userAddress } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Random pose selection - including standing poses
    const poses = [
      "standing upright on two legs like a magical humanoid character",
      "standing proudly with arms crossed",
      "standing with one hand raised casting a spell",
      "standing elegantly with flowing robes or wings spread",
      "sitting gracefully on a magical throne",
      "floating in mid-air with magical aura",
      "dancing on tiptoes with graceful movement",
      "standing heroically with a magical staff or wand",
      "walking gracefully with flowing magical trails",
      "striking a cute pose with peace sign"
    ];
    const randomPose = poses[Math.floor(Math.random() * poses.length)];

    // ALL Bloomers are cute kawaii fox/cat-like magical creatures with wings
    // Only the accessories, colors, and magical elements vary based on user's profile
    const creature = "adorable kawaii fox-cat spirit creature with fluffy fur, big sparkly anime eyes, small cute wings, and magical jewelry";

    // Build the message content with image analysis
    let messageContent: any[];
    
    if (sourceImage && !sourceImage.includes('dicebear')) {
      // Use the source image to analyze and extract traits
      console.log("Using source image for trait extraction:", sourceImage.substring(0, 100));
      
      messageContent = [
        {
          type: "text",
          text: `Analyze this profile picture and create a unique magical creature inspired by it.

CRITICAL - Extract these traits from the image:
- Dominant colors (use these for the creature's color palette)
- Any patterns or textures
- The mood/vibe (energetic, calm, mysterious, playful)
- Any accessories, hats, or distinctive features

Now create a hyper-detailed ${creature} portrait in anime art style.

POSE: The creature must be ${randomPose} - NOT on all fours, NOT crouching. This is important!

Style requirements:
- Adorable big sparkly anime eyes
- The creature's COLOR PALETTE must match the dominant colors from the analyzed image
- Ornate magical accessories inspired by any accessories in the image
- Glowing gems and magical effects
- Intricate wing/pattern details if applicable
- Fluffy fur, scales, or magical elements with iridescent sheen
- Christmas/winter themed accessories (Santa hat, holly, snowflakes) as a festive touch

Background: Enchanted mystical setting with floating sparkles, magical auroras, snow-covered enchanted forest, or northern lights.

The creature should look friendly, magical, and collectible - like a premium NFT character.
Ultra high resolution, highly detailed, professional digital art quality.`
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
        "midnight blues and stars"
      ];
      const randomColors = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];

      messageContent = [
        {
          type: "text",
          text: `Create a hyper-detailed ${creature} portrait in anime art style.

POSE: The creature must be ${randomPose} - NOT on all fours, NOT crouching. This is important!

Style requirements:
- Adorable big sparkly anime eyes
- Color palette: ${randomColors}
- Ornate magical accessories
- Glowing gems and magical effects
- Intricate wing/pattern details if applicable
- Fluffy fur, scales, or magical elements with iridescent sheen
- Christmas/winter themed accessories (Santa hat, holly, snowflakes) as a festive touch

Background: Enchanted mystical setting with floating sparkles, magical auroras, snow-covered enchanted forest, or northern lights.

The creature should look friendly, magical, and collectible - like a premium NFT character.
Ultra high resolution, highly detailed, professional digital art quality.`
        }
      ];
    }

    console.log("Generating Bloomer with pose:", randomPose);
    console.log("Creature type:", creature);

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
          tx_hash: null  // null means pending, not minted
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
