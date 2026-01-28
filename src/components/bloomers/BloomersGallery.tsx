
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import sdk from '@farcaster/miniapp-sdk';

interface BloomersGalleryProps {
  mintedBloomers: string[];
}

// Placeholder bloomer examples for empty state
const EXAMPLE_BLOOMERS = [
{ name: 'Glowtail Bloomer', verdict: 'Chain Champion', emoji: '🦊', gradient: 'from-amber-500 to-orange-600' },
{ name: 'Bloomwing Bloomer', verdict: 'Vibe Creator', emoji: '🦋', gradient: 'from-purple-500 to-pink-500' },
{ name: 'Starpaw Bloomer', verdict: 'Space Pioneer', emoji: '🐺', gradient: 'from-slate-400 to-blue-600' },
{ name: 'Crystalheart Bloomer', verdict: 'Joy Catalyst', emoji: '🦄', gradient: 'from-pink-400 to-purple-500' },
];

const BloomersGallery = ({ mintedBloomers }: BloomersGalleryProps) => {
  const hasBloomers = mintedBloomers.length > 0;

  const handleShare = async (imageUrl: string, index: number) => {
    const shareText = `✨ Check out my Bloomer #${index + 1}! ✨\n\nFrom my naughty-or-nice-wrapped collection by @uniquebeing404\n\nMint yours 🌸👇`;
    
    try {
      await sdk.actions.composeCast({
        text: shareText,
        embeds: [
          imageUrl,
          'https://farcaster.xyz/miniapps/m0Hnzx2HWtB5/naughty-or-nice-wrapped'
        ]
      });
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  return (
    <section className="py-16 px-6">
      <div className="max-w-lg mx-auto">
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="font-display text-3xl font-bold text-christmas-snow mb-2">
            Your <span className="text-christmas-gold">Bloomers</span>
          </h2>
          <p className="text-christmas-snow/60 text-sm">
            Every Bloomer tells a winter story
          </p>
        </div>

        {!hasBloomers ? (
          <>
            {/* Empty state - show preview */}
            <div className="text-center mb-6">
              <p className="text-christmas-snow/50 text-sm mb-4">
                Your collection is waiting to bloom... ✨
              </p>
            </div>

            {/* Example gallery preview */}
            <div className="grid grid-cols-2 gap-4">
              {EXAMPLE_BLOOMERS.map((bloomer, idx) => (
                <div 
                  key={bloomer.name}
                  className="relative group"
                >
                  {/* Card */}
                  <div className={`aspect-square rounded-2xl bg-gradient-to-br ${bloomer.gradient} p-0.5 opacity-40 transition-opacity duration-300`}>
                    <div className="w-full h-full rounded-2xl bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-3">
                      <span className="text-4xl mb-2">{bloomer.emoji}</span>
                      <p className="text-white text-xs font-semibold text-center leading-tight">{bloomer.name}</p>
                      <p className="text-white/60 text-[10px] mt-1">{bloomer.verdict}</p>
                    </div>
                  </div>

                  {/* Lock overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl">🔒</span>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-christmas-snow/40 text-xs mt-6">
              Mint your first Bloomer to start your collection
            </p>
          </>
        ) : (
          /* Actual gallery */
          <div className="grid grid-cols-2 gap-4">
            {mintedBloomers.map((bloomer, idx) => (
              <div 
                key={idx}
                className="relative group"
              >
                <div className="aspect-square rounded-2xl bg-gradient-to-br from-christmas-gold/30 to-amber-600/30 p-0.5 hover:scale-105 transition-transform duration-300 shadow-lg hover:shadow-christmas-gold/20">
                  <div className="w-full h-full rounded-2xl bg-black/40 backdrop-blur-sm flex items-center justify-center overflow-hidden">
                    <img 
                      src={bloomer} 
                      alt={`Bloomer #${idx + 1}`}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  </div>
                </div>
                
                {/* Share button overlay */}
                <Button
                  size="sm"
                  onClick={() => handleShare(bloomer, idx)}
                  className="absolute bottom-2 right-2 bg-christmas-gold/90 hover:bg-christmas-gold text-black rounded-full p-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default BloomersGallery;
