
import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
  username: string;
  pfp: string;
}

const loadingMessages = [
  "Connecting to the North Pole... 🎅",
  "Santa is pulling up your records... 📜",
  "Counting every reply you sent... 💬",
  "Measuring your like-giving energy... ❤️",
  "Detecting your spicy moments... 🔥",
  "Scanning for chaos levels... 😈",
  "Consulting the Elf Committee... 🧝",
  "Crunching the numbers... ✨",
  "Almost ready for the reveal... 🎁",
];

const LoadingScreen = ({ onComplete, username, pfp }: LoadingScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const duration = 4500;
    const interval = 50;
    const increment = 100 / (duration / interval);

    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev + increment + (Math.random() * 0.3);
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 400);
          return 100;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  useEffect(() => {
    const index = Math.min(
      Math.floor((progress / 100) * loadingMessages.length),
      loadingMessages.length - 1
    );
    setMessageIndex(index);
  }, [progress]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8">
      {/* Profile */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-christmas-gold blur-2xl opacity-50 scale-125 animate-pulse" />
        <img
          src={pfp}
          alt={username}
          className="w-24 h-24 rounded-full border-4 border-christmas-gold relative z-10 shadow-2xl"
        />
        <div className="absolute -bottom-1 -right-1 text-3xl z-20">🎅</div>
      </div>

      {/* Welcome Text - Static */}
      <h1 className="font-display text-3xl md:text-4xl font-bold text-christmas-snow mb-2 text-center">
        Welcome to your
      </h1>
      <h2 className="font-display text-3xl md:text-4xl font-bold mb-3 text-center">
        <span className="text-gradient-gold">Naughty or Nice Wrapped</span>
        <span className="ml-2">🎄</span>
      </h2>
      <p className="text-christmas-snow/80 text-lg mb-10 text-center">
        Santa has been watching your Farcaster journey.
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-3 bg-muted rounded-full overflow-hidden border-2 border-christmas-gold/30">
          <div 
            className="h-full bg-gradient-to-r from-christmas-red via-christmas-green to-christmas-gold rounded-full transition-all duration-100 relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 animate-shimmer" />
          </div>
        </div>
        
        {/* Percentage */}
        <div className="text-center mt-4">
          <span className="font-display text-5xl font-bold text-gradient-gold">
            {Math.floor(progress)}%
          </span>
        </div>

        {/* Changing status message */}
        <p className="text-christmas-gold text-center mt-4 text-base font-medium h-6">
          {loadingMessages[messageIndex]}
        </p>
      </div>

      {/* Decorations */}
      <div className="absolute bottom-16 flex gap-4 text-3xl">
        <span className="animate-float" style={{ animationDelay: '0s' }}>🎄</span>
        <span className="animate-float" style={{ animationDelay: '0.3s' }}>🎁</span>
        <span className="animate-float" style={{ animationDelay: '0.6s' }}>❄️</span>
        <span className="animate-float" style={{ animationDelay: '0.9s' }}>⭐</span>
        <span className="animate-float" style={{ animationDelay: '1.2s' }}>🔔</span>
      </div>
    </div>
  );
};

export default LoadingScreen;
