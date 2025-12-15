import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const tokenId = pathParts[pathParts.length - 1];

    console.log(`Fetching metadata for token ID: ${tokenId}`);

    if (!tokenId || isNaN(Number(tokenId))) {
      return new Response(JSON.stringify({ error: 'Invalid token ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all minted bloomers ordered by creation time to match token IDs
    const { data: bloomers, error } = await supabase
      .from('minted_bloomers')
      .select('*')
      .not('tx_hash', 'is', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    // Token IDs start from 0, so index matches
    const tokenIndex = parseInt(tokenId);
    const bloomer = bloomers?.[tokenIndex];

    if (!bloomer) {
      console.log(`Token ${tokenId} not found. Total minted: ${bloomers?.length || 0}`);
      return new Response(JSON.stringify({ error: 'Token not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found bloomer for token ${tokenId}:`, bloomer.image_url);

    // Generate metadata in ERC721 standard format
    const metadata = {
      name: `Bloomer #${tokenId}`,
      description: "A magical Bloomer creature from Naughty or Nice Wrapped. Each Bloomer is uniquely generated based on its owner's profile, making it a one-of-a-kind digital companion.",
      image: bloomer.image_url,
      external_url: "https://naughty-or-nice-wrapped.vercel.app/bloomers",
      attributes: [
        {
          trait_type: "Collection",
          value: "Naughty or Nice Wrapped"
        },
        {
          trait_type: "Season",
          value: "Christmas 2024"
        },
        {
          trait_type: "Minted By",
          value: bloomer.user_address
        }
      ]
    };

    return new Response(JSON.stringify(metadata), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      },
    });
  } catch (error) {
    console.error('Error in bloomer-metadata function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
