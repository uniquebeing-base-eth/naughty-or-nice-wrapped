
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

  // Fetch wallet address directly from Farcaster SDK
  const fetchWalletFromFarcaster = useCallback(async () => {
    if (!user?.fid) {
      console.log('No FID available, skipping wallet fetch');
      setLoadingWallet(false);
      return;
    }
    
    try {
      setLoadingWallet(true);
      console.log('Fetching wallet from Farcaster SDK for FID:', user.fid);
      
      // Import SDK dynamically
      const { sdk } = await import('@farcaster/miniapp-sdk');
      
      if (!sdk?.wallet?.ethProvider) {
        console.log('Farcaster wallet provider not available');
        setLoadingWallet(false);
        return;
      }

      const provider = sdk.wallet.ethProvider;
      
      // Request accounts from the Farcaster wallet
      const accounts = await provider.request({ 
        method: 'eth_requestAccounts' 
      }) as string[];
      
      if (accounts && accounts.length > 0) {
        const address = accounts[0] as `0x${string}`;
        console.log('Got wallet from Farcaster SDK:', address);
        setWalletAddress(address);
      } else {
        console.log('No accounts returned from Farcaster wallet');
      }
    } catch (error) {
      console.error('Error fetching wallet from Farcaster SDK:', error);
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
      fetchWalletFromFarcaster();
    }
  }, [user?.fid, fetchWalletFromFarcaster]);

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
      {/* Coming Soon Overlay */}
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="text-center px-6 max-w-sm">
          <div className="p-8 rounded-3xl bg-gradient-to-b from-white/10 to-white/5 border border-pink-500/30 backdrop-blur-xl">
            <div className="text-6xl mb-4">🌸</div>
            <h2 className="font-display text-3xl font-bold text-white mb-3">Coming Soon</h2>
            <p className="text-pink-200/70 mb-6">
              BLOOM Tipping is being prepared. Check back soon to tip your favorite creators!
            </p>
            <Button
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:brightness-110 text-white px-8 py-3 rounded-full font-bold gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
      
      <Snowfall />
      
      {/* Blurred Content Behind */}
      <div className="blur-sm pointer-events-none opacity-30">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-black/40 backdrop-blur-xl border-b border-pink-500/20 p-4">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <Button
              variant="ghost"
              size="icon"
              className="text-pink-300"
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
              className="text-pink-300"
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
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">$0.000001</span>
                  <span className="text-sm font-medium text-green-400">+2.50%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wallet Card */}
          <Card className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-500/30 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-purple-200 flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Your Wallet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-purple-300/70">Balance</span>
                  <span className="text-white font-bold">1,000,000 🌸</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

};

export default BloomTipping;
