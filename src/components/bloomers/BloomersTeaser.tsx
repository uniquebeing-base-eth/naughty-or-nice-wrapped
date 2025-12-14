import { useState, useEffect } from 'react';

// Import Bloomer images
import bloomerCelestialFox from '@/assets/bloomers/bloomer-celestial-fox.png';
import bloomerMysticKitsune from '@/assets/bloomers/bloomer-mystic-kitsune.png';
import bloomerBlossomFairy from '@/assets/bloomers/bloomer-blossom-fairy.png';
import bloomerGoldenSpirit from '@/assets/bloomers/bloomer-golden-spirit.png';
import bloomerFrostGuardian from '@/assets/bloomers/bloomer-frost-guardian.png';

const CREATURE_TYPES = [
  { image: bloomerCelestialFox, name: 'Celestial Fox', desc: 'Angelic guardians with golden wings' },
  { image: bloomerMysticKitsune, name: 'Mystic Kitsune', desc: 'Crystal spirits of the winter realm' },
  { image: bloomerBlossomFairy, name: 'Blossom Fairy', desc: 'Keepers of eternal spring magic' },
  { image: bloomerGoldenSpirit, name: 'Golden Spirit', desc: 'Radiant beings of pure light' },
  { image: bloomerFrostGuardian, name: 'Frost Guardian', desc: 'Protectors of the frozen wonderland' },
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
          <div className="w-28 h-28 mx-auto rounded-xl overflow-hidden mb-3 shadow-lg">
            <img 
              src={CREATURE_TYPES[activeIndex].image}
              alt={CREATURE_TYPES[activeIndex].name}
              className="w-full h-full object-cover"
            />
          </div>
          <p className="font-display text-lg text-christmas-gold font-semibold">
            {CREATURE_TYPES[activeIndex].name}
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
