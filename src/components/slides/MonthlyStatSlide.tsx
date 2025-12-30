import { useEffect, useState } from 'react';
import { MonthlySlideContent, MonthlyStats } from '@/types/monthly';
import ChristmasCharacterIcon from '../ChristmasCharacterIcon';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';

interface MonthlyStatSlideProps {
  slide: MonthlySlideContent;
  stats: MonthlyStats;
  onShare: () => void;
  isGeneratingShare?: boolean;
}


const MonthlyStatSlide = ({ slide, stats, onShare, isGeneratingShare = false }: MonthlyStatSlideProps) => {
  const [animate, setAnimate] = useState(false);
  const [countValue, setCountValue] = useState(0);

  const numericValue = typeof slide.value === 'number' ? slide.value : 0;
  const isNumeric = typeof slide.value === 'number';

  useEffect(() => {
    setAnimate(false);
    setCountValue(0);
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, [slide.id]);

  useEffect(() => {
    if (!animate || !isNumeric) return;
    
    const duration = 1500;
    const steps = 60;
    const increment = numericValue / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= numericValue) {
        setCountValue(numericValue);
        clearInterval(timer);
      } else {
        setCountValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [animate, numericValue, isNumeric]);

  const colorClasses = {
    red: {
      gradient: 'from-christmas-red via-christmas-red-light to-christmas-red',
      glow: 'shadow-[0_0_100px_hsl(var(--christmas-red)/0.6)]',
      text: 'text-christmas-red-light',
      border: 'border-christmas-red/40',
      bg: 'bg-christmas-red/20',
    },
    green: {
      gradient: 'from-christmas-green via-christmas-green-light to-christmas-green',
      glow: 'shadow-[0_0_100px_hsl(var(--christmas-green)/0.6)]',
      text: 'text-christmas-green-light',
      border: 'border-christmas-green/40',
      bg: 'bg-christmas-green/20',
    },
    gold: {
      gradient: 'from-christmas-gold via-christmas-gold-light to-christmas-gold',
      glow: 'shadow-[0_0_100px_hsl(var(--christmas-gold)/0.6)]',
      text: 'text-christmas-gold-light',
      border: 'border-christmas-gold/40',
      bg: 'bg-christmas-gold/20',
    },
    purple: {
      gradient: 'from-purple-500 via-purple-400 to-purple-500',
      glow: 'shadow-[0_0_100px_rgba(168,85,247,0.6)]',
      text: 'text-purple-400',
      border: 'border-purple-500/40',
      bg: 'bg-purple-500/20',
    },
  };

  const colors = colorClasses[slide.color];

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] text-center px-6">
      <div 
        id={`stat-card-${slide.id}`}
        className={`relative christmas-card ${colors.glow} border-2 ${colors.border} max-w-sm w-full transition-all duration-700 ${
          animate ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
      >
        {/* Decorative corners */}
        <div className="absolute -top-3 -left-3 text-2xl">✨</div>
        <div className="absolute -top-3 -right-3 text-2xl">✨</div>
        <div className="absolute -bottom-3 -left-3 text-2xl">⚡</div>
        <div className="absolute -bottom-3 -right-3 text-2xl">⚡</div>
        
        <div className="relative z-10">
          {/* Month tag */}
          <div className="text-[9px] uppercase tracking-[0.12em] text-christmas-gold/80 font-bold mb-2">
            ✨ {stats.month} {stats.year} ✨
          </div>

          {/* Emoji */}
          <div 
            className={`mb-6 transition-all duration-700 delay-200 ${
              animate ? 'opacity-100 scale-100 animate-bounce-in' : 'opacity-0 scale-50'
            }`}
          >
            <ChristmasCharacterIcon emoji={slide.emoji} />
          </div>

          {/* Title */}
          <h2 
            className={`font-display text-lg font-medium text-christmas-gold mb-4 uppercase tracking-widest transition-all duration-500 delay-300 ${
              animate ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {slide.title}
          </h2>

          {/* Big number or text */}
          <div 
            className={`font-display text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-b ${colors.gradient} bg-clip-text text-transparent transition-all duration-700 delay-400 ${
              animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {isNumeric ? countValue.toLocaleString() : slide.value}
          </div>

          {/* Decorative line */}
          <div className={`h-1.5 w-24 mx-auto rounded-full ${colors.bg} mb-6`}>
            <div className={`h-full rounded-full bg-gradient-to-r ${colors.gradient} animate-shimmer`} />
          </div>

          {/* Description */}
          <p 
            className={`text-lg text-christmas-snow leading-relaxed whitespace-pre-line font-medium transition-all duration-700 delay-500 ${
              animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {slide.funnyText}
          </p>

          {/* Username attribution */}
          <p className="text-[10px] text-christmas-snow/50 mt-4">@{stats.username}</p>
        </div>
      </div>

      {/* Share button for all stat slides */}
      <div className={`mt-4 transition-all duration-700 delay-700 relative z-50 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <Button 
          onClick={(e) => { 
            e.stopPropagation(); 
            e.preventDefault();
            onShare(); 
          }} 
          disabled={isGeneratingShare}
          className="bg-gradient-to-r from-christmas-green to-christmas-green-dark hover:from-christmas-green-light hover:to-christmas-green text-white px-5 py-2.5 rounded-full font-bold gap-2 text-sm shadow-lg shadow-christmas-green/30 border-2 border-christmas-gold/30 pointer-events-auto disabled:opacity-70 cursor-pointer touch-manipulation"
        >
          {isGeneratingShare ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              Share on Farcaster
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default MonthlyStatSlide;
