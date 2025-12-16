import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Gift, Share2, ExternalLink, X, Loader2, CheckCircle } from 'lucide-react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useFarcaster } from '@/contexts/FarcasterContext';
import { useToast } from '@/hooks/use-toast';
import { encodeFunctionData } from 'viem';
import { supabase } from '@/integrations/supabase/client';
import enbBlastIcon from '@/assets/partners/enb-blast-icon.png';
import uniquehubIcon from '@/assets/partners/uniquehub-icon.png';
import { BLOOMERS_VERDICT_ADDRESS, UNIQUEHUB_VERDICT_ADDRESS, BLOOMERS_VERDICT_ABI } from '@/config/wagmi';

const BASE_CHAIN_ID = '0x2105';

interface GiftPartner {
  id: string;
  name: string;
  icon: string;
  link: string;
  description: string;
  santaMessage: string;
  reward: string;
  contractAddress: `0x${string}`;
  tokenSymbol: string;
  enabled: boolean;
  claimIntervalHours: number; // Claim interval in hours
}

const GIFTS: GiftPartner[] = [
  {
    id: 'enb',
    name: 'ENB Blast',
    icon: enbBlastIcon,
    link: 'https://farcaster.xyz/miniapps/0z7FDSc-9NU_/enb-blast',
    description: 'Drag your avatar and collect ENBs',
    santaMessage: "Ho ho ho! The ENB elves have been blasting joy across the blockchain! Drag, collect, and spread the holiday cheer! 🎄✨",
    reward: '1,000 ENB Tokens',
    contractAddress: BLOOMERS_VERDICT_ADDRESS,
    tokenSymbol: 'ENB',
    enabled: true,
    claimIntervalHours: 24, // Daily
  },
  {
    id: 'uniquehub',
    name: 'UniqueHub',
    icon: uniquehubIcon,
    link: 'https://farcaster.xyz/miniapps/lQoakVUKSjUV/uniquehub',
    description: 'Your unique hub for everything onchain',
    santaMessage: "Ho ho ho! The UniqueHub spirits are spreading uniqueness across the realm! Every soul deserves to shine uniquely! 🌟✨",
    reward: '300,000 UNIQ Tokens',
    contractAddress: UNIQUEHUB_VERDICT_ADDRESS,
    tokenSymbol: 'UNIQ',
    enabled: true,
    claimIntervalHours: 5, // Every 5 hours
  },
];

