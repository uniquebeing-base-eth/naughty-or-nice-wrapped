import { useState, useCallback, useEffect } from 'react';
import { UserStats } from '@/types/wrapped';
import { useWrappedData } from '@/hooks/useWrappedData';
import { useFarcaster } from '@/contexts/FarcasterContext';
import { useChristmasMusic } from '@/hooks/useChristmasMusic';
import Snowfall from './Snowfall';
import ChristmasLights from './ChristmasLights';
import ChristmasDecorations from './ChristmasDecorations';
import LoadingScreen from './LoadingScreen';
import WelcomeSlide from './slides/WelcomeSlide';
import StatSlide from './slides/StatSlide';
import JudgmentSlide from './slides/JudgmentSlide';
import SlideProgress from './SlideProgress';
import MusicControl from './MusicControl';
import { useToast } from '@/hooks/use-toast';
import { sdk } from '@farcaster/miniapp-sdk';
import { supabase } from '@/integrations/supabase/client';

const WrappedApp = () => {
  const { user, isSDKLoaded, isInMiniApp } = useFarcaster();
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingStats, setIsFetchingStats] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const { isMuted, toggleMute } = useChristmasMusic();
  const { toast } = useToast();

  // Stats state
  const [stats, setStats] = useState<UserStats>({
    fid: user?.fid || 12345,
    username: user?.username || 'uniquebeing404',
    pfp: user?.pfpUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=uniquebeing404',
    replies: 0,
    likesGiven: 0,
    likesReceived: 0,
    recastsGiven: 0,
    recastsReceived: 0,
    activeDays: 0,
    silentDays: 0,
    timeframe: 'year',
  });

  // Fetch real stats from Neynar via edge function
  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.fid) {
        console.log('No FID available, using mock data');
        setStats(prev => ({
          ...prev,
          replies: 342,
          likesGiven: 1289,
          likesReceived: 2156,
          recastsGiven: 456,
          recastsReceived: 789,
          activeDays: 247,
          silentDays: 118,
        }));
        setIsFetchingStats(false);
        return;
      }

      try {
        console.log('Fetching stats for FID:', user.fid);
        const { data, error } = await supabase.functions.invoke('fetch-farcaster-stats', {
          body: { fid: user.fid }
        });

        if (error) {
          console.error('Error fetching stats:', error);
          throw error;
        }

        console.log('Received stats:', data);

        if (data?.stats) {
          setStats(prev => ({
            ...prev,
            fid: user.fid,
            username: user.username,
            pfp: user.pfpUrl,
            replies: data.stats.replies || 0,
            likesGiven: data.stats.likes_given || 0,
            likesReceived: Math.floor((data.stats.likes_given || 0) * 1.5),
            recastsGiven: data.stats.recasts_given || 0,
            recastsReceived: Math.floor((data.stats.recasts_given || 0) * 1.2),
            activeDays: data.stats.active_days || 0,
            silentDays: data.stats.silent_days || 0,
          }));
        }
      } catch (err) {
        console.error('Failed to fetch stats, using fallback:', err);
        // Fallback to mock data
        setStats(prev => ({
          ...prev,
          fid: user.fid,
          username: user.username,
          pfp: user.pfpUrl,
          replies: 342,
          likesGiven: 1289,
          likesReceived: 2156,
          recastsGiven: 456,
          recastsReceived: 789,
          activeDays: 247,
          silentDays: 118,
        }));
      } finally {
        setIsFetchingStats(false);
      }
    };

    if (isSDKLoaded) {
      fetchStats();
    }
  }, [user?.fid, isSDKLoaded]);

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
    const shareUrl = 'https://naughty-or-nice-wrapped.vercel.app';
    
    // If in mini app, use SDK to compose cast with embed
    if (isInMiniApp && sdk) {
      try {
        await sdk.actions.composeCast({
          text: shareText,
          embeds: [shareUrl],
        });
        return;
      } catch (err) {
        console.log('Failed to compose cast:', err);
        // Try opening URL as fallback
        try {
          await sdk.actions.openUrl(shareUrl);
          return;
        } catch (urlErr) {
          console.log('Failed to open URL:', urlErr);
        }
      }
    }
    
    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      toast({
        title: "🎄 Copied to clipboard!",
        description: "Share your Wrapped on Farcaster",
      });
    } catch (err) {
      console.log('Failed to copy to clipboard:', err);
    }
  };

  const handleLoadingComplete = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Wait for SDK and stats to load before showing content
  if (!isSDKLoaded || isFetchingStats) {
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
      <MusicControl isMuted={isMuted} onToggle={toggleMute} />

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
