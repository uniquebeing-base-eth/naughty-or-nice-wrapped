import { useState, useEffect, useCallback } from 'react';
import { useFarcaster } from '@/contexts/FarcasterContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2, TrendingUp, Wallet, CheckCircle2, Plus, ArrowUpRight, ArrowDownLeft, Sparkles, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { parseUnits, formatUnits, createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import Snowfall from '@/components/Snowfall';
import { BLOOM_TOKEN_ADDRESS, BLOOM_TIPPING_ADDRESS, BLOOM_TIPPING_ABI } from '@/config/wagmi';

// Quick approve presets
const APPROVE_PRESETS = [
  { label: '100K 🌸', value: '100000' },
  { label: '500K 🌸', value: '500000' },
  { label: '1M 🌸', value: '1000000' },
  { label: '5M 🌸', value: '5000000' },
];

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

interface OnChainTip {
  from: `0x${string}`;
  to: `0x${string}`;
  amount: bigint;
  fromFid: bigint;
  toFid: bigint;
  castHash: `0x${string}`;
  timestamp: bigint;
}

interface TipDisplay {
  id: string;
  from: string;
  to: string;
  amount: string;
  fromFid: number;
  toFid: number;
  timestamp: Date;
  username?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const publicClient: any = createPublicClient({
  chain: base,
  transport: http(),
});

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
  const [activeTab, setActiveTab] = useState('approve');
  const [tipsSent, setTipsSent] = useState<TipDisplay[]>([]);
  const [tipsReceived, setTipsReceived] = useState<TipDisplay[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [userNonce, setUserNonce] = useState<bigint>(0n);
  const [tipStats, setTipStats] = useState<{ sent: number; received: number }>({ sent: 0, received: 0 });

  // Fetch wallet address from Neynar using FID
  const fetchWalletFromNeynar = useCallback(async () => {
    if (!user?.fid) return;
    
    try {
      setLoadingWallet(true);
      
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

  // Fetch user's BLOOM balance, allowance, and nonce from chain
  const fetchBalances = useCallback(async () => {
    if (!walletAddress) return;
    
    try {
      setLoadingBalances(true);
      
      const [balanceResult, allowanceResult, nonceResult] = await Promise.all([
        publicClient.readContract({
          address: BLOOM_TOKEN_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [walletAddress],
        }) as Promise<bigint>,
        publicClient.readContract({
          address: BLOOM_TOKEN_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [walletAddress, BLOOM_TIPPING_ADDRESS],
        }) as Promise<bigint>,
        publicClient.readContract({
          address: BLOOM_TIPPING_ADDRESS,
          abi: BLOOM_TIPPING_ABI,
          functionName: 'nonces',
          args: [walletAddress],
        }) as Promise<bigint>,
      ]);

      setBloomBalance(formatUnits(balanceResult, 18));
      setCurrentAllowance(formatUnits(allowanceResult, 18));
      setUserNonce(nonceResult);
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setLoadingBalances(false);
    }
  }, [walletAddress]);

  // Fetch tip history from contract
  const fetchTipHistory = useCallback(async () => {
    if (!walletAddress) return;
    
    try {
      setLoadingHistory(true);
      
      // Fetch counts first
      const [sentCount, receivedCount] = await Promise.all([
        publicClient.readContract({
          address: BLOOM_TIPPING_ADDRESS,
          abi: BLOOM_TIPPING_ABI,
          functionName: 'getTipsSentCount',
          args: [walletAddress],
        }) as Promise<bigint>,
        publicClient.readContract({
          address: BLOOM_TIPPING_ADDRESS,
          abi: BLOOM_TIPPING_ABI,
          functionName: 'getTipsReceivedCount',
          args: [walletAddress],
        }) as Promise<bigint>,
      ]);

      setTipStats({ sent: Number(sentCount), received: Number(receivedCount) });

      // Fetch recent tips (up to 20 each)
      const limit = 20n;
      const [sentTips, receivedTips] = await Promise.all([
        sentCount > 0n
          ? (publicClient.readContract({
              address: BLOOM_TIPPING_ADDRESS,
              abi: BLOOM_TIPPING_ABI,
              functionName: 'getTipsSentByUser',
              args: [walletAddress, 0n, limit],
            }) as Promise<readonly OnChainTip[]>)
          : Promise.resolve([] as readonly OnChainTip[]),
        receivedCount > 0n
          ? (publicClient.readContract({
              address: BLOOM_TIPPING_ADDRESS,
              abi: BLOOM_TIPPING_ABI,
              functionName: 'getTipsReceivedByUser',
              args: [walletAddress, 0n, limit],
            }) as Promise<readonly OnChainTip[]>)
          : Promise.resolve([] as readonly OnChainTip[]),
      ]);

      // Convert to display format
      const formatTips = (tips: readonly OnChainTip[], isSent: boolean): TipDisplay[] => {
        return (tips as OnChainTip[]).map((tip, index) => ({
          id: `${isSent ? 'sent' : 'received'}-${index}`,
          from: tip.from,
          to: tip.to,
          amount: formatUnits(tip.amount, 18),
          fromFid: Number(tip.fromFid),
          toFid: Number(tip.toFid),
          timestamp: new Date(Number(tip.timestamp) * 1000),
        }));
      };

      setTipsSent(formatTips(sentTips, true).reverse());
      setTipsReceived(formatTips(receivedTips, false).reverse());
    } catch (error) {
      console.error('Error fetching tip history:', error);
    } finally {
      setLoadingHistory(false);
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
      fetchTipHistory();
    }
  }, [walletAddress, fetchBalances, fetchTipHistory]);

  // Handle approval using Farcaster wallet
  const handleApprove = async (amount?: string) => {
    const amountToApprove = amount || approvalAmount;
    
    if (!walletAddress || !amountToApprove) {
      toast.error('Please enter an amount');
      return;
    }

    try {
      // Dynamically import sdk only when needed in Farcaster environment
      const { sdk } = await import('@farcaster/miniapp-sdk');
      
      if (!sdk?.wallet?.ethProvider) {
        toast.error('Wallet not available');
        return;
      }

      setIsApproving(true);
      
      const provider = sdk.wallet.ethProvider;
      const parsedAmount = parseUnits(amountToApprove, 18);
      
      const { encodeFunctionData } = await import('viem');
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [BLOOM_TIPPING_ADDRESS, parsedAmount],
      });

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: BLOOM_TOKEN_ADDRESS,
          data: data,
        }],
      });

