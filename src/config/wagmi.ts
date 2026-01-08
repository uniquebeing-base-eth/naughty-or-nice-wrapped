import { createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';

// BLOOM Token on Base
export const BLOOM_TOKEN_ADDRESS = '0xd6B69E58D44e523EB58645F1B78425c96Dfa648C' as const;

// BLOOM Tipping Contract on Base
export const BLOOM_TIPPING_ADDRESS = '0xaa9E610270a1205Fca3E2625A8f26963c745C011' as const;

// BloomersVerdictClaim contract on Base (ENB)
export const BLOOMERS_VERDICT_ADDRESS = '0xf2BD230858D30e5858937a27A0C2FB8309E47997' as const;

// UniqueHubVerdictClaim contract on Base (UNIQ)
export const UNIQUEHUB_VERDICT_ADDRESS = '0xaa21174594d02b36AfAB8a9533927F1133AA91cA' as const;

// BloomersNFT contract on Base
export const BLOOMERS_NFT_ADDRESS = '0x31031d10988169e6cac45F47469BA87d8B394E1e' as const;

// ABI for BloomersVerdictClaim
export const BLOOMERS_VERDICT_ABI = [
  {
    name: 'claimReward',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'signature', type: 'bytes' }],
    outputs: [],
  },
  {
    name: 'canClaimToday',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getTimeUntilNextClaim',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'lastClaimTimestamp',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalClaimed',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// ABI for BloomersNFT
export const BLOOMERS_NFT_ABI = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'batchMint',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'count', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'getMintPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'hasDiscount',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'mintPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'discountedMintPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalMinted',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getUserENBBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// ABI for BloomTipping
export const BLOOM_TIPPING_ABI = [
  {
    name: 'tip',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'fromFid', type: 'uint256' },
      { name: 'toFid', type: 'uint256' },
      { name: 'castHash', type: 'bytes32' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'batchTip',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'tipDataArray',
        type: 'tuple[]',
        components: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'fromFid', type: 'uint256' },
          { name: 'toFid', type: 'uint256' },
          { name: 'castHash', type: 'bytes32' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'signature', type: 'bytes' },
        ],
      },
    ],
    outputs: [],
  },
  {
    name: 'nonces',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getTipCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getTip',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'index', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'fromFid', type: 'uint256' },
          { name: 'toFid', type: 'uint256' },
          { name: 'castHash', type: 'bytes32' },
          { name: 'timestamp', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'getTipsSentCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getTipsReceivedCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getTipsSentByUser',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'offset', type: 'uint256' },
      { name: 'limit', type: 'uint256' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'fromFid', type: 'uint256' },
          { name: 'toFid', type: 'uint256' },
          { name: 'castHash', type: 'bytes32' },
          { name: 'timestamp', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'getTipsReceivedByUser',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'offset', type: 'uint256' },
      { name: 'limit', type: 'uint256' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'fromFid', type: 'uint256' },
          { name: 'toFid', type: 'uint256' },
          { name: 'castHash', type: 'bytes32' },
          { name: 'timestamp', type: 'uint256' },
        ],
      },
    ],
  },
] as const;

// Create wagmi config for Base network
export const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
});
