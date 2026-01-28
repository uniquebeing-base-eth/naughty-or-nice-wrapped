import { useEffect, useState } from 'react';
import { SlideContent } from '@/types/wrapped';
import ChristmasCharacterIcon from '../ChristmasCharacterIcon';

interface StatSlideProps {
  slide: SlideContent;
}

const StatSlide = ({ slide }: StatSlideProps) => {
  const [animate, setAnimate] = useState(false);
  const [countValue, setCountValue] = useState(0);

  const numericValue = typeof slide.value === 'number' ? slide.value : parseInt(slide.value.toString());

  useEffect(() => {
    setAnimate(false);
    setCountValue(0);
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, [slide.id]);

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
  };

  const colors = colorClasses[slide.color];

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] text-center px-6">
      {/* Main stat card */}
      <div 
        className={`relative christmas-card ${colors.glow} border-2 ${colors.border} max-w-sm w-full transition-all duration-700 ${
          animate ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
      >
        {/* Decorative corners */}
        <div className="absolute -top-3 -left-3 text-2xl">❄️</div>
        <div className="absolute -top-3 -right-3 text-2xl">❄️</div>
        <div className="absolute -bottom-3 -left-3 text-2xl">🎄</div>
        <div className="absolute -bottom-3 -right-3 text-2xl">🎄</div>
        
        {/* Content */}
        <div className="relative z-10">
          {/* Emoji with Christmas character hugging it */}
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

          {/* Big number */}
          <div 
            className={`font-display text-7xl md:text-8xl font-bold mb-6 bg-gradient-to-b ${colors.gradient} bg-clip-text text-transparent transition-all duration-700 delay-400 ${
              animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {countValue.toLocaleString()}{!['naughty-moments', 'nice-moments'].includes(slide.id) && '+'}
          </div>

          {/* Decorative line */}
          <div className={`h-1.5 w-24 mx-auto rounded-full ${colors.bg} mb-6`}>
            <div className={`h-full rounded-full bg-gradient-to-r ${colors.gradient} animate-shimmer`} />
          </div>

          {/* Description - always shows the random funny text */}
          <p 
            className={`text-lg text-christmas-snow leading-relaxed whitespace-pre-line font-medium transition-all duration-700 delay-500 ${
              animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {slide.funnyText}
          </p>
        </div>
      </div>
    </div>
  );
};


export default StatSlide;
