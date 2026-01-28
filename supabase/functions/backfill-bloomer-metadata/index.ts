import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BLOOMERS_NFT_ADDRESS = '0x31031d10988169e6cac45F47469BA87d8B394E1e';
const BASE_RPC_URL = 'https://base.publicnode.com';

// Transfer event topic: keccak256("Transfer(address,address,uint256)")
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching Transfer events from NFT contract...');

    // First get current block number
    const blockResponse = await fetch(BASE_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_blockNumber',
        params: []
      })
    });
    const blockData = await blockResponse.json();
    const currentBlock = parseInt(blockData.result, 16);
    // Go back ~24 hours worth of blocks (2 second block time on Base = 43200 blocks/day)
    const fromBlock = Math.max(0, currentBlock - 50000);
    console.log(`Querying from block ${fromBlock} to ${currentBlock}`);

    // Get all Transfer events from the NFT contract (mints are from 0x0 address)
    const logsResponse = await fetch(BASE_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getLogs',
        params: [{
          fromBlock: `0x${fromBlock.toString(16)}`,
          toBlock: 'latest',
          address: BLOOMERS_NFT_ADDRESS,
          topics: [TRANSFER_TOPIC]
        }]
      })
    });

    
    const logsData = await logsResponse.json();
    
    if (logsData.error) {
      throw new Error(`RPC error: ${logsData.error.message}`);
    }

    const logs = logsData.result || [];
    console.log(`Found ${logs.length} Transfer events`);

    // Get all minted bloomers from database
    const { data: bloomers, error } = await supabase
      .from('minted_bloomers')
      .select('*')
      .not('tx_hash', 'is', null);

    if (error) throw error;

    console.log(`Found ${bloomers?.length || 0} minted bloomers in database`);

    // Create a map of tx_hash -> bloomer
    const bloomersByTxHash = new Map();
    for (const bloomer of bloomers || []) {
      bloomersByTxHash.set(bloomer.tx_hash.toLowerCase(), bloomer);
    }

    const results = [];

    // Process each Transfer event
    for (const log of logs) {
      const txHash = log.transactionHash.toLowerCase();
      const tokenId = parseInt(log.topics[3], 16);
      
      const bloomer = bloomersByTxHash.get(txHash);
      
      if (!bloomer) {
        console.log(`No database record for txHash ${txHash}, tokenId ${tokenId}`);
        results.push({ tokenId, success: false, error: 'No database record' });
        continue;
      }

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
        results.push({ tokenId, txHash, success: false, error: uploadError.message });
      } else {
        console.log(`Uploaded metadata for token ${tokenId} (tx: ${txHash})`);
        results.push({ tokenId, txHash, success: true, image: bloomer.image_url });
      }
    }

    return new Response(JSON.stringify({ 
      message: `Processed ${logs.length} on-chain mints, uploaded ${results.filter(r => r.success).length} metadata files`,
      totalOnChain: logs.length,
      totalInDb: bloomers?.length || 0,
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
