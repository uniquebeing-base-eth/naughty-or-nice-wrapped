import { useState, useCallback, useEffect } from 'react';
import { UserStats } from '@/types/wrapped';
import { useWrappedData, mockUserStats } from '@/hooks/useWrappedData';
import Snowfall from './Snowfall';
import ChristmasLights from './ChristmasLights';
import ChristmasDecorations from './ChristmasDecorations';
import LoadingScreen from './LoadingScreen';
import WelcomeSlide from './slides/WelcomeSlide';
import StatSlide from './slides/StatSlide';
import JudgmentSlide from './slides/JudgmentSlide';
import SlideProgress from './SlideProgress';
import { useToast } from '@/hooks/use-toast';

const WrappedApp = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [stats] = useState<UserStats>(mockUserStats);
  const { slides, judgment } = useWrappedData(stats);
  const { toast } = useToast();

  // Total slides: welcome (1) + stat slides + judgment (1)
  const totalSlides = 1 + slides.length + 1;
  const isLastSlide = currentSlide === totalSlides - 1;

  const handleNext = useCallback(() => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  }, [currentSlide, totalSlides]);

  // Tap to advance
  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Don't advance if clicking on buttons or interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) {
      return;
    }
    
    // Don't advance on the last slide (judgment card)
    if (!isLastSlide) {
      handleNext();
    }
  }, [handleNext, isLastSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        if (!isLastSlide) {
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, isLastSlide]);

  const handleShare = () => {
    const shareText = `Here's my Naughty or Nice Wrapped by @uniquebeing404 ❄️\n\nI'm ${judgment.score}% ${judgment.isNice ? 'NICE' : 'NAUGHTY'} — ${judgment.badge}!\n\nCheck yours 👇`;
    
    navigator.clipboard.writeText(shareText);
    toast({
      title: "🎄 Copied to clipboard!",
      description: "Share your Wrapped on Farcaster",
    });
  };

  const handleGenerateNew = () => {
    setIsLoading(true);
    setCurrentSlide(0);
  };

  const handleLoadingComplete = useCallback(() => {
    setIsLoading(false);
  }, []);

  const renderSlide = () => {
    if (currentSlide === 0) {
      return (
        <WelcomeSlide
          username={stats.username}
          pfp={stats.pfp}
        />
      );
    }

    if (currentSlide === totalSlides - 1) {
      return (
        <JudgmentSlide
          stats={stats}
          judgment={judgment}
          onShare={handleShare}
          onGenerateNew={handleGenerateNew}
        />
      );
    }

    const slideIndex = currentSlide - 1;
    return (
      <StatSlide
        key={slides[slideIndex].id}
        slide={slides[slideIndex]}
      />
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Snowfall />
      <ChristmasLights />
      <ChristmasDecorations />

      {isLoading ? (
        <LoadingScreen onComplete={handleLoadingComplete} />
      ) : (
        <>
          {/* Tap area - covers the whole screen */}
          <div 
            className="relative z-10 pb-24 pt-12 min-h-screen cursor-pointer"
            onClick={handleTap}
          >
            {renderSlide()}
          </div>

          <SlideProgress
            currentSlide={currentSlide}
            totalSlides={totalSlides}
          />
        </>
      )}
    </div>
  );
};

export default WrappedApp;
