import { useState, useEffect, useCallback } from 'react';
import { useFarcaster } from '@/contexts/FarcasterContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, ExternalLink, Loader2, Coins, TrendingUp, Wallet, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useFarcasterWallet } from '@/hooks/useFarcasterWallet';
import { parseUnits, formatUnits } from 'viem';
import Snowfall from '@/components/Snowfall';

// BLOOM Token on Base
const BLOOM_TOKEN_ADDRESS = '0xd6B69E58D44e523EB58645F1B78425c96Dfa648C' as const;

// BLOOM Tipping Contract (will be deployed)
const BLOOM_TIPPING_ADDRESS = '0x0000000000000000000000000000000000000000' as const; // TODO: Deploy and update

// ERC20 ABI for approval
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
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

interface BloomPrice {
  priceUsd: string;
  priceChange24h: number;
  volume24h: string;
}

const BloomTipping = () => {
  const { isInMiniApp } = useFarcaster();
  const navigate = useNavigate();
  const { address, isConnected, connect, walletClient } = useFarcasterWallet();
  
  const [bloomPrice, setBloomPrice] = useState<BloomPrice | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [approvalAmount, setApprovalAmount] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [currentAllowance, setCurrentAllowance] = useState<string>('0');
  const [bloomBalance, setBloomBalance] = useState<string>('0');
  const [loadingBalances, setLoadingBalances] = useState(false);

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
      toast.error('Failed to fetch BLOOM price');
    } finally {
      setLoadingPrice(false);
    }
  }, []);

  // Fetch user's BLOOM balance and allowance
  const fetchBalances = useCallback(async () => {
    if (!address || !walletClient) return;
    
    try {
      setLoadingBalances(true);
      const { createPublicClient, http } = await import('viem');
      const { base } = await import('viem/chains');
      
      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      });

      // Get balance - use any to bypass strict typing issues
      const balanceResult = await (publicClient as any).readContract({
        address: BLOOM_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      });
      
      // Get allowance for tipping contract
      const allowanceResult = await (publicClient as any).readContract({
        address: BLOOM_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, BLOOM_TIPPING_ADDRESS],
      });

      setBloomBalance(formatUnits(BigInt(balanceResult), 18));
      setCurrentAllowance(formatUnits(BigInt(allowanceResult), 18));
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setLoadingBalances(false);
    }
  }, [address, walletClient]);

  useEffect(() => {
    fetchBloomPrice();
    // Refresh price every 30 seconds
    const interval = setInterval(fetchBloomPrice, 30000);
    return () => clearInterval(interval);
  }, [fetchBloomPrice]);

  useEffect(() => {
    if (isConnected && address) {
      fetchBalances();
    }
  }, [isConnected, address, fetchBalances]);

  // Handle approval
  const handleApprove = async () => {
    if (!walletClient || !address || !approvalAmount) {
      toast.error('Please connect wallet and enter an amount');
      return;
    }

    try {
      setIsApproving(true);
      
      const { base } = await import('viem/chains');
      const amount = parseUnits(approvalAmount, 18);
      
      const hash = await walletClient.writeContract({
        address: BLOOM_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [BLOOM_TIPPING_ADDRESS, amount],
        chain: base,
        account: address as `0x${string}`,
      });

      toast.success('Approval submitted!', {
        description: `Transaction: ${hash.slice(0, 10)}...`,
      });

      // Wait a bit and refresh allowance
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

  // Handle max button
  const handleMax = () => {
    setApprovalAmount(bloomBalance);
  };

  const formatNumber = (num: string | number) => {
    const n = typeof num === 'string' ? parseFloat(num) : num;
    if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(2)}K`;
    return n.toFixed(4);
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
              onClick={() => window.open('https://warpcast.com/~/composer-actions?url=https://bloomers.app/bloomers', '_blank')}
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
                    ${parseFloat(bloomPrice.priceUsd).toFixed(6)}
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
              onClick={() => window.open('https://app.uniswap.org/swap?chain=base&outputCurrency=0xd6B69E58D44e523EB58645F1B78425c96Dfa648C', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Buy BLOOM
            </Button>
          </CardContent>
        </Card>

        {/* Wallet Connection */}
        {!isConnected ? (
          <Card className="bg-black/40 border-purple-500/30 backdrop-blur-xl">
            <CardContent className="p-6 text-center">
              <Wallet className="w-12 h-12 mx-auto mb-4 text-purple-400" />
              <h3 className="text-lg font-bold text-white mb-2">Connect Wallet</h3>
              <p className="text-purple-200/70 text-sm mb-4">
                Connect your wallet to approve BLOOM for tipping
              </p>
              <Button
                onClick={connect}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Connect Wallet
              </Button>
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
                    ≈ ${(parseFloat(approvalAmount) * parseFloat(bloomPrice.priceUsd)).toFixed(2)} USD
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
