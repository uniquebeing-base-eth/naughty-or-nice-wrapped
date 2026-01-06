import { useState, useEffect, useCallback } from 'react';
import { useFarcaster } from '@/contexts/FarcasterContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2, Coins, TrendingUp, Wallet, CheckCircle2, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { parseUnits, formatUnits, createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { sdk } from '@farcaster/miniapp-sdk';
import Snowfall from '@/components/Snowfall';

// BLOOM Token on Base
const BLOOM_TOKEN_ADDRESS = '0xd6B69E58D44e523EB58645F1B78425c96Dfa648C' as const;

// Token for buying (the one users swap to)
const BLOOM_SWAP_TOKEN = '0xa07e759da6b3d4d75ed76f92fbcb867b9c145b07' as const;

// BLOOM Tipping Contract (deploy and update this address)
const BLOOM_TIPPING_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

// ERC20 ABI for approval and balance
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

interface BloomPrice {
  priceUsd: string;
  priceChange24h: number;
  volume24h: string;
}

interface NeynarUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  verified_addresses: {
    eth_addresses: string[];
  };
}

const BloomTipping = () => {
  const { user, isInMiniApp } = useFarcaster();
  const navigate = useNavigate();
  
  const [walletAddress, setWalletAddress] = useState<`0x${string}` | null>(null);
  const [bloomPrice, setBloomPrice] = useState<BloomPrice | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [approvalAmount, setApprovalAmount] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [currentAllowance, setCurrentAllowance] = useState<string>('0');
  const [bloomBalance, setBloomBalance] = useState<string>('0');
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [loadingBalances, setLoadingBalances] = useState(false);

  // Fetch wallet address from Neynar using FID
  const fetchWalletFromNeynar = useCallback(async () => {
    if (!user?.fid) return;
    
    try {
      setLoadingWallet(true);
      
      // Use the fetch-users-by-address edge function to get user data
      const { data, error } = await supabase.functions.invoke('fetch-users-by-address', {
        body: { fid: user.fid }
      });
      
      if (error) throw error;
      
      const neynarUser = data?.users?.[0] as NeynarUser | undefined;
      if (neynarUser?.verified_addresses?.eth_addresses?.length > 0) {
        const address = neynarUser.verified_addresses.eth_addresses[0] as `0x${string}`;
        setWalletAddress(address);
      }
    } catch (error) {
      console.error('Error fetching wallet from Neynar:', error);
    } finally {
      setLoadingWallet(false);
    }
  }, [user?.fid]);

  // Fetch BLOOM price
  const fetchBloomPrice = useCallback(async () => {
    try {
      setLoadingPrice(true);
      const { data, error } = await supabase.functions.invoke('fetch-bloom-price');
      
      if (error) throw error;
      
      if (data) {
        setBloomPrice(data);
      }
    } catch (error) {
      console.error('Error fetching BLOOM price:', error);
    } finally {
      setLoadingPrice(false);
    }
  }, []);

  // Fetch user's BLOOM balance and allowance from chain
  const fetchBalances = useCallback(async () => {
    if (!walletAddress) return;
    
    try {
      setLoadingBalances(true);
      
      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      });

      // Get balance - use any to bypass viem strict typing
      const balanceResult = await (publicClient as unknown as { readContract: (args: unknown) => Promise<bigint> }).readContract({
        address: BLOOM_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [walletAddress],
      });
      
      // Get allowance for tipping contract
      const allowanceResult = await (publicClient as unknown as { readContract: (args: unknown) => Promise<bigint> }).readContract({
        address: BLOOM_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [walletAddress, BLOOM_TIPPING_ADDRESS],
      });

      setBloomBalance(formatUnits(balanceResult, 18));
      setCurrentAllowance(formatUnits(allowanceResult, 18));
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setLoadingBalances(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchBloomPrice();
    const interval = setInterval(fetchBloomPrice, 30000);
    return () => clearInterval(interval);
  }, [fetchBloomPrice]);

  useEffect(() => {
    if (user?.fid) {
      fetchWalletFromNeynar();
    }
  }, [user?.fid, fetchWalletFromNeynar]);

  useEffect(() => {
    if (walletAddress) {
      fetchBalances();
    }
  }, [walletAddress, fetchBalances]);

  // Handle approval using Farcaster wallet
  const handleApprove = async () => {
    if (!walletAddress || !approvalAmount) {
      toast.error('Please enter an amount');
      return;
    }

    if (!sdk?.wallet?.ethProvider) {
      toast.error('Wallet not available');
      return;
    }

    try {
      setIsApproving(true);
      
      const provider = sdk.wallet.ethProvider;
      const amount = parseUnits(approvalAmount, 18);
      
      // Encode the approve function call
      const { encodeFunctionData } = await import('viem');
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [BLOOM_TIPPING_ADDRESS, amount],
      });

      // Send transaction via Farcaster wallet
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: BLOOM_TOKEN_ADDRESS,
          data: data,
        }],
      });

      toast.success('Approval submitted!', {
        description: `Transaction: ${String(txHash).slice(0, 10)}...`,
      });

      // Refresh balances after a delay
      setTimeout(() => {
        fetchBalances();
      }, 5000);
      
    } catch (error: unknown) {
      console.error('Approval error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Approval failed', {
        description: errorMessage,
      });
    } finally {
      setIsApproving(false);
    }
  };

  // Handle buy button - open Farcaster native swap
  const handleBuyBloom = async () => {
    if (!sdk?.wallet?.ethProvider) {
      toast.error('Wallet not available');
      return;
    }

    try {
      // Use Farcaster's native swap action if available
      if (sdk.actions && 'openUrl' in sdk.actions) {
        // Open the swap in Warpcast which will use Warplet
        await (sdk.actions as { openUrl: (url: string) => Promise<void> }).openUrl(
          `https://warpcast.com/~/swap?token=${BLOOM_SWAP_TOKEN}`
        );
      } else {
        // Fallback: try to open via provider
        window.open(`https://warpcast.com/~/swap?token=${BLOOM_SWAP_TOKEN}`, '_blank');
      }
    } catch (error) {
      console.error('Error opening swap:', error);
      // Fallback to direct URL
      window.open(`https://warpcast.com/~/swap?token=${BLOOM_SWAP_TOKEN}`, '_blank');
    }
  };

  const handleMax = () => {
    setApprovalAmount(bloomBalance);
  };

  const formatNumber = (num: string | number) => {
    const n = typeof num === 'string' ? parseFloat(num) : num;
    if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(2)}K`;
    return n.toFixed(4);
  };

  // Format price with 8 decimals for small values
  const formatPrice = (priceStr: string) => {
    const price = parseFloat(priceStr);
    if (price < 0.0001) {
      return price.toFixed(10); // Show up to 10 decimals for very small prices
    } else if (price < 0.01) {
      return price.toFixed(8);
    } else if (price < 1) {
      return price.toFixed(6);
    }
    return price.toFixed(4);
  };

  if (!isInMiniApp) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#1a0a28] to-[#0a1628] flex items-center justify-center p-4">
        <Card className="bg-black/40 border-purple-500/30 backdrop-blur-xl">
          <CardContent className="p-8 text-center">
            <Coins className="w-16 h-16 mx-auto mb-4 text-purple-400" />
            <h2 className="text-2xl font-bold text-white mb-2">BLOOM Tipping</h2>
            <p className="text-purple-200/70 mb-4">Open in Farcaster to access BLOOM tipping</p>
            <Button
              onClick={() => window.open('https://warpcast.com', '_blank')}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Open in Warpcast
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#1a0a28] to-[#0a1628] relative overflow-hidden">
      <Snowfall />
      
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-purple-500/20 p-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/bloomers')}
            className="text-purple-300 hover:text-white hover:bg-purple-500/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-purple-400" />
            BLOOM Tipping
          </h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4 pb-24">
        {/* Price Card */}
        <Card className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-500/30 backdrop-blur-xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-purple-200 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              BLOOM Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPrice ? (
              <div className="flex items-center gap-2 text-purple-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading price...
              </div>
            ) : bloomPrice ? (
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">
                    ${formatPrice(bloomPrice.priceUsd)}
                  </span>
                  <span className={`text-sm font-medium ${bloomPrice.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {bloomPrice.priceChange24h >= 0 ? '+' : ''}{bloomPrice.priceChange24h.toFixed(2)}%
                  </span>
                </div>
                <p className="text-sm text-purple-300/70">
                  24h Volume: ${formatNumber(bloomPrice.volume24h)}
                </p>
              </div>
            ) : (
              <p className="text-purple-300/70">Unable to load price</p>
            )}
            
            <Button
              className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold"
              onClick={handleBuyBloom}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Buy BLOOM
            </Button>
          </CardContent>
        </Card>

        {/* Wallet & Balance Card */}
        {loadingWallet ? (
          <Card className="bg-black/40 border-purple-500/30 backdrop-blur-xl">
            <CardContent className="p-6 text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-4 text-purple-400 animate-spin" />
              <p className="text-purple-200/70">Loading wallet...</p>
            </CardContent>
          </Card>
        ) : !walletAddress ? (
          <Card className="bg-black/40 border-purple-500/30 backdrop-blur-xl">
            <CardContent className="p-6 text-center">
              <Wallet className="w-12 h-12 mx-auto mb-4 text-purple-400" />
              <h3 className="text-lg font-bold text-white mb-2">No Verified Wallet</h3>
              <p className="text-purple-200/70 text-sm">
                Please verify your wallet address on Farcaster to use BLOOM tipping
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Balance Card */}
            <Card className="bg-black/40 border-purple-500/30 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-purple-200 flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Your BLOOM
                </CardTitle>
                <p className="text-xs text-purple-400/60 font-mono">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingBalances ? (
                  <div className="flex items-center gap-2 text-purple-300">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-purple-300/70">Balance:</span>
                      <span className="text-white font-bold">{formatNumber(bloomBalance)} BLOOM</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-purple-300/70">Approved for Tipping:</span>
                      <span className="text-green-400 font-bold flex items-center gap-1">
                        {parseFloat(currentAllowance) > 0 && <CheckCircle2 className="w-4 h-4" />}
                        {formatNumber(currentAllowance)} BLOOM
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Approval Card */}
            <Card className="bg-black/40 border-purple-500/30 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-lg text-purple-200">Approve BLOOM for Tipping</CardTitle>
                <CardDescription className="text-purple-300/70">
                  Set the amount of BLOOM you want to allow for auto-tipping via comments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={approvalAmount}
                    onChange={(e) => setApprovalAmount(e.target.value)}
                    className="bg-black/40 border-purple-500/30 text-white pr-16"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMax}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300 h-7 px-2"
                  >
                    MAX
                  </Button>
                </div>
                
                {approvalAmount && bloomPrice && (
                  <p className="text-sm text-purple-300/70">
                    ≈ ${(parseFloat(approvalAmount) * parseFloat(bloomPrice.priceUsd)).toFixed(6)} USD
                  </p>
                )}

                <Button
                  onClick={handleApprove}
                  disabled={isApproving || !approvalAmount || parseFloat(approvalAmount) <= 0}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold"
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Approve BLOOM
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* How It Works */}
            <Card className="bg-black/40 border-purple-500/30 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-lg text-purple-200">How Tipping Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-purple-200/80 text-sm">
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0">1</span>
                  <p>Approve the amount of BLOOM you want available for tipping</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0">2</span>
                  <p>Comment on any cast mentioning <span className="text-purple-400 font-mono">$bloom</span> followed by an amount</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0">3</span>
                  <p>Example: <span className="text-purple-400 font-mono">"Great cast! $bloom 100"</span></p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0">4</span>
                  <p>The BLOOM is automatically sent to the cast author</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default BloomTipping;
