import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pre-made Bloomer templates - same kawaii fox character with different color trait markings and solid backgrounds
const BLOOMER_TEMPLATES: { [key: string]: string[] } = {
  blue: [
    "blue-fox-black-bg.png",
    "blue-fox-blue-bg.png", 
    "blue-fox-navy-bg.png"
  ],
  pink: [
    "pink-fox-black-bg.png",
    "pink-fox-pink-bg.png",
    "pink-fox-magenta-bg.png"
  ],
  gold: [
    "gold-fox-black-bg.png",
    "gold-fox-gold-bg.png",
    "gold-fox-amber-bg.png"
  ],
  white: [
    "white-fox-black-bg.png",
    "white-fox-gray-bg.png",
    "white-fox-cream-bg.png"
  ],
  ice: [
    "ice-fox-black-bg.png",
    "ice-fox-cyan-bg.png",
    "ice-fox-lightblue-bg.png"
  ],
  purple: [
    "purple-fox-black-bg.png",
    "purple-fox-purple-bg.png",
    "purple-fox-violet-bg.png"
  ],
  green: [
    "green-fox-black-bg.png",
    "green-fox-green-bg.png",
    "green-fox-lime-bg.png"
  ],
  orange: [
    "orange-fox-black-bg.png",
    "orange-fox-orange-bg.png",
    "orange-fox-rust-bg.png"
  ],
  red: [
    "red-fox-black-bg.png",
    "red-fox-red-bg.png",
    "red-fox-maroon-bg.png"
  ],
  default: [
    "default-fox-black-bg.png",
    "default-fox-purple-bg.png",
    "default-fox-navy-bg.png"
  ]
};

// Function to get random template from a color trait
function getRandomTemplate(colorTrait: string): string {
  const templates = BLOOMER_TEMPLATES[colorTrait] || BLOOMER_TEMPLATES.default;
  return templates[Math.floor(Math.random() * templates.length)];
}

// Color trait to hex mapping for detection
const COLOR_MAPPINGS: { [key: string]: string[] } = {
  blue: ["#0000ff", "#0066cc", "#003399", "#6699ff", "#00ccff", "#336699", "#000080", "#4169e1", "#1e90ff", "#00bfff"],
  pink: ["#ff69b4", "#ff1493", "#ffb6c1", "#ffc0cb", "#db7093", "#ff66b2", "#ff99cc", "#ffccff", "#e91e8c"],
  gold: ["#ffd700", "#ffcc00", "#daa520", "#b8860b", "#f4a460", "#cd853f", "#d4af37", "#ffdf00"],
  white: ["#ffffff", "#f5f5f5", "#fafafa", "#f0f0f0", "#e8e8e8", "#dcdcdc", "#d3d3d3"],
  ice: ["#e0ffff", "#afeeee", "#b0e0e6", "#add8e6", "#87ceeb", "#87cefa", "#00ced1", "#48d1cc"],
  purple: ["#800080", "#9932cc", "#8b008b", "#9400d3", "#ba55d3", "#da70d6", "#ee82ee", "#8a2be2", "#9370db"],
  green: ["#008000", "#00ff00", "#32cd32", "#228b22", "#006400", "#90ee90", "#98fb98", "#00fa9a", "#2e8b57"],
  orange: ["#ffa500", "#ff8c00", "#ff7f50", "#ff6347", "#ff4500", "#e9967a", "#fa8072", "#f08080"],
  red: ["#ff0000", "#dc143c", "#b22222", "#8b0000", "#cd5c5c", "#ff6b6b", "#e74c3c", "#c0392b", "#a93226"]
};

// Simple color distance calculation
function colorDistance(hex1: string, r2: number, g2: number, b2: number): number {
  const hex = hex1.replace('#', '');
  const r1 = parseInt(hex.substring(0, 2), 16);
  const g1 = parseInt(hex.substring(2, 4), 16);
  const b1 = parseInt(hex.substring(4, 6), 16);
  return Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2));
}

