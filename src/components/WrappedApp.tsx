import { useState, useCallback, useEffect } from 'react';
import { UserStats } from '@/types/wrapped';
import { useWrappedData } from '@/hooks/useWrappedData';
import { useFarcaster } from '@/contexts/FarcasterContext';
import Snowfall from './Snowfall';
import ChristmasLights from './ChristmasLights';
import ChristmasDecorations from './ChristmasDecorations';
import LoadingScreen from './LoadingScreen';
import WelcomeSlide from './slides/WelcomeSlide';
import StatSlide from './slides/StatSlide';
import JudgmentSlide from './slides/JudgmentSlide';
import SlideProgress from './SlideProgress';
import { useToast } from '@/hooks/use-toast';
import { sdk } from '@farcaster/miniapp-sdk';

const WrappedApp = () => {
  const { user, isSDKLoaded, isInMiniApp } = useFarcaster();
  const [isLoading, setIsLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const { toast } = useToast();

  // Build stats from Farcaster user context (mock data for now until Neynar integration)
  const stats: UserStats = {
    fid: user?.fid || 12345,
    username: user?.username || 'uniquebeing404',
    pfp: user?.pfpUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=uniquebeing404',
    replies: 342,
    likesGiven: 1289,
    likesReceived: 2156,
    recastsGiven: 456,
    recastsReceived: 789,
    activeDays: 247,
    silentDays: 118,
    timeframe: 'year',
  };

  const { slides, judgment } = useWrappedData(stats);

  const totalSlides = 1 + slides.length + 1;
  const isLastSlide = currentSlide === totalSlides - 1;
  const isFirstSlide = currentSlide === 0;

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

  // Left/Right tap navigation
  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) {
      return;
    }

    // Get tap position
    const clientX = 'touches' in e 
      ? e.changedTouches?.[0]?.clientX || 0
      : (e as React.MouseEvent).clientX;
    
    const screenWidth = window.innerWidth;
    const tapZone = clientX / screenWidth;

    // Left 40% = back, Right 60% = forward
    if (tapZone < 0.4) {
      if (!isFirstSlide) {
        handlePrev();
      }
    } else {
      if (!isLastSlide) {
        handleNext();
      }
    }
  }, [handleNext, handlePrev, isLastSlide, isFirstSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        if (!isLastSlide) handleNext();
      } else if (e.key === 'ArrowLeft') {
        if (!isFirstSlide) handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, isLastSlide, isFirstSlide]);

  const handleShare = async () => {
    const shareText = `Here's my Naughty or Nice Wrapped by @uniquebeing404 ❄️\n\nI'm ${judgment.score}% ${judgment.isNice ? 'NICE' : 'NAUGHTY'} — ${judgment.badge}!\n\nCheck yours 👇`;
    
    // If in mini app, use SDK to compose cast
    if (isInMiniApp && sdk) {
      try {
        await sdk.actions.composeCast({
          text: shareText,
          embeds: ['https://naughty-or-nice-wrapped.lovable.app'],
        });
        return;
      } catch (err) {
        console.log('Failed to compose cast:', err);
      }
    }
    
    // Fallback to clipboard
    navigator.clipboard.writeText(shareText);
    toast({
      title: "🎄 Copied to clipboard!",
      description: "Share your Wrapped on Farcaster",
    });
  };

  const handleLoadingComplete = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Wait for SDK to load before showing content
  if (!isSDKLoaded) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <Snowfall />
        <ChristmasLights />
        <ChristmasDecorations />
        <LoadingScreen 
          onComplete={() => {}} 
          username={stats.username}
          pfp={stats.pfp}
        />
      </div>
    );
  }

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
        <LoadingScreen 
          onComplete={handleLoadingComplete} 
          username={stats.username}
          pfp={stats.pfp}
        />
      ) : (
        <>
          {/* Tap zone overlay */}
          <div 
            className="fixed inset-0 z-20"
            onClick={handleTap}
          />

          {/* Content */}
          <div className="relative z-10 pb-24 pt-12 min-h-screen pointer-events-none">
            <div className="pointer-events-auto">
              {renderSlide()}
            </div>
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
