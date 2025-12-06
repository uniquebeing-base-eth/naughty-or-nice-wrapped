import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
}

const loadingMessages = [
  "Connecting to the North Pole... 🎅",
  "Santa is checking his list... 📜",
  "Counting your replies... 💬",
  "Measuring your kindness... ❤️",
  "Detecting spicy moments... 😈",
  "Calculating your vibe... ✨",
  "Consulting the elves... 🧝",
  "Almost there... 🎄",
];

const LoadingScreen = ({ onComplete }: LoadingScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const duration = 4000; // 4 seconds total
    const interval = 50; // Update every 50ms
    const increment = 100 / (duration / interval);

    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev + increment + (Math.random() * 0.5); // Slight randomness
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 300);
          return 100;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  // Change message based on progress
  useEffect(() => {
    const index = Math.min(
      Math.floor((progress / 100) * loadingMessages.length),
      loadingMessages.length - 1
    );
    setMessageIndex(index);
  }, [progress]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8">
      {/* Animated Santa */}
      <div className="text-8xl mb-8 animate-bounce">
        🎅
      </div>

      {/* Title */}
      <h2 className="font-display text-3xl md:text-4xl font-bold text-christmas-snow mb-2 text-center">
        Fetching Your Stats
      </h2>
      <p className="text-christmas-gold mb-10 text-lg">
        {loadingMessages[messageIndex]}
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-4 bg-muted rounded-full overflow-hidden border-2 border-christmas-gold/30">
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
      </div>

      {/* Decorations */}
      <div className="absolute bottom-20 flex gap-4 text-3xl">
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
