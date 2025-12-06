import { useState, useCallback, useEffect } from 'react';
import { UserStats } from '@/types/wrapped';
import { useWrappedData, mockUserStats } from '@/hooks/useWrappedData';
import Snowfall from './Snowfall';
import WelcomeSlide from './slides/WelcomeSlide';
import StatSlide from './slides/StatSlide';
import JudgmentSlide from './slides/JudgmentSlide';
import SlideNavigation from './SlideNavigation';
import ModeToggle from './ModeToggle';
import { useToast } from '@/hooks/use-toast';

const WrappedApp = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFunnyMode, setIsFunnyMode] = useState(true);
  const [stats] = useState<UserStats>(mockUserStats);
  const { slides, judgment } = useWrappedData(stats);
  const { toast } = useToast();

  // Total slides: welcome (1) + stat slides + judgment (1)
  const totalSlides = 1 + slides.length + 1;

  const handleNext = useCallback(() => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  }, [currentSlide, totalSlides]);

  const handlePrev = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  }, [currentSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  // Touch swipe support
  useEffect(() => {
    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = startX - endX;
      const diffY = Math.abs(startY - endY);

      // Only trigger if horizontal swipe is more significant than vertical
      if (Math.abs(diffX) > 50 && diffY < 100) {
        if (diffX > 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleNext, handlePrev]);

  const handleShare = () => {
    const shareText = `Here's my Naughty or Nice Wrapped by @uniquebeing404 ❄️\n\nI'm ${judgment.score}% ${judgment.isNice ? 'NICE' : 'NAUGHTY'} — ${judgment.badge}!\n\nCheck yours 👇`;
    
    // For Farcaster, we'd integrate with Warpcast SDK
    // For now, copy to clipboard
    navigator.clipboard.writeText(shareText);
    toast({
      title: "Copied to clipboard! 🎄",
      description: "Share your Wrapped on Farcaster",
    });
  };

  const handleGenerateNew = () => {
    setCurrentSlide(0);
    toast({
      title: "Starting over! 🎅",
      description: "Let's see your Wrapped again",
    });
  };

  const renderSlide = () => {
    if (currentSlide === 0) {
      return (
        <WelcomeSlide
          username={stats.username}
          pfp={stats.pfp}
          isFunnyMode={isFunnyMode}
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
        isFunnyMode={isFunnyMode}
      />
    );
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <Snowfall />
      
      <ModeToggle 
        isFunnyMode={isFunnyMode} 
        onToggle={() => setIsFunnyMode(!isFunnyMode)} 
      />

      {/* Main content area */}
      <div className="relative z-10 pb-32">
        {renderSlide()}
      </div>

      <SlideNavigation
        currentSlide={currentSlide}
        totalSlides={totalSlides}
        onPrev={handlePrev}
        onNext={handleNext}
        canGoPrev={currentSlide > 0}
        canGoNext={currentSlide < totalSlides - 1}
      />
    </div>
  );
};

export default WrappedApp;
