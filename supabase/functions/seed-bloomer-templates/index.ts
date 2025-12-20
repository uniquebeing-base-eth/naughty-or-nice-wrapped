import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// All template filenames
const TEMPLATE_FILES = [
  "bloomer-dragon-blue.png",
  "bloomer-fairy-pink.png",
  "bloomer-fox-golden.png",
  "bloomer-fox-white.png",
  "bloomer-owl-ice.png",
  "bloomer-mystic-kitsune.png",
  "bloomer-frost-guardian.png",
  "bloomer-celestial-fox.png",
  "bloomer-blossom-fairy.png",
  "bloomer-golden-spirit.png"
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the source URL from the request body (should be a preview/dev URL)
    const { sourceBaseUrl } = await req.json();
    
    if (!sourceBaseUrl) {
      return new Response(
        JSON.stringify({ error: "sourceBaseUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { file: string; status: string; error?: string }[] = [];

    for (const fileName of TEMPLATE_FILES) {
      try {
        // Check if already exists
        const { data: existingFiles } = await supabase.storage
          .from("bloomers")
          .list("templates");
        
        if (existingFiles?.some(f => f.name === fileName)) {
          results.push({ file: fileName, status: "already_exists" });
          continue;
        }

        // Fetch from source
        const sourceUrl = `${sourceBaseUrl}/bloomers/${fileName}`;
        console.log(`Fetching: ${sourceUrl}`);
        
        const response = await fetch(sourceUrl);
        if (!response.ok) {
          results.push({ file: fileName, status: "fetch_failed", error: `HTTP ${response.status}` });
          continue;
        }

        const imageBytes = new Uint8Array(await response.arrayBuffer());
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("bloomers")
          .upload(`templates/${fileName}`, imageBytes, {
            contentType: "image/png",
            upsert: true
          });

        if (uploadError) {
          results.push({ file: fileName, status: "upload_failed", error: uploadError.message });
        } else {
          results.push({ file: fileName, status: "uploaded" });
        }
      } catch (err) {
        results.push({ file: fileName, status: "error", error: String(err) });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error seeding templates:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
