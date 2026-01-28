import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};


// Only using the 5 spirit bloomers - these are the ONLY templates
const BLOOMER_TEMPLATES: { [key: string]: string } = {
  purple: "bloomer-purple-spirit.png",
  pink: "bloomer-pink-spirit.png", 
  green: "bloomer-green-spirit.png",
  red: "bloomer-red-spirit.png",
  gold: "bloomer-gold-spirit.png",
};

// Production URL where bloomers are hosted
const PRODUCTION_BASE_URL = "https://naughty-or-nice-wrapped.lovable.app/bloomers";

// Color trait RGB definitions for detection
const COLOR_DEFINITIONS: { [key: string]: { r: number, g: number, b: number } } = {
  purple: { r: 128, g: 0, b: 128 },
  pink: { r: 255, g: 105, b: 180 },
  green: { r: 0, g: 128, b: 0 },
  red: { r: 255, g: 0, b: 0 },
  gold: { r: 255, g: 215, b: 0 },
};

// Simple color distance calculation
function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt(Math.pow(r2 - r1, 2) + Math.pow(g2 - g1, 2) + Math.pow(b2 - b1, 2));
}

// Analyze dominant color and match to closest trait
function detectColorTrait(profileColors: { r: number, g: number, b: number }[]): string {
  const traits = Object.keys(BLOOMER_TEMPLATES);
  
  if (!profileColors || profileColors.length === 0) {
    // Return random trait if no colors detected
    return traits[Math.floor(Math.random() * traits.length)];
  }

  // Find the most saturated/dominant color
  let dominantColor = profileColors[0];
  let maxSaturation = 0;
  
  for (const color of profileColors) {
    const max = Math.max(color.r, color.g, color.b);
    const min = Math.min(color.r, color.g, color.b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    if (saturation > maxSaturation) {
      maxSaturation = saturation;
      dominantColor = color;
    }
  }

  // Match to closest color trait from the 5 spirit bloomers
  let bestTrait = "gold";
  let bestDistance = Infinity;

  for (const [trait, colorDef] of Object.entries(COLOR_DEFINITIONS)) {
    const distance = colorDistance(dominantColor.r, dominantColor.g, dominantColor.b, colorDef.r, colorDef.g, colorDef.b);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestTrait = trait;
    }
  }

  console.log(`Detected color trait: ${bestTrait} (distance: ${bestDistance}) from RGB(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b})`);
  return bestTrait;
}

