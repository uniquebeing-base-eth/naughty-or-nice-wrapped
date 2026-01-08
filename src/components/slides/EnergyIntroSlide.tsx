
import { useEffect, useState } from 'react';
import { Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EnergyIntroSlideProps {
  onStart: () => void;
}

const EnergyIntroSlide = ({ onStart }: EnergyIntroSlideProps) => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] text-center px-6">
      {/* Floating magical elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 text-4xl animate-float" style={{ animationDelay: '0s' }}>🔮</div>
        <div className="absolute top-32 right-12 text-3xl animate-float" style={{ animationDelay: '0.5s' }}>✨</div>
        <div className="absolute bottom-40 left-16 text-3xl animate-float" style={{ animationDelay: '1s' }}>⭐</div>
        <div className="absolute bottom-32 right-10 text-4xl animate-float" style={{ animationDelay: '1.5s' }}>💫</div>
        <div className="absolute top-1/2 left-8 text-2xl animate-float" style={{ animationDelay: '2s' }}>🌙</div>
        <div className="absolute top-1/2 right-8 text-2xl animate-float" style={{ animationDelay: '2.5s' }}>🦋</div>
      </div>

      {/* Main card */}
      <div 
        className={`relative christmas-card shadow-[0_0_100px_hsl(280_70%_50%/0.5)] border-2 border-purple-500/30 max-w-sm w-full transition-all duration-1000 ${
          animate ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
      >
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-pink-600/10 to-violet-600/20 rounded-3xl" />
        
        {/* Corner decorations */}
        <div className="absolute -top-4 -left-4 text-3xl">🔮</div>
        <div className="absolute -top-4 -right-4 text-3xl">✨</div>
        <div className="absolute -bottom-4 -left-4 text-3xl">💫</div>
        <div className="absolute -bottom-4 -right-4 text-3xl">⭐</div>

        <div className="relative z-10">
          {/* Icon */}
          <div className={`text-7xl mb-6 transition-all duration-700 delay-200 ${animate ? 'opacity-100 scale-100 animate-bounce-in' : 'opacity-0 scale-50'}`}>
            🔮
          </div>

          {/* Title */}
          <h1 className={`font-display text-3xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-violet-400 bg-clip-text text-transparent transition-all duration-700 delay-300 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Energy Personality Test
          </h1>

          {/* Description */}
          <p className={`text-christmas-snow/90 text-base mb-6 leading-relaxed transition-all duration-700 delay-400 ${animate ? 'opacity-100' : 'opacity-0'}`}>
            Discover your unique energy signature. Answer 5 magical questions to reveal your <span className="text-purple-300 font-semibold">energy glow</span> and what the universe has in store for you.
          </p>

          {/* What you'll discover */}
          <div className={`text-left space-y-2 mb-8 transition-all duration-700 delay-500 ${animate ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex items-center gap-3 text-sm text-christmas-snow/80">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Your unique energy type</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-christmas-snow/80">
              <Sparkles className="w-4 h-4 text-pink-400" />
              <span>Personalized predictions</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-christmas-snow/80">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>Your power affirmation</span>
            </div>
          </div>

          {/* Start button */}
          <Button 
            onClick={(e) => { e.stopPropagation(); onStart(); }}
            className={`bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-8 py-4 rounded-full font-bold gap-2 text-lg shadow-lg shadow-purple-500/30 border-2 border-purple-400/30 pointer-events-auto transition-all duration-700 delay-600 ${animate ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
          >
            <Wand2 className="w-5 h-5" />
            Reveal My Energy
          </Button>
        </div>
      </div>

      {/* Footer */}
      <p className={`mt-8 text-sm text-purple-300/70 transition-all duration-700 delay-700 ${animate ? 'opacity-100' : 'opacity-0'}`}>
        Takes less than 30 seconds ✨
      </p>
    </div>
  );
};

export default EnergyIntroSlide;