      toast.success('Approval submitted! 🌸', {
        description: `Transaction: ${String(txHash).slice(0, 10)}...`,
      });

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

  // Handle increase allowance
  const handleIncreaseAllowance = async () => {
    if (!approvalAmount || parseFloat(approvalAmount) <= 0) {
      toast.error('Please enter an amount to add');
      return;
    }
    
    const newTotal = parseFloat(currentAllowance) + parseFloat(approvalAmount);
    await handleApprove(newTotal.toString());
  };

  const handlePresetClick = (value: string) => {
    setApprovalAmount(value);
  };

  const handleMax = () => {
    setApprovalAmount(bloomBalance);
  };

  const handleRefresh = async () => {
    await Promise.all([fetchBalances(), fetchTipHistory()]);
    toast.success('Refreshed! 🌸');
  };

  const formatNumber = (num: string | number) => {
    const n = typeof num === 'string' ? parseFloat(num) : num;
    if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(2)}K`;
    return n.toFixed(2);
  };

  const formatPrice = (priceStr: string) => {
    const price = parseFloat(priceStr);
    if (price < 0.0001) {
      return price.toFixed(10);
    } else if (price < 0.01) {
      return price.toFixed(8);
    } else if (price < 1) {
      return price.toFixed(6);
    }
    return price.toFixed(4);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isInMiniApp) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#1a0a28] to-[#0a1628] flex items-center justify-center p-4">
        <Card className="bg-black/40 border-pink-500/30 backdrop-blur-xl">
          <CardContent className="p-8 text-center">
            <span className="text-5xl mb-4 block">🌸</span>
            <h2 className="text-2xl font-bold text-white mb-2">BLOOM Tipping</h2>
            <p className="text-pink-200/70 mb-4">Open in Farcaster to access BLOOM tipping</p>
            <Button
              onClick={() => window.open('https://warpcast.com', '_blank')}
              className="bg-pink-600 hover:bg-pink-700"
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
      <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-pink-500/20 p-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/bloomers')}
            className="text-pink-300 hover:text-white hover:bg-pink-500/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🌸</span>
            BLOOM Tipping
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            className="text-pink-300 hover:text-white hover:bg-pink-500/20"
          >
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4 pb-24">
        {/* Price Card */}
        <Card className="bg-gradient-to-br from-pink-900/40 to-purple-900/40 border-pink-500/30 backdrop-blur-xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-pink-200 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              BLOOM Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPrice ? (
              <div className="flex items-center gap-2 text-pink-300">
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
                <p className="text-sm text-pink-300/70">
                  24h Volume: ${formatNumber(bloomPrice.volume24h)}
                </p>
              </div>
            ) : (
              <p className="text-pink-300/70">Unable to load price</p>
            )}
          </CardContent>
        </Card>

        {/* Wallet & Balance Card */}
        {loadingWallet ? (
          <Card className="bg-black/40 border-pink-500/30 backdrop-blur-xl">
            <CardContent className="p-6 text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-4 text-pink-400 animate-spin" />
              <p className="text-pink-200/70">Loading wallet...</p>
            </CardContent>
          </Card>
        ) : !walletAddress ? (
          <Card className="bg-black/40 border-pink-500/30 backdrop-blur-xl">
            <CardContent className="p-6 text-center">
              <Wallet className="w-12 h-12 mx-auto mb-4 text-pink-400" />
              <h3 className="text-lg font-bold text-white mb-2">No Verified Wallet</h3>
              <p className="text-pink-200/70 text-sm">
                Please verify your wallet address on Farcaster to use BLOOM tipping
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Balance Card */}
            <Card className="bg-black/40 border-pink-500/30 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-pink-200 flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Your BLOOM 🌸
                </CardTitle>
                <p className="text-xs text-pink-400/60 font-mono">
                  {formatAddress(walletAddress)}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingBalances ? (
                  <div className="flex items-center gap-2 text-pink-300">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-pink-300/70">Balance:</span>
                      <span className="text-white font-bold">{formatNumber(bloomBalance)} 🌸</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-pink-300/70">Approved for Tipping:</span>
                      <span className="text-green-400 font-bold flex items-center gap-1">
                        {parseFloat(currentAllowance) > 0 && <CheckCircle2 className="w-4 h-4" />}
                        {formatNumber(currentAllowance)} 🌸
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-pink-300/50">Tips Sent:</span>
                      <span className="text-pink-300">{tipStats.sent}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-pink-300/50">Tips Received:</span>
                      <span className="text-green-300">{tipStats.received}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Tabs for Approve / History */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-black/40 border border-pink-500/30">
                <TabsTrigger value="approve" className="data-[state=active]:bg-pink-600 data-[state=active]:text-white">
                  <Sparkles className="w-4 h-4 mr-1" />
                  Approve
                </TabsTrigger>
                <TabsTrigger value="sent" className="data-[state=active]:bg-pink-600 data-[state=active]:text-white">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  Sent ({tipStats.sent})
                </TabsTrigger>
                <TabsTrigger value="received" className="data-[state=active]:bg-pink-600 data-[state=active]:text-white">
                  <ArrowDownLeft className="w-4 h-4 mr-1" />
                  Received ({tipStats.received})
                </TabsTrigger>
              </TabsList>

              {/* Approve Tab */}
              <TabsContent value="approve" className="mt-4 space-y-4">
                <Card className="bg-black/40 border-pink-500/30 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-lg text-pink-200">Approve BLOOM for Tipping 🌸</CardTitle>
                    <CardDescription className="text-pink-300/70">
                      Set how much BLOOM you want available for auto-tipping
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Quick Presets */}
                    <div className="grid grid-cols-2 gap-2">
                      {APPROVE_PRESETS.map((preset) => (
                        <Button
                          key={preset.value}
                          variant="outline"
                          onClick={() => handlePresetClick(preset.value)}
                          className={`border-pink-500/30 hover:bg-pink-500/20 hover:border-pink-400 transition-all ${
                            approvalAmount === preset.value ? 'bg-pink-500/30 border-pink-400' : ''
                          }`}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>

                    {/* Custom Input */}
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="Or enter custom amount"
                        value={approvalAmount}
                        onChange={(e) => setApprovalAmount(e.target.value)}
                        className="bg-black/40 border-pink-500/30 text-white pr-16"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMax}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-pink-400 hover:text-pink-300 h-7 px-2"
                      >
                        MAX
                      </Button>
                    </div>
                    
                    {approvalAmount && bloomPrice && (
                      <p className="text-sm text-pink-300/70">
                        ≈ ${(parseFloat(approvalAmount) * parseFloat(bloomPrice.priceUsd)).toFixed(6)} USD
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => handleApprove()}
                        disabled={isApproving || !approvalAmount || parseFloat(approvalAmount) <= 0}
                        className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold"
                      >
                        {isApproving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleIncreaseAllowance}
                        disabled={isApproving || !approvalAmount || parseFloat(approvalAmount) <= 0 || parseFloat(currentAllowance) <= 0}
                        variant="outline"
                        className="border-green-500/50 text-green-400 hover:bg-green-500/20 hover:border-green-400"
                      >
                        {isApproving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Add More
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* How It Works */}
                <Card className="bg-black/40 border-pink-500/30 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-lg text-pink-200">How Tipping Works 💫</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-pink-200/80 text-sm">
                    <div className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold text-xs shrink-0">1</span>
                      <p>Approve the amount of BLOOM you want available for tipping</p>
                    </div>
                    <div className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold text-xs shrink-0">2</span>
                      <p>Comment on any cast with <span className="text-pink-400 font-mono">$bloom</span> + amount</p>
                    </div>
                    <div className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold text-xs shrink-0">3</span>
                      <p>Example: <span className="text-pink-400 font-mono">"Love this! 🌸 $bloom 1000"</span></p>
                    </div>
                    <div className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold text-xs shrink-0">4</span>
                      <p>Tip the same cast as many times as you want! 💕</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Contract Info */}
                <Card className="bg-black/20 border-pink-500/20 backdrop-blur-xl">
                  <CardContent className="py-3">
                    <p className="text-xs text-pink-400/50 text-center">
                      Contract: {formatAddress(BLOOM_TIPPING_ADDRESS)} · Nonce: {userNonce.toString()}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tips Sent Tab */}
              <TabsContent value="sent" className="mt-4">
                <Card className="bg-black/40 border-pink-500/30 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-lg text-pink-200 flex items-center gap-2">
                      <ArrowUpRight className="w-5 h-5 text-pink-400" />
                      Tips Sent
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingHistory ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-pink-400 animate-spin" />
                      </div>
                    ) : tipsSent.length === 0 ? (
                      <div className="text-center py-8">
                        <span className="text-4xl mb-3 block">🌸</span>
                        <p className="text-pink-300/70 text-sm">No tips sent yet</p>
                        <p className="text-pink-400/50 text-xs mt-1">Start spreading the BLOOM love!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {tipsSent.map((tip) => (
                          <div key={tip.id} className="flex items-center justify-between p-3 bg-pink-900/20 rounded-lg border border-pink-500/20">
                            <div>
                              <p className="text-white font-medium">To {formatAddress(tip.to)}</p>
                              <p className="text-pink-400/60 text-xs">FID: {tip.toFid} · {formatDate(tip.timestamp)}</p>
                            </div>
                            <span className="text-pink-400 font-bold">{formatNumber(tip.amount)} 🌸</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tips Received Tab */}
              <TabsContent value="received" className="mt-4">
                <Card className="bg-black/40 border-pink-500/30 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-lg text-pink-200 flex items-center gap-2">
                      <ArrowDownLeft className="w-5 h-5 text-green-400" />
                      Tips Received
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingHistory ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-pink-400 animate-spin" />
                      </div>
                    ) : tipsReceived.length === 0 ? (
                      <div className="text-center py-8">
                        <span className="text-4xl mb-3 block">💕</span>
                        <p className="text-pink-300/70 text-sm">No tips received yet</p>
                        <p className="text-pink-400/50 text-xs mt-1">Keep creating great content!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {tipsReceived.map((tip) => (
                          <div key={tip.id} className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg border border-green-500/20">
                            <div>
                              <p className="text-white font-medium">From {formatAddress(tip.from)}</p>
                              <p className="text-green-400/60 text-xs">FID: {tip.fromFid} · {formatDate(tip.timestamp)}</p>
                            </div>
                            <span className="text-green-400 font-bold">+{formatNumber(tip.amount)} 🌸</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
};

export default BloomTipping;