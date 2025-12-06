import { useEffect, useState } from 'react';
import { JudgmentResult, UserStats } from '@/types/wrapped';
import { Button } from '@/components/ui/button';
import { Share2, Download, Sparkles } from 'lucide-react';

interface JudgmentSlideProps {
  stats: UserStats;
  judgment: JudgmentResult;
  onShare: () => void;
  onGenerateNew: () => void;
}

const JudgmentSlide = ({ stats, judgment, onShare, onGenerateNew }: JudgmentSlideProps) => {
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

  const verdictColor = judgment.isNice 
    ? 'from-christmas-green to-christmas-green-light' 
    : 'from-christmas-red to-christmas-red-dark';

  const verdictGlow = judgment.isNice
    ? 'shadow-[0_0_80px_hsl(var(--christmas-green)/0.5)]'
    : 'shadow-[0_0_80px_hsl(var(--christmas-red)/0.5)]';

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-6">
      {/* The Card */}
      <div 
        id="judgment-card"
        className={`relative christmas-card ${verdictGlow} border border-christmas-gold/20 max-w-sm w-full overflow-hidden transition-all duration-1000 ${
          animate ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}
      >
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-christmas-gold/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-christmas-red/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[200px] opacity-5">
            {judgment.isNice ? '🎁' : '😈'}
          </div>
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div 
            className={`text-xs uppercase tracking-widest text-christmas-gold mb-6 transition-all duration-700 delay-200 ${
              animate ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Naughty or Nice Wrapped — 2025
          </div>

          {/* Profile */}
          <div 
            className={`flex flex-col items-center mb-6 transition-all duration-700 delay-300 ${
              animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <div className="relative mb-3">
              <img
                src={stats.pfp}
                alt={stats.username}
                className="w-20 h-20 rounded-full border-3 border-christmas-gold shadow-lg"
              />
              <div className="absolute -bottom-1 -right-1 text-2xl">
                {judgment.isNice ? '😇' : '😈'}
              </div>
            </div>
            <span className="font-medium text-foreground">@{stats.username}</span>
          </div>

          {/* Score Ring */}
          <div 
            className={`relative w-40 h-40 mx-auto mb-6 transition-all duration-1000 delay-500 ${
              animate ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
            }`}
          >
            {/* Background circle */}
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke={`url(#gradient-${judgment.isNice ? 'nice' : 'naughty'})`}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(scoreValue / 100) * 440} 440`}
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="gradient-nice" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--christmas-green))" />
                  <stop offset="100%" stopColor="hsl(var(--christmas-green-light))" />
                </linearGradient>
                <linearGradient id="gradient-naughty" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--christmas-red))" />
                  <stop offset="100%" stopColor="hsl(var(--christmas-red-dark))" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`font-display text-4xl font-bold bg-gradient-to-br ${verdictColor} bg-clip-text text-transparent`}>
                {scoreValue}%
              </span>
              <span className="text-sm text-muted-foreground">
                {judgment.isNice ? 'NICE' : 'NAUGHTY'}
              </span>
            </div>
          </div>

          {/* Badge */}
          <div 
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${verdictColor} text-white font-medium text-sm mb-4 transition-all duration-700 delay-700 ${
              animate ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {judgment.badge}
          </div>

          {/* Stats summary */}
          <div 
            className={`flex justify-center gap-8 text-sm text-muted-foreground mb-4 transition-all duration-700 delay-800 ${
              animate ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div>
              <span className="text-christmas-green font-medium">{judgment.nicePoints.toLocaleString()}</span>
              <br />nice moments
            </div>
            <div>
              <span className="text-christmas-red font-medium">{judgment.naughtyPoints}</span>
              <br />naughty moments
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div 
        className={`flex flex-col sm:flex-row gap-3 mt-8 transition-all duration-700 delay-1000 ${
          animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <Button
          onClick={onShare}
          className="bg-gradient-to-r from-christmas-red to-christmas-red-dark hover:from-christmas-red-dark hover:to-christmas-red text-white px-6 py-3 rounded-full font-medium gap-2"
        >
          <Share2 className="w-4 h-4" />
          Share on Farcaster
        </Button>
        <Button
          onClick={onGenerateNew}
          variant="outline"
          className="border-christmas-gold/30 text-christmas-gold hover:bg-christmas-gold/10 px-6 py-3 rounded-full font-medium"
        >
          Generate Yours
        </Button>
      </div>

      {/* Mini app credit */}
      <p 
        className={`mt-6 text-xs text-muted-foreground transition-all duration-700 delay-1100 ${
          animate ? 'opacity-100' : 'opacity-0'
        }`}
      >
        Made with ❄️ by @uniquebeing404
      </p>
    </div>
  );
};

export default JudgmentSlide;
