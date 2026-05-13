import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createWalletClient, createPublicClient, http, parseUnits, getAddress, pad } from "https://esm.sh/viem@2.21.55";
import { privateKeyToAccount } from "https://esm.sh/viem@2.21.55/accounts";
import { base } from "https://esm.sh/viem@2.21.55/chains";
import { createHmac } from "node:crypto";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-neynar-signature',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const BLOOM_TOKEN = "0xa07e759da6b3d4d75ed76f92fbcb867b9c145b07";
const BLOOM_TIPPING = "0xF009C91FF4838Ebd76d23B9694Fb6e78bE25a5f2";

const ERC20_ABI = [
  { name: "balanceOf", type: "function", stateMutability: "view",
    inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "allowance", type: "function", stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ name: "", type: "uint256" }] },
] as const;

const TIPPING_ABI = [
  { name: "executeTip", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "fromFid", type: "uint256" },
      { name: "toFid", type: "uint256" },
      { name: "castHash", type: "bytes32" },
    ],
    outputs: [] },
] as const;

// Default tip amount when user replies just "bloom" or 🌸 with no number
const DEFAULT_TIP = 100;

// Match: "bloom", "🌸", "tip 50 bloom", "50 $bloom", "bloom 25", "🌸 10"
const NUMBER_THEN_BLOOM = /(\d+(?:\.\d+)?)\s*(?:\$?bloom|🌸)/i;
const BLOOM_THEN_NUMBER = /(?:\$?bloom|🌸)\s*(\d+(?:\.\d+)?)/i;
const TIP_THEN_NUMBER = /tip\s+(\d+(?:\.\d+)?)/i;
const KEYWORD_ONLY = /(?:^|\s)(?:\$?bloom|🌸)(?:\s|$|[!.?])/i;

