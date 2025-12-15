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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all minted bloomers ordered by creation time
    const { data: bloomers, error } = await supabase
      .from('minted_bloomers')
      .select('*')
      .not('tx_hash', 'is', null)
      .order('created_at', { ascending: true });

    if (error) throw error;

    console.log(`Found ${bloomers?.length || 0} minted bloomers to backfill`);

    const results = [];

    for (let i = 0; i < (bloomers?.length || 0); i++) {
      const bloomer = bloomers![i];
      const tokenId = i; // 0-indexed

      const metadata = {
        name: `Bloomer #${tokenId}`,
        description: "A magical Bloomer creature from Naughty or Nice Wrapped. Each Bloomer is uniquely generated based on its owner's profile, making it a one-of-a-kind digital companion.",
        image: bloomer.image_url,
        external_url: "https://naughty-or-nice-wrapped.vercel.app/bloomers",
        attributes: [
          { trait_type: "Collection", value: "Naughty or Nice Wrapped" },
          { trait_type: "Season", value: "Christmas 2024" },
          { trait_type: "Minted By", value: bloomer.user_address }
        ]
      };

      // Upload to storage
      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
      const { error: uploadError } = await supabase.storage
        .from('bloomers-metadata')
        .upload(`${tokenId}.json`, metadataBlob, {
          contentType: 'application/json',
          upsert: true
        });

      if (uploadError) {
        console.error(`Failed to upload metadata for token ${tokenId}:`, uploadError);
        results.push({ tokenId, success: false, error: uploadError.message });
      } else {
        console.log(`Uploaded metadata for token ${tokenId}`);
        results.push({ tokenId, success: true, image: bloomer.image_url });
      }
    }

    return new Response(JSON.stringify({ 
      message: `Backfilled ${results.filter(r => r.success).length}/${bloomers?.length || 0} metadata files`,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Backfill error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