// Fetch profile image colors from Neynar
async function getProfileColors(fid: number): Promise<{ r: number, g: number, b: number }[]> {
  const NEYNAR_API_KEY = Deno.env.get("NEYNAR_API_KEY");
  if (!NEYNAR_API_KEY || !fid) {
    return [];
  }

  try {
    const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
      headers: {
        'accept': 'application/json',
        'x-api-key': NEYNAR_API_KEY
      }
    });

    if (!response.ok) {
      console.error("Neynar API error:", response.status);
      return [];
    }

    const data = await response.json();
    const user = data.users?.[0];
    
    if (!user?.pfp_url) {
      console.log("No PFP found for user");
      return [];
    }

    console.log("Analyzing PFP:", user.pfp_url);
    
    // Fetch the image and extract colors
    const imageResponse = await fetch(user.pfp_url);
    if (!imageResponse.ok) {
      return [];
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBytes = new Uint8Array(imageBuffer);
    
    // Simple color extraction from image bytes (sample pixels)
    // This is a simplified approach - we'll sample some pixels from the image data
    const colors: { r: number, g: number, b: number }[] = [];
    
    // For PNG/JPEG, we'll do basic sampling
    // Sample every Nth byte assuming RGB format
    const sampleRate = Math.max(1, Math.floor(imageBytes.length / 1000));
    
    for (let i = 0; i < imageBytes.length - 2; i += sampleRate * 3) {
      const r = imageBytes[i];
      const g = imageBytes[i + 1];
      const b = imageBytes[i + 2];
      
      // Skip near-black and near-white pixels
      if (r + g + b > 30 && r + g + b < 720) {
        colors.push({ r, g, b });
      }
      
      if (colors.length >= 100) break;
    }

    return colors;
  } catch (error) {
    console.error("Error fetching profile colors:", error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sourceImage, userAddress, userFid } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get profile colors from Neynar if we have a fid
    let colorTrait = "default";
    if (userFid) {
      const profileColors = await getProfileColors(userFid);
      colorTrait = detectColorTrait(profileColors);
    } else {
      // Random trait if no fid
      const traits = Object.keys(BLOOMER_TEMPLATES);
      colorTrait = traits[Math.floor(Math.random() * traits.length)];
    }
    
    console.log(`Selected color trait: ${colorTrait} for user ${userAddress}`);
    
    // Get the template filename for this trait
    const templateFileName = BLOOMER_TEMPLATES[colorTrait] || BLOOMER_TEMPLATES.gold;
    
    let templateBytes: Uint8Array = new Uint8Array();
    let usedTemplate = "";
    
    // Try fetching from production URL first
    console.log(`Fetching template from: ${PRODUCTION_BASE_URL}/${templateFileName}`);
    try {
      const response = await fetch(`${PRODUCTION_BASE_URL}/${templateFileName}`, { 
        headers: { 'Accept': 'image/png,image/*' }
      });
      if (response.ok) {
        templateBytes = new Uint8Array(await response.arrayBuffer());
        usedTemplate = templateFileName;
        console.log("Successfully fetched template:", templateFileName);
      }
    } catch (e) {
      console.log("Failed to fetch from production URL:", e);
    }
    
    // Fallback: check storage for cached templates
    if (templateBytes.length === 0) {
      const { data: existingFiles } = await supabase.storage
        .from("bloomers")
        .list("templates");
      
      const templateExists = existingFiles?.some(f => f.name === templateFileName);
      if (templateExists) {
        console.log("Trying cached template from storage:", templateFileName);
        const { data: templateData, error: downloadError } = await supabase.storage
          .from("bloomers")
          .download(`templates/${templateFileName}`);
        
        if (!downloadError && templateData) {
          templateBytes = new Uint8Array(await templateData.arrayBuffer());
          usedTemplate = templateFileName;
          console.log("Using template from storage:", templateFileName);
        }
      }
    }
    
    // Cache the template to storage if we fetched it
    if (templateBytes.length > 0 && usedTemplate === templateFileName) {
      await supabase.storage
        .from("bloomers")
        .upload(`templates/${templateFileName}`, templateBytes, {
          contentType: "image/png",
          upsert: true
        }).catch(() => {}); // Ignore cache errors
    }
    
    // Last resort: use any existing bloomer from storage
    if (templateBytes.length === 0) {
      const { data: existingBloomers } = await supabase.storage
        .from("bloomers")
        .list("", { limit: 10 });
      
      if (existingBloomers && existingBloomers.length > 0) {
        const fallbackFile = existingBloomers.find(f => f.name.startsWith("bloomer_"));
        if (fallbackFile) {
          console.log("Using fallback bloomer:", fallbackFile.name);
          const { data: fallbackData } = await supabase.storage
            .from("bloomers")
            .download(fallbackFile.name);
          if (fallbackData) {
            templateBytes = new Uint8Array(await fallbackData.arrayBuffer());
            usedTemplate = fallbackFile.name;
          }
        }
      }
    }
    
    if (templateBytes.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "Bloomer templates not available yet. Please try again in a few minutes.",
          colorTrait
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    console.log(`Final template used: ${usedTemplate} for trait: ${colorTrait}`);

    // templateBytes already populated above
    
    // Upload with unique filename for this user
    const fileName = `bloomer_${userAddress || 'anon'}_${Date.now()}.png`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("bloomers")
      .upload(fileName, templateBytes, {
        contentType: "image/png",
        upsert: false
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      // Return an error if upload fails
      return new Response(
        JSON.stringify({ error: "Failed to upload bloomer image", colorTrait }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
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
          tx_hash: null,
          fid: userFid || null
        });
      
      if (insertError) {
        console.error("Failed to save pending bloomer:", insertError);
      } else {
        console.log("Saved pending bloomer for user:", userAddress);
      }
    }

    return new Response(
      JSON.stringify({ imageUrl: publicUrl.publicUrl, colorTrait }),
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
