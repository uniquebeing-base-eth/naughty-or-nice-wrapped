
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import BloomersLeaderboard from './BloomersLeaderboard';

// Import Bloomer images
import bloomerCelestialFox from '@/assets/bloomers/bloomer-celestial-fox.png';
import bloomerMysticKitsune from '@/assets/bloomers/bloomer-mystic-kitsune.png';
import bloomerBlossomFairy from '@/assets/bloomers/bloomer-blossom-fairy.png';
import bloomerGoldenSpirit from '@/assets/bloomers/bloomer-golden-spirit.png';
import bloomerFrostGuardian from '@/assets/bloomers/bloomer-frost-guardian.png';

const BLOOMER_VARIATIONS = [
{ image: bloomerCelestialFox, color: 'from-orange-500 to-red-500', name: 'Celestial Fox' },
{ image: bloomerMysticKitsune, color: 'from-indigo-500 to-fuchsia-500', name: 'Mystic Kitsune' },
{ image: bloomerBlossomFairy, color: 'from-rose-400 to-fuchsia-500', name: 'Blossom Fairy' },
{ image: bloomerGoldenSpirit, color: 'from-amber-500 to-orange-600', name: 'Golden Spirit' },
{ image: bloomerFrostGuardian, color: 'from-sky-400 to-indigo-500', name: 'Frost Guardian' },
  
];

const VERDICT_TITLES = [
  'Holiday Hero',
  'Mischief Spark',
  'Winter Guardian',
  'Joy Bringer',
  'Frost Whisperer',
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
          className={`absolute inset-0 bg-gradient-to-r ${current.color} blur-3xl opacity-50 scale-150 transition-all duration-500`}
        />
        
        {/* Bloomer container */}
        <div 
          className={`relative w-72 h-72 md:w-96 md:h-96 rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 ${
            isTransitioning ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
          }`}
        >
          {/* Bloomer image */}
          <img 
            src={current.image} 
            alt={current.name}
            className="w-full h-full object-cover"
          />
          
          {/* Name overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
            <p className="text-white font-display text-xl font-semibold text-center drop-shadow-lg">
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

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <Button 
          onClick={() => {
            document.getElementById('mint-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-gradient-to-r from-christmas-gold to-amber-600 text-white px-8 py-6 rounded-full font-bold text-lg border border-christmas-gold/50 hover:scale-105 transition-transform"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Mint Now
        </Button>
        
        <BloomersLeaderboard />
      </div>

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
