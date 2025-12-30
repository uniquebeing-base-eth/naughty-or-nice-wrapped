import { useState, useCallback, useEffect } from 'react';
import { MonthlyStats, MonthlyJudgment } from '@/types/monthly';
import { useMonthlyWrappedData } from '@/hooks/useMonthlyWrappedData';
import { useEnergyQuiz } from '@/hooks/useEnergyQuiz';
import { useFarcaster } from '@/contexts/FarcasterContext';
import { useChristmasMusic } from '@/hooks/useChristmasMusic';
import Snowfall from './Snowfall';
import ChristmasLights from './ChristmasLights';
import ChristmasDecorations from './ChristmasDecorations';
import LoadingScreen from './LoadingScreen';
import WelcomeSlide from './slides/WelcomeSlide';
import MonthlyStatSlide from './slides/MonthlyStatSlide';
import MonthlyJudgmentSlide from './slides/MonthlyJudgmentSlide';
import EnergyIntroSlide from './slides/EnergyIntroSlide';
import EnergyQuizSlide from './slides/EnergyQuizSlide';
import EnergyRevealSlide from './slides/EnergyRevealSlide';
import SlideProgress from './SlideProgress';
import MusicControl from './MusicControl';
import { useToast } from '@/hooks/use-toast';
import { sdk } from '@farcaster/miniapp-sdk';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import html2canvas from 'html2canvas';
import { ExternalLink } from 'lucide-react';

const FARCASTER_MINIAPP_URL = 'https://farcaster.xyz/miniapps/m0Hnzx2HWtB5/naughty-or-nice-wrapped';

const FarcasterOnlyGuard = () => (
  <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
    <Snowfall />
    <ChristmasLights />
    <ChristmasDecorations />
    <div className="relative z-10 text-center px-6 max-w-md">
      <div className="christmas-card p-8 border-2 border-christmas-gold/30">
        <div className="text-6xl mb-6">🎄</div>
        <h1 className="font-display text-3xl font-bold text-christmas-gold mb-4">Naughty or Nice Wrapped</h1>
        <p className="text-christmas-snow/90 text-lg mb-2">This experience is exclusively available on Farcaster!</p>
        <p className="text-christmas-snow/60 text-sm mb-8">Open the Farcaster app to discover if you made Santa's nice list or naughty list this year. Your 2025 Farcaster journey awaits! ❄️</p>
        <Button onClick={() => window.open(FARCASTER_MINIAPP_URL, '_blank')} className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white px-8 py-4 rounded-full font-bold gap-2 text-lg shadow-lg shadow-purple-500/30 border-2 border-purple-400/30">
          <ExternalLink className="w-5 h-5" />
          Open in Farcaster
        </Button>
        <p className="text-christmas-snow/40 text-xs mt-6">Made with ❄️ by @uniquebeing404</p>
      </div>
    </div>
  </div>
);

