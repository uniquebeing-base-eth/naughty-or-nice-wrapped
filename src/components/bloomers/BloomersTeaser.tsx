import { useState, useEffect } from 'react';

// Import Bloomer images
import bloomerFoxGolden from '@/assets/bloomers/bloomer-fox-golden.png';
import bloomerDragonBlue from '@/assets/bloomers/bloomer-dragon-blue.png';
import bloomerFoxWhite from '@/assets/bloomers/bloomer-fox-white.png';
import bloomerFairyPink from '@/assets/bloomers/bloomer-fairy-pink.png';
import bloomerOwlIce from '@/assets/bloomers/bloomer-owl-ice.png';

const CREATURE_TYPES = [
  { image: bloomerFoxGolden, name: 'Sunfire Fox', desc: 'Swift and radiant companions' },
  { image: bloomerDragonBlue, name: 'Frostscale Dragon', desc: 'Guardians of winter wonder' },
  { image: bloomerFoxWhite, name: 'Crystal Kitsune', desc: 'Mystical nine-tailed spirits' },
  { image: bloomerFairyPink, name: 'Blossom Fairy', desc: 'Keepers of springtime magic' },
  { image: bloomerOwlIce, name: 'Aurora Owl', desc: 'Wise watchers of the night sky' },
];

const BloomersTeaser = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % CREATURE_TYPES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-20 px-6">
      <div className="max-w-md mx-auto text-center">
        {/* Text */}
        <div className="mb-10">
          <h2 className="font-display text-3xl font-bold text-christmas-snow mb-4">
            Every Bloomer is <span className="text-christmas-gold">Unique</span>
          </h2>
          <p className="text-christmas-snow/60">
            Shaped by your actions. No two bloom alike.
          </p>
        </div>

        {/* Creature grid showcase */}
        <div className="grid grid-cols-5 gap-2 mb-8">
          {CREATURE_TYPES.map((creature, idx) => (
            <div
              key={creature.name}
              className={`aspect-square rounded-xl overflow-hidden transition-all duration-500 ${
                idx === activeIndex
                  ? 'scale-110 shadow-lg shadow-christmas-gold/40 ring-2 ring-christmas-gold/50'
                  : 'opacity-60'
              }`}
            >
              <img 
                src={creature.image} 
                alt={creature.name}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>

        {/* Active creature description */}
        <div className="christmas-card p-4 border border-christmas-gold/20 transition-all duration-500">
          <div className="w-24 h-24 mx-auto rounded-xl overflow-hidden mb-3">
            <img 
              src={CREATURE_TYPES[activeIndex].image}
              alt={CREATURE_TYPES[activeIndex].name}
              className="w-full h-full object-cover"
            />
          </div>
          <p className="font-display text-lg text-christmas-gold font-semibold">
            {CREATURE_TYPES[activeIndex].name}
          </p>
          <p className="text-christmas-snow/60 text-sm">
            {CREATURE_TYPES[activeIndex].desc}
          </p>
        </div>

        {/* Traits preview */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {['Glowing Aura', 'Crystal Wings', 'Golden Markings', 'Starry Eyes'].map((trait) => (
            <span 
              key={trait}
              className="px-3 py-1 rounded-full bg-muted/30 border border-christmas-gold/20 text-christmas-snow/70 text-xs"
            >
              {trait}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BloomersTeaser;
