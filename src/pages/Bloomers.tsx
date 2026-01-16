
import { useState, useEffect } from 'react';
import { useFarcaster } from '@/contexts/FarcasterContext';
import BloomersHero from '@/components/bloomers/BloomersHero';
import BloomersTeaser from '@/components/bloomers/BloomersTeaser';
import BloomersVerdict from '@/components/bloomers/BloomersVerdict';
import BloomersGifts from '@/components/bloomers/BloomersGifts';
import BloomersMint from '@/components/bloomers/BloomersMint';
import BloomersGallery from '@/components/bloomers/BloomersGallery';
import { Button } from '@/components/ui/button';
import { ExternalLink, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const FARCASTER_MINIAPP_URL = 'https://farcaster.xyz/miniapps/m0Hnzx2HWtB5/naughty-or-nice-wrapped';

const FarcasterOnlyGuard = () => (
  <div className="relative min-h-screen overflow-hidden flex items-center justify-center bg-gradient-to-b from-[#1a0a15] via-[#0f0a15] to-[#0a0510]">
    <div className="relative z-10 text-center px-6 max-w-md">
      <div className="p-8 rounded-3xl bg-gradient-to-b from-white/10 to-white/[0.02] border border-white/10">
        <div className="text-6xl mb-6">🌸</div>
        <h1 className="font-display text-3xl font-bold text-white mb-4">Bloomers</h1>
        <p className="text-white/80 text-lg mb-2">This experience is exclusively available on Farcaster!</p>
        <p className="text-white/50 text-sm mb-8">Open Farcaster to mint your magical Bloomer NFT ✨</p>
        <Button 
          onClick={() => window.open(FARCASTER_MINIAPP_URL, '_blank')} 
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-8 py-4 rounded-full font-bold gap-2 text-lg shadow-lg shadow-purple-500/30 border border-purple-400/30"
        >
          <ExternalLink className="w-5 h-5" />
          Open in Farcaster
        </Button>
      </div>
    </div>
  </div>
);

export interface UserVerdict {
  score: number;
  isNice: boolean;
  badge: string;
  aura: string;
}

const Bloomers = () => {
  const { user, isSDKLoaded, isInMiniApp } = useFarcaster();
  const [verdict, setVerdict] = useState<UserVerdict | null>(null);
  const [mintedBloomers, setMintedBloomers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user's verdict and minted bloomers
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.fid) {
        // Default mock verdict for testing
        setVerdict({
          score: 85,
          isNice: true,
          badge: 'Holiday Hero',
          aura: 'Radiant'
        });
        setIsLoading(false);
        return;
      }

      try {
        // Fetch verdict
        const { data, error } = await supabase
          .from('wrapped_stats')
          .select('stats')
          .eq('fid', user.fid)
          .maybeSingle();

        if (data?.stats) {
          const stats = data.stats as { judgment?: { score: number; isNice: boolean; badge: string } };
          if (stats.judgment) {
            setVerdict({
              score: stats.judgment.score,
              isNice: stats.judgment.isNice,
              badge: stats.judgment.badge,
              aura: stats.judgment.isNice ? 'Radiant' : 'Mysterious'
            });
          }
        }

        // Fetch minted bloomers by wallet address
        // We need to get wallet from SDK
        const sdk = (await import('@farcaster/miniapp-sdk')).default;
        if (sdk?.wallet?.ethProvider) {
          const accounts = await sdk.wallet.ethProvider.request({ 
            method: 'eth_requestAccounts' 
          }) as string[];
          
          if (accounts?.[0]) {
            const { data: bloomersData } = await supabase
              .from('minted_bloomers')
              .select('image_url')
              .eq('user_address', accounts[0].toLowerCase())
              .not('tx_hash', 'is', null)  // Only show minted ones, not pending
              .order('created_at', { ascending: false });
            
            if (bloomersData) {
              setMintedBloomers(bloomersData.map(b => b.image_url));
            }
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (isSDKLoaded) fetchData();
  }, [user?.fid, isSDKLoaded]);

  if (isSDKLoaded && !isInMiniApp) return <FarcasterOnlyGuard />;

  if (!isSDKLoaded || isLoading) {
    return (
      <div className="relative min-h-screen overflow-hidden flex items-center justify-center bg-gradient-to-b from-[#1a0a15] via-[#0f0a15] to-[#0a0510]">
        <div className="relative z-10 text-center">
          <div className="text-6xl mb-4 animate-bounce">🌸</div>
          <h2 className="font-display text-2xl text-white animate-pulse">Loading Bloomers...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#1a0a15] via-[#0f0a15] to-[#0a0510]">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Back button */}
      <Link 
        to="/" 
        className="fixed top-4 left-4 z-50 flex items-center gap-2 text-white/60 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Back</span>
      </Link>

      {/* Main content - scrollable */}
      <div className="relative z-10 min-h-screen overflow-y-auto pb-20">
        {/* Hero Section */}
        <BloomersHero />

        {/* Teaser Section */}
        <BloomersTeaser />

        {/* Verdict Section */}
        {verdict && <BloomersVerdict verdict={verdict} />}

        {/* Mint Section */}
        <BloomersMint 
          userPfp={user?.pfpUrl} 
          userFid={user?.fid}
          username={user?.username}
          onMinted={(imageUrl) => setMintedBloomers(prev => [imageUrl, ...prev])}
        />

        {/* Daily Gifts Section */}
        <BloomersGifts />

        {/* Gallery Section */}
        <BloomersGallery mintedBloomers={mintedBloomers} />

        {/* Footer */}
        <div className="text-center py-10">
          <p className="text-white/40 text-sm">
            Made with 🌸 by @uniquebeing404
          </p>
        </div>
      </div>
    </div>
  );
};

export default Bloomers;
