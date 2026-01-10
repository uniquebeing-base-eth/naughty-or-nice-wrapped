import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFarcaster } from '@/contexts/FarcasterContext';
import { useEnergyQuiz } from '@/hooks/useEnergyQuiz';
import { Button } from '@/components/ui/button';
import { Share2, ArrowLeft, ExternalLink, RefreshCw, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sdk } from '@farcaster/miniapp-sdk';
import html2canvas from 'html2canvas';
import { EnergyPersonality, ENERGY_PERSONALITIES } from '@/types/energy';
import EnergyQuizSlide from '@/components/slides/EnergyQuizSlide';

const FARCASTER_MINIAPP_URL = 'https://farcaster.xyz/miniapps/m0Hnzx2HWtB5/naughty-or-nice-wrapped';

// Contract address for gasless transaction
const CONTRACT_ADDRESS = '0x301dA08F829F9da52eBe7fF1F6d1f0c3E2017d38';
const MICRO_AMOUNT = '0x2540BE400'; // 0.00000001 ETH

// Daily affirmations pool - different ones for each user/day combo
const DAILY_AFFIRMATIONS = [
  { text: "Today, I choose to see the magic in ordinary moments.", emoji: "✨" },
  { text: "My energy attracts exactly what I need.", emoji: "🧲" },
  { text: "I am aligned with my highest purpose.", emoji: "🎯" },
  { text: "Abundance flows to me effortlessly.", emoji: "🌊" },
  { text: "I trust the timing of my life.", emoji: "⏳" },
  { text: "My presence creates positive ripples.", emoji: "🌟" },
  { text: "I am becoming who I was meant to be.", emoji: "🦋" },
  { text: "The universe is conspiring in my favor.", emoji: "🌌" },
  { text: "I release what no longer serves me.", emoji: "🍃" },
  { text: "My potential is limitless.", emoji: "♾️" },
  { text: "I am worthy of all the good coming my way.", emoji: "💫" },
  { text: "Today, I lead with authenticity.", emoji: "💎" },
  { text: "My energy is magnetic and powerful.", emoji: "⚡" },
  { text: "I welcome new opportunities with open arms.", emoji: "🤗" },
  { text: "I am exactly where I need to be.", emoji: "📍" },
  { text: "My journey is unfolding perfectly.", emoji: "🗺️" },
  { text: "I radiate confidence and calm.", emoji: "☀️" },
  { text: "Today, I choose growth over comfort.", emoji: "🌱" },
  { text: "I am the author of my story.", emoji: "📖" },
  { text: "My vibe attracts my tribe.", emoji: "🤝" },
  { text: "I am resilient, strong, and capable.", emoji: "💪" },
  { text: "Peace flows through me.", emoji: "🕊️" },
  { text: "I embrace change as an opportunity.", emoji: "🔄" },
  { text: "My intuition guides me wisely.", emoji: "🔮" },
  { text: "I am enough, exactly as I am.", emoji: "💝" },
  { text: "Today, I choose joy.", emoji: "🎉" },
  { text: "I create my own luck.", emoji: "🍀" },
  { text: "My dreams are valid and achievable.", emoji: "🌈" },
  { text: "I am grateful for this moment.", emoji: "🙏" },
  { text: "I shine brightest when I'm authentic.", emoji: "💡" },
];

