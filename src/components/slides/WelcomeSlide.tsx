import { useEffect, useState, useMemo } from 'react';

interface WelcomeSlideProps {
  username: string;
  pfp: string;
}

const welcomeTexts = [
  { main: "Ho ho ho... We've been watching your December 👀", sub: "Let's see if you've been naughty or nice!" },
  { main: "Santa's elves tracked your December casts 🎅", sub: "Time to reveal your month!" },
  { main: "December is almost over... 🎄", sub: "But first, let's judge your timeline behavior!" },
  { main: "The North Pole reviewed your December activity ❄️", sub: "Were you nice? Were you naughty? Let's find out!" },
  { main: "Jingle bells, your December tells 🔔", sub: "We know what you posted this month!" },
];

const WelcomeSlide = ({ username, pfp }: WelcomeSlideProps) => {
  const [animate, setAnimate] = useState(false);
  
  const welcomeText = useMemo(() => welcomeTexts[Math.floor(Math.random() * welcomeTexts.length)], []);

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] text-center px-6">
      {/* Profile picture with glow */}
      <div 
        className={`relative mb-8 transition-all duration-700 ${
          animate ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}
      >
        <div className="absolute inset-0 rounded-full bg-christmas-gold blur-2xl opacity-60 animate-pulse scale-125" />
        <div className="absolute inset-0 rounded-full bg-christmas-red blur-xl opacity-40 animate-pulse scale-110" style={{ animationDelay: '0.5s' }} />
        <img
          src={pfp}
          alt={username}
          className="w-32 h-32 rounded-full border-4 border-christmas-gold relative z-10 shadow-2xl"
        />
        <div className="absolute -bottom-2 -right-2 text-4xl z-20 animate-bounce">🎅</div>
        <div className="absolute -top-2 -left-2 text-2xl z-20 animate-float">⭐</div>
      </div>

      {/* Title */}
      <h1 
        className={`font-display text-4xl md:text-5xl font-bold mb-2 transition-all duration-700 delay-200 ${
          animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <span className="text-christmas-snow">December</span>
      </h1>
      <h2
        className={`font-display text-3xl md:text-4xl font-bold mb-2 transition-all duration-700 delay-300 ${
          animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <span className="text-gradient-gold">Naughty or Nice</span>
      </h2>
      <h3
        className={`font-display text-4xl md:text-5xl font-bold mb-6 transition-all duration-700 delay-350 ${
          animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <span className="text-christmas-red-light">Wrapped</span>
        <span className="ml-3 text-4xl">🎄</span>
      </h3>

      {/* Subtitle */}
      <p 
        className={`text-xl md:text-2xl text-christmas-snow font-medium max-w-md leading-relaxed transition-all duration-700 delay-400 ${
          animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {welcomeText.main}
      </p>
      <p 
        className={`text-lg text-christmas-gold/80 mt-2 transition-all duration-700 delay-500 ${
          animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {welcomeText.sub}
      </p>

      {/* Username badge */}
      <div 
        className={`mt-10 px-8 py-4 rounded-full bg-gradient-to-r from-christmas-red to-christmas-red-dark border-2 border-christmas-gold/40 shadow-lg transition-all duration-700 delay-600 ${
          animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <span className="text-christmas-gold font-bold text-lg">@{username}</span>
      </div>
    </div>
  );
};

export default WelcomeSlide;
