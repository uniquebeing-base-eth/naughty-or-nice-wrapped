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

  const [stats, setStats] = useState<UserStats>({
    fid: user?.fid || 12345,
    username: user?.username || 'uniquebeing404',
    pfp: user?.pfpUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=uniquebeing404',
    replies: 0, likesGiven: 0, likesReceived: 0, recastsGiven: 0, recastsReceived: 0,
    activeDays: 0, silentDays: 0, timeframe: 'year',
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.fid) {
        setStats(prev => ({ ...prev,
          replies: 2000 + Math.floor(Math.random() * 500),
          likesGiven: 10000 + Math.floor(Math.random() * 2000),
          likesReceived: 20000 + Math.floor(Math.random() * 5000),
          recastsGiven: 2500 + Math.floor(Math.random() * 500),
          recastsReceived: 789, activeDays: 150 + Math.floor(Math.random() * 150),
          silentDays: 20 + Math.floor(Math.random() * 60),
        }));
        setIsFetchingStats(false);
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke('fetch-farcaster-stats', { body: { fid: user.fid } });
        if (error) throw error;
        if (data?.stats) {
          setStats(prev => ({ ...prev, fid: user.fid, username: user.username, pfp: user.pfpUrl,
            replies: data.stats.replies || 0, likesGiven: data.stats.likes_given || 0,
            likesReceived: Math.floor((data.stats.likes_given || 0) * 1.5),
            recastsGiven: data.stats.recasts_given || 0, recastsReceived: Math.floor((data.stats.recasts_given || 0) * 1.2),
            activeDays: data.stats.active_days || 0, silentDays: data.stats.silent_days || 0,
          }));
        }
      } catch {
        setStats(prev => ({ ...prev, fid: user.fid, username: user.username, pfp: user.pfpUrl,
          replies: 2000, likesGiven: 10000, likesReceived: 20000, recastsGiven: 2500,
          recastsReceived: 789, activeDays: 200, silentDays: 30,
        }));
      } finally { setIsFetchingStats(false); }
    };
    if (isSDKLoaded) fetchStats();
  }, [user?.fid, isSDKLoaded]);

  const { slides, judgment } = useWrappedData(stats);
  const totalSlides = 1 + slides.length + 1;
  const isLastSlide = currentSlide === totalSlides - 1;
  const isFirstSlide = currentSlide === 0;

  const handleNext = useCallback(() => { if (currentSlide < totalSlides - 1) setCurrentSlide(prev => prev + 1); }, [currentSlide, totalSlides]);
  const handlePrev = useCallback(() => { if (currentSlide > 0) setCurrentSlide(prev => prev - 1); }, [currentSlide]);

  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) return;
    const clientX = 'touches' in e ? e.changedTouches?.[0]?.clientX || 0 : (e as React.MouseEvent).clientX;
    const tapZone = clientX / window.innerWidth;
    if (tapZone < 0.4) { if (!isFirstSlide) handlePrev(); } else { if (!isLastSlide) handleNext(); }
  }, [handleNext, handlePrev, isLastSlide, isFirstSlide]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') { if (!isLastSlide) handleNext(); }
      else if (e.key === 'ArrowLeft') { if (!isFirstSlide) handlePrev(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, isLastSlide, isFirstSlide]);

  const handleShare = async () => {
    const shareText = `Here's my Naughty or Nice Wrapped by @uniquebeing404 ❄️\n\nI'm ${judgment.score}% ${judgment.isNice ? 'NICE' : 'NAUGHTY'} — ${judgment.badge}!\n\nCheck yours 👇`;
    const shareUrl = 'https://naughty-or-nice-wrapped.vercel.app';
    if (isInMiniApp && sdk) {
      try { await sdk.actions.composeCast({ text: shareText, embeds: [shareUrl] }); return; } catch { /* fallback */ }
    }
    try { await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`); toast({ title: "🎄 Copied!", description: "Share on Farcaster" }); } catch { /* ignore */ }
  };

  const handleLoadingComplete = useCallback(() => setIsLoading(false), []);

  if (!isSDKLoaded || isFetchingStats) {
    return (<div className="relative min-h-screen overflow-hidden"><Snowfall /><ChristmasLights /><ChristmasDecorations /><LoadingScreen onComplete={() => {}} username={stats.username} pfp={stats.pfp} /></div>);
  }

  const renderSlide = () => {
    if (currentSlide === 0) return <WelcomeSlide username={stats.username} pfp={stats.pfp} />;
    if (currentSlide === totalSlides - 1) return <JudgmentSlide stats={stats} judgment={judgment} onShare={handleShare} />;
    return <StatSlide key={slides[currentSlide - 1].id} slide={slides[currentSlide - 1]} />;
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Snowfall /><ChristmasLights /><ChristmasDecorations /><MusicControl isMuted={isMuted} onToggle={toggleMute} />
      {isLoading ? <LoadingScreen onComplete={handleLoadingComplete} username={stats.username} pfp={stats.pfp} /> : (
        <>
          {!isLastSlide && <div className="fixed inset-0 z-20" onClick={handleTap} />}
          <div className="relative z-10 pb-24 pt-12 min-h-screen">{renderSlide()}</div>
          <SlideProgress currentSlide={currentSlide} totalSlides={totalSlides} />
        </>
      )}
    </div>
  );
};

export default WrappedApp;