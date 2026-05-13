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

const DEFAULT_BLOOM_TOKEN = "0xa07e759da6b3d4d75ed76f92fbcb867b9c145b07";
const DEFAULT_TIP_CONTRACT = "0xF009C91FF4838Ebd76d23B9694Fb6e78bE25a5f2";
const DEFAULT_BLOOM_DECIMALS = 18;
const DEFAULT_MAX_TIP = 1000;
const DEFAULT_BASE_RPC_URL = "https://base-rpc.publicnode.com";

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
  { name: "executors", type: "function", stateMutability: "view",
    inputs: [{ name: "executor", type: "address" }], outputs: [{ name: "", type: "bool" }] },
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
    if (u?.verified_addresses?.primary?.eth_address) return u.verified_addresses.primary.eth_address;
    if (u?.verified_addresses?.eth_addresses?.length > 0) return u.verified_addresses.eth_addresses[0];
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
    const provided = signature.trim().toLowerCase();
    // constant-time-ish compare
    if (expected.length !== provided.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function selectExecutorKey(publicClient: ReturnType<typeof createPublicClient>, tipContract: `0x${string}`) {
  const privateKeys = [
    Deno.env.get('BACKEND_SIGNER_PRIVATE_KEY'),
    Deno.env.get('TIP_POOL_PRIVATE_KEY'),
  ].filter(Boolean) as string[];

  for (const raw of privateKeys) {
    const pk = raw.startsWith('0x') ? raw : `0x${raw}`;
    const account = privateKeyToAccount(pk as `0x${string}`);
    const authorized = await publicClient.readContract({
      address: tipContract,
      abi: TIPPING_ABI,
      functionName: 'executors',
      args: [account.address],
    }) as boolean;
    console.log(`Executor candidate ${account.address}: authorized=${authorized}`);
    if (authorized) return { pk: pk as `0x${string}`, account };
  }
  return null;
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
    const NEYNAR_WEBHOOK_SECRET = Deno.env.get('NEYNAR_WEBHOOK_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const BLOOM_TOKEN = (Deno.env.get('BLOOM_TOKEN_ADDRESS') || DEFAULT_BLOOM_TOKEN) as `0x${string}`;
    const TIP_CONTRACT = (Deno.env.get('TIP_CONTRACT_ADDRESS') || DEFAULT_TIP_CONTRACT) as `0x${string}`;
    const BLOOM_DECIMALS = Number(Deno.env.get('BLOOM_DECIMALS') || DEFAULT_BLOOM_DECIMALS);
    const MAX_TIP = Number(Deno.env.get('MAX_BLOOM_TIP') || DEFAULT_MAX_TIP);
    const BASE_RPC_URL = Deno.env.get('BASE_RPC_URL') || DEFAULT_BASE_RPC_URL;

    if (!NEYNAR_API_KEY) {
      console.error('Missing required secret: NEYNAR_API_KEY');
      return json({ message: 'server misconfigured' });
    }

    // Read raw body once — needed for HMAC verification AND empty-body handling
    const rawBody = await req.text();
    if (!rawBody || rawBody.trim().length === 0) {
      console.log('Empty body received (likely a Neynar test ping)');
      return json({ ok: true, message: 'empty body' });
    }

    // Verify Neynar HMAC signature if secret is configured
    if (NEYNAR_WEBHOOK_SECRET) {
      const sig = req.headers.get('X-Neynar-Signature') || req.headers.get('x-neynar-signature');
      if (!verifySignature(rawBody, sig, NEYNAR_WEBHOOK_SECRET)) {
        console.warn('Invalid X-Neynar-Signature; rejecting');
        return json({ error: 'invalid signature' }, 401);
      }
    } else {
      console.warn('NEYNAR_WEBHOOK_SECRET not configured — accepting webhook unverified');
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      console.error('Bad JSON body:', rawBody.slice(0, 200));
      return json({ message: 'invalid json' });
    }

    console.log('Webhook:', {
      type: payload.type,
      author: payload.data?.author?.username,
      text: payload.data?.text?.slice(0, 80),
      parent_hash: payload.data?.parent_hash,
    });

    if (payload.type !== 'cast.created') {
      return json({ message: 'ignored', type: payload.type });
    }

    const data = payload.data;
    if (!data?.parent_hash || !data?.parent_author?.fid) {
      return json({ message: 'not a reply' });
    }

    const tipAmount = parseTipCommand(data.text || '');
    if (!tipAmount) {
      return json({ message: 'no tip command', text: data.text?.slice(0, 80) });
    }
    if (tipAmount <= 0 || tipAmount > MAX_TIP) {
      console.log(`Tip amount out of range: ${tipAmount}`);
      return json({ message: 'tip amount out of range', maxTip: MAX_TIP });
    }

    const senderFid = Number(data.author.fid);
    const receiverFid = Number(data.parent_author.fid);
    const castHash = String(data.hash);

    if (senderFid === receiverFid) {
      return json({ message: 'self-tip blocked' });
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
        return json({ message: 'duplicate' });
      }
    }

    const [senderWallet, receiverWallet] = await Promise.all([
      getWalletForFid(senderFid, NEYNAR_API_KEY),
      getWalletForFid(receiverFid, NEYNAR_API_KEY),
    ]);

    if (!senderWallet) {
      console.log(`Sender FID ${senderFid} has no wallet`);
      return json({ message: 'sender has no verified ETH wallet' });
    }
    if (!receiverWallet) {
      console.log(`Receiver FID ${receiverFid} has no wallet`);
      return json({ message: 'receiver has no verified ETH wallet' });
    }

    const publicClient = createPublicClient({ chain: base, transport: http(BASE_RPC_URL) });
    const selected = await selectExecutorKey(publicClient, TIP_CONTRACT);
    if (!selected) {
      console.error('No configured signer is authorized on the tipping contract');
      return json({ message: 'no authorized executor signer configured' });
    }
    const { account } = selected;
    console.log(`Executor (backend signer): ${account.address}`);
    const walletClient = createWalletClient({ account, chain: base, transport: http(BASE_RPC_URL) });

    const amountWei = parseUnits(tipAmount.toString(), BLOOM_DECIMALS);
    const senderAddr = getAddress(senderWallet);
    const receiverAddr = getAddress(receiverWallet);
    console.log(`Resolved sender: ${senderAddr}`);
    console.log(`Resolved recipient: ${receiverAddr}`);

    const [senderBalance, senderAllowance] = await Promise.all([
      publicClient.readContract({
        address: BLOOM_TOKEN, abi: ERC20_ABI, functionName: 'balanceOf', args: [senderAddr],
      }) as Promise<bigint>,
      publicClient.readContract({
        address: BLOOM_TOKEN, abi: ERC20_ABI, functionName: 'allowance', args: [senderAddr, TIP_CONTRACT],
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
      return json({ message: 'insufficient sender balance' });
    }
    if (senderAllowance < amountWei) {
      console.error(`Sender allowance too low: have ${senderAllowance}, need ${amountWei}`);
      await recordFailure('insufficient_allowance');
      return json({ message: 'sender has not approved enough BLOOM for the tip contract' });
    }

    const castHashBytes32 = castHashToBytes32(castHash);
    console.log(`executeTip: ${tipAmount} BLOOM ${senderAddr} -> ${receiverAddr} (cast ${castHash})`);

    const txHash = await walletClient.writeContract({
      address: TIP_CONTRACT,
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

    return json({ success: true, txHash, amount: tipAmount, from: senderAddr, to: receiverAddr });
  } catch (err) {
    console.error('Webhook error:', err);
    return json({ message: 'webhook handled with internal error', error: err instanceof Error ? err.message : 'unknown' });
  }
});