function parseTipCommand(text: string): number | null {
  if (!text) return null;
  for (const re of [TIP_THEN_NUMBER, NUMBER_THEN_BLOOM, BLOOM_THEN_NUMBER]) {
    const m = text.match(re);
    if (m) {
      const a = parseFloat(m[1]);
      if (a >= 1) return a;
    }
  }
  if (KEYWORD_ONLY.test(text)) return DEFAULT_TIP;
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

function castHashToBytes32(hash: string): `0x${string}` {
  const clean = hash.startsWith('0x') ? hash : `0x${hash}`;
  return pad(clean as `0x${string}`, { size: 32 });
}

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  try {
    const hmac = createHmac("sha512", secret);
    hmac.update(rawBody);
    const expected = hmac.digest("hex");
    // constant-time-ish compare
    if (expected.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Health check / Neynar test GET
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ ok: true, service: 'process-tip-webhook' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const NEYNAR_API_KEY = Deno.env.get('NEYNAR_API_KEY');
    // Prefer the on-chain executor key (BACKEND_SIGNER_PRIVATE_KEY = 0xad3e2d50...456637233);
    // fall back to TIP_POOL_PRIVATE_KEY for backward compatibility.
    const TIP_POOL_PRIVATE_KEY =
      Deno.env.get('BACKEND_SIGNER_PRIVATE_KEY') || Deno.env.get('TIP_POOL_PRIVATE_KEY');
    const NEYNAR_WEBHOOK_SECRET = Deno.env.get('NEYNAR_WEBHOOK_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!NEYNAR_API_KEY || !TIP_POOL_PRIVATE_KEY) {
      console.error('Missing required secrets (NEYNAR_API_KEY / TIP_POOL_PRIVATE_KEY)');
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Read raw body once — needed for HMAC verification AND empty-body handling
    const rawBody = await req.text();
    if (!rawBody || rawBody.trim().length === 0) {
      console.log('Empty body received (likely a Neynar test ping)');
      return new Response(JSON.stringify({ ok: true, message: 'empty body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify Neynar HMAC signature if secret is configured
    if (NEYNAR_WEBHOOK_SECRET) {
      const sig = req.headers.get('X-Neynar-Signature') || req.headers.get('x-neynar-signature');
      if (!verifySignature(rawBody, sig, NEYNAR_WEBHOOK_SECRET)) {
        console.warn('Invalid X-Neynar-Signature; rejecting');
        return new Response(JSON.stringify({ error: 'invalid signature' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      console.warn('NEYNAR_WEBHOOK_SECRET not configured — accepting webhook unverified');
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      console.error('Bad JSON body:', rawBody.slice(0, 200));
      return new Response(JSON.stringify({ error: 'invalid json' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Webhook:', {
      type: payload.type,
      author: payload.data?.author?.username,
      text: payload.data?.text?.slice(0, 80),
      parent_hash: payload.data?.parent_hash,
    });

    if (payload.type !== 'cast.created') {
      return new Response(JSON.stringify({ message: 'ignored', type: payload.type }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = payload.data;
    if (!data?.parent_hash || !data?.parent_author?.fid) {
      return new Response(JSON.stringify({ message: 'not a reply' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tipAmount = parseTipCommand(data.text || '');
    if (!tipAmount) {
      return new Response(JSON.stringify({ message: 'no tip command', text: data.text?.slice(0, 80) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const senderFid = Number(data.author.fid);
    const receiverFid = Number(data.parent_author.fid);
    const castHash = String(data.hash);

    if (senderFid === receiverFid) {
      return new Response(JSON.stringify({ message: 'self-tip blocked' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : null;

    if (supabase) {
      const { data: existing } = await supabase
        .from('pending_tips')
        .select('id, status')
        .eq('cast_hash', castHash)
        .limit(1);
      if (existing && existing.length > 0) {
        console.log('Already processed:', castHash, existing[0]);
        return new Response(JSON.stringify({ message: 'duplicate' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

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

    const pk = TIP_POOL_PRIVATE_KEY.startsWith('0x') ? TIP_POOL_PRIVATE_KEY : `0x${TIP_POOL_PRIVATE_KEY}`;
    const account = privateKeyToAccount(pk as `0x${string}`);
    console.log(`Executor (backend signer): ${account.address}`);
    const publicClient = createPublicClient({ chain: base, transport: http() });
    const walletClient = createWalletClient({ account, chain: base, transport: http() });

    const amountWei = parseUnits(tipAmount.toString(), 18);
    const senderAddr = getAddress(senderWallet);
    const receiverAddr = getAddress(receiverWallet);

    const [senderBalance, senderAllowance] = await Promise.all([
      publicClient.readContract({
        address: BLOOM_TOKEN, abi: ERC20_ABI, functionName: 'balanceOf', args: [senderAddr],
      }) as Promise<bigint>,
      publicClient.readContract({
        address: BLOOM_TOKEN, abi: ERC20_ABI, functionName: 'allowance', args: [senderAddr, BLOOM_TIPPING],
      }) as Promise<bigint>,
    ]);

    const recordFailure = async (status: string) => {
      if (!supabase) return;
      await supabase.from('pending_tips').insert({
        sender_fid: senderFid, receiver_fid: receiverFid,
        sender_wallet: senderAddr.toLowerCase(), receiver_wallet: receiverAddr.toLowerCase(),
        amount: tipAmount.toString(), cast_hash: castHash,
        sender_username: data.author.username, status,
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

    const castHashBytes32 = castHashToBytes32(castHash);
    console.log(`executeTip: ${tipAmount} BLOOM ${senderAddr} -> ${receiverAddr} (cast ${castHash})`);

    const txHash = await walletClient.writeContract({
      address: BLOOM_TIPPING as `0x${string}`,
      abi: TIPPING_ABI,
      functionName: 'executeTip',
      args: [senderAddr, receiverAddr, amountWei, BigInt(senderFid), BigInt(receiverFid), castHashBytes32],
    });

    console.log('Tx submitted:', txHash);

    if (supabase) {
      await supabase.from('pending_tips').insert({
        sender_fid: senderFid, receiver_fid: receiverFid,
        sender_wallet: senderAddr.toLowerCase(), receiver_wallet: receiverAddr.toLowerCase(),
        amount: tipAmount.toString(), cast_hash: castHash,
        sender_username: data.author.username, status: 'executed',
        tx_hash: txHash, executed_at: new Date().toISOString(),
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
