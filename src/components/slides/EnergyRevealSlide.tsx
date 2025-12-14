import { useEffect, useState } from 'react';
import { EnergyPersonality } from '@/types/energy';
import { UserStats } from '@/types/wrapped';
import { Button } from '@/components/ui/button';
import { Share2, Sparkles, Flower2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EnergyRevealSlideProps {
  personality: EnergyPersonality;
  stats: UserStats;
  onShare: () => void;
  isGeneratingShare?: boolean;
}

const EnergyRevealSlide = ({ 
  personality, 
  stats, 
  onShare, 
  isGeneratingShare = false 
}: EnergyRevealSlideProps) => {
  const [animate, setAnimate] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);

  useEffect(() => {
    setAnimate(false);
    setShowPredictions(false);
    const timer = setTimeout(() => setAnimate(true), 100);
    const predTimer = setTimeout(() => setShowPredictions(true), 1500);
    return () => {
      clearTimeout(timer);
      clearTimeout(predTimer);
    };
  }, [personality.id]);

  // Solid text colors for better html2canvas capture (no gradient text)
  const textColors: Record<string, string> = {
    purple: 'text-purple-400',
    slate: 'text-slate-300',
    orange: 'text-orange-400',
    gold: 'text-yellow-400',
    teal: 'text-teal-400',
    pink: 'text-pink-400',
    emerald: 'text-emerald-400',
    violet: 'text-violet-400',
  };

  const borderColors: Record<string, string> = {
    purple: 'border-purple-500/40',
    slate: 'border-slate-400/40',
    orange: 'border-orange-500/40',
    gold: 'border-yellow-500/40',
    teal: 'border-teal-400/40',
    pink: 'border-pink-500/40',
    emerald: 'border-emerald-500/40',
    violet: 'border-violet-500/40',
  };

  return (
    <div className="flex flex-col items-center justify-start text-center px-3 py-2 h-[calc(100vh-100px)] overflow-y-auto">
      {/* Main Card */}
      <div 
        id="energy-card"
        className={`relative christmas-card border-2 ${borderColors[personality.glowColor]} w-full max-w-[320px] overflow-hidden transition-all duration-1000 p-4 ${
          animate ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}
      >
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className={`absolute top-0 left-0 w-32 h-32 bg-gradient-to-br ${personality.gradient} opacity-20 rounded-full blur-3xl`} />
          <div className={`absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl ${personality.gradient} opacity-20 rounded-full blur-3xl`} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[100px] opacity-10">
            {personality.emoji}
          </div>
        </div>

        {/* Corner decorations */}
        <div className="absolute top-2 left-2 text-lg">🔮</div>
        <div className="absolute top-2 right-2 text-lg">✨</div>
        <div className="absolute bottom-2 left-2 text-lg">⭐</div>
        <div className="absolute bottom-2 right-2 text-lg">💫</div>

        <div className="relative z-10">
          {/* Header */}
          <div className={`text-[10px] uppercase tracking-[0.15em] text-purple-300 font-bold mb-3 transition-all duration-700 delay-200 ${animate ? 'opacity-100' : 'opacity-0'}`}>
            ✨ Your Energy Revealed ✨
          </div>

          {/* User info */}
          <div className={`flex flex-col items-center mb-4 transition-all duration-700 delay-300 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="relative mb-2">
              <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${personality.gradient} blur-lg opacity-60 scale-125`} />
              <img src={stats.pfp} alt={stats.username} className="w-16 h-16 rounded-full border-3 border-white/30 shadow-xl relative z-10" />
              <div className="absolute -bottom-1 -right-1 text-xl z-20">{personality.emoji}</div>
            </div>
            <span className="font-bold text-christmas-snow text-sm">@{stats.username}</span>
          </div>

          {/* Energy type name */}
          <div className={`mb-4 transition-all duration-1000 delay-500 ${animate ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
            <div className="text-5xl mb-2">{personality.emoji}</div>
            <h2 className={`font-display text-2xl font-bold ${textColors[personality.glowColor]}`}>
              {personality.name}
            </h2>
          </div>

          {/* Personality reveal points */}
          <div className={`space-y-2 mb-4 text-left transition-all duration-700 delay-700 ${animate ? 'opacity-100' : 'opacity-0'}`}>
            {personality.reveal.map((point, index) => (
              <p 
                key={index} 
                className="text-sm text-christmas-snow/90 flex items-start gap-2"
                style={{ animationDelay: `${700 + index * 150}ms` }}
              >
                <span className="text-purple-400">•</span>
                {point}
              </p>
            ))}
          </div>

          {/* Predictions section */}
          {showPredictions && (
            <div className={`mt-3 pt-3 border-t border-white/10 transition-all duration-700 ${showPredictions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <h3 className="text-[10px] uppercase tracking-widest text-purple-300 font-bold mb-2 flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3" />
                Your Prediction
                <Sparkles className="w-3 h-3" />
              </h3>
              <div className="space-y-1.5 text-left">
                {personality.predictions.map((prediction, index) => (
                  <p key={index} className="text-xs text-christmas-snow/80 flex items-start gap-1.5">
                    <span className="text-yellow-400">✦</span>
                    {prediction}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Affirmation */}
          <div className={`mt-3 py-2 px-3 rounded-xl bg-gradient-to-r ${personality.gradient} transition-all duration-700 delay-1000 ${animate ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
            <p className="text-xs font-bold text-white italic">
              "{personality.affirmation}"
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons - more compact */}
      <div className={`mt-3 flex flex-col gap-2 w-full max-w-[320px] transition-all duration-700 delay-1200 relative z-30 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <Button 
          onClick={(e) => { e.stopPropagation(); onShare(); }} 
          disabled={isGeneratingShare}
          className={`bg-gradient-to-r ${personality.gradient} hover:brightness-110 text-white px-5 py-2.5 rounded-full font-bold gap-2 text-sm shadow-lg border-2 border-white/20 pointer-events-auto disabled:opacity-70`}
        >
          {isGeneratingShare ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              Share My Energy
            </>
          )}
        </Button>
        
        <Link to="/bloomers" onClick={(e) => e.stopPropagation()} className="w-full">
          <Button 
            className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-400 hover:via-purple-400 hover:to-indigo-400 text-white px-5 py-2.5 rounded-full font-bold gap-2 text-sm shadow-lg shadow-purple-500/30 border-2 border-pink-400/30 pointer-events-auto"
          >
            <Flower2 className="w-4 h-4" />
            Mint Your Bloomer 🌸
          </Button>
        </Link>
      </div>

      <p className={`mt-2 text-[10px] text-purple-300/80 font-medium transition-all duration-700 delay-1300 ${animate ? 'opacity-100' : 'opacity-0'}`}>
        Made with ✨ by @uniquebeing404
      </p>
    </div>
  );
};

export default EnergyRevealSlide;
