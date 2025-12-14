import { createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';

// BloomersGifts contract on Base
export const BLOOMERS_GIFTS_ADDRESS = '0x4C1e7de7bae1820b0A34bC14810bD0e8daE8aE7f' as const;

// ABI for claimGift function
export const BLOOMERS_GIFTS_ABI = [
  {
    name: 'claimGift',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'hasClaimed',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

// Create wagmi config for Base network
export const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
});
