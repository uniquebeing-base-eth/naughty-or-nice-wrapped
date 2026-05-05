import { useState, useEffect, useCallback } from 'react';
import { useFarcaster } from '@/contexts/FarcasterContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2, TrendingUp, Wallet, Sparkles, RefreshCw, ArrowUpRight, ArrowDownLeft, MessageCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatUnits, createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import Snowfall from '@/components/Snowfall';
import { BLOOM_TOKEN_ADDRESS } from '@/config/wagmi';

const ERC20_ABI = [
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

interface CommentTip {
  id: string;
  sender_fid: number;
  receiver_fid: number;
  sender_wallet: string;
  receiver_wallet: string;
  amount: string;
  status: string;
  tx_hash: string | null;
  cast_hash: string;
  sender_username: string | null;
  created_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const publicClient: any = createPublicClient({ chain: base, transport: http() });

const BloomTipping = () => {
  const { user, isInMiniApp } = useFarcaster();
  const navigate = useNavigate();

  const [walletAddress, setWalletAddress] = useState<`0x${string}` | null>(null);
  const [bloomPrice, setBloomPrice] = useState<BloomPrice | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [bloomBalance, setBloomBalance] = useState<string>('0');
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [tipsSent, setTipsSent] = useState<CommentTip[]>([]);
  const [tipsReceived, setTipsReceived] = useState<CommentTip[]>([]);
  const [recentTips, setRecentTips] = useState<CommentTip[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchWalletFromFarcaster = useCallback(async () => {
    if (!user?.fid) { setLoadingWallet(false); return; }
    try {
      setLoadingWallet(true);
      const { sdk } = await import('@farcaster/miniapp-sdk');
      if (!sdk?.wallet?.ethProvider) { setLoadingWallet(false); return; }
      const accounts = await sdk.wallet.ethProvider.request({ method: 'eth_requestAccounts' }) as string[];
      if (accounts?.length > 0) setWalletAddress(accounts[0] as `0x${string}`);
    } catch (e) {
      console.error('wallet fetch error', e);
    } finally {
      setLoadingWallet(false);
    }
  }, [user?.fid]);

  const fetchBloomPrice = useCallback(async () => {
    try {
      setLoadingPrice(true);
      const { data, error } = await supabase.functions.invoke('fetch-bloom-price');
      if (error) throw error;
      if (data) setBloomPrice(data);
    } catch (e) {
      console.error('price error', e);
    } finally {
      setLoadingPrice(false);
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    if (!walletAddress) return;
    try {
      setLoadingBalances(true);
      const balance = await publicClient.readContract({
        address: BLOOM_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [walletAddress],
      }) as bigint;
      setBloomBalance(formatUnits(balance, 18));
    } catch (e) {
      console.error('balance error', e);
    } finally {
      setLoadingBalances(false);
    }
  }, [walletAddress]);

  const fetchTipHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const { data: recent } = await supabase
        .from('pending_tips')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      const all = (recent || []) as CommentTip[];
      setRecentTips(all);
      if (user?.fid) {
        setTipsSent(all.filter((t) => t.sender_fid === user.fid));
        setTipsReceived(all.filter((t) => t.receiver_fid === user.fid));
      }
    } catch (e) {
      console.error('history error', e);
    } finally {
      setLoadingHistory(false);
    }
  }, [user?.fid]);

  useEffect(() => {
    fetchBloomPrice();
    const i = setInterval(fetchBloomPrice, 30000);
    return () => clearInterval(i);
  }, [fetchBloomPrice]);

  useEffect(() => { if (user?.fid) fetchWalletFromFarcaster(); }, [user?.fid, fetchWalletFromFarcaster]);
  useEffect(() => { if (walletAddress) fetchBalance(); }, [walletAddress, fetchBalance]);
  useEffect(() => { fetchTipHistory(); }, [fetchTipHistory]);

  // Realtime: refresh tip list whenever a new tip is processed
  useEffect(() => {
    const channel = supabase
      .channel('pending_tips_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_tips' }, () => {
        fetchTipHistory();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTipHistory]);

  const handleRefresh = async () => {
    await Promise.all([fetchBalance(), fetchTipHistory(), fetchBloomPrice()]);
    toast.success('Refreshed! 🌸');
  };

  const formatNumber = (n: number | string) => {
    const v = typeof n === 'string' ? parseFloat(n) : n;
    if (!isFinite(v)) return '0';
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(2)}K`;
    return v.toFixed(v < 1 ? 4 : 2);
  };

  const formatPrice = (s: string) => {
    const p = parseFloat(s);
    if (p < 0.0000001) return p.toExponential(3);
    if (p < 0.0001) return p.toFixed(10);
    if (p < 1) return p.toFixed(6);
    return p.toFixed(4);
  };

  const formatDate = (s: string) => new Date(s).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const formatAddress = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;

  const usdValue = bloomPrice ? parseFloat(bloomBalance) * parseFloat(bloomPrice.priceUsd) : 0;

  const renderTip = (tip: CommentTip, kind: 'sent' | 'received' | 'recent') => (
    <div key={tip.id} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-pink-500/10">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-white text-sm font-medium">
          {kind === 'received' ? <ArrowDownLeft className="w-3 h-3 text-green-400 shrink-0" /> : <ArrowUpRight className="w-3 h-3 text-pink-400 shrink-0" />}
          <span className="truncate">
            {tip.sender_username ? `@${tip.sender_username}` : `FID ${tip.sender_fid}`} → FID {tip.receiver_fid}
          </span>
        </div>
        <p className="text-pink-200/50 text-xs mt-0.5">{formatDate(tip.created_at)} · {tip.status}</p>
      </div>
      <div className="text-right shrink-0 ml-2">
        <span className={`font-bold ${kind === 'received' ? 'text-green-300' : 'text-pink-200'}`}>
          {kind === 'received' ? '+' : ''}{formatNumber(tip.amount)} 🌸
        </span>
        {tip.tx_hash && (
          <a
            href={`https://basescan.org/tx/${tip.tx_hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-pink-300/60 text-[10px] hover:text-pink-200 mt-0.5"
          >
            tx <ExternalLink className="inline w-2.5 h-2.5" />
          </a>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#1a0a28] to-[#0a1628] relative overflow-hidden">
      <Snowfall />

      <div className="relative z-10">
        <div className="sticky top-0 z-40 bg-black/40 backdrop-blur-xl border-b border-pink-500/20 p-4">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <Button variant="ghost" size="icon" className="text-pink-300" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">🌸</span>
              BLOOM Tipping
            </h1>
            <Button variant="ghost" size="icon" className="text-pink-300" onClick={handleRefresh} disabled={loadingBalances || loadingHistory}>
              <RefreshCw className={`w-5 h-5 ${loadingBalances || loadingHistory ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="max-w-lg mx-auto p-4 space-y-4 pb-24">
          {/* Price */}
          <Card className="bg-gradient-to-br from-pink-900/40 to-purple-900/40 border-pink-500/30 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-pink-200 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" /> BLOOM Price
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPrice && !bloomPrice ? (
                <Loader2 className="w-5 h-5 animate-spin text-pink-300" />
              ) : bloomPrice ? (
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl font-bold text-white">${formatPrice(bloomPrice.priceUsd)}</span>
                    <span className={`text-sm font-medium ${bloomPrice.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {bloomPrice.priceChange24h >= 0 ? '+' : ''}{bloomPrice.priceChange24h.toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-xs text-pink-200/60">24h Vol: ${formatNumber(bloomPrice.volume24h)}</p>
                </div>
              ) : (
                <p className="text-sm text-pink-200/60">Price unavailable</p>
              )}
            </CardContent>
          </Card>

          {/* Wallet */}
          <Card className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-500/30 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-purple-200 flex items-center gap-2">
                <Wallet className="w-5 h-5" /> Your Wallet
              </CardTitle>
              {walletAddress && (
                <CardDescription className="text-purple-200/60 text-xs font-mono">{formatAddress(walletAddress)}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {!isInMiniApp ? (
                <p className="text-sm text-purple-200/70">Open in Farcaster to see your BLOOM balance.</p>
              ) : loadingWallet ? (
                <Loader2 className="w-5 h-5 animate-spin text-purple-300" />
              ) : !walletAddress ? (
                <p className="text-sm text-purple-200/70">Wallet not connected.</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-purple-300/70">BLOOM Balance</span>
                    <span className="text-white font-bold text-lg">{formatNumber(bloomBalance)} 🌸</span>
                  </div>
                  {bloomPrice && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-purple-300/70">USD Value</span>
                      <span className="text-purple-100">${formatNumber(usdValue)}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* How it works */}
          <Card className="bg-black/40 border-pink-500/20 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-pink-200 flex items-center gap-2">
                <Sparkles className="w-5 h-5" /> Tip via Comments
              </CardTitle>
              <CardDescription className="text-pink-200/60">
                No transactions, no popups. Tips are sponsored by the BLOOM pool.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-pink-100/80">
              <p>1. Find a cast you love on Farcaster.</p>
              <p>2. Reply with <span className="text-pink-300 font-mono bg-pink-500/10 px-1.5 py-0.5 rounded">tip 100 bloom</span> (or any amount ≥ 1).</p>
              <p>3. We auto-send BLOOM from the sponsor pool to the cast author. 🌸</p>
              <p className="text-pink-200/50 text-xs pt-1">Other accepted formats: <span className="font-mono">100 $bloom</span>, <span className="font-mono">🌸 50</span></p>
            </CardContent>
          </Card>

          {/* Tip history */}
          <Card className="bg-black/40 border-pink-500/20 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-pink-200 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" /> Comment Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="recent">
                <TabsList className="grid w-full grid-cols-3 bg-black/40">
                  <TabsTrigger value="recent" className="data-[state=active]:bg-pink-500/20 text-xs">Recent</TabsTrigger>
                  <TabsTrigger value="sent" className="data-[state=active]:bg-pink-500/20 text-xs">Sent</TabsTrigger>
                  <TabsTrigger value="received" className="data-[state=active]:bg-pink-500/20 text-xs">Received</TabsTrigger>
                </TabsList>
                <TabsContent value="recent" className="space-y-2 mt-3">
                  {loadingHistory ? <Loader2 className="w-5 h-5 animate-spin text-pink-300 mx-auto" />
                    : recentTips.length === 0 ? <p className="text-sm text-pink-200/60 text-center py-4">No tips yet. Be the first! 🌸</p>
                    : recentTips.map((t) => renderTip(t, 'recent'))}
                </TabsContent>
                <TabsContent value="sent" className="space-y-2 mt-3">
                  {tipsSent.length === 0 ? <p className="text-sm text-pink-200/60 text-center py-4">You haven't tipped yet.</p>
                    : tipsSent.map((t) => renderTip(t, 'sent'))}
                </TabsContent>
                <TabsContent value="received" className="space-y-2 mt-3">
                  {tipsReceived.length === 0 ? <p className="text-sm text-pink-200/60 text-center py-4">No tips received yet.</p>
                    : tipsReceived.map((t) => renderTip(t, 'received'))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BloomTipping;
