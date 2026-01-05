import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    console.log('Fetching BLOOM price from GeckoTerminal...');
    
    // GeckoTerminal API for the BLOOM/WETH pool on Base
    const poolAddress = '0x0d423c5b8686fb8c7c66a30cb7b6b2ad2f17b264e045b893cda5be1afc202da5';
    const response = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/base/pools/${poolAddress}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('GeckoTerminal API error:', response.status, response.statusText);
      throw new Error(`GeckoTerminal API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('GeckoTerminal response:', JSON.stringify(data, null, 2));

    const poolData = data.data?.attributes;
    
    if (!poolData) {
      throw new Error('Invalid pool data from GeckoTerminal');
    }

    const result = {
      priceUsd: poolData.base_token_price_usd || '0',
      priceChange24h: parseFloat(poolData.price_change_percentage?.h24 || '0'),
      volume24h: poolData.volume_usd?.h24 || '0',
      poolName: poolData.name || 'BLOOM Pool',
      liquidity: poolData.reserve_in_usd || '0',
    };

    console.log('Returning price data:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching BLOOM price:', errorMessage);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        priceUsd: '0',
        priceChange24h: 0,
        volume24h: '0',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