// Analyze dominant color from image via Neynar profile data
function detectColorTrait(profileColors: { r: number, g: number, b: number }[]): string {
  if (!profileColors || profileColors.length === 0) {
    // Return random trait if no colors detected
    const traits = Object.keys(BLOOMER_TEMPLATES).filter(t => t !== 'default');
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

  // Match to closest color trait
  let bestTrait = "default";
  let bestDistance = Infinity;

  for (const [trait, hexColors] of Object.entries(COLOR_MAPPINGS)) {
    for (const hex of hexColors) {
      const distance = colorDistance(hex, dominantColor.r, dominantColor.g, dominantColor.b);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestTrait = trait;
      }
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
      const traits = Object.keys(BLOOMER_TEMPLATES).filter(t => t !== 'default');
      colorTrait = traits[Math.floor(Math.random() * traits.length)];
    }
    
    console.log(`Selected color trait: ${colorTrait} for user ${userAddress}`);
    
    // Get a random template filename for this trait
    const templateFileName = getRandomTemplate(colorTrait);
    console.log(`Selected template: ${templateFileName}`);
    
    // Check if template already exists in storage
    const { data: existingFiles } = await supabase.storage
      .from("bloomers")
      .list("templates");
    
    const templateExists = existingFiles?.some(f => f.name === templateFileName);
    let templateBytes: Uint8Array = new Uint8Array();
    
    if (templateExists) {
      // Download from storage
      console.log("Using existing template from storage:", templateFileName);
      const { data: templateData, error: downloadError } = await supabase.storage
        .from("bloomers")
        .download(`templates/${templateFileName}`);
      
      if (downloadError || !templateData) {
        throw new Error(`Failed to download template: ${downloadError?.message}`);
      }
      templateBytes = new Uint8Array(await templateData.arrayBuffer());
    } else {
      // Templates not in storage - try multiple sources
      const sources = [
        // Try the preview URL first
        `https://id-preview--f2e7c21e-29f6-4b6c-8b04-b3f98f1de7a7.lovable.app/bloomers/${templateFileName}`,
        // Try the production URL 
        `https://bloomers.lovable.app/bloomers/${templateFileName}`,
        // Try a direct GitHub raw URL if the repo exists
        `https://raw.githubusercontent.com/lovable-projects/bloomers/main/public/bloomers/${templateFileName}`,
      ];
      
      let fetched = false;
      for (const sourceUrl of sources) {
        console.log("Trying source:", sourceUrl);
        try {
          const response = await fetch(sourceUrl, { 
            headers: { 'Accept': 'image/png,image/*' }
          });
          if (response.ok) {
            templateBytes = new Uint8Array(await response.arrayBuffer());
            fetched = true;
            
            // Cache to storage for future use
            await supabase.storage
              .from("bloomers")
              .upload(`templates/${templateFileName}`, templateBytes, {
                contentType: "image/png",
                upsert: true
              });
            console.log("Cached template to storage:", templateFileName);
            break;
          }
        } catch (e) {
          console.log("Source failed:", sourceUrl, e);
        }
      }
      
      if (!fetched) {
        // Last resort: Check if we have any existing bloomers in storage to use as fallback
        const { data: existingBloomers } = await supabase.storage
          .from("bloomers")
          .list("", { limit: 1 });
        
        if (existingBloomers && existingBloomers.length > 0) {
          // Use an existing bloomer as template
          const fallbackFile = existingBloomers.find(f => f.name.startsWith("bloomer_"));
          if (fallbackFile) {
            console.log("Using fallback bloomer:", fallbackFile.name);
            const { data: fallbackData } = await supabase.storage
              .from("bloomers")
              .download(fallbackFile.name);
            if (fallbackData) {
              templateBytes = new Uint8Array(await fallbackData.arrayBuffer());
              fetched = true;
            }
          }
        }
      }
      
      if (!fetched) {
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
    }

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
