
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userAddress, fid } = await req.json();
    
    console.log('Sign claim request:', { userAddress, fid });

    if (!userAddress || !fid) {
      return new Response(
        JSON.stringify({ error: 'Missing userAddress or fid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has a verdict in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: userData, error: dbError } = await supabase
      .from('wrapped_stats')
      .select('stats')
      .eq('fid', fid)
      .single();

    if (dbError || !userData) {
      console.log('No verdict found for FID:', fid);
      return new Response(
        JSON.stringify({ error: 'No verdict found. Complete your wrapped first!' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if stats contains judgment - both Nice (true) and Naughty (false) users can claim
    const stats = userData.stats as any;
    const hasVerdict = stats?.judgment !== undefined && typeof stats?.judgment?.isNice === 'boolean';
    
    if (!hasVerdict) {
      console.log('User has no judgment verdict:', fid, 'stats:', JSON.stringify(stats?.judgment));
      return new Response(
        JSON.stringify({ error: 'No verdict found. Complete your wrapped first!' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verdictType = stats.judgment.isNice ? 'Nice' : 'Naughty';
    console.log('User verdict found:', { fid, verdictType, score: stats.judgment.score });

    console.log('User has verdict, signing claim for:', userAddress);

    // Get the private key
    const privateKey = Deno.env.get('BACKEND_SIGNER_PRIVATE_KEY');
    if (!privateKey) {
      console.error('BACKEND_SIGNER_PRIVATE_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the message hash: keccak256(abi.encodePacked(userAddress))
    // We need to sign the message that the contract expects
    const { ethers } = await import("https://esm.sh/ethers@6.9.0");
    
    // Create message hash matching contract's getMessageHash
    const messageHash = ethers.solidityPackedKeccak256(
      ['address'],
      [userAddress]
    );

    // Create wallet and sign the message hash
    const wallet = new ethers.Wallet(privateKey);
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));

    console.log('Signature generated for:', userAddress);

    return new Response(
      JSON.stringify({ 
        signature,
        message: 'Claim authorized'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sign claim error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to sign claim' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
