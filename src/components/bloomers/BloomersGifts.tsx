import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Gift, Share2, ExternalLink } from 'lucide-react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useFarcaster } from '@/contexts/FarcasterContext';
import { useToast } from '@/hooks/use-toast';

// Static placeholder gift - will be replaced with dynamic partner gifts
const TODAY_GIFT = {
  id: 1,
  day: 14,
  partner: {
    name: 'Farcaster',
    icon: '💜',
    link: 'https://farcaster.xyz',
  },
  santaMessage: "Ho ho ho! The elves at Farcaster have been working hard to bring joy to the community. They've earned a special spot on the Nice list! 🎄",
  reward: 'Special Recognition',
  claimed: false,
};

const BloomersGifts = () => {
  const { isInMiniApp } = useFarcaster();
  const { toast } = useToast();
  const [gift, setGift] = useState(TODAY_GIFT);
  const [hasShared, setHasShared] = useState(false);

  const handleClaimGift = () => {
    setGift(prev => ({ ...prev, claimed: true }));
    toast({
      title: "🎁 Gift Claimed!",
      description: "Santa smiles 🌸 Bloomers grow brighter when joy is shared",
    });
  };

  const handleShare = async () => {
    const shareText = `🎁 I just opened Santa's Garden Gift from ${gift.partner.name}!\n\n🌸 Every gift claimed helps my Bloomer bloom brighter ✨\n\nGet your Bloomer 👇`;
    
    if (isInMiniApp && sdk?.actions?.composeCast) {
      try {
        await sdk.actions.composeCast({
          text: shareText,
          embeds: ['https://naughty-or-nice-wrapped.vercel.app/bloomers'],
        });
        setHasShared(true);
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
          {/* Day indicator */}
          <div className="flex items-center justify-between mb-4">
            <span className="px-3 py-1 rounded-full bg-christmas-red/20 text-christmas-red text-sm font-semibold">
              Day {gift.day}
            </span>
            <Gift className={`w-6 h-6 ${gift.claimed ? 'text-christmas-green' : 'text-christmas-gold animate-bounce'}`} />
          </div>

          {/* Partner info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/30 to-purple-700/30 flex items-center justify-center text-2xl">
              {gift.partner.icon}
            </div>
            <div>
              <p className="font-display text-lg text-christmas-gold font-semibold">{gift.partner.name}</p>
              <a 
                href={gift.partner.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-christmas-snow/50 text-xs flex items-center gap-1 hover:text-christmas-gold transition-colors"
              >
                Visit Partner <ExternalLink className="w-3 h-3" />
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
              className="w-full bg-gradient-to-r from-christmas-gold to-amber-600 hover:from-christmas-gold/90 hover:to-amber-600/90 text-black font-bold py-6 rounded-xl"
            >
              <Gift className="w-5 h-5 mr-2" />
              Open Today's Gift
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
  );
};

export default BloomersGifts;
