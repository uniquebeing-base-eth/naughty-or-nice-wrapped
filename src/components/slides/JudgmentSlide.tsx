import { useEffect, useState } from 'react';
import { JudgmentResult, UserStats } from '@/types/wrapped';
import { Button } from '@/components/ui/button';
import { Share2, Sparkles } from 'lucide-react';

interface JudgmentSlideProps {
  stats: UserStats;
  judgment: JudgmentResult;
  onShare: () => void;
}

const JudgmentSlide = ({ stats, judgment, onShare }: JudgmentSlideProps) => {
  const [animate, setAnimate] = useState(false);
  const [scoreValue, setScoreValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Animated score counter
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
    <div className="flex flex-col items-center justify-center min-h-[85vh] text-center px-6">
      {/* The Card */}
      <div 
        id="judgment-card"
        className={`relative christmas-card ${verdictGlow} border-2 border-christmas-gold/30 max-w-sm w-full overflow-hidden transition-all duration-1000 ${
          animate ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}
      >
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-40 h-40 bg-christmas-gold/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-christmas-red/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[180px] opacity-10">
            {judgment.isNice ? '🎁' : '😈'}
          </div>
        </div>

        {/* Corner decorations */}
        <div className="absolute top-2 left-2 text-xl">⭐</div>
        <div className="absolute top-2 right-2 text-xl">⭐</div>
        <div className="absolute bottom-2 left-2 text-xl">🎄</div>
        <div className="absolute bottom-2 right-2 text-xl">🎄</div>

        <div className="relative z-10">
          {/* Header */}
          <div 
            className={`text-xs uppercase tracking-[0.2em] text-christmas-gold font-bold mb-6 transition-all duration-700 delay-200 ${
              animate ? 'opacity-100' : 'opacity-0'
            }`}
          >
            ❄️ Naughty or Nice Wrapped — 2025 ❄️
          </div>

          {/* Profile */}
          <div 
            className={`flex flex-col items-center mb-6 transition-all duration-700 delay-300 ${
              animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <div className="relative mb-3">
              <div className="absolute inset-0 rounded-full bg-christmas-gold blur-xl opacity-50 scale-125" />
              <img
                src={stats.pfp}
                alt={stats.username}
                className="w-24 h-24 rounded-full border-4 border-christmas-gold shadow-2xl relative z-10"
              />
              <div className="absolute -bottom-1 -right-1 text-3xl z-20">
                {judgment.isNice ? '😇' : '😈'}
              </div>
            </div>
            <span className="font-bold text-christmas-snow text-lg">@{stats.username}</span>
          </div>

          {/* Score Ring */}
          <div 
            className={`relative w-44 h-44 mx-auto mb-6 transition-all duration-1000 delay-500 ${
              animate ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
            }`}
          >
            {/* Background circle */}
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="88"
                cy="88"
                r="75"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="10"
              />
              <circle
                cx="88"
                cy="88"
                r="75"
                fill="none"
                stroke={`url(#gradient-${judgment.isNice ? 'nice' : 'naughty'})`}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(scoreValue / 100) * 471} 471`}
                className="transition-all duration-1000"
                style={{ filter: 'drop-shadow(0 0 10px currentColor)' }}
              />
              <defs>
                <linearGradient id="gradient-nice" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--christmas-green))" />
                  <stop offset="100%" stopColor="hsl(var(--christmas-green-light))" />
                </linearGradient>
                <linearGradient id="gradient-naughty" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--christmas-red))" />
                  <stop offset="100%" stopColor="hsl(var(--christmas-red-light))" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`font-display text-5xl font-bold bg-gradient-to-b ${verdictGradient} bg-clip-text text-transparent`}>
                {scoreValue}%
              </span>
              <span className="text-sm text-christmas-gold font-bold uppercase tracking-wider">
                {judgment.isNice ? 'NICE' : 'NAUGHTY'}
              </span>
            </div>
          </div>

          {/* Badge */}
          <div 
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r ${verdictGradient} text-white font-bold text-base mb-4 transition-all duration-700 delay-700 shadow-lg ${
              animate ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            {judgment.badge}
          </div>

          {/* Stats summary */}
          <div 
            className={`flex justify-center gap-10 text-sm mb-4 transition-all duration-700 delay-800 ${
              animate ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div>
              <span className="text-christmas-green font-bold text-xl">{judgment.nicePoints.toLocaleString()}</span>
              <br />
              <span className="text-christmas-snow/70">nice moments</span>
            </div>
            <div>
              <span className="text-christmas-red font-bold text-xl">{judgment.naughtyPoints}</span>
              <br />
              <span className="text-christmas-snow/70">naughty moments</span>
            </div>
          </div>
        </div>
      </div>

      {/* Share button */}
      <div 
        className={`mt-8 transition-all duration-700 delay-1000 ${
          animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <Button
          onClick={onShare}
          className="bg-gradient-to-r from-christmas-red to-christmas-red-dark hover:from-christmas-red-light hover:to-christmas-red text-white px-8 py-4 rounded-full font-bold gap-2 text-lg shadow-lg shadow-christmas-red/30 border-2 border-christmas-gold/30"
        >
          <Share2 className="w-5 h-5" />
          Share on Farcaster
        </Button>
      </div>

      {/* Mini app credit */}
      <p 
        className={`mt-6 text-sm text-christmas-gold/80 font-medium transition-all duration-700 delay-1100 ${
          animate ? 'opacity-100' : 'opacity-0'
        }`}
      >
        Made with ❄️ by @uniquebeing404
      </p>
    </div>
  );
};

export default JudgmentSlide;
