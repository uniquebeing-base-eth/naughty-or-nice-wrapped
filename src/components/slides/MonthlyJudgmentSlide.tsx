
import { useEffect, useState } from 'react';
import { MonthlyJudgment, MonthlyStats } from '@/types/monthly';
import { Button } from '@/components/ui/button';
import { Share2, Sparkles } from 'lucide-react';

interface MonthlyJudgmentSlideProps {
  stats: MonthlyStats;
  judgment: MonthlyJudgment;
  onShare: () => void;
  isGeneratingShare?: boolean;
  onProceedToEnergy?: () => void;
}

const MonthlyJudgmentSlide = ({ stats, judgment, onShare, isGeneratingShare = false, onProceedToEnergy }: MonthlyJudgmentSlideProps) => {
  const [animate, setAnimate] = useState(false);
  const [scoreValue, setScoreValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!animate) return;
    const duration = 2000;
    const steps = 60;
    const increment = judgment.score / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= judgment.score) {
        setScoreValue(judgment.score);
        clearInterval(timer);
      } else {
        setScoreValue(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [animate, judgment.score]);

  const verdictGlow = judgment.isNice
    ? 'shadow-[0_0_120px_hsl(var(--christmas-green)/0.7)]'
    : 'shadow-[0_0_120px_hsl(var(--christmas-red)/0.7)]';

  // One-liner verdict descriptions
  const niceDescriptions = [
    "You showed up.\nYou engaged.\nGood internet behavior confirmed.",
    "Not perfect.\nBut consistent.\nWe respect the effort.",
    "Talked less.\nImpacted more.",
    "Community energy.\nGood vibes.\nThe timeline thanks you.",
  ];

  const naughtyDescriptions = [
    "You caused a little chaos.\nOn purpose.\nWe noticed 😈",
    "Dangerous takes.\nZero remorse.\nNaughty behavior confirmed.",
    "Chaos creator.\nImpact maker.\nWe'll allow it.",
    "You chose violence.\nSometimes.\nThe timeline felt it.",
  ];

  const description = judgment.isNice 
    ? niceDescriptions[Math.floor(Math.random() * niceDescriptions.length)]
    : naughtyDescriptions[Math.floor(Math.random() * naughtyDescriptions.length)];

  return (
    <div className="flex flex-col items-center justify-start text-center px-4 py-2 h-[calc(100vh-100px)] overflow-y-auto">
      <div 
        id="judgment-card"
        className={`relative christmas-card ${verdictGlow} border-2 border-christmas-gold/30 w-full max-w-[340px] transition-all duration-1000 p-4 ${animate ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-christmas-gold/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-christmas-red/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[80px] opacity-10">
            {judgment.isNice ? '💙' : '😈'}
          </div>
        </div>
        <div className="absolute top-2 left-2 text-sm">⭐</div>
        <div className="absolute top-2 right-2 text-sm">⭐</div>
        <div className="absolute bottom-2 left-2 text-sm">✨</div>
        <div className="absolute bottom-2 right-2 text-sm">✨</div>

        <div className="relative z-10">
          <div className={`text-[9px] uppercase tracking-[0.12em] text-christmas-gold font-bold mb-2 transition-all duration-700 delay-200 ${animate ? 'opacity-100' : 'opacity-0'}`}>
            ✨ {stats.month} Wrapped — {stats.year} ✨
          </div>

          <div className={`flex flex-col items-center mb-2 transition-all duration-700 delay-300 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="relative mb-1">
              <div className="absolute inset-0 rounded-full bg-christmas-gold blur-lg opacity-50 scale-125" />
              <img src={stats.pfp} alt={stats.username} className="w-16 h-16 rounded-full border-2 border-christmas-gold shadow-xl relative z-10" />
              <div className="absolute -bottom-1 -right-1 text-xl z-20">{judgment.isNice ? '😇' : '😈'}</div>
            </div>
            <span className="font-bold text-christmas-snow text-sm">@{stats.username}</span>
          </div>

          <div className={`relative w-28 h-28 mx-auto mb-3 transition-all duration-1000 delay-500 ${animate ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                border: `6px solid ${judgment.isNice ? '#22c55e' : '#ef4444'}`,
                boxShadow: judgment.isNice 
                  ? '0 0 15px #22c55e, inset 0 0 15px rgba(34, 197, 94, 0.3)' 
                  : '0 0 15px #ef4444, inset 0 0 15px rgba(239, 68, 68, 0.3)',
              }}
            />
            <div 
              className="absolute rounded-full"
              style={{ top: '6px', left: '6px', right: '6px', bottom: '6px', backgroundColor: '#2a1010' }}
            />
            <div 
              className="absolute flex flex-col items-center justify-center"
              style={{ top: '6px', left: '6px', right: '6px', bottom: '6px' }}
            >
              <span 
                className="font-display text-3xl font-bold leading-none"
                style={{ color: judgment.isNice ? '#22c55e' : '#ef4444' }}
              >
                {scoreValue}%
              </span>
              <span 
                className="text-[10px] font-bold uppercase tracking-wider mt-0.5"
                style={{ color: '#fbbf24' }}
              >
                {judgment.isNice ? 'NICE' : 'NAUGHTY'}
              </span>
            </div>
          </div>

          <div 
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white font-bold text-xs mb-2 transition-all duration-700 delay-700 shadow-lg ${animate ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
            style={{
              background: judgment.isNice 
                ? 'linear-gradient(to right, #22c55e, #16a34a)' 
                : 'linear-gradient(to right, #ef4444, #dc2626)',
            }}
          >
            <Sparkles className="w-3 h-3" />
            {judgment.badge}
          </div>

          {/* One-liner description */}
          <p className={`text-xs text-christmas-snow/90 whitespace-pre-line leading-relaxed mb-2 transition-all duration-700 delay-800 ${animate ? 'opacity-100' : 'opacity-0'}`}>
            {description}
          </p>

          <div className={`flex justify-center gap-6 text-[10px] transition-all duration-700 delay-900 ${animate ? 'opacity-100' : 'opacity-0'}`}>
            <div>
              <span className="text-christmas-green font-bold text-sm">{judgment.nicePoints.toLocaleString()}</span>
              <br />
              <span className="text-christmas-snow/70">nice</span>
            </div>
            <div>
              <span className="text-christmas-red font-bold text-sm">{judgment.naughtyPoints}</span>
              <br />
              <span className="text-christmas-snow/70">naughty</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`mt-3 flex flex-col gap-2 transition-all duration-700 delay-1000 relative z-30 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <Button 
          onClick={(e) => { e.stopPropagation(); onShare(); }} 
          disabled={isGeneratingShare}
          className="bg-gradient-to-r from-christmas-green to-christmas-green-dark hover:from-christmas-green-light hover:to-christmas-green text-white px-5 py-2.5 rounded-full font-bold gap-2 text-sm shadow-lg shadow-christmas-green/30 border-2 border-christmas-gold/30 pointer-events-auto disabled:opacity-70"
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
        
        {onProceedToEnergy && (
          <Button 
            onClick={(e) => { e.stopPropagation(); onProceedToEnergy(); }} 
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-5 py-2.5 rounded-full font-bold gap-2 text-sm shadow-lg shadow-purple-500/30 border-2 border-purple-400/30 pointer-events-auto"
          >
            <Sparkles className="w-4 h-4" />
            Reveal My Energy ✨
          </Button>
        )}
      </div>

      <p className={`mt-2 text-[10px] text-christmas-gold/80 font-medium transition-all duration-700 delay-1100 ${animate ? 'opacity-100' : 'opacity-0'}`}>
        Made with ✨ by @uniquebeing404
      </p>
    </div>
  );
};

export default MonthlyJudgmentSlide;
