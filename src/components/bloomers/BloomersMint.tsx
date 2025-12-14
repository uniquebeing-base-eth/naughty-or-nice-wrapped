import { Button } from '@/components/ui/button';
import { Sparkles, Lock } from 'lucide-react';

interface BloomersMintProps {
  userPfp?: string;
}

const BloomersMint = ({ userPfp }: BloomersMintProps) => {
  return (
    <section className="py-16 px-6">
      <div className="max-w-md mx-auto">
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="font-display text-3xl font-bold text-christmas-snow mb-2">
            Mint Your <span className="text-christmas-gold">Bloomer</span>
          </h2>
          <p className="text-christmas-snow/60 text-sm">
            Mint your own magical Bloomer. Unlimited variations.
          </p>
          <p className="text-christmas-snow/40 text-xs mt-1">
            Each mint reveals a new form
          </p>
        </div>

        {/* Preview card */}
        <div className="christmas-card p-6 border border-christmas-gold/20 mb-6">
          {/* User DNA preview */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="relative">
              {/* User PFP */}
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-christmas-gold/30">
                <img 
                  src={userPfp || 'https://api.dicebear.com/7.x/avataaars/svg?seed=bloomer'} 
                  alt="Your avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 text-lg">✨</div>
            </div>
            
            {/* Arrow */}
            <div className="text-2xl text-christmas-gold animate-pulse">→</div>
            
            {/* Bloomer preview */}
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center border-2 border-christmas-gold/30">
              <span className="text-3xl">🌸</span>
              <div className="absolute -bottom-1 -right-1 text-lg">🦋</div>
            </div>
          </div>

          <p className="text-center text-christmas-snow/60 text-sm mb-4">
            Your profile traits will shape your Bloomer's appearance
          </p>

          {/* Trait extraction preview */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <span className="px-2 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs">
              Color DNA
            </span>
            <span className="px-2 py-1 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300 text-xs">
              Pattern DNA
            </span>
            <span className="px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs">
              Mood DNA
            </span>
          </div>

          {/* Price */}
          <div className="text-center mb-6">
            <p className="text-christmas-snow/50 text-xs">Mint Price</p>
            <p className="font-display text-2xl text-christmas-gold font-bold">0.0004 ETH</p>
            <p className="text-christmas-snow/40 text-xs">on Base</p>
          </div>

          {/* Mint button - disabled */}
          <Button 
            disabled 
            className="w-full bg-gradient-to-r from-christmas-gold/30 to-amber-600/30 text-christmas-snow/60 py-6 rounded-xl font-bold text-lg border border-christmas-gold/30 cursor-not-allowed"
          >
            <Lock className="w-5 h-5 mr-2" />
            Minting Opens Soon 🎄
          </Button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/20 rounded-xl p-4 text-center border border-christmas-gold/10">
            <Sparkles className="w-6 h-6 text-christmas-gold mx-auto mb-2" />
            <p className="text-christmas-snow/80 text-sm font-semibold">Unlimited</p>
            <p className="text-christmas-snow/50 text-xs">Variations</p>
          </div>
          <div className="bg-muted/20 rounded-xl p-4 text-center border border-christmas-gold/10">
            <span className="text-2xl">🎁</span>
            <p className="text-christmas-snow/80 text-sm font-semibold mt-1">Rare Traits</p>
            <p className="text-christmas-snow/50 text-xs">To Discover</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BloomersMint;
