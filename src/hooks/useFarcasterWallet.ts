
import { useState, useEffect, useCallback } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { createWalletClient, custom, type WalletClient, type Chain } from 'viem';
import { base } from 'viem/chains';

const BASE_CHAIN_ID = '0x2105';

export function useFarcasterWallet() {
  const [address, setAddress] = useState<`0x${string}` | undefined>();
  const [isConnected, setIsConnected] = useState(false);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    if (!sdk?.wallet?.ethProvider) {
      console.error('Farcaster wallet provider not available');
      return null;
    }

    setIsConnecting(true);
    try {
      const provider = sdk.wallet.ethProvider;

      // Switch to Base network
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_CHAIN_ID }],
        });
      } catch (switchError) {
        console.log('Network switch error (may already be on Base):', switchError);
      }

      // Request accounts
      const accounts = await provider.request({ 
        method: 'eth_requestAccounts' 
      }) as string[];
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned');
      }

      const userAddress = accounts[0] as `0x${string}`;
      setAddress(userAddress);
      setIsConnected(true);

      // Create viem wallet client with Farcaster provider
      const client = createWalletClient({
        account: userAddress,
        chain: base as Chain,
        transport: custom(provider),
      });

      setWalletClient(client);
      return { address: userAddress, client };
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Auto-connect on mount if provider available
  useEffect(() => {
    if (sdk?.wallet?.ethProvider && !isConnected && !isConnecting) {
      // Don't auto-connect, wait for user action
    }
  }, [isConnected, isConnecting]);

  return {
    address,
    isConnected,
    walletClient,
    connect,
    isConnecting,
  };
}
