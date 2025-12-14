import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Gift, Share2, ExternalLink, X, Loader2 } from 'lucide-react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useFarcaster } from '@/contexts/FarcasterContext';
import { useToast } from '@/hooks/use-toast';
import enbBlastIcon from '@/assets/partners/enb-blast-icon.png';

// Contract details
const GIFT_CONTRACT_ADDRESS = '0x4C1e7de7bae1820b0A34bC14810bD0e8daE8aE7f';
const BASE_CHAIN_ID = '0x2105'; // Base mainnet (8453)

// claimGift() function selector - keccak256("claimGift()") first 4 bytes
const CLAIM_GIFT_DATA = '0x7a6d298d';

const TODAY_GIFT = {
  id: 1,
  partner: {
    name: 'ENB Blast',
    icon: enbBlastIcon,
    link: 'https://farcaster.xyz/miniapps/0z7FDSc-9NU_/enb-blast',
    description: 'Drag your avatar and collect ENBs',
  },
  santaMessage: "Ho ho ho! The ENB elves have been blasting joy across the blockchain! Drag, collect, and spread the holiday cheer! 🎄✨",
  reward: '1,000 ENB Tokens',
  claimed: false,
};

const BloomersGifts = () => {
  const { isInMiniApp } = useFarcaster();
  const { toast } = useToast();
  
  const [gift, setGift] = useState(TODAY_GIFT);
  const [hasShared, setHasShared] = useState(false);
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const handleClaimGift = async () => {
    if (!isInMiniApp || !sdk?.wallet?.ethProvider) {
      toast({
        title: "Farcaster Required",
        description: "Please open this in Farcaster to claim tokens",
        variant: "destructive",
      });
      return;
    }

    setIsClaiming(true);

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

      // Send claim transaction with minimal gas
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: accounts[0],
          to: GIFT_CONTRACT_ADDRESS,
          data: CLAIM_GIFT_DATA,
          value: '0x0',
          gas: '0xC350', // 50000 gas limit
          maxFeePerGas: '0x5F5E100', // 0.1 gwei
          maxPriorityFeePerGas: '0x5F5E100', // 0.1 gwei
        }],
      });

      console.log('Claim tx:', txHash);

      setGift(prev => ({ ...prev, claimed: true }));
      setShowSharePopup(true);
      toast({
        title: "🎁 1,000 ENB Tokens Claimed!",
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
        toast({
          title: "Already Claimed",
          description: "You've already claimed this gift!",
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
      setIsClaiming(false);
    }
  };

  const handleShare = async () => {
    const shareText = `🎅 Ho ho ho! Spread love to stay in Santa's good books! 💝\n\n🎁 Just claimed my daily gift from ${gift.partner.name}!\n\n🌸 Every gift helps my Bloomer bloom brighter ✨`;
    
    if (isInMiniApp && sdk?.actions?.composeCast) {
      try {
        await sdk.actions.composeCast({
          text: shareText,
          embeds: [
            'https://farcaster.xyz/miniapps/0z7FDSc-9NU_/enb-blast',
            'https://farcaster.xyz/miniapps/m0Hnzx2HWtB5/naughty-or-nice-wrapped'
          ],
        });
        setHasShared(true);
        setShowSharePopup(false);
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

  const handleClosePopup = () => {
    setShowSharePopup(false);
  };

  const daysUntilChristmas = Math.max(0, Math.ceil((new Date('2025-12-25').getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <>
      {/* Share Popup */}
      {showSharePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="christmas-card max-w-sm w-full p-6 border-2 border-christmas-gold/40 relative animate-in zoom-in-95 duration-300">
            <button 
              onClick={handleClosePopup}
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
                <img src={gift.partner.icon} alt={gift.partner.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-christmas-gold font-semibold text-sm">{gift.partner.name}</p>
                <p className="text-christmas-snow/50 text-xs truncate">{gift.partner.description}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={handleShare}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold py-5 rounded-xl"
              >
                <Share2 className="w-5 h-5 mr-2" />
                Share on Farcaster
              </Button>
              <button 
                onClick={handleClosePopup}
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

        {/* Gift Card */}
        <div className={`christmas-card p-6 border-2 transition-all duration-500 ${
          gift.claimed 
            ? 'border-christmas-green/40 shadow-lg shadow-christmas-green/20' 
            : 'border-christmas-gold/30 animate-pulse-glow'
        }`}>
          {/* Gift indicator */}
          <div className="flex items-center justify-end mb-4">
            <Gift className={`w-6 h-6 ${gift.claimed ? 'text-christmas-green' : 'text-christmas-gold animate-bounce'}`} />
          </div>

          {/* Partner info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-white shadow-lg">
              <img src={gift.partner.icon} alt={gift.partner.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-display text-lg text-christmas-gold font-semibold">{gift.partner.name}</p>
              <p className="text-christmas-snow/60 text-xs">{gift.partner.description}</p>
              <a 
                href={gift.partner.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-christmas-snow/50 text-xs flex items-center gap-1 hover:text-christmas-gold transition-colors mt-1"
              >
                Play Now <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Santa's message */}
          <div className="bg-muted/30 rounded-xl p-4 mb-4">
            <p className="text-christmas-snow/80 text-sm italic">
              "{gift.santaMessage}"
            </p>
            <p className="text-christmas-snow/50 text-xs mt-2 text-right">— Santa 🎅</p>
          </div>

          {/* Actions */}
          {!gift.claimed ? (
            <Button 
              onClick={handleClaimGift}
              disabled={isClaiming}
              className="w-full bg-gradient-to-r from-christmas-gold to-amber-600 hover:from-christmas-gold/90 hover:to-amber-600/90 text-black font-bold py-6 rounded-xl disabled:opacity-70"
            >
              {isClaiming ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Claiming...
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
              </div>

              {/* Share prompt */}
              {!hasShared ? (
                <>
                  <Button 
                    onClick={handleShare}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold py-4 rounded-xl"
                  >
                    <Share2 className="w-5 h-5 mr-2" />
                    Share on Farcaster
                  </Button>
                  <p className="text-center text-christmas-snow/40 text-xs">
                    Santa is watching kindly… Bloomers remember generosity 🎅✨
                  </p>
                </>
              ) : (
                <div className="text-center py-2">
                  <p className="text-christmas-gold text-sm">Thank you for sharing! 🌸</p>
                </div>
              )}
            </div>
          )}
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