const WrappedApp = () => {
  const { user, isSDKLoaded, isInMiniApp } = useFarcaster();
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingStats, setIsFetchingStats] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const { isMuted, toggleMute } = useChristmasMusic();
  const { toast } = useToast();

  // Energy quiz state
  const energyQuiz = useEnergyQuiz();
  const [energyQuizStarted, setEnergyQuizStarted] = useState(false);
  const [savedEnergyResult, setSavedEnergyResult] = useState<typeof energyQuiz.result>(null);

  const [stats, setStats] = useState<MonthlyStats>({
    fid: user?.fid || 12345,
    username: user?.username || 'uniquebeing404',
    pfp: user?.pfpUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=uniquebeing404',
    totalCasts: 0, replies: 0, likesReceived: 0, recastsReceived: 0,
    activeDays: 0, longestStreak: 0, mostActiveHour: 12,
    mostRepliedCast: null, peakMoment: null,
    lateNightPosts: 0, hasGapReturn: false, flavorTitles: [],
    month: 'December', year: 2025,
  });

  // Store saved judgment from API
  const [savedJudgment, setSavedJudgment] = useState<MonthlyJudgment | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.fid) {
        setStats(prev => ({ ...prev, totalCasts: 50 + Math.floor(Math.random() * 100), replies: 30 + Math.floor(Math.random() * 50), likesReceived: 200 + Math.floor(Math.random() * 300), recastsReceived: 50 + Math.floor(Math.random() * 100), activeDays: 15 + Math.floor(Math.random() * 15), longestStreak: 3 + Math.floor(Math.random() * 7) }));
        setIsFetchingStats(false);
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke('fetch-monthly-stats', { body: { fid: user.fid } });
        if (error) throw error;
        if (data?.stats) {
          setStats(prev => ({ 
            ...prev, 
            fid: user.fid, 
            username: user.username, 
            pfp: user.pfpUrl,
            totalCasts: data.stats.totalCasts || 0,
            replies: data.stats.replies || 0, 
            likesReceived: data.stats.likesReceived || 0, 
            recastsReceived: data.stats.recastsReceived || 0, 
            activeDays: data.stats.activeDays || 0, 
            longestStreak: data.stats.longestStreak || 0,
            mostActiveHour: data.stats.mostActiveHour || 12,
            mostRepliedCast: data.stats.mostRepliedCast,
            peakMoment: data.stats.peakMoment,
            lateNightPosts: data.stats.lateNightPosts || 0,
            hasGapReturn: data.stats.hasGapReturn || false,
            flavorTitles: data.stats.flavorTitles || [],
            month: data.stats.month || 'December',
            year: data.stats.year || 2025,
          }));
          
          if (data.stats.judgment) {
            setSavedJudgment(data.stats.judgment);
          }
          
          if (data.energy_result) {
            console.log('Found saved energy result:', data.energy_result);
            setSavedEnergyResult(data.energy_result);
          }
        }
      } catch {
        setStats(prev => ({ ...prev, fid: user.fid, username: user.username, pfp: user.pfpUrl, totalCasts: 75, replies: 40, likesReceived: 300, recastsReceived: 80, activeDays: 20, longestStreak: 5, month: 'December', year: 2025 }));
      } finally { setIsFetchingStats(false); }
    };
    if (isSDKLoaded) fetchStats();
  }, [user?.fid, isSDKLoaded]);

  const { slides, judgment } = useMonthlyWrappedData(stats, savedJudgment);
  
  // Slide structure:
  // 0: Welcome
  // 1 to slides.length: Stats slides
  // slides.length + 1: Judgment slide
  // slides.length + 2: Energy intro slide
  // slides.length + 3 to slides.length + 7: Quiz questions (5)
  // slides.length + 8: Energy reveal slide
  const judgmentSlideIndex = slides.length + 1;
  const energyIntroSlideIndex = slides.length + 2;
  const energyQuizStartIndex = slides.length + 3;
  const energyRevealSlideIndex = slides.length + 8;
  const totalSlides = slides.length + 9; // Welcome + stats + judgment + energy intro + 5 questions + reveal
  
  const isJudgmentSlide = currentSlide === judgmentSlideIndex;
  const isEnergyIntroSlide = currentSlide === energyIntroSlideIndex;
  const isEnergyQuizSlide = currentSlide >= energyQuizStartIndex && currentSlide < energyRevealSlideIndex;
  const isEnergyRevealSlide = currentSlide === energyRevealSlideIndex;
  const isLastSlide = currentSlide === totalSlides - 1;
  const isFirstSlide = currentSlide === 0;

  const handleNext = useCallback(() => { 
    if (currentSlide < totalSlides - 1) setCurrentSlide(prev => prev + 1); 
  }, [currentSlide, totalSlides]);
  
  const handlePrev = useCallback(() => { 
    if (currentSlide > 0) setCurrentSlide(prev => prev - 1); 
  }, [currentSlide]);

  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) return;
    
    // Don't allow tap navigation during quiz questions or on special slides
    if (isEnergyQuizSlide || isJudgmentSlide || isEnergyIntroSlide || isEnergyRevealSlide) return;
    
    const clientX = 'touches' in e ? e.changedTouches?.[0]?.clientX || 0 : (e as React.MouseEvent).clientX;
    const tapZone = clientX / window.innerWidth;
    if (tapZone < 0.4) { if (!isFirstSlide) handlePrev(); } else { if (!isLastSlide) handleNext(); }
  }, [handleNext, handlePrev, isLastSlide, isFirstSlide, isEnergyQuizSlide, isJudgmentSlide, isEnergyIntroSlide, isEnergyRevealSlide]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't allow keyboard nav during quiz
      if (isEnergyQuizSlide) return;
      
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') { 
        if (!isLastSlide && !isJudgmentSlide && !isEnergyIntroSlide && !isEnergyRevealSlide) handleNext(); 
      }
      else if (e.key === 'ArrowLeft') { 
        if (!isFirstSlide) handlePrev(); 
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, isLastSlide, isFirstSlide, isEnergyQuizSlide, isJudgmentSlide, isEnergyIntroSlide, isEnergyRevealSlide]);

  const [isGeneratingShare, setIsGeneratingShare] = useState(false);

  // Contract address on Base network
  const CONTRACT_ADDRESS = '0x301dA08F829F9da52eBe7fF1F6d1f0c3E2017d38';
  const MICRO_AMOUNT = '0x2540BE400'; // 0.00000001 ETH in hex (10000000000 wei)

  const sendMicroTransaction = async (): Promise<boolean> => {
    if (!isInMiniApp || !sdk?.wallet?.ethProvider) {
      console.log('Wallet not available, skipping transaction');
      return true;
    }

    try {
      toast({ title: "🎁 Supporting the app...", description: "Confirm the transaction" });
      
      const provider = sdk.wallet.ethProvider;
      const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[];
      if (!accounts || accounts.length === 0) {
        console.log('No accounts available');
        return true;
      }

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: accounts[0],
          to: CONTRACT_ADDRESS,
          value: MICRO_AMOUNT,
          chainId: '0x2105',
        }],
      });

      console.log('Transaction sent:', txHash);
      toast({ title: "✅ Thanks for supporting!", description: "Generating your card..." });
      return true;
    } catch (err) {
      console.log('Transaction skipped or failed:', err);
      return true;
    }
  };

  const handleShare = async () => {
    const shareText = `Here's my ${stats.month} Wrapped by @uniquebeing404 ✨\n\nI'm ${judgment.score}% ${judgment.isNice ? 'NICE' : 'NAUGHTY'} — ${judgment.badge}!\n\nCheck yours 👇`;
    
    setIsGeneratingShare(true);

    try {
      await sendMicroTransaction();
      toast({ title: "🎨 Generating your card...", description: "This takes a few seconds" });

      const cardElement = document.getElementById('judgment-card');
      if (!cardElement) throw new Error('Card element not found');

      const canvas = await html2canvas(cardElement, {
        backgroundColor: '#1a0505',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to create blob'));
        }, 'image/png', 0.95);
      });

      const filename = `share-cards/${stats.username}-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('share-images')
        .upload(filename, blob, { contentType: 'image/png', upsert: true });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: urlData } = supabase.storage.from('share-images').getPublicUrl(filename);
      const imageUrl = urlData.publicUrl;
      console.log('Share image captured and uploaded:', imageUrl);

      if (sdk?.actions?.composeCast) {
        try {
          const result = await sdk.actions.composeCast({ 
            text: shareText, 
            embeds: [imageUrl, 'https://farcaster.xyz/miniapps/m0Hnzx2HWtB5/naughty-or-nice-wrapped'] 
          });
          console.log('composeCast result:', result);
          toast({ title: "🎄 Shared!", description: "Your verdict has been posted" });
        } catch (castError) {
          console.error('composeCast error:', castError);
          await navigator.clipboard.writeText(`${shareText}\n\nMy Wrapped: ${imageUrl}\n\nGet yours: https://farcaster.xyz/miniapps/m0Hnzx2HWtB5/naughty-or-nice-wrapped`);
          toast({ title: "🎄 Copied!", description: "Paste to share" });
        }
      } else {
        await navigator.clipboard.writeText(`${shareText}\n\nMy Wrapped: ${imageUrl}\n\nGet yours: https://farcaster.xyz/miniapps/m0Hnzx2HWtB5/naughty-or-nice-wrapped`);
        toast({ title: "🎄 Copied!", description: "Paste to share" });
      }
    } catch (err) {
      console.error('Share error:', err);
      toast({ title: "Failed to generate", description: "Please try again", variant: "destructive" });
    } finally {
      setIsGeneratingShare(false);
    }
  };

  // Energy share handler
  const handleEnergyShare = async () => {
    const personality = savedEnergyResult || energyQuiz.result;
    if (!personality) return;
    
    const shareText = `🎅✨ Naughty-or-Nice-Wrapped by @uniquebeing404 read my energy! Apparently I'm ${personality.name} — ${personality.shareCaption}\n\nDiscover yours 👇`;
    
    setIsGeneratingShare(true);

    try {
      await sendMicroTransaction();
      toast({ title: "✨ Generating your energy card...", description: "This takes a few seconds" });

      const cardElement = document.getElementById('energy-card');
      if (!cardElement) throw new Error('Card element not found');

      const canvas = await html2canvas(cardElement, {
        backgroundColor: '#1a0505',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to create blob'));
        }, 'image/png', 0.95);
      });

      const filename = `energy-cards/${stats.username}-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('share-images')
        .upload(filename, blob, { contentType: 'image/png', upsert: true });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: urlData } = supabase.storage.from('share-images').getPublicUrl(filename);
      const imageUrl = urlData.publicUrl;
      console.log('Energy card captured and uploaded:', imageUrl);

      if (sdk?.actions?.composeCast) {
        try {
          const result = await sdk.actions.composeCast({ 
            text: shareText, 
            embeds: [imageUrl, 'https://farcaster.xyz/miniapps/m0Hnzx2HWtB5/naughty-or-nice-wrapped'] 
          });
          console.log('composeCast result:', result);
          toast({ title: "✨ Shared!", description: "Your energy has been posted" });
        } catch (castError) {
          console.error('composeCast error:', castError);
          await navigator.clipboard.writeText(`${shareText}\n\nMy Energy: ${imageUrl}\n\nGet yours: https://farcaster.xyz/miniapps/m0Hnzx2HWtB5/naughty-or-nice-wrapped`);
          toast({ title: "✨ Copied!", description: "Paste to share" });
        }
      } else {
        await navigator.clipboard.writeText(`${shareText}\n\nMy Energy: ${imageUrl}\n\nGet yours: https://farcaster.xyz/miniapps/m0Hnzx2HWtB5/naughty-or-nice-wrapped`);
        toast({ title: "✨ Copied!", description: "Paste to share" });
      }
    } catch (err) {
      console.error('Share error:', err);
      toast({ title: "Failed to generate", description: "Please try again", variant: "destructive" });
    } finally {
      setIsGeneratingShare(false);
    }
  };

  // Stat slide share handler - fun captions by @uniquebeing404
  const handleStatShare = async (slide: typeof slides[0]) => {
    const funCaptions: Record<string, string[]> = {
      'monthly-total-casts': [
        `${slide.value} casts this month. I said what I said 💅`,
        `Dropped ${slide.value} casts in December. No regrets 🎄`,
        `${slide.value} posts this month. The timeline needed me 🔥`,
      ],
      'monthly-replies': [
        `${slide.value} replies received. I'm the conversation now 💬`,
        `Got ${slide.value} people talking to me this month. Main character energy ✨`,
        `${slide.value} replies?! The fam showed up 🎅`,
      ],
      'monthly-likes': [
        `Collected ${slide.value} likes this December. Validated 💙`,
        `${slide.value} likes this month. Touch grass? Never heard of it 🎄`,
        `${slide.value} hearts collected. I'm basically loved 😌`,
      ],
      'monthly-recasts': [
        `${slide.value} recasts this month. My words traveled 🚀`,
        `People recast me ${slide.value} times. The influence is real 👀`,
        `${slide.value} recasts?! The gospel spreads 📢`,
      ],
      'monthly-active-days': [
        `Showed up ${slide.value} days this month. Consistency unlocked 🔓`,
        `${slide.value} active days. That's commitment fr 💪`,
        `${slide.value} days on the timeline. No breaks allowed 🎄`,
      ],
      'monthly-streak': [
        `${slide.value}-day posting streak. I'm locked in 🔥`,
        `Maintained a ${slide.value}-day streak. Built different 💪`,
        `${slide.value} consecutive days. Sleep is for the weak 😈`,
      ],
    };

    const captions = funCaptions[slide.id] || [`Check out my December Wrapped stats! 🎄`];
    const shareText = `${captions[Math.floor(Math.random() * captions.length)]}\n\nMy ${stats.month} Wrapped by @uniquebeing404 👇`;

    setIsGeneratingShare(true);

    try {
      // Wait for transaction to confirm before sharing
      const txSuccess = await sendMicroTransaction();
      if (!txSuccess) {
        toast({ title: "Transaction needed", description: "Please confirm to share" });
        setIsGeneratingShare(false);
        return;
      }
      
      toast({ title: "🎨 Generating your card...", description: "This takes a few seconds" });

      const cardElement = document.getElementById(`stat-card-${slide.id}`);
      if (!cardElement) throw new Error('Card element not found');

      const canvas = await html2canvas(cardElement, {
        backgroundColor: '#1a0505',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to create blob'));
        }, 'image/png', 0.95);
      });

      const filename = `stat-cards/${stats.username}-${slide.id}-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('share-images')
        .upload(filename, blob, { contentType: 'image/png', upsert: true });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: urlData } = supabase.storage.from('share-images').getPublicUrl(filename);
      const imageUrl = urlData.publicUrl;
      console.log('Stat card captured and uploaded:', imageUrl);

      if (sdk?.actions?.composeCast) {
        try {
          const result = await sdk.actions.composeCast({ 
            text: shareText, 
            embeds: [imageUrl, 'https://farcaster.xyz/miniapps/m0Hnzx2HWtB5/naughty-or-nice-wrapped'] 
          });
          console.log('composeCast result:', result);
          toast({ title: "🎄 Shared!", description: "Your stat has been posted" });
        } catch (castError) {
          console.error('composeCast error:', castError);
          await navigator.clipboard.writeText(`${shareText}\n\nMy Stat: ${imageUrl}\n\nGet yours: https://farcaster.xyz/miniapps/m0Hnzx2HWtB5/naughty-or-nice-wrapped`);
          toast({ title: "🎄 Copied!", description: "Paste to share" });
        }
      } else {
        await navigator.clipboard.writeText(`${shareText}\n\nMy Stat: ${imageUrl}\n\nGet yours: https://farcaster.xyz/miniapps/m0Hnzx2HWtB5/naughty-or-nice-wrapped`);
        toast({ title: "🎄 Copied!", description: "Paste to share" });
      }
    } catch (err) {
      console.error('Share error:', err);
      toast({ title: "Failed to generate", description: "Please try again", variant: "destructive" });
    } finally {
      setIsGeneratingShare(false);
    }
  };

  // Handle proceeding from judgment to energy quiz
  const handleProceedToEnergy = useCallback(() => {
    setCurrentSlide(energyIntroSlideIndex);
  }, [energyIntroSlideIndex]);

  // Handle starting energy quiz - skip if already have saved result
  const handleStartEnergyQuiz = useCallback(() => {
    if (savedEnergyResult) {
      // Skip directly to reveal if we have saved result
      setCurrentSlide(energyRevealSlideIndex);
    } else {
      setEnergyQuizStarted(true);
      setCurrentSlide(energyQuizStartIndex);
    }
  }, [energyQuizStartIndex, energyRevealSlideIndex, savedEnergyResult]);

  // Save energy result when quiz completes
  const saveEnergyResult = useCallback(async (result: typeof energyQuiz.result) => {
    if (!result || !user?.fid) return;
    
    try {
      const { error } = await supabase.functions.invoke('save-energy-result', { 
        body: { fid: user.fid, energy_result: result } 
      });
      if (error) console.error('Failed to save energy result:', error);
      else console.log('Energy result saved successfully');
    } catch (err) {
      console.error('Error saving energy result:', err);
    }
  }, [user?.fid]);

  // Handle quiz answer selection - auto advances through quiz
  const handleQuizAnswer = useCallback((optionLabel: string) => {
    energyQuiz.selectAnswer(optionLabel);
    
    // Auto-advance handled by hook, but we need to update slide
    setTimeout(() => {
      if (energyQuiz.currentQuestionIndex < energyQuiz.totalQuestions - 1) {
        setCurrentSlide(prev => prev + 1);
      } else {
        // Move to reveal slide and save result
        setCurrentSlide(energyRevealSlideIndex);
      }
    }, 400);
  }, [energyQuiz, energyRevealSlideIndex]);

  // Save result when quiz completes
  useEffect(() => {
    if (energyQuiz.isQuizComplete && energyQuiz.result && !savedEnergyResult) {
      saveEnergyResult(energyQuiz.result);
      setSavedEnergyResult(energyQuiz.result);
    }
  }, [energyQuiz.isQuizComplete, energyQuiz.result, savedEnergyResult, saveEnergyResult]);

  const handleLoadingComplete = useCallback(() => setIsLoading(false), []);

  if (isSDKLoaded && !isInMiniApp) return <FarcasterOnlyGuard />;

  if (!isSDKLoaded || isFetchingStats) {
    return (<div className="relative min-h-screen overflow-hidden"><Snowfall /><ChristmasLights /><ChristmasDecorations /><LoadingScreen onComplete={() => {}} username={stats.username} pfp={stats.pfp} /></div>);
  }

  const renderSlide = () => {
    // Welcome slide
    if (currentSlide === 0) {
      return <WelcomeSlide username={stats.username} pfp={stats.pfp} />;
    }
    
    // Stats slides
    if (currentSlide >= 1 && currentSlide <= slides.length) {
      return (
        <MonthlyStatSlide 
          key={slides[currentSlide - 1].id} 
          slide={slides[currentSlide - 1]} 
          stats={stats}
          onShare={() => handleStatShare(slides[currentSlide - 1])}
          isGeneratingShare={isGeneratingShare}
        />
      );
    }
    
    // Judgment slide
    if (currentSlide === judgmentSlideIndex) {
      return (
        <MonthlyJudgmentSlide 
          stats={stats} 
          judgment={judgment} 
          onShare={handleShare} 
          isGeneratingShare={isGeneratingShare}
          onProceedToEnergy={handleProceedToEnergy}
        />
      );
    }
    
    // Energy intro slide
    if (currentSlide === energyIntroSlideIndex) {
      return <EnergyIntroSlide onStart={handleStartEnergyQuiz} />;
    }
    
    // Energy quiz slides
    if (currentSlide >= energyQuizStartIndex && currentSlide < energyRevealSlideIndex) {
      const questionIndex = currentSlide - energyQuizStartIndex;
      const question = energyQuiz.currentQuestion;
      
      // Make sure we show the correct question based on slide
      if (question && questionIndex === energyQuiz.currentQuestionIndex) {
        return (
          <EnergyQuizSlide
            question={question}
            questionIndex={questionIndex}
            totalQuestions={energyQuiz.totalQuestions}
            selectedAnswer={energyQuiz.getSelectedAnswer(question.id)}
            onSelectAnswer={handleQuizAnswer}
          />
        );
      }
      
      // Fallback for viewing previous questions
      const questions = [1, 2, 3, 4, 5];
      const qId = questions[questionIndex];
      const q = { id: qId, question: '', options: [] };
      return (
        <EnergyQuizSlide
          question={energyQuiz.currentQuestion || q as any}
          questionIndex={questionIndex}
          totalQuestions={5}
          selectedAnswer={null}
          onSelectAnswer={() => {}}
        />
      );
    }
    
    // Energy reveal slide - use saved result or quiz result
    const energyResultToShow = savedEnergyResult || energyQuiz.result;
    if (currentSlide === energyRevealSlideIndex && energyResultToShow) {
      return (
        <EnergyRevealSlide
          personality={energyResultToShow}
          stats={stats}
          onShare={handleEnergyShare}
          isGeneratingShare={isGeneratingShare}
        />
      );
    }

    return <WelcomeSlide username={stats.username} pfp={stats.pfp} />;
  };

  // Calculate progress - don't count quiz internals in main progress
  const getProgressSlide = () => {
    if (currentSlide <= judgmentSlideIndex) {
      return currentSlide;
    }
    if (currentSlide === energyIntroSlideIndex) {
      return judgmentSlideIndex + 1;
    }
    if (isEnergyQuizSlide) {
      return judgmentSlideIndex + 2;
    }
    if (currentSlide === energyRevealSlideIndex) {
      return judgmentSlideIndex + 3;
    }
    return currentSlide;
  };

  const progressTotalSlides = judgmentSlideIndex + 4; // Welcome + stats + judgment + energy intro + quiz + reveal

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Snowfall /><ChristmasLights /><ChristmasDecorations /><MusicControl isMuted={isMuted} onToggle={toggleMute} />
      {isLoading ? <LoadingScreen onComplete={handleLoadingComplete} username={stats.username} pfp={stats.pfp} /> : (
        <>
          {!isLastSlide && !isJudgmentSlide && !isEnergyIntroSlide && !isEnergyQuizSlide && !isEnergyRevealSlide && (
            <div className="fixed inset-0 z-20" onClick={handleTap} />
          )}
          <div className="relative z-10 pb-24 pt-12 min-h-screen">{renderSlide()}</div>
          <SlideProgress currentSlide={getProgressSlide()} totalSlides={progressTotalSlides} />
        </>
      )}
    </div>
  );
};

export default WrappedApp;
