import { useState, useEffect } from 'react';
import { useFarcaster } from '@/contexts/FarcasterContext';
import { Button } from '@/components/ui/button';
import { Share2, ArrowLeft, ExternalLink, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sdk } from '@farcaster/miniapp-sdk';
import html2canvas from 'html2canvas';

const FARCASTER_MINIAPP_URL = 'https://farcaster.xyz/miniapps/m0Hnzx2HWtB5/naughty-or-nice-wrapped';

// Contract address for gasless transaction
const CONTRACT_ADDRESS = '0x301dA08F829F9da52eBe7fF1F6d1f0c3E2017d38';
const MICRO_AMOUNT = '0x2540BE400'; // 0.00000001 ETH

interface SavedJudgment {
  score: number;
  isNice: boolean;
  badge: string;
  nicePoints?: number;
  naughtyPoints?: number;
}

const Wrapped = () => {
  const { user, isSDKLoaded, isInMiniApp } = useFarcaster();
  const { toast } = useToast();
  const [judgment, setJudgment] = useState<SavedJudgment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [topEngagedUsers, setTopEngagedUsers] = useState<{ username: string }[]>([]);

  useEffect(() => {
    const fetchVerdict = async () => {
      if (!user?.fid) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('wrapped_stats')
          .select('stats')
          .eq('fid', user.fid)
          .maybeSingle();

        if (error) throw error;

        if (data?.stats) {
          const stats = data.stats as { judgment?: SavedJudgment; topEngagedUsers?: { username: string }[] };
          if (stats.judgment) {
            setJudgment(stats.judgment);
          }
          if (stats.topEngagedUsers) {
            setTopEngagedUsers(stats.topEngagedUsers);
          }
        }
      } catch (err) {
        console.error('Error fetching verdict:', err);
      } finally {
        setIsLoading(false);
        setTimeout(() => setAnimate(true), 100);
      }
    };

    if (isSDKLoaded) fetchVerdict();
  }, [user?.fid, isSDKLoaded]);

  // Get top user tags for sharing
  const getTopUserTags = () => {
    if (!topEngagedUsers || topEngagedUsers.length === 0) return '';
    const tags = topEngagedUsers.slice(0, 4).map(u => `@${u.username}`).join(' ');
    return `\n\n${tags}`;
  };

  // Gasless transaction before sharing
  const sendMicroTransaction = async (): Promise<boolean> => {
    if (!isInMiniApp || !sdk?.wallet?.ethProvider) {
      console.log('Wallet not available, skipping transaction');
      return true;
    }

    try {
      toast({ title: "🎁 Supporting the app...", description: "Confirm the micro transaction" });
      
      const provider = sdk.wallet.ethProvider;
      const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[];
      if (!accounts || accounts.length === 0) {
        console.log('No accounts available');
        return true;
      }

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: accounts[0],
          to: CONTRACT_ADDRESS,
          value: MICRO_AMOUNT,
          chainId: '0x2105',
        }],
      });

      console.log('Transaction sent:', txHash);
      toast({ title: "✅ Thanks for supporting!", description: "Generating your card..." });
      return true;
    } catch (err) {
      console.log('Transaction skipped or failed:', err);
      return true;
    }
  };

  const handleShare = async () => {
    if (!judgment) return;
    
    setIsSharing(true);
    const topTags = getTopUserTags();
    const shareText = `🎁 Naughty or Nice Wrapped by @uniquebeing404\n\nI'm ${judgment.score}% ${judgment.isNice ? 'NICE' : 'NAUGHTY'} — ${judgment.badge}!\n\nThe timeline has spoken. See you next December! 🎅${topTags}`;

    try {
      await sendMicroTransaction();
      toast({ title: "🎨 Generating your card...", description: "This takes a few seconds" });

      const cardElement = document.getElementById('verdict-card');
      if (!cardElement) throw new Error('Card element not found');

      const canvas = await html2canvas(cardElement, {
        backgroundColor: '#1a0a15',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to create blob'));
        }, 'image/png', 0.95);
      });

      const filename = `wrapped-cards/${user?.username}-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('share-images')
        .upload(filename, blob, { contentType: 'image/png', upsert: true });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: urlData } = supabase.storage.from('share-images').getPublicUrl(filename);
      const imageUrl = urlData.publicUrl;

      if (sdk?.actions?.composeCast) {
        await sdk.actions.composeCast({ 
          text: shareText, 
          embeds: [imageUrl, FARCASTER_MINIAPP_URL] 
        });
        toast({ title: "🎁 Shared!", description: "Your verdict has been posted" });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n\nGet yours: ${FARCASTER_MINIAPP_URL}`);
        toast({ title: "📋 Copied!", description: "Paste to share" });
      }
    } catch (err) {
      console.error('Share error:', err);
      toast({ title: "Failed to generate", description: "Please try again", variant: "destructive" });
    } finally {
      setIsSharing(false);
    }
  };

  if (isSDKLoaded && !isInMiniApp) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1a0a15] via-[#0f0a15] to-[#0a0510]">
        <div className="text-center px-6 max-w-md">
          <div className="p-8 rounded-3xl bg-gradient-to-b from-white/5 to-white/[0.02] border border-white/10">
            <div className="text-6xl mb-6">🎁</div>
            <h1 className="font-display text-3xl font-bold text-white mb-4">Wrapped</h1>
            <p className="text-white/60 mb-8">Open in Farcaster to view your verdict</p>
            <Button onClick={() => window.open(FARCASTER_MINIAPP_URL, '_blank')} className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-8 py-4 rounded-full font-bold gap-2">
              <ExternalLink className="w-5 h-5" />
              Open in Farcaster
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1a0a15] via-[#0f0a15] to-[#0a0510]">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🎁</div>
          <p className="text-white/60">Loading your verdict...</p>
        </div>
      </div>
    );
  }

  if (!judgment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1a0a15] via-[#0f0a15] to-[#0a0510] px-6">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🎁</div>
          <h2 className="font-display text-2xl font-bold text-white mb-4">No Verdict Yet</h2>
          <p className="text-white/60 mb-4">You haven't received your Naughty or Nice verdict yet.</p>
          
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-6">
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-bold">Annual Event</span>
            </div>
            <p className="text-white/50 text-sm">
              Wrapped happens once a year in December. Come back next December to see your verdict!
            </p>
          </div>
          
          <Link to="/">
            <Button className="bg-white/10 hover:bg-white/20 text-white rounded-full gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const verdictColor = judgment.isNice ? 'from-green-500 to-emerald-600' : 'from-red-500 to-rose-600';
  const verdictText = judgment.isNice ? 'NICE' : 'NAUGHTY';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0a15] via-[#0f0a15] to-[#0a0510] px-4 py-8">
      {/* Back button */}
      <Link 
        to="/" 
        className="fixed top-4 left-4 z-50 flex items-center gap-2 text-white/60 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Back</span>
      </Link>

      <div className="flex flex-col items-center justify-center min-h-screen pt-8">
        {/* Verdict Card */}
        <div 
          id="verdict-card"
          className={`relative p-6 rounded-3xl bg-gradient-to-b from-white/10 to-white/[0.02] border border-white/10 w-full max-w-sm transition-all duration-700 ${animate ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
        >
          {/* Background glow */}
          <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${verdictColor} opacity-10 blur-xl`} />
          
          <div className="relative z-10 text-center">
            {/* Header */}
            <div className="text-xs uppercase tracking-widest text-white/50 mb-4">
              ✨ Naughty or Nice Wrapped ✨
            </div>

            {/* User info */}
            {user?.pfpUrl && (
              <div className="relative inline-block mb-4">
                <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${verdictColor} blur-lg opacity-60 scale-125`} />
                <img src={user.pfpUrl} alt={user.username} className="w-20 h-20 rounded-full border-3 border-white/30 shadow-xl relative z-10" />
              </div>
            )}
            <p className="text-white font-bold mb-6">@{user?.username}</p>

            {/* Verdict */}
            <div className="text-6xl mb-4">{judgment.isNice ? '😇' : '😈'}</div>
            <h2 className={`font-display text-5xl font-black bg-gradient-to-r ${verdictColor} bg-clip-text text-transparent mb-2`}>
              {judgment.score}% {verdictText}
            </h2>
            <p className="text-white/80 text-lg font-medium mb-6">{judgment.badge}</p>

            {/* Attribution */}
            <p className="text-white/30 text-xs">Made with 🌸 by @uniquebeing404</p>
          </div>
        </div>
        
        {/* Annual reminder */}
        <div className={`p-4 rounded-2xl bg-white/5 border border-white/10 w-full max-w-sm mt-4 transition-all duration-500 ${animate ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-2 text-amber-400 mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Yearly Event</span>
          </div>
          <p className="text-white/50 text-xs">
            Wrapped happens every December. Share your verdict and see you next year! ✨
          </p>
        </div>

        {/* Share Button */}
        <Button 
          onClick={handleShare}
          disabled={isSharing}
          className={`mt-6 bg-gradient-to-r ${verdictColor} hover:brightness-110 text-white px-8 py-3 rounded-full font-bold gap-2 shadow-lg transition-all duration-300 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ transitionDelay: '200ms' }}
        >
          {isSharing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              Share to Farcaster
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Wrapped;
