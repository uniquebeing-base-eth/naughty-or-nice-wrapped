
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BLOOM_TIPPING_ADDRESS = '0xaa9E610270a1205Fca3E2625A8f26963c745C011';
const BASE_CHAIN_ID = 8453;

// Helper to convert hex string to bytes
function hexToBytes(hex: string): Uint8Array {
  hex = hex.replace('0x', '');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Helper to convert bytes to hex
function bytesToHex(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper to pad address to 32 bytes
function padAddress(address: string): Uint8Array {
  const bytes = new Uint8Array(32);
  const addrBytes = hexToBytes(address.slice(2));
  bytes.set(addrBytes, 32 - addrBytes.length);
  return bytes;
}

// Helper to pad uint256 to 32 bytes
function padUint256(value: bigint): Uint8Array {
  const hex = value.toString(16).padStart(64, '0');
  return hexToBytes(hex);
}

// Helper to convert bytes32 string to Uint8Array
function bytes32ToArray(hex: string): Uint8Array {
  if (hex.startsWith('0x')) hex = hex.slice(2);
  if (hex.length !== 64) {
    // Pad or hash if needed
    hex = hex.padEnd(64, '0');
  }
  return hexToBytes(hex);
}

// Keccak256 implementation using Web Crypto with additional processing
async function keccak256(data: Uint8Array): Promise<Uint8Array> {
  // Import keccak from deno std
  const { keccak256: keccak } = await import("https://esm.sh/ethereum-cryptography@2.1.2/keccak");
  return keccak(data);
}

// Sign message with private key
async function signMessage(messageHash: Uint8Array, privateKey: string): Promise<string> {
  const { secp256k1 } = await import("https://esm.sh/ethereum-cryptography@2.1.2/secp256k1");
  
  const privKeyBytes = hexToBytes(privateKey.replace('0x', ''));
  const signature = secp256k1.sign(messageHash, privKeyBytes);
  
  // Encode signature in Ethereum format (r, s, v)
  const r = signature.r.toString(16).padStart(64, '0');
  const s = signature.s.toString(16).padStart(64, '0');
  const v = (signature.recovery + 27).toString(16).padStart(2, '0');
  
  return '0x' + r + s + v;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      from,        // sender address
      to,          // recipient address
      amount,      // tip amount (as string)
      fromFid,     // sender's FID
      toFid,       // recipient's FID
      castHash,    // cast hash (bytes32)
      nonce,       // current nonce for user
      deadline     // signature expiry timestamp
    } = await req.json();

    // Validate inputs
    if (!from || !to || !amount || fromFid === undefined || toFid === undefined || !castHash || nonce === undefined || !deadline) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const privateKey = Deno.env.get('BACKEND_SIGNER_PRIVATE_KEY');
    if (!privateKey) {
      console.error('BACKEND_SIGNER_PRIVATE_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the message hash exactly as the contract does
    // keccak256(abi.encodePacked(from, to, amount, fromFid, toFid, castHash, nonce, deadline, chainId, contractAddress))
    const packedData = new Uint8Array([
      ...padAddress(from),
      ...padAddress(to),
      ...padUint256(BigInt(amount)),
      ...padUint256(BigInt(fromFid)),
      ...padUint256(BigInt(toFid)),
      ...bytes32ToArray(castHash),
      ...padUint256(BigInt(nonce)),
      ...padUint256(BigInt(deadline)),
      ...padUint256(BigInt(BASE_CHAIN_ID)),
      ...padAddress(BLOOM_TIPPING_ADDRESS),
    ]);

    const messageHash = await keccak256(packedData);
    
    // Create eth signed message hash: keccak256("\x19Ethereum Signed Message:\n32" + messageHash)
    const prefix = new TextEncoder().encode("\x19Ethereum Signed Message:\n32");
    const ethSignedMessageHash = await keccak256(new Uint8Array([...prefix, ...messageHash]));
    
    // Sign the message
    const signature = await signMessage(ethSignedMessageHash, privateKey);

    console.log('Tip signature generated:', {
      from,
      to,
      amount,
      fromFid,
      toFid,
      castHash: castHash.slice(0, 10) + '...',
      nonce,
      deadline,
    });

    return new Response(
      JSON.stringify({ 
        signature,
        nonce: Number(nonce),
        deadline: Number(deadline),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error signing tip:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
