import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pre-existing templates organized by color trait (black background versions)
// Priority: fairy templates first (new high-quality ones), then others
const TEMPLATE_MAP: { [key: string]: string[] } = {
  blue: [
    "blue-fox-black-bg.png",
    "blue-fox-navy-bg.png",
    "blue-fox-blue-bg.png",
    "blue-bunny-navy-bg.png",
    "blue-dragon-blue-bg.png"
  ],
  pink: [
    "pink-fairy-black-bg.png",
    "pink-fox-black-bg.png",
    "pink-cat-black-bg.png",
    "pink-fox-magenta-bg.png",
    "pink-fox-pink-bg.png",
    "pink-bunny-magenta-bg.png",
    "pink-unicorn-pink-bg.png"
  ],
  gold: [
    "gold-fairy-black-bg.png",
    "gold-cat-black-bg.png",
    "gold-fox-black-bg.png",
    "gold-kitsune-black-bg.png",
    "gold-fox-amber-bg.png",
    "gold-fox-gold-bg.png",
    "gold-lion-amber-bg.png",
    "gold-phoenix-gold-bg.png"
  ],
  white: [
    "white-fox-black-bg.png",
    "white-bunny-black-bg.png",
    "white-fox-cream-bg.png",
    "white-fox-gray-bg.png",
    "white-owl-gray-bg.png"
  ],
  ice: [
    "ice-fox-black-bg.png",
    "ice-fairy-black-bg.png",
    "ice-fox-cyan-bg.png",
    "ice-fox-lightblue-bg.png",
    "ice-penguin-teal-bg.png",
    "ice-wolf-cyan-bg.png"
  ],
  purple: [
    "purple-fairy-black-bg.png",
    "purple-fox-black-bg.png",
    "purple-cat-black-bg.png",
    "purple-fox-purple-bg.png",
    "purple-fox-violet-bg.png",
    "purple-dragon-magenta-bg.png",
    "purple-owl-purple-bg.png"
  ],
  green: [
    "green-fairy-black-bg.png",
    "green-cat-black-bg.png",
    "green-fox-black-bg.png",
    "green-fox-green-bg.png",
    "green-fox-lime-bg.png",
    "green-dragon-green-bg.png",
    "green-frog-lime-bg.png"
  ],
  orange: [
    "orange-fox-black-bg.png",
    "orange-fox-orange-bg.png",
    "orange-fox-rust-bg.png",
    "orange-panda-rust-bg.png",
    "orange-tiger-orange-bg.png"
  ],
  red: [
    "red-fairy-black-bg.png",
    "red-cat-black-bg.png",
    "red-fox-black-bg.png",
    "red-phoenix-black-bg.png",
    "red-fox-red-bg.png",
    "red-fox-maroon-bg.png",
    "red-dragon-red-bg.png"
  ],
  default: [
    "default-fox-black-bg.png",
    "default-cat-black-bg.png",
    "default-fox-navy-bg.png",
    "default-fox-purple-bg.png",
    "default-owl-navy-bg.png",
    "default-unicorn-purple-bg.png"
  ]
};

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

// Analyze dominant color from image
function detectColorTrait(profileColors: { r: number, g: number, b: number }[]): string {
  if (!profileColors || profileColors.length === 0) {
    const traits = Object.keys(TEMPLATE_MAP).filter(t => t !== 'default');
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
    
    // Simple color extraction from image bytes
    const colors: { r: number, g: number, b: number }[] = [];
    const sampleRate = Math.max(1, Math.floor(imageBytes.length / 1000));
    
    for (let i = 0; i < imageBytes.length - 2; i += sampleRate * 3) {
      const r = imageBytes[i];
      const g = imageBytes[i + 1];
      const b = imageBytes[i + 2];
      
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

// Pick a random template based on color trait
function pickTemplate(colorTrait: string, userAddress: string): string {
  const templates = TEMPLATE_MAP[colorTrait] || TEMPLATE_MAP.default;
  
  // Use user address to add some deterministic randomness
  // but still allow variation between mints
  const seed = Date.now() + (userAddress ? userAddress.charCodeAt(2) + userAddress.charCodeAt(5) : 0);
  const index = seed % templates.length;
  
  return templates[index];
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
      console.log("Fetching profile colors for fid:", userFid);
      const profileColors = await getProfileColors(userFid);
      colorTrait = detectColorTrait(profileColors);
    } else {
      const traits = Object.keys(TEMPLATE_MAP).filter(t => t !== 'default');
      colorTrait = traits[Math.floor(Math.random() * traits.length)];
    }
    
    console.log(`Selected color trait: ${colorTrait} for user ${userAddress}`);
    
    // Pick a template based on color trait
    const templateFileName = pickTemplate(colorTrait, userAddress || '');
    console.log(`Selected template: ${templateFileName}`);
    
    // Build the public URL for the template from the app's public folder
    // Templates are served from the deployed app's public/bloomers folder
    const templateUrl = `https://naughty-or-nice-wrapped.lovable.app/bloomers/${templateFileName}`;
    console.log(`Template URL: ${templateUrl}`);
    
    // Fetch the template image
    let imageBytes: Uint8Array;
    try {
      const templateResponse = await fetch(templateUrl);
      if (!templateResponse.ok) {
        throw new Error(`Failed to fetch template: ${templateResponse.status}`);
      }
      const buffer = await templateResponse.arrayBuffer();
      imageBytes = new Uint8Array(buffer);
      console.log(`Fetched template image, size: ${imageBytes.length} bytes`);
    } catch (fetchError) {
      console.error("Error fetching template:", fetchError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to load Bloomer template. Please try again.",
          colorTrait
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Upload with unique filename for this user
    const fileName = `bloomer_${userAddress || 'anon'}_${Date.now()}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from("bloomers")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        upsert: false
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
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
      await supabase
        .from("minted_bloomers")
        .delete()
        .eq("user_address", userAddress.toLowerCase())
        .is("tx_hash", null);
      
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