const BloomersGifts = () => {
  const { isInMiniApp, user } = useFarcaster();
  const { toast } = useToast();
  
  const [claimedGifts, setClaimedGifts] = useState<Record<string, boolean>>({});
  const [claimingGift, setClaimingGift] = useState<string | null>(null);
  const [showSharePopup, setShowSharePopup] = useState<GiftPartner | null>(null);
  const [visitedGifts, setVisitedGifts] = useState<Record<string, boolean>>({});

  const handleVisitPartner = async (gift: GiftPartner) => {
    // Mark as visited
    setVisitedGifts(prev => ({ ...prev, [gift.id]: true }));
    
    // Open the mini app directly within Farcaster
    if (isInMiniApp && sdk?.actions?.openUrl) {
      try {
        await sdk.actions.openUrl(gift.link);
      } catch (err) {
        console.log('openUrl error:', err);
        window.open(gift.link, '_blank');
      }
    } else {
      window.open(gift.link, '_blank');
    }
  };

  const handleClaimGift = async (gift: GiftPartner) => {
    // Check if user visited the partner first
    if (!visitedGifts[gift.id]) {
      toast({
        title: "Visit Required",
        description: `Please tap 'Visit' to check out ${gift.name} first!`,
        variant: "destructive",
      });
      return;
    }

    if (!isInMiniApp || !sdk?.wallet?.ethProvider) {
      toast({
        title: "Farcaster Required",
        description: "Please open this in Farcaster to claim tokens",
        variant: "destructive",
      });
      return;
    }

    if (!user?.fid) {
      toast({
        title: "Not Connected",
        description: "Please connect your Farcaster account",
        variant: "destructive",
      });
      return;
    }

    setClaimingGift(gift.id);

    try {
      const provider = sdk.wallet.ethProvider;

      // Switch to Base network
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_CHAIN_ID }],
        });
      } catch (switchError) {
        console.log('Chain switch:', switchError);
      }

      // Get user address
      const accounts = await provider.request({ 
        method: 'eth_requestAccounts' 
      }) as string[];
      
      if (!accounts?.[0]) {
        throw new Error('No wallet address');
      }

      const userAddress = accounts[0];
      console.log('Requesting signature for:', userAddress, 'FID:', user.fid, 'Gift:', gift.id);

      // Get signature from backend (verifies user has verdict)
      const { data: signData, error: signError } = await supabase.functions.invoke('sign-verdict-claim', {
        body: { userAddress, fid: user.fid }
      });

      if (signError || !signData?.signature) {
        console.error('Sign error:', signError, signData);
        throw new Error(signData?.error || 'Failed to verify eligibility');
      }

      console.log('Got signature, sending claim tx to:', gift.contractAddress);

      // Encode the claimReward(signature) call
      const data = encodeFunctionData({
        abi: BLOOMERS_VERDICT_ABI,
        functionName: 'claimReward',
        args: [signData.signature as `0x${string}`],
      });

      // Send claim transaction
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: userAddress,
          to: gift.contractAddress,
          data: data,
          value: '0x0',
        }],
      });

      console.log('Claim tx:', txHash);

      setClaimedGifts(prev => ({ ...prev, [gift.id]: true }));
      setShowSharePopup(gift);
      toast({
        title: `🎁 ${gift.reward} Claimed!`,
        description: "Santa smiles 🌸 Bloomers grow brighter when joy is shared",
      });
    } catch (error: any) {
      console.error('Claim error:', error);
      
      const msg = error?.message || '';
      
      if (msg.includes('User rejected') || msg.includes('denied') || error?.code === 4001) {
        toast({
          title: "Transaction Cancelled",
          description: "You cancelled the transaction",
          variant: "destructive",
        });
      } else if (msg.includes('Already claimed') || msg.includes('already claimed') || msg.includes('execution reverted')) {
        const intervalText = gift.claimIntervalHours === 24 ? 'tomorrow' : `in ${gift.claimIntervalHours} hours`;
        toast({
          title: "Already Claimed",
          description: `Come back ${intervalText} for your next gift!`,
          variant: "destructive",
        });
      } else if (msg.includes('No verdict') || msg.includes('eligibility')) {
        toast({
          title: "No Verdict Found",
          description: "Complete your Naughty or Nice Wrapped first!",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Claim Failed", 
          description: msg || "Something went wrong. Try again!",
          variant: "destructive",
        });
      }
    } finally {
      setClaimingGift(null);
    }
  };

  const handleShare = async (gift: GiftPartner) => {
    const shareText = `🎅 Ho ho ho! Spread love to stay in Santa's good books! 💝\n\n🎁 Just claimed my daily gift of $${gift.tokenSymbol} from ${gift.name}!\n\n🌸 Every gift helps my Bloomer bloom brighter 🌌\n\nnaughty-or-nice-wrapped by @uniquebeing404`;
    
    if (isInMiniApp && sdk?.actions?.composeCast) {
      try {
        await sdk.actions.composeCast({
          text: shareText,
          embeds: [
            gift.link,
            'https://farcaster.xyz/miniapps/m0Hnzx2HWtB5/naughty-or-nice-wrapped'
          ],
        });
        setShowSharePopup(null);
        toast({ title: "✨ Shared!", description: "Your Bloomer thanks you" });
      } catch (err) {
        console.error('Share error:', err);
        await navigator.clipboard.writeText(shareText);
        toast({ title: "📋 Copied!", description: "Paste to share" });
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast({ title: "📋 Copied!", description: "Paste to share" });
    }
  };

  const daysUntilChristmas = Math.max(0, Math.ceil((new Date('2025-12-25').getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <>
      {/* Share Popup */}
      {showSharePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="christmas-card max-w-sm w-full p-6 border-2 border-christmas-gold/40 relative animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setShowSharePopup(null)}
              className="absolute top-3 right-3 text-christmas-snow/50 hover:text-christmas-snow transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🎅</div>
              <h3 className="font-display text-2xl text-christmas-gold font-bold mb-2">
                Ho Ho Ho!
              </h3>
              <p className="text-christmas-snow/80 text-sm">
                Spread love to stay in Santa's good books! Share your gift and help your Bloomer bloom brighter! 💝
              </p>
            </div>
            
            <div className="flex items-center gap-3 bg-muted/30 rounded-xl p-3 mb-6">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow-md flex-shrink-0">
                <img src={showSharePopup.icon} alt={showSharePopup.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-christmas-gold font-semibold text-sm">{showSharePopup.name}</p>
                <p className="text-christmas-snow/50 text-xs truncate">{showSharePopup.description}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={() => handleShare(showSharePopup)}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold py-5 rounded-xl"
              >
                <Share2 className="w-5 h-5 mr-2" />
                Share on Farcaster
              </Button>
              <button 
                onClick={() => setShowSharePopup(null)}
                className="w-full text-christmas-snow/40 text-xs hover:text-christmas-snow/60 transition-colors py-2"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="py-16 px-6">
        <div className="max-w-md mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <h2 className="font-display text-3xl font-bold text-christmas-snow mb-2">
              Santa's <span className="text-christmas-gold">Garden Gifts</span>
            </h2>
            <p className="text-christmas-snow/60 text-sm">
              Every day until Christmas, Santa leaves a gift for the Bloomers
            </p>
            {daysUntilChristmas > 0 && (
              <p className="text-christmas-gold/80 text-xs mt-2">
                {daysUntilChristmas} days until Christmas! 🎄
              </p>
            )}
          </div>

          {/* Gift Cards */}
          <div className="space-y-6">
            {GIFTS.map((gift) => {
              const isClaimed = claimedGifts[gift.id];
              const isClaiming = claimingGift === gift.id;
              const isVisited = visitedGifts[gift.id];

              return (
                <div 
                  key={gift.id}
                  className={`christmas-card p-6 border-2 transition-all duration-500 ${
                    isClaimed 
                      ? 'border-christmas-green/40 shadow-lg shadow-christmas-green/20' 
                      : gift.enabled 
                        ? 'border-christmas-gold/30 animate-pulse-glow'
                        : 'border-christmas-snow/20 opacity-70'
                  }`}
                >
                  {/* Gift indicator */}
                  <div className="flex items-center justify-between mb-4">
                    {!gift.enabled && (
                      <span className="text-xs bg-christmas-snow/10 text-christmas-snow/60 px-2 py-1 rounded-full">
                        Coming Soon
                      </span>
                    )}
                    {gift.claimIntervalHours !== 24 && gift.enabled && (
                      <span className="text-xs bg-christmas-gold/20 text-christmas-gold px-2 py-1 rounded-full">
                        Every {gift.claimIntervalHours}h
                      </span>
                    )}
                    <div className="ml-auto">
                      <Gift className={`w-6 h-6 ${
                        isClaimed 
                          ? 'text-christmas-green' 
                          : gift.enabled 
                            ? 'text-christmas-gold animate-bounce' 
                            : 'text-christmas-snow/40'
                      }`} />
                    </div>
                  </div>

                  {/* Partner info */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-white shadow-lg">
                      <img src={gift.icon} alt={gift.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="font-display text-lg text-christmas-gold font-semibold">{gift.name}</p>
                      <p className="text-christmas-snow/60 text-xs">{gift.description}</p>
                      <button 
                        onClick={() => handleVisitPartner(gift)}
                        className={`text-xs flex items-center gap-1 mt-1 transition-colors ${
                          isVisited 
                            ? 'text-christmas-green' 
                            : 'text-christmas-snow/50 hover:text-christmas-gold'
                        }`}
                      >
                        {isVisited ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            Visited
                          </>
                        ) : (
                          <>
                            Visit <ExternalLink className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Santa's message */}
                  <div className="bg-muted/30 rounded-xl p-4 mb-4">
                    <p className="text-christmas-snow/80 text-sm italic">
                      "{gift.santaMessage}"
                    </p>
                    <p className="text-christmas-snow/50 text-xs mt-2 text-right">— Santa 🎅</p>
                  </div>

                  {/* Visit requirement hint */}
                  {!isVisited && gift.enabled && !isClaimed && (
                    <p className="text-christmas-gold/80 text-xs text-center mb-3 animate-pulse">
                      👆 Tap 'Visit' above to unlock claim
                    </p>
                  )}

                  {/* Actions */}
                  {!isClaimed ? (
                    <Button 
                      onClick={() => handleClaimGift(gift)}
                      disabled={isClaiming || !gift.enabled || !isVisited}
                      className={`w-full font-bold py-6 rounded-xl disabled:opacity-70 ${
                        isVisited && gift.enabled
                          ? 'bg-gradient-to-r from-christmas-gold to-amber-600 hover:from-christmas-gold/90 hover:to-amber-600/90 text-black'
                          : 'bg-christmas-snow/20 text-christmas-snow/50'
                      }`}
                    >
                      {isClaiming ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Claiming...
                        </>
                      ) : !gift.enabled ? (
                        <>
                          <Gift className="w-5 h-5 mr-2" />
                          Coming Soon
                        </>
                      ) : !isVisited ? (
                        <>
                          <Gift className="w-5 h-5 mr-2" />
                          Visit to Unlock
                        </>
                      ) : (
                        <>
                          <Gift className="w-5 h-5 mr-2" />
                          Claim {gift.reward}
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      {/* Claimed message */}
                      <div className="text-center py-2 bg-christmas-green/10 rounded-xl border border-christmas-green/30">
                        <p className="text-christmas-green font-semibold">✓ Gift Claimed!</p>
                        <p className="text-christmas-snow/50 text-xs mt-1">
                          Next claim in {gift.claimIntervalHours === 24 ? '~24 hours' : `~${gift.claimIntervalHours} hours`}
                        </p>
                      </div>

                      {/* Sponsor thank you */}
                      <div className="text-center py-3 bg-muted/20 rounded-xl">
                        <p className="text-christmas-snow/70 text-sm mb-2">
                          🎁 Thank you to our sponsor!
                        </p>
                        <a 
                          href={gift.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-christmas-gold hover:text-christmas-gold/80 font-semibold text-sm transition-colors"
                        >
                          <img src={gift.icon} alt={gift.name} className="w-5 h-5 rounded-full" />
                          Visit {gift.name}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {/* Share button - always visible */}
                      <Button 
                        onClick={() => handleShare(gift)}
                        className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold py-4 rounded-xl"
                      >
                        <Share2 className="w-5 h-5 mr-2" />
                        Share on Farcaster
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Connection hint */}
          <p className="text-center text-christmas-snow/40 text-xs mt-6">
            Each gift claimed helps your Bloomer bloom brighter ✨
          </p>
        </div>
      </section>
    </>
  );
};

export default BloomersGifts;
