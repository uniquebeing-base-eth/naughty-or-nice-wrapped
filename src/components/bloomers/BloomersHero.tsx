import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

const BLOOMER_VARIATIONS = [
  { emoji: '🦊', color: 'from-amber-400 to-orange-500', name: 'Foxfire Bloomer' },
  { emoji: '🐉', color: 'from-purple-500 to-pink-500', name: 'Stardust Dragon' },
  { emoji: '🦋', color: 'from-cyan-400 to-blue-500', name: 'Crystalwing Fairy' },
  { emoji: '🦄', color: 'from-pink-400 to-purple-500', name: 'Moonbeam Unicorn' },
  { emoji: '🐺', color: 'from-slate-400 to-blue-600', name: 'Frostfang Guardian' },
  { emoji: '🦅', color: 'from-yellow-400 to-amber-600', name: 'Goldenfeather Phoenix' },
];

const VERDICT_TITLES = [
  'Holiday Hero',
  'Mischief Spark',
  'Winter Guardian',
  'Joy Bringer',
  'Frost Whisperer',
  'Star Seeker',
];

const BloomersHero = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [titleIndex, setTitleIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Morph bloomer every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % BLOOMER_VARIATIONS.length);
        setTitleIndex((prev) => (prev + 1) % VERDICT_TITLES.length);
        setIsTransitioning(false);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const current = BLOOMER_VARIATIONS[currentIndex];
  const currentTitle = VERDICT_TITLES[titleIndex];

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 py-16 relative">
      {/* Floating sparkles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${3 + Math.random() * 3}s`,
            }}
          >
            <Sparkles 
              className="text-christmas-gold/30" 
              size={12 + Math.random() * 12} 
            />
          </div>
        ))}
      </div>

      {/* Title */}
      <div className="text-center mb-8 animate-slide-up">
        <h1 className="font-display text-5xl md:text-6xl font-bold text-christmas-gold mb-2">
          Bloomers 🎅🌸
        </h1>
        <p className="text-christmas-snow/60 text-lg">
          Little beings of glow and cheer
        </p>
        <p className="text-christmas-snow/40 text-sm">
          Born from your aura
        </p>
      </div>

      {/* Morphing Bloomer Preview */}
      <div className="relative mb-8">
        {/* Outer glow */}
        <div 
          className={`absolute inset-0 bg-gradient-to-r ${current.color} blur-3xl opacity-30 scale-150 transition-all duration-500`}
        />
        
        {/* Bloomer container */}
        <div 
          className={`relative w-64 h-64 md:w-80 md:h-80 rounded-3xl bg-gradient-to-br ${current.color} p-1 shadow-2xl transition-all duration-500 ${
            isTransitioning ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
          }`}
        >
          <div className="w-full h-full rounded-3xl bg-gradient-to-br from-black/20 to-black/40 backdrop-blur-sm flex flex-col items-center justify-center">
            {/* Creature emoji placeholder */}
            <div className="text-8xl md:text-9xl mb-4 animate-bounce-in">
              {current.emoji}
            </div>
            
            {/* Name */}
            <p className="text-white font-display text-lg font-semibold text-center px-4">
              {current.name}
            </p>
          </div>
        </div>

        {/* Floating magic particles */}
        <div className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-br from-yellow-300 to-amber-500 rounded-full animate-pulse opacity-80" />
        <div className="absolute -bottom-2 -left-6 w-6 h-6 bg-gradient-to-br from-pink-300 to-purple-500 rounded-full animate-pulse delay-300 opacity-80" />
        <div className="absolute top-1/2 -right-8 w-4 h-4 bg-gradient-to-br from-cyan-300 to-blue-500 rounded-full animate-pulse delay-700 opacity-80" />
      </div>

      {/* Verdict teaser */}
      <div 
        className={`mb-8 transition-all duration-500 ${
          isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
        }`}
      >
        <div className="christmas-card px-6 py-3 border border-christmas-gold/20">
          <p className="text-christmas-snow/70 text-sm text-center">
            Verdict: <span className="text-christmas-gold font-semibold">{currentTitle}</span>
          </p>
        </div>
      </div>

      {/* Coming soon button */}
      <Button 
        disabled 
        className="bg-gradient-to-r from-christmas-gold/30 to-amber-600/30 text-christmas-snow/60 px-8 py-6 rounded-full font-bold text-lg border border-christmas-gold/30 cursor-not-allowed"
      >
        <Sparkles className="w-5 h-5 mr-2" />
        Minting Soon
      </Button>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-christmas-snow/30 flex justify-center pt-2">
          <div className="w-1.5 h-3 bg-christmas-snow/50 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
};

export default BloomersHero;
