import { useEffect, useState } from 'react';

interface WelcomeSlideProps {
  username: string;
  pfp: string;
  isFunnyMode: boolean;
}

const WelcomeSlide = ({ username, pfp, isFunnyMode }: WelcomeSlideProps) => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 text-4xl animate-float" style={{ animationDelay: '0s' }}>🎄</div>
      <div className="absolute top-32 right-12 text-3xl animate-float" style={{ animationDelay: '0.5s' }}>⭐</div>
      <div className="absolute bottom-32 left-16 text-3xl animate-float" style={{ animationDelay: '1s' }}>🎁</div>
      <div className="absolute bottom-20 right-10 text-4xl animate-float" style={{ animationDelay: '1.5s' }}>❄️</div>

      {/* Profile picture */}
      <div 
        className={`relative mb-8 transition-all duration-700 ${
          animate ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}
      >
        <div className="absolute inset-0 rounded-full bg-christmas-gold/30 blur-xl animate-pulse" />
        <img
          src={pfp}
          alt={username}
          className="w-28 h-28 rounded-full border-4 border-christmas-gold relative z-10 shadow-lg"
        />
        <div className="absolute -bottom-2 -right-2 text-3xl z-20">🎅</div>
      </div>

      {/* Title */}
      <h1 
        className={`font-display text-4xl md:text-5xl font-bold mb-4 transition-all duration-700 delay-200 ${
          animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <span className="text-christmas-snow">Naughty or Nice</span>
        <br />
        <span className="text-gradient-gold">Wrapped</span>
      </h1>

      {/* Subtitle */}
      <p 
        className={`text-lg md:text-xl text-muted-foreground max-w-md leading-relaxed transition-all duration-700 delay-400 ${
          animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {isFunnyMode ? (
          <>
            Ho ho ho… Santa has been stalking your casts 👀🎄
            <br />
            <span className="text-christmas-snow/80">Let's see what you've been up to.</span>
          </>
        ) : (
          <>
            Welcome to your Naughty or Nice Wrapped 🎄
            <br />
            <span className="text-christmas-snow/80">Santa has been watching your Farcaster journey.</span>
          </>
        )}
      </p>

      {/* Username badge */}
      <div 
        className={`mt-8 px-6 py-3 rounded-full bg-card border border-christmas-gold/30 transition-all duration-700 delay-600 ${
          animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <span className="text-christmas-gold font-medium">@{username}</span>
      </div>
    </div>
  );
};

export default WelcomeSlide;
