
import { useEffect, useState } from 'react';
import { JudgmentResult, UserStats } from '@/types/wrapped';
import { Button } from '@/components/ui/button';
import { Share2, Sparkles } from 'lucide-react';

interface JudgmentSlideProps {
  stats: UserStats;
  judgment: JudgmentResult;
  onShare: () => void;
  isGeneratingShare?: boolean;
  onProceedToEnergy?: () => void;
}

const JudgmentSlide = ({ stats, judgment, onShare, isGeneratingShare = false, onProceedToEnergy }: JudgmentSlideProps) => {
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

  const verdictGradient = judgment.isNice 
    ? 'from-christmas-green via-christmas-green-light to-christmas-green' 
    : 'from-christmas-red via-christmas-red-light to-christmas-red';

  const verdictGlow = judgment.isNice
    ? 'shadow-[0_0_120px_hsl(var(--christmas-green)/0.7)]'
    : 'shadow-[0_0_120px_hsl(var(--christmas-red)/0.7)]';

  return (
    <div className="flex flex-col items-center justify-start text-center px-4 py-4 h-[calc(100vh-120px)] overflow-hidden">
      <div 
        id="judgment-card"
        className={`relative christmas-card ${verdictGlow} border-2 border-christmas-gold/30 w-full max-w-[340px] overflow-hidden transition-all duration-1000 p-4 ${animate ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-christmas-gold/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-christmas-red/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[120px] opacity-10">
            {judgment.isNice ? '🎁' : '😈'}
          </div>
        </div>
        <div className="absolute top-2 left-2 text-lg">⭐</div>
        <div className="absolute top-2 right-2 text-lg">⭐</div>
        <div className="absolute bottom-2 left-2 text-lg">🎄</div>
        <div className="absolute bottom-2 right-2 text-lg">🎄</div>

        <div className="relative z-10">
          <div className={`text-[10px] uppercase tracking-[0.15em] text-christmas-gold font-bold mb-3 transition-all duration-700 delay-200 ${animate ? 'opacity-100' : 'opacity-0'}`}>
            ❄️ Naughty or Nice Wrapped — 2025 ❄️
          </div>

          <div className={`flex flex-col items-center mb-3 transition-all duration-700 delay-300 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="relative mb-2">
              <div className="absolute inset-0 rounded-full bg-christmas-gold blur-lg opacity-50 scale-125" />
              <img src={stats.pfp} alt={stats.username} className="w-20 h-20 rounded-full border-3 border-christmas-gold shadow-xl relative z-10" />
              <div className="absolute -bottom-1 -right-1 text-2xl z-20">{judgment.isNice ? '😇' : '😈'}</div>
            </div>
            <span className="font-bold text-christmas-snow text-base">@{stats.username}</span>
          </div>

          <div className={`relative w-36 h-36 mx-auto mb-4 transition-all duration-1000 delay-500 ${animate ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
            {/* Simple border-based ring that html2canvas can capture */}
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                border: `8px solid ${judgment.isNice ? '#22c55e' : '#ef4444'}`,
                boxShadow: judgment.isNice 
                  ? '0 0 20px #22c55e, inset 0 0 20px rgba(34, 197, 94, 0.3)' 
                  : '0 0 20px #ef4444, inset 0 0 20px rgba(239, 68, 68, 0.3)',
              }}
            />
            {/* Inner dark circle */}
            <div 
              className="absolute rounded-full"
              style={{
                top: '8px',
                left: '8px',
                right: '8px',
                bottom: '8px',
                backgroundColor: '#2a1010',
              }}
            />
            {/* Text content - properly centered */}
            <div 
              className="absolute flex flex-col items-center justify-center"
              style={{
                top: '8px',
                left: '8px',
                right: '8px',
                bottom: '8px',
              }}
            >
              <span 
                className="font-display text-4xl font-bold leading-none"
                style={{ color: judgment.isNice ? '#22c55e' : '#ef4444' }}
              >
                {scoreValue}%
              </span>
              <span 
                className="text-xs font-bold uppercase tracking-wider mt-1"
                style={{ color: '#fbbf24' }}
              >
                {judgment.isNice ? 'NICE' : 'NAUGHTY'}
              </span>
            </div>
          </div>

          <div 
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-white font-bold text-sm mb-4 transition-all duration-700 delay-700 shadow-lg ${animate ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
            style={{
              background: judgment.isNice 
                ? 'linear-gradient(to right, #22c55e, #16a34a)' 
                : 'linear-gradient(to right, #ef4444, #dc2626)',
            }}
          >
            <Sparkles className="w-4 h-4" />
            {judgment.badge}
          </div>

          <div className={`flex justify-center gap-8 text-xs mb-2 transition-all duration-700 delay-800 ${animate ? 'opacity-100' : 'opacity-0'}`}>
            <div>
              <span className="text-christmas-green font-bold text-lg">{judgment.nicePoints.toLocaleString()}</span>
              <br />
              <span className="text-christmas-snow/70">nice moments</span>
            </div>
            <div>
              <span className="text-christmas-red font-bold text-lg">{judgment.naughtyPoints}</span>
              <br />
              <span className="text-christmas-snow/70">naughty moments</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`mt-4 flex flex-col gap-3 transition-all duration-700 delay-1000 relative z-30 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <Button 
          onClick={(e) => { e.stopPropagation(); onShare(); }} 
          disabled={isGeneratingShare}
          className="bg-gradient-to-r from-christmas-green to-christmas-green-dark hover:from-christmas-green-light hover:to-christmas-green text-white px-6 py-3 rounded-full font-bold gap-2 text-base shadow-lg shadow-christmas-green/30 border-2 border-christmas-gold/30 pointer-events-auto disabled:opacity-70"
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
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-6 py-3 rounded-full font-bold gap-2 text-base shadow-lg shadow-purple-500/30 border-2 border-purple-400/30 pointer-events-auto"
          >
            <Sparkles className="w-4 h-4" />
            Reveal My Energy ✨
          </Button>
        )}
      </div>

      <p className={`mt-3 text-xs text-christmas-gold/80 font-medium transition-all duration-700 delay-1100 ${animate ? 'opacity-100' : 'opacity-0'}`}>
        Made with ❄️ by @uniquebeing404
      </p>
    </div>
  );
};

export default JudgmentSlide;
