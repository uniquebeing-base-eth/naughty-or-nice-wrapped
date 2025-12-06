import { useEffect, useState, useMemo } from 'react';
import { SlideContent } from '@/types/wrapped';

interface StatSlideProps {
  slide: SlideContent;
  isFunnyMode: boolean;
}

const StatSlide = ({ slide, isFunnyMode }: StatSlideProps) => {
  const [animate, setAnimate] = useState(false);
  const [countValue, setCountValue] = useState(0);

  const numericValue = typeof slide.value === 'number' ? slide.value : parseInt(slide.value.toString());

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Animated counter
  useEffect(() => {
    if (!animate) return;
    
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
  }, [animate, numericValue]);

  const randomAlternate = useMemo(() => {
    return slide.alternates[Math.floor(Math.random() * slide.alternates.length)];
  }, [slide.alternates]);

  const colorClasses = {
    red: {
      bg: 'from-christmas-red/20 to-christmas-red-dark/10',
      border: 'border-christmas-red/30',
      glow: 'shadow-[0_0_60px_hsl(var(--christmas-red)/0.3)]',
      text: 'text-christmas-red',
      accent: 'bg-christmas-red',
    },
    green: {
      bg: 'from-christmas-green/20 to-christmas-green-light/10',
      border: 'border-christmas-green/30',
      glow: 'shadow-[0_0_60px_hsl(var(--christmas-green)/0.3)]',
      text: 'text-christmas-green-light',
      accent: 'bg-christmas-green',
    },
    gold: {
      bg: 'from-christmas-gold/20 to-christmas-gold-dark/10',
      border: 'border-christmas-gold/30',
      glow: 'shadow-[0_0_60px_hsl(var(--christmas-gold)/0.3)]',
      text: 'text-christmas-gold',
      accent: 'bg-christmas-gold',
    },
  };

  const colors = colorClasses[slide.color];

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
      {/* Main stat card */}
      <div 
        className={`relative christmas-card ${colors.glow} border ${colors.border} max-w-sm w-full transition-all duration-700 ${
          animate ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
      >
        {/* Background gradient */}
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${colors.bg} opacity-50`} />
        
        {/* Content */}
        <div className="relative z-10">
          {/* Emoji */}
          <div 
            className={`text-6xl mb-6 transition-all duration-700 delay-200 ${
              animate ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
            }`}
          >
            {slide.emoji}
          </div>

          {/* Title */}
          <h2 
            className={`font-display text-lg font-medium text-muted-foreground mb-2 transition-all duration-500 delay-300 ${
              animate ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {slide.title}
          </h2>

          {/* Big number */}
          <div 
            className={`font-display text-6xl md:text-7xl font-bold ${colors.text} mb-6 transition-all duration-700 delay-400 ${
              animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {countValue.toLocaleString()}
          </div>

          {/* Decorative line */}
          <div className={`h-1 w-20 mx-auto rounded-full ${colors.accent} mb-6 opacity-60`} />

          {/* Description */}
          <p 
            className={`text-foreground/90 leading-relaxed whitespace-pre-line transition-all duration-700 delay-500 ${
              animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {isFunnyMode ? slide.funnyText : slide.cleanText}
          </p>
        </div>
      </div>

      {/* Alternate text */}
      <p 
        className={`mt-6 text-sm text-muted-foreground italic transition-all duration-700 delay-700 ${
          animate ? 'opacity-100' : 'opacity-0'
        }`}
      >
        "{randomAlternate}"
      </p>
    </div>
  );
};

export default StatSlide;
