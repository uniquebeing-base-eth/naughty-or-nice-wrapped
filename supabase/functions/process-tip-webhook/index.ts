import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createWalletClient, createPublicClient, http, parseUnits, getAddress, keccak256, toBytes, pad } from "https://esm.sh/viem@2.21.55";
import { privateKeyToAccount } from "https://esm.sh/viem@2.21.55/accounts";
import { base } from "https://esm.sh/viem@2.21.55/chains";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-neynar-signature',
};

// Canonical BLOOM token on Base
const BLOOM_TOKEN = "0xa07e759da6b3d4d75ed76f92fbcb867b9c145b07";

// BloomCommentTipping contract (pull-based, approve-once)
const BLOOM_TIPPING = "0xF009C91FF4838Ebd76d23B9694Fb6e78bE25a5f2";

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const TIPPING_ABI = [
  {
    name: "executeTip",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "fromFid", type: "uint256" },
      { name: "toFid", type: "uint256" },
      { name: "castHash", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;

// Tip command patterns
const TIP_REGEX = /(?:tip|🌸|\$bloom)\s*(\d+(?:\.\d+)?)\s*(?:bloom|\$bloom|🌸)?/i;
const BLOOM_MENTION_REGEX = /(\d+(?:\.\d+)?)\s*(?:\$bloom|bloom|🌸)/i;

function parseTipCommand(text: string): number | null {
  let m = text.match(TIP_REGEX);
  if (m) {
    const a = parseFloat(m[1]);
    if (a >= 1) return a;
  }
  m = text.match(BLOOM_MENTION_REGEX);
  if (m) {
    const a = parseFloat(m[1]);
    if (a >= 1) return a;
  }
  return null;
}

async function getWalletForFid(fid: number, apiKey: string): Promise<string | null> {
  try {
    const r = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
      headers: { 'accept': 'application/json', 'x-api-key': apiKey },
    });
    if (!r.ok) return null;
    const d = await r.json();
    const u = d.users?.[0];
    if (u?.verified_addresses?.eth_addresses?.length > 0) return u.verified_addresses.eth_addresses[0];
    if (u?.custody_address) return u.custody_address;
    return null;
  } catch {
    return null;
  }
}

// Convert Farcaster cast hash (0x... 20 bytes) to bytes32 (left-padded)
function castHashToBytes32(hash: string): `0x${string}` {
  const clean = hash.startsWith('0x') ? hash : `0x${hash}`;
  return pad(clean as `0x${string}`, { size: 32 });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const NEYNAR_API_KEY = Deno.env.get('NEYNAR_API_KEY');
    const TIP_POOL_PRIVATE_KEY = Deno.env.get('TIP_POOL_PRIVATE_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!NEYNAR_API_KEY || !TIP_POOL_PRIVATE_KEY) {
      console.error('Missing required secrets');
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();
    console.log('Webhook:', { type: payload.type, author: payload.data?.author?.username, text: payload.data?.text?.slice(0, 80) });

    if (payload.type !== 'cast.created') {
      return new Response(JSON.stringify({ message: 'ignored' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = payload.data;
    if (!data.parent_hash || !data.parent_author?.fid) {
      return new Response(JSON.stringify({ message: 'not a reply' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const tipAmount = parseTipCommand(data.text);
    if (!tipAmount) {
      return new Response(JSON.stringify({ message: 'no tip command' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const senderFid = data.author.fid;
    const receiverFid = data.parent_author.fid;
    const castHash = data.hash;

    if (senderFid === receiverFid) {
      console.log('Self-tip blocked');
      return new Response(JSON.stringify({ message: 'self-tip blocked' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : null;

    if (supabase) {
      const { data: existing } = await supabase.from('pending_tips').select('id').eq('cast_hash', castHash).limit(1);
      if (existing && existing.length > 0) {
        console.log('Already processed:', castHash);
        return new Response(JSON.stringify({ message: 'duplicate' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Resolve wallets
    const [senderWallet, receiverWallet] = await Promise.all([
      getWalletForFid(senderFid, NEYNAR_API_KEY),
      getWalletForFid(receiverFid, NEYNAR_API_KEY),
    ]);

    if (!senderWallet) {
      console.log(`Sender FID ${senderFid} has no wallet`);
      return new Response(JSON.stringify({ error: 'sender has no wallet' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!receiverWallet) {
      console.log(`Receiver FID ${receiverFid} has no wallet`);
      return new Response(JSON.stringify({ error: 'receiver has no wallet' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Set up viem clients
    const pk = TIP_POOL_PRIVATE_KEY.startsWith('0x') ? TIP_POOL_PRIVATE_KEY : `0x${TIP_POOL_PRIVATE_KEY}`;
    const account = privateKeyToAccount(pk as `0x${string}`);

    const publicClient = createPublicClient({ chain: base, transport: http() });
    const walletClient = createWalletClient({ account, chain: base, transport: http() });

    const amountWei = parseUnits(tipAmount.toString(), 18);
    const senderAddr = getAddress(senderWallet);
    const receiverAddr = getAddress(receiverWallet);

    // Check sender balance + allowance
    const [senderBalance, senderAllowance] = await Promise.all([
      publicClient.readContract({
        address: BLOOM_TOKEN,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [senderAddr],
      }) as Promise<bigint>,
      publicClient.readContract({
        address: BLOOM_TOKEN,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [senderAddr, BLOOM_TIPPING],
      }) as Promise<bigint>,
    ]);

    const recordFailure = async (status: string) => {
      if (!supabase) return;
      await supabase.from('pending_tips').insert({
        sender_fid: senderFid,
        receiver_fid: receiverFid,
        sender_wallet: senderAddr.toLowerCase(),
        receiver_wallet: receiverAddr.toLowerCase(),
        amount: tipAmount.toString(),
        cast_hash: castHash,
        sender_username: data.author.username,
        status,
      });
    };

    if (senderBalance < amountWei) {
      console.error(`Sender balance too low: have ${senderBalance}, need ${amountWei}`);
      await recordFailure('insufficient_balance');
      return new Response(JSON.stringify({ error: 'insufficient sender balance' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (senderAllowance < amountWei) {
      console.error(`Sender allowance too low: have ${senderAllowance}, need ${amountWei}`);
      await recordFailure('insufficient_allowance');
      return new Response(JSON.stringify({ error: 'sender has not approved enough BLOOM. Visit the mini app to approve.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Execute pull-based tip via BloomCommentTipping.executeTip
    const castHashBytes32 = castHashToBytes32(castHash);
    console.log(`executeTip: ${tipAmount} BLOOM from ${senderAddr} -> ${receiverAddr} (cast ${castHash})`);

    const txHash = await walletClient.writeContract({
      address: BLOOM_TIPPING as `0x${string}`,
      abi: TIPPING_ABI,
      functionName: 'executeTip',
      args: [
        senderAddr,
        receiverAddr,
        amountWei,
        BigInt(senderFid),
        BigInt(receiverFid),
        castHashBytes32,
      ],
    });

    console.log('Tx submitted:', txHash);

    if (supabase) {
      await supabase.from('pending_tips').insert({
        sender_fid: senderFid,
        receiver_fid: receiverFid,
        sender_wallet: senderAddr.toLowerCase(),
        receiver_wallet: receiverAddr.toLowerCase(),
        amount: tipAmount.toString(),
        cast_hash: castHash,
        sender_username: data.author.username,
        status: 'executed',
        tx_hash: txHash,
        executed_at: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({ success: true, txHash, amount: tipAmount, from: senderAddr, to: receiverAddr }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
