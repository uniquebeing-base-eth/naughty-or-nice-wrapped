import { useState, useEffect } from 'react';
import { useFarcaster } from '@/contexts/FarcasterContext';
import { Button } from '@/components/ui/button';
import { ExternalLink, Gift, Zap, Coins, Flower2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const FARCASTER_MINIAPP_URL = 'https://farcaster.xyz/miniapps/m0Hnzx2HWtB5/naughty-or-nice-wrapped';

const FarcasterOnlyGuard = () => (
  <div className="relative min-h-screen overflow-hidden flex items-center justify-center bg-gradient-to-b from-[#1a0a15] via-[#0f0a15] to-[#0a0510]">
    <div className="relative z-10 text-center px-6 max-w-md">
      <div className="p-8 rounded-3xl bg-gradient-to-b from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-sm">
        <div className="text-6xl mb-6">🌸</div>
        <h1 className="font-display text-3xl font-bold text-white mb-4">Bloomers</h1>
        <p className="text-white/80 text-lg mb-2">This experience is exclusively available on Farcaster!</p>
        <p className="text-white/50 text-sm mb-8">Open Farcaster to explore your energy and mint your Bloomer ✨</p>
        <Button 
          onClick={() => window.open(FARCASTER_MINIAPP_URL, '_blank')} 
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-8 py-4 rounded-full font-bold gap-2 text-lg shadow-lg shadow-purple-500/30 border border-purple-400/30"
        >
          <ExternalLink className="w-5 h-5" />
          Open in Farcaster
        </Button>
      </div>
    </div>
  </div>
);

const Index = () => {
  const { user, isSDKLoaded, isInMiniApp } = useFarcaster();
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (isSDKLoaded && !isInMiniApp) return <FarcasterOnlyGuard />;

  const menuItems = [
    {
      title: 'Wrapped',
      description: 'Your Naughty or Nice verdict',
      icon: Gift,
      path: '/wrapped',
      gradient: 'from-red-500 via-orange-500 to-amber-500',
      emoji: '🎁',
    },
    {
      title: 'Reveal Energy',
      description: 'Daily affirmations & your energy',
      icon: Zap,
      path: '/energy',
      gradient: 'from-purple-500 via-pink-500 to-rose-500',
      emoji: '✨',
    },
    {
      title: 'Tip BLOOM',
      description: 'Send & receive BLOOM tips',
      icon: Coins,
      path: '/bloom-tipping',
      gradient: 'from-green-500 via-emerald-500 to-teal-500',
      emoji: '💰',
    },
    {
      title: 'Bloomers',
      description: 'Mint your unique Bloomer NFT',
      icon: Flower2,
      path: '/bloomers',
      gradient: 'from-pink-500 via-purple-500 to-indigo-500',
      emoji: '🌸',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#1a0a15] via-[#0f0a15] to-[#0a0510]">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-12">
        {/* Header */}
        <div className={`text-center mb-10 transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {user?.pfpUrl && (
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 blur-lg opacity-60 scale-125" />
              <img 
                src={user.pfpUrl} 
                alt={user.username} 
                className="w-20 h-20 rounded-full border-3 border-white/30 shadow-xl relative z-10" 
              />
            </div>
          )}
          <h1 className="font-display text-3xl font-bold text-white mb-2">
            Welcome{user?.username ? `, @${user.username}` : ''}
          </h1>
          <p className="text-white/60 text-sm">What would you like to explore?</p>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          {menuItems.map((item, index) => (
            <Link 
              key={item.path}
              to={item.path}
              className={`group transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${200 + index * 100}ms` }}
            >
              <div className="relative p-5 rounded-2xl bg-gradient-to-b from-white/10 to-white/[0.02] border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                {/* Glow effect */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300 blur-xl`} />
                
                <div className="relative z-10">
                  <div className="text-3xl mb-2">{item.emoji}</div>
                  <h3 className={`font-display text-lg font-bold bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent`}>
                    {item.title}
                  </h3>
                  <p className="text-white/50 text-xs mt-1">{item.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <p className={`mt-10 text-white/30 text-xs transition-all duration-700 delay-700 ${animate ? 'opacity-100' : 'opacity-0'}`}>
          Made with 🌸 by @uniquebeing404
        </p>
      </div>
    </div>
  );
};

export default Index;
