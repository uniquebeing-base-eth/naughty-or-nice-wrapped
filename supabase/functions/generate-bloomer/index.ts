import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Color trait descriptions for AI generation
const COLOR_TRAIT_PROMPTS: { [key: string]: string } = {
  blue: "pastel blue and light blue colored fur with blue markings and stripes",
  pink: "pastel pink and rose colored fur with pink markings and stripes", 
  gold: "golden orange and amber colored fur with yellow-gold markings and stripes",
  white: "pure white and cream colored fur with subtle white markings",
  ice: "icy cyan and light blue colored fur with frost-like ice blue markings",
  purple: "lavender purple and violet colored fur with purple markings and stripes",
  green: "lime green and mint colored fur with green markings and stripes",
  orange: "bright orange and tangerine colored fur with orange markings and stripes",
  red: "crimson red and coral colored fur with red markings and stripes",
  default: "soft gray and silver colored fur with subtle gray markings"
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

// Analyze dominant color from image via Neynar profile data
function detectColorTrait(profileColors: { r: number, g: number, b: number }[]): string {
  if (!profileColors || profileColors.length === 0) {
    // Return random trait if no colors detected
    const traits = Object.keys(COLOR_TRAIT_PROMPTS).filter(t => t !== 'default');
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
    const colors: { r: number, g: number, b: number }[] = [];
    
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

// Generate Bloomer image using Lovable AI
async function generateBloomerWithAI(colorTrait: string): Promise<Uint8Array | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY not configured");
    return null;
  }

  const colorDescription = COLOR_TRAIT_PROMPTS[colorTrait] || COLOR_TRAIT_PROMPTS.default;
  
  // Create a unique prompt for this Bloomer
  const prompt = `Create a cute kawaii chibi fox character with small angel wings. The fox has ${colorDescription}. The character should have big sparkly anime eyes with star reflections, fluffy tail, and a sweet happy expression with rosy cheeks. The character is centered in the image, sitting pose. IMPORTANT: The background must be a completely SOLID PURE BLACK color (#000000), no patterns, no gradients, no textures - just flat black. Digital art style, high quality, crisp lines.`;

  console.log("Generating Bloomer with AI, color trait:", colorTrait);
  console.log("Prompt:", prompt);

  try {
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
            content: prompt
          }
        ],
        modalities: ["image", "text"]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI generation error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log("AI response received");
    
    // Extract the base64 image from the response
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      console.error("No image in AI response");
      return null;
    }

    // Convert base64 to Uint8Array
    // Remove the data:image/png;base64, prefix if present
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    console.log("Successfully generated Bloomer image, size:", bytes.length);
    return bytes;
  } catch (error) {
    console.error("Error generating Bloomer with AI:", error);
    return null;
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
      console.log("Fetching profile colors for fid:", userFid);
      const profileColors = await getProfileColors(userFid);
      colorTrait = detectColorTrait(profileColors);
    } else {
      // Random trait if no fid
      const traits = Object.keys(COLOR_TRAIT_PROMPTS).filter(t => t !== 'default');
      colorTrait = traits[Math.floor(Math.random() * traits.length)];
    }
    
    console.log(`Selected color trait: ${colorTrait} for user ${userAddress}`);
    
    // Generate unique Bloomer using AI
    console.log("Starting AI generation...");
    const imageBytes = await generateBloomerWithAI(colorTrait);
    
    if (!imageBytes) {
      console.error("Failed to generate Bloomer with AI");
      return new Response(
        JSON.stringify({ 
          error: "Failed to generate Bloomer. Please try again.",
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
