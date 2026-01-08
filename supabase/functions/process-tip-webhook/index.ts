import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-neynar-signature',
};

// Regex to detect tip commands: "tip 10 bloom", "$bloom 1000", "🌸 50 bloom", etc.
const TIP_REGEX = /(?:tip|🌸|\$bloom)\s*(\d+(?:\.\d+)?)\s*(?:bloom|\$bloom|🌸)?/i;
const BLOOM_MENTION_REGEX = /(\d+(?:\.\d+)?)\s*(?:\$bloom|bloom|🌸)/i;

interface CastAuthor {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  verified_addresses?: {
    eth_addresses: string[];
  };
}

interface WebhookData {
  object: string;
  hash: string;
  thread_hash: string;
  parent_hash: string | null;
  parent_author: {
    fid: number | null;
  };
  author: CastAuthor;
  text: string;
  timestamp: string;
  embeds: unknown[];
  mentioned_profiles: CastAuthor[];
}

interface NeynarWebhookPayload {
  created_at: number;
  type: string;
  data: WebhookData;
}

// Parse tip amount from text
function parseTipCommand(text: string): number | null {
  // Try main regex first
  let match = text.match(TIP_REGEX);
  if (match) {
    const amount = parseFloat(match[1]);
    if (amount >= 1) return amount;
  }
  
  // Try alternative pattern
  match = text.match(BLOOM_MENTION_REGEX);
  if (match) {
    const amount = parseFloat(match[1]);
    if (amount >= 1) return amount;
  }
  
  return null;
}

// Get wallet address for a FID
async function getWalletForFid(fid: number, apiKey: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          'accept': 'application/json',
          'x-api-key': apiKey,
        },
      }
    );

    if (!response.ok) {
      console.error(`Neynar API error for FID ${fid}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const user = data.users?.[0];
    
    if (user?.verified_addresses?.eth_addresses?.length > 0) {
      return user.verified_addresses.eth_addresses[0];
    }
    
    // Fallback to custody address
    if (user?.custody_address) {
      return user.custody_address;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching wallet for FID:', error);
    return null;
  }
}

// Reply to a cast
async function replyToCast(
  parentHash: string,
  text: string,
  signerUuid: string,
  apiKey: string
): Promise<boolean> {
  try {
    const response = await fetch('https://api.neynar.com/v2/farcaster/cast', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        signer_uuid: signerUuid,
        text: text,
        parent: parentHash,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error replying to cast:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const NEYNAR_API_KEY = Deno.env.get('NEYNAR_API_KEY');
    const NEYNAR_SIGNER_UUID = Deno.env.get('NEYNAR_SIGNER_UUID');
    const BACKEND_SIGNER_PRIVATE_KEY = Deno.env.get('BACKEND_SIGNER_PRIVATE_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!NEYNAR_API_KEY) {
      console.error('NEYNAR_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: NeynarWebhookPayload = await req.json();
    
    console.log('Webhook received:', {
      type: payload.type,
      author: payload.data?.author?.username,
      text: payload.data?.text?.slice(0, 50),
      parentAuthorFid: payload.data?.parent_author?.fid,
    });

    // Only process cast.created events
    if (payload.type !== 'cast.created') {
      return new Response(
        JSON.stringify({ message: 'Event type not supported' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data } = payload;
    
    // Must be a reply (has parent_hash and parent_author.fid)
    if (!data.parent_hash || !data.parent_author?.fid) {
      return new Response(
        JSON.stringify({ message: 'Not a reply, skipping' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse tip amount from text
    const tipAmount = parseTipCommand(data.text);
    
    if (!tipAmount) {
      return new Response(
        JSON.stringify({ message: 'No tip command found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const senderFid = data.author.fid;
    const receiverFid = data.parent_author.fid;
    const castHash = data.hash;

    // Prevent self-tipping
    if (senderFid === receiverFid) {
      console.log('Self-tip attempt blocked');
      return new Response(
        JSON.stringify({ message: 'Self-tipping not allowed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Tip detected:', {
      amount: tipAmount,
      from: senderFid,
      to: receiverFid,
      castHash: castHash.slice(0, 10),
    });

    // Get wallet addresses for both sender and receiver
    const [senderWallet, receiverWallet] = await Promise.all([
      getWalletForFid(senderFid, NEYNAR_API_KEY),
      getWalletForFid(receiverFid, NEYNAR_API_KEY),
    ]);

    if (!senderWallet) {
      console.log(`No wallet for sender FID ${senderFid}`);
      if (NEYNAR_SIGNER_UUID) {
        await replyToCast(
          castHash,
          `@${data.author.username} Please verify your wallet on Farcaster to tip BLOOM 🌸`,
          NEYNAR_SIGNER_UUID,
          NEYNAR_API_KEY
        );
      }
      return new Response(
        JSON.stringify({ error: 'Sender has no verified wallet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!receiverWallet) {
      console.log(`No wallet for receiver FID ${receiverFid}`);
      return new Response(
        JSON.stringify({ error: 'Receiver has no verified wallet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store pending tip in database for user to execute
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      await supabase.from('pending_tips').insert({
        sender_fid: senderFid,
        receiver_fid: receiverFid,
        sender_wallet: senderWallet.toLowerCase(),
        receiver_wallet: receiverWallet.toLowerCase(),
        amount: tipAmount.toString(),
        cast_hash: castHash,
        sender_username: data.author.username,
        status: 'pending',
      });
    }

    // Generate signature for the tip
    if (BACKEND_SIGNER_PRIVATE_KEY) {
      // Import crypto libraries
      const { keccak256 } = await import("https://esm.sh/ethereum-cryptography@2.1.2/keccak");
      const { secp256k1 } = await import("https://esm.sh/ethereum-cryptography@2.1.2/secp256k1");

      // Get current nonce from chain (would need RPC call)
      // For now, we'll store the signature data for the user to execute
      
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour deadline
      const amountWei = BigInt(Math.floor(tipAmount * 1e18)).toString();
      
      // Store tip for later execution
      const tipData = {
        sender_fid: senderFid,
        receiver_fid: receiverFid,
        sender_wallet: senderWallet,
        receiver_wallet: receiverWallet,
        amount: tipAmount,
        amount_wei: amountWei,
        cast_hash: castHash,
        deadline,
        sender_username: data.author.username,
        timestamp: Date.now(),
      };

      console.log('Tip prepared for execution:', tipData);

      // Reply to confirm tip is queued
      if (NEYNAR_SIGNER_UUID) {
        await replyToCast(
          castHash,
          `🌸 ${tipAmount} BLOOM tip queued from @${data.author.username}!\nOpen Bloomers app to execute. ✨`,
          NEYNAR_SIGNER_UUID,
          NEYNAR_API_KEY
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Tip queued for execution',
          tip: tipData,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Tip detected',
        from: senderFid,
        to: receiverFid,
        amount: tipAmount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