// Get a deterministic daily affirmation based on user FID and date
const getDailyAffirmation = (fid: number) => {
  const today = new Date();
  const dateString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  // Create a simple hash from FID + date
  const hash = (fid + dateString.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % DAILY_AFFIRMATIONS.length;
  return DAILY_AFFIRMATIONS[hash];
};

const Energy = () => {
  const { user, isSDKLoaded, isInMiniApp } = useFarcaster();
  const { toast } = useToast();
  const energyQuiz = useEnergyQuiz();
  
  const [savedEnergy, setSavedEnergy] = useState<EnergyPersonality | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [quizSlide, setQuizSlide] = useState(0);
  const [isAffirmationSharing, setIsAffirmationSharing] = useState(false);
  const [topEngagedUsers, setTopEngagedUsers] = useState<{ username: string }[]>([]);

  const dailyAffirmation = useMemo(() => {
    if (!user?.fid) return DAILY_AFFIRMATIONS[0];
    return getDailyAffirmation(user.fid);
  }, [user?.fid]);

  useEffect(() => {
    const fetchEnergy = async () => {
      if (!user?.fid) {
        setIsLoading(false);
        return;
      }

      try {
        // Check monthly stats for energy result
        const { data: monthlyData } = await supabase
          .from('monthly_wrapped_stats')
          .select('energy_result')
          .eq('fid', user.fid)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (monthlyData?.energy_result) {
          const energyResult = monthlyData.energy_result as unknown as EnergyPersonality;
          // Get the full personality data from the ID
          if (energyResult.id && ENERGY_PERSONALITIES[energyResult.id]) {
            setSavedEnergy(ENERGY_PERSONALITIES[energyResult.id]);
          } else {
            setSavedEnergy(energyResult);
          }
        } else {
          // Check wrapped_stats as fallback
          const { data: wrappedData } = await supabase
            .from('wrapped_stats')
            .select('energy_result')
            .eq('fid', user.fid)
            .maybeSingle();

          if (wrappedData?.energy_result) {
            const energyResult = wrappedData.energy_result as unknown as EnergyPersonality;
            if (energyResult.id && ENERGY_PERSONALITIES[energyResult.id]) {
              setSavedEnergy(ENERGY_PERSONALITIES[energyResult.id]);
            } else {
              setSavedEnergy(energyResult);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching energy:', err);
      } finally {
        setIsLoading(false);
        setTimeout(() => setAnimate(true), 100);
      }
    };

    if (isSDKLoaded) fetchEnergy();
  }, [user?.fid, isSDKLoaded]);

  // Fetch top engaged users for tagging
  useEffect(() => {
    const fetchTopUsers = async () => {
      if (!user?.fid) return;
      try {
        const { data } = await supabase
          .from('wrapped_stats')
          .select('stats')
          .eq('fid', user.fid)
          .maybeSingle();
        
        if (data?.stats) {
          const stats = data.stats as { topEngagedUsers?: { username: string }[] };
          if (stats.topEngagedUsers) {
            setTopEngagedUsers(stats.topEngagedUsers);
          }
        }
      } catch (err) {
        console.error('Error fetching top users:', err);
      }
    };
    fetchTopUsers();
  }, [user?.fid]);

  // Get top user tags for sharing
  const getTopUserTags = () => {
    if (!topEngagedUsers || topEngagedUsers.length === 0) return '';
    const tags = topEngagedUsers.slice(0, 4).map(u => `@${u.username}`).join(' ');
    return `\n\n${tags}`;
  };

  // Gasless transaction before sharing
  const sendMicroTransaction = async (): Promise<boolean> => {
    if (!sdk?.wallet?.ethProvider) {
      console.log('Wallet not available, skipping transaction');
      return true;
    }

    try {
      toast({ title: "🎁 Supporting the app...", description: "Confirm the micro transaction" });
      
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

  // Handle quiz answer
  const handleQuizAnswer = useCallback((optionLabel: string) => {
    energyQuiz.selectAnswer(optionLabel);
    
    setTimeout(() => {
      if (energyQuiz.currentQuestionIndex < energyQuiz.totalQuestions - 1) {
        setQuizSlide(prev => prev + 1);
      } else {
        // Quiz complete - save result
        setShowQuiz(false);
        if (energyQuiz.result) {
          setSavedEnergy(energyQuiz.result);
          // Save to database
          saveEnergyResult(energyQuiz.result);
        }
      }
    }, 400);
  }, [energyQuiz]);

  const saveEnergyResult = async (result: EnergyPersonality) => {
    if (!user?.fid) return;
    try {
      await supabase.functions.invoke('save-energy-result', { 
        body: { fid: user.fid, energy_result: result } 
      });
    } catch (err) {
      console.error('Error saving energy result:', err);
    }
  };

  const handleShareEnergy = async () => {
    if (!savedEnergy) return;
    
    setIsSharing(true);
    const topTags = getTopUserTags();
    const shareText = `✨ Reveal Energy by @uniquebeing404\n\nMy vibe? ${savedEnergy.name} ${savedEnergy.emoji}\n\n"${savedEnergy.shareCaption}"${topTags}`;

    try {
      await sendMicroTransaction();
      toast({ title: "🎨 Generating your card...", description: "This takes a few seconds" });

      const cardElement = document.getElementById('energy-card');
      if (!cardElement) throw new Error('Card element not found');

      const canvas = await html2canvas(cardElement, {
        backgroundColor: '#1a0a15',
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

      const filename = `energy-cards/${user?.username}-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('share-images')
        .upload(filename, blob, { contentType: 'image/png', upsert: true });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: urlData } = supabase.storage.from('share-images').getPublicUrl(filename);
      const imageUrl = urlData.publicUrl;

      if (sdk?.actions?.composeCast) {
        await sdk.actions.composeCast({ 
          text: shareText, 
          embeds: [imageUrl, FARCASTER_MINIAPP_URL] 
        });
        toast({ title: "✨ Shared!", description: "Your energy has been posted" });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n\nGet yours: ${FARCASTER_MINIAPP_URL}`);
        toast({ title: "📋 Copied!", description: "Paste to share" });
      }
    } catch (err) {
      console.error('Share error:', err);
      toast({ title: "Failed to generate", description: "Please try again", variant: "destructive" });
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareAffirmation = async () => {
    setIsAffirmationSharing(true);
    const topTags = getTopUserTags();
    const shareText = `${dailyAffirmation.emoji} "${dailyAffirmation.text}"\n\nDaily Affirmation from Reveal Energy ✨\nWhat's your vibe today?${topTags}`;

    try {
      await sendMicroTransaction();
      toast({ title: "🎨 Generating affirmation card...", description: "This takes a few seconds" });

      const cardElement = document.getElementById('affirmation-card');
      if (!cardElement) throw new Error('Card element not found');

      const canvas = await html2canvas(cardElement, {
        backgroundColor: '#1a0a15',
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

      const filename = `affirmation-cards/${user?.username}-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('share-images')
        .upload(filename, blob, { contentType: 'image/png', upsert: true });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: urlData } = supabase.storage.from('share-images').getPublicUrl(filename);
      const imageUrl = urlData.publicUrl;

      if (sdk?.actions?.composeCast) {
        await sdk.actions.composeCast({ 
          text: shareText, 
          embeds: [imageUrl, FARCASTER_MINIAPP_URL] 
        });
        toast({ title: "✨ Shared!", description: "Your affirmation has been posted" });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n\nGet yours: ${FARCASTER_MINIAPP_URL}`);
        toast({ title: "📋 Copied!", description: "Paste to share" });
      }
    } catch (err) {
      console.error('Share error:', err);
      toast({ title: "Failed to share", description: "Please try again", variant: "destructive" });
    } finally {
      setIsAffirmationSharing(false);
    }
  };

  if (isSDKLoaded && !isInMiniApp) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1a0a15] via-[#0f0a15] to-[#0a0510]">
        <div className="text-center px-6 max-w-md">
          <div className="p-8 rounded-3xl bg-gradient-to-b from-white/5 to-white/[0.02] border border-white/10">
            <div className="text-6xl mb-6">✨</div>
            <h1 className="font-display text-3xl font-bold text-white mb-4">Reveal Energy</h1>
            <p className="text-white/60 mb-8">Open in Farcaster to discover your energy</p>
            <Button onClick={() => window.open(FARCASTER_MINIAPP_URL, '_blank')} className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-full font-bold gap-2">
              <ExternalLink className="w-5 h-5" />
              Open in Farcaster
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1a0a15] via-[#0f0a15] to-[#0a0510]">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">✨</div>
          <p className="text-white/60">Loading your energy...</p>
        </div>
      </div>
    );
  }

  // Show quiz if user clicked reveal and hasn't saved energy
  if (showQuiz) {
    const question = energyQuiz.currentQuestion;
    if (!question) return null;

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a0a15] via-[#0f0a15] to-[#0a0510] px-4 py-8">
        <button 
          onClick={() => setShowQuiz(false)}
          className="fixed top-4 left-4 z-50 flex items-center gap-2 text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>

        <div className="pt-12">
          <EnergyQuizSlide
            question={question}
            questionIndex={quizSlide}
            totalQuestions={energyQuiz.totalQuestions}
            selectedAnswer={energyQuiz.getSelectedAnswer(question.id)}
            onSelectAnswer={handleQuizAnswer}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0a15] via-[#0f0a15] to-[#0a0510] px-4 py-8">
      {/* Back button */}
      <Link 
        to="/" 
        className="fixed top-4 left-4 z-50 flex items-center gap-2 text-white/60 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Back</span>
      </Link>

      <div className="flex flex-col items-center justify-start min-h-screen pt-16 pb-8 space-y-6">
        {/* Daily Affirmation Card - Shareable */}
        <div 
          id="affirmation-card"
          className={`w-full max-w-sm transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="p-6 rounded-3xl bg-gradient-to-b from-[#2d1f1f] to-[#1a1212] border border-amber-600/30 relative overflow-hidden">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span className="text-xs uppercase tracking-widest text-amber-500 font-bold">Daily Affirmation</span>
              </div>
              
              <p className="text-white text-xl font-semibold mb-3 leading-relaxed">
                "{dailyAffirmation.text}"
              </p>
              
              <div className="text-4xl mb-4">{dailyAffirmation.emoji}</div>
              
              <div className="pt-3 border-t border-amber-800/30">
                <p className="text-amber-600/80 text-xs font-medium">Reveal Energy by @uniquebeing404</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Share Affirmation Button */}
        <Button 
          onClick={handleShareAffirmation}
          disabled={isAffirmationSharing}
          className={`w-full max-w-sm bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 text-white px-8 py-3 rounded-full font-bold gap-2 shadow-lg transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          {isAffirmationSharing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              Share Today's Affirmation
            </>
          )}
        </Button>

        <div className="w-full max-w-sm h-px bg-white/10 my-2" />

        {/* Energy Card or Reveal Button */}
        {savedEnergy ? (
          <>
            <div 
              id="energy-card"
              className={`relative p-6 rounded-3xl bg-gradient-to-b from-white/10 to-white/[0.02] border border-white/10 w-full max-w-sm transition-all duration-700 delay-100 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            >
              {/* Background glow */}
              <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${savedEnergy.gradient} opacity-10 blur-xl`} />
              
              <div className="relative z-10 text-center">
                <div className="text-xs uppercase tracking-widest text-purple-300 mb-4">
                  ✨ Your Energy ✨
                </div>

                {user?.pfpUrl && (
                  <div className="relative inline-block mb-4">
                    <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${savedEnergy.gradient} blur-lg opacity-60 scale-125`} />
                    <img src={user.pfpUrl} alt={user.username} className="w-16 h-16 rounded-full border-2 border-white/30 shadow-xl relative z-10" />
                    <div className="absolute -bottom-1 -right-1 text-xl z-20">{savedEnergy.emoji}</div>
                  </div>
                )}
                <p className="text-white font-bold text-sm mb-4">@{user?.username}</p>

                <div className="text-5xl mb-3">{savedEnergy.emoji}</div>
                <h2 className={`font-display text-2xl font-bold bg-gradient-to-r ${savedEnergy.gradient} bg-clip-text text-transparent mb-4`}>
                  {savedEnergy.name}
                </h2>

                <div className="space-y-2 text-left mb-4">
                  {savedEnergy.reveal.map((point, index) => (
                    <p key={index} className="text-sm text-white/80 flex items-start gap-2">
                      <span className="text-purple-400">•</span>
                      {point}
                    </p>
                  ))}
                </div>

                <div className={`py-2 px-4 rounded-xl bg-gradient-to-r ${savedEnergy.gradient}`}>
                  <p className="text-xs font-bold text-white italic">"{savedEnergy.affirmation}"</p>
                </div>

                <p className="text-white/30 text-xs mt-4">Made with ✨ by @uniquebeing404</p>
              </div>
            </div>

            {/* Share and Retake buttons */}
            <div className={`flex flex-col gap-3 w-full max-w-sm transition-all duration-700 delay-200 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <Button 
                onClick={handleShareEnergy}
                disabled={isSharing}
                className={`bg-gradient-to-r ${savedEnergy.gradient} hover:brightness-110 text-white px-8 py-3 rounded-full font-bold gap-2 shadow-lg`}
              >
                {isSharing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    Share My Energy
                  </>
                )}
              </Button>
              <Button 
                onClick={() => {
                  energyQuiz.resetQuiz();
                  setQuizSlide(0);
                  setShowQuiz(true);
                }}
                variant="outline"
                className="bg-white/5 border-white/20 text-white hover:bg-white/10 rounded-full gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retake Quiz
              </Button>
            </div>
          </>
        ) : (
          <div className={`text-center transition-all duration-700 delay-100 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-6xl mb-4">🔮</div>
            <h2 className="font-display text-2xl font-bold text-white mb-2">Discover Your Energy</h2>
            <p className="text-white/60 mb-6 max-w-xs mx-auto">Answer 5 quick questions to reveal your unique energy type</p>
            <Button 
              onClick={() => {
                energyQuiz.resetQuiz();
                setQuizSlide(0);
                setShowQuiz(true);
              }}
              className="bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 hover:brightness-110 text-white px-8 py-3 rounded-full font-bold gap-2 shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
              Reveal My Energy
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Energy;
